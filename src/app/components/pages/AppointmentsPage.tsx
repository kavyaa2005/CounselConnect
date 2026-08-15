import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock, Video, MessageCircle, CheckCircle, Calendar, CreditCard, Paperclip, X, Download } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api, fileUrl } from '../../lib/api';
import { getUser } from '../../lib/auth';
import { useMoney } from '../../lib/money';
import { loadRazorpay, openCheckout } from '../../lib/razorpay';

const SESSION_TYPES = [
  { id: 'video', icon: Video,          label: 'Video Session', desc: '50-min video call' },
  { id: 'chat',  icon: MessageCircle,  label: 'Chat Session',  desc: 'Text-based messaging' },
];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SLOTS  = ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','5:00 PM','5:30 PM'];

// Convert '2:30 PM' → minutes since midnight
const slotMinutes = (t: string) => {
  const [time, mer] = t.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

function buildCal(y: number, m: number) {
  const first = new Date(y, m, 1).getDay();
  const days  = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}
function isPast(y: number, m: number, d: number) {
  const td = new Date(); td.setHours(0,0,0,0);
  const cd = new Date(y, m, d); cd.setHours(0,0,0,0);
  return cd < td;
}

export function AppointmentsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // "Book Session" from a profile or AI Match names the counselor in the URL
  const requestedId = searchParams.get('counselor');
  const today = new Date();
  const [yr, setYr]   = useState(today.getFullYear());
  const [mo, setMo]   = useState(today.getMonth());
  const [day, setDay] = useState<number | null>(null);
  const [slot, setSlot]               = useState<string | null>(null);
  const [counselors, setCounselors]   = useState<any[]>([]);
  const [counselor, setCounselor]     = useState<any>(null);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);

  // Live counselor roster — real doctor accounts from the backend
  useEffect(() => {
    api.get('/counselors').then(res => {
      const list = (res.data.counselors || []).map((c: any) => ({ ...c, avatar: c.image }));
      setCounselors(list);
      setCounselor((prev: any) => {
        // Honour the counselor named in the URL before falling back
        const wanted = requestedId ? list.find((c: any) => c.id === requestedId) : null;
        if (wanted) return wanted;
        return prev || list[0] || null;
      });
      // Applied — clear it so switching counselor manually sticks
      if (requestedId && list.some((c: any) => c.id === requestedId)) {
        const next = new URLSearchParams(searchParams);
        next.delete('counselor');
        setSearchParams(next, { replace: true });
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedId]);
  const [sessionType, setSessionType] = useState('video');
  const [mode, setMode]               = useState<'online' | 'offline'>('online');
  const [reason, setReason]           = useState('');
  const [pending, setPending]         = useState<File[]>([]);
  const [confirmed, setConfirmed]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [bookError, setBookError]     = useState('');
  // Real availability for the selected counselor, keyed by YYYY-MM-DD
  const [availability, setAvailability] = useState<Record<string, any[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  // Whether this server has a real payment gateway configured.
  const [gateway, setGateway] = useState<{ enabled: boolean; testMode?: boolean }>({ enabled: false });
  const [paid, setPaid] = useState(false);
  // The currency symbol comes from the server, never a literal '$'.
  const { money } = useMoney();

  useEffect(() => {
    api.get('/billing/config')
      .then(r => setGateway({ enabled: !!r.data.enabled, testMode: !!r.data.testMode }))
      .catch(() => {});   // no gateway → the simulated flow below still works
  }, []);

  // Pull the counselor's real open slots instead of showing a fixed grid.
  useEffect(() => {
    if (!counselor?.id) return;
    setLoadingSlots(true);
    api.get(`/counselors/${counselor.id}/slots?days=30`)
      .then(r => {
        const map: Record<string, any[]> = {};
        (r.data.days || []).forEach((d: any) => { map[d.iso] = d.slots; });
        setAvailability(map);
      })
      .catch(() => setAvailability({}))
      .finally(() => setLoadingSlots(false));
  }, [counselor?.id, confirmed]);

  // Arriving from the profile slot picker with a date+time already chosen
  const wantDate = searchParams.get('date');
  const wantTime = searchParams.get('time');
  useEffect(() => {
    if (!wantDate || !wantTime) return;
    const d = new Date(wantDate);
    if (isNaN(d.getTime())) return;
    setYr(d.getFullYear());
    setMo(d.getMonth());
    setDay(d.getDate());
    setSlot(wantTime);
    const next = new URLSearchParams(searchParams);
    next.delete('date'); next.delete('time');
    setSearchParams(next, { replace: true });
  }, [wantDate, wantTime]);

  const [manageId, setManageId] = useState<string | null>(null);
  const [reDate, setReDate] = useState('');
  const [reTime, setReTime] = useState('');
  const [reBusy, setReBusy] = useState(false);
  const [manageMsg, setManageMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [reSlots, setReSlots] = useState<any[]>([]);

  const flashManage = (text: string, bad = false) => {
    setManageMsg({ text, bad });
    setTimeout(() => setManageMsg(null), 3200);
  };

  const reload = () => api.get('/appointments')
    .then(r => setMyAppointments(r.data.appointments || [])).catch(() => {});

  /** Opens the reschedule panel and loads that counselor's live openings. */
  const openReschedule = async (a: any) => {
    if (manageId === a.id) { setManageId(null); return; }
    setManageId(a.id);
    setReDate(''); setReTime(''); setReSlots([]);
    try {
      const r = await api.get(`/counselors/${a.counselorId}/slots?days=30`);
      setReSlots(r.data.days || []);
    } catch { setReSlots([]); }
  };

  const doReschedule = async (a: any) => {
    if (!reDate || !reTime) { flashManage('Pick a new date and time', true); return; }
    setReBusy(true);
    try {
      await api.put(`/appointments/${a.id}/reschedule`, { date: reDate, time: reTime });
      flashManage('Session moved');
      setManageId(null);
      reload();
    } catch (e: any) {
      flashManage(e.message || 'Could not reschedule', true);
    } finally { setReBusy(false); }
  };

  const doCancel = async (a: any) => {
    if (!window.confirm(`Cancel your session with ${a.counselorName} on ${a.date}?`)) return;
    try {
      await api.put(`/appointments/${a.id}`, { status: 'cancelled' });
      flashManage('Session cancelled' + (a.paymentStatus === 'paid' ? ' — refund issued' : ''));
      reload();
    } catch (e: any) { flashManage(e.message || 'Could not cancel', true); }
  };

  const downloadDetails = async (a: any) => {
    try {
      await api.download(`/appointments/${a.id}/details.pdf`);
      flashManage('Details downloaded');
    } catch (e: any) { flashManage(e.message || 'Download failed', true); }
  };

  const upcoming = myAppointments
    .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const isoFor = (y: number, m: number, d: number | null) =>
    d == null ? '' : `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const daySlots = availability[isoFor(yr, mo, day)] || [];

  // Existing bookings — used to grey out taken slots
  useEffect(() => {
    api.get('/appointments').then(res => setMyAppointments(res.data.appointments || [])).catch(() => {});
  }, [confirmed]);

  const cells = buildCal(yr, mo);

  if (!counselor) {
    return <div style={{ minHeight: '100%', backgroundColor: CC.luxuryBg }} />;
  }

  const prevMo = () => { if (mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1); setDay(null);setSlot(null); };
  const nextMo = () => { if (mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1); setDay(null);setSlot(null); };

  /** Uploads the chosen attachments against a booking that already exists. */
  const uploadPending = async (appointmentId: string) => {
    for (const f of pending) {
      const fd = new FormData();
      fd.append('file', f);
      try { await api.upload(`/appointments/${appointmentId}/documents`, fd); } catch { /* non-fatal */ }
    }
  };

  const bookingPayload = () => ({
    counselorId: counselor.id,
    counselorName: counselor.name,
    counselorAvatar: counselor.avatar,
    sessionType,
    mode,
    reason: reason.trim(),
    date: `${MONTHS[mo]} ${day}, ${yr}`,
    time: slot,
  });

  const book = async () => {
    setLoading(true);
    setBookError('');
    try {
      if (gateway.enabled) {
        await bookWithPayment();
      } else {
        // No gateway configured on this server — book first, pay from Billing.
        const res = await api.post('/appointments', { ...bookingPayload(), price: counselor.price });
        await uploadPending(res.data.appointment.id);
        setPaid(false);
        setConfirmed(true);
      }
    } catch (err: any) {
      setBookError(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pay first, book second.
   *
   * The appointment is created by the server only after it has re-computed
   * Razorpay's signature, so an abandoned or failed payment never leaves an
   * unpaid booking sitting on the counselor's calendar.
   */
  const bookWithPayment = async () => {
    // 1. Server checks the slot is genuinely free and opens an order priced
    //    from the counselor's own record.
    const orderRes = await api.post('/billing/order', bookingPayload());
    const order = orderRes.data;

    // 2. Payment sheet.
    const ready = await loadRazorpay();
    if (!ready) {
      await api.post('/billing/abandon', { orderId: order.orderId, reason: 'checkout script failed to load' })
        .catch(() => {});
      throw new Error('Could not open the payment window. Check your internet connection and try again.');
    }

    let result;
    try {
      const me = getUser();
      result = await openCheckout(order, { name: me?.name, email: me?.email, contact: me?.phone });
    } catch (payErr: any) {
      await api.post('/billing/abandon', { orderId: order.orderId, reason: payErr?.message || 'payment failed' })
        .catch(() => {});
      throw payErr;
    }

    if (!result) {
      // Sheet dismissed. Nothing was charged and nothing was booked — say so
      // plainly rather than showing a scary failure.
      await api.post('/billing/abandon', { orderId: order.orderId, reason: 'closed by user' }).catch(() => {});
      throw new Error('Payment cancelled — your slot has not been booked. You can try again any time.');
    }

    // 3. Only the server can turn a payment into a booking.
    const verified = await api.post('/billing/verify', result);
    const appt = verified.data.appointment;
    if (appt?.id) await uploadPending(appt.id);
    setPaid(true);
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="p-8 flex items-center justify-center" style={{ minHeight:'100%', backgroundColor:CC.luxuryBg }}>
        <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{duration:0.5}} className="text-center max-w-md">
          <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',delay:0.2,stiffness:200}}
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{background:`linear-gradient(135deg,${CC.forestSage},${CC.darkForest})`}}>
            <CheckCircle size={40} color="white" />
          </motion.div>
          <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:'1.8rem',color:CC.primaryText,marginBottom:8}}>Session Booked! 🎉</h2>
          <p style={{color:CC.mutedOlive,lineHeight:1.7,marginBottom:24}}>
            Your {sessionType==='video'?'video':'chat'} session with{' '}
            <strong style={{color:CC.primaryText}}>{counselor.name}</strong> is confirmed for{' '}
            <strong style={{color:CC.forestSage}}>{MONTHS[mo]} {day}, {yr} at {slot}</strong>.
          </p>
          <div className="p-5 rounded-2xl mb-6" style={{backgroundColor:CC.softSage}}>
            <div className="flex items-center gap-4">
              <img src={fileUrl(counselor.avatar)} alt="" className="w-14 h-14 rounded-2xl object-cover" />
              <div className="text-left">
                <p style={{fontWeight:700,color:CC.primaryText}}>{counselor.name}</p>
                <p style={{fontSize:'0.82rem',color:CC.mutedOlive}}>{counselor.specialty}</p>
                <p style={{fontSize:'0.8rem',color:CC.forestSage,fontWeight:600,marginTop:2}}>{MONTHS[mo]} {day} · {slot}</p>
              </div>
            </div>
          </div>
          {/* Paid up front → nothing owed. Otherwise payment is the next step. */}
          {paid ? (
            <div className="p-4 rounded-2xl mb-5 flex items-center gap-3"
              style={{backgroundColor:`${CC.forestSage}12`,border:`1px solid ${CC.forestSage}33`}}>
              <CheckCircle size={16} color={CC.forestSage} style={{flexShrink:0}} />
              <p style={{fontSize:'0.83rem',color:CC.primaryText,textAlign:'left',lineHeight:1.5}}>
                <strong>{money(counselor.price)} paid.</strong> Your slot is confirmed — your counselor has been notified.
                {gateway.testMode && <span style={{color:CC.mutedOlive}}> (test mode)</span>}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl mb-5 flex items-center gap-3"
              style={{backgroundColor:'rgba(217,119,87,0.08)',border:`1px solid ${CC.terracotta}33`}}>
              <Clock size={16} color={CC.terracotta} style={{flexShrink:0}} />
              <p style={{fontSize:'0.83rem',color:CC.primaryText,textAlign:'left',lineHeight:1.5}}>
                <strong>{money(counselor.price)} due.</strong> Complete payment so your counselor can confirm the slot.
              </p>
            </div>
          )}

          <div className="flex gap-3 mb-3">
            <motion.button onClick={()=>navigate('/dashboard/billing')} whileHover={{scale:1.02}}
              className="flex-1 py-3 rounded-xl text-sm text-white flex items-center justify-center gap-2"
              style={{background:`linear-gradient(135deg,${CC.forestSage},${CC.darkForest})`,border:'none',cursor:'pointer',fontWeight:600}}>
              <CreditCard size={15} /> {paid ? 'View Receipt' : `Pay ${money(counselor.price)}`}
            </motion.button>
            <motion.button onClick={()=>navigate('/dashboard/video')} whileHover={{scale:1.02}}
              className="flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              style={{backgroundColor:CC.softSage,color:CC.primaryText,border:'none',cursor:'pointer',fontWeight:600}}>
              <Video size={15} /> Join Session
            </motion.button>
          </div>

          <motion.button onClick={()=>{setConfirmed(false);setPaid(false);setPending([]);setDay(null);setSlot(null);}} whileHover={{scale:1.02}}
            className="w-full py-3 rounded-xl text-sm"
            style={{backgroundColor:'transparent',color:CC.mutedOlive,fontWeight:600,border:'none',cursor:'pointer'}}>
            Book Another
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8" style={{backgroundColor:CC.luxuryBg,minHeight:'100%'}}>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
        <p style={{color:CC.mutedOlive,fontSize:'0.875rem',marginBottom:4}}>Schedule your care</p>
        <h1 style={{fontFamily:"'Poppins',sans-serif",fontWeight:800,fontSize:'1.9rem',color:CC.primaryText,marginBottom:24}}>
          Book a Session
        </h1>


        {/* ── Your booked sessions ── */}
        {!!upcoming.length && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:'1.05rem',color:CC.primaryText}}>
                Your upcoming sessions
              </h2>
              <span style={{fontSize:'0.78rem',color:CC.mutedOlive}}>{upcoming.length} booked</span>
            </div>

            {manageMsg&&(
              <div className="mb-3 p-3 rounded-2xl"
                style={{backgroundColor:manageMsg.bad?'rgba(217,119,87,0.1)':`${CC.forestSage}12`,
                        border:`1px solid ${manageMsg.bad?CC.terracotta:CC.forestSage}`}}>
                <p style={{fontSize:'0.8rem',color:manageMsg.bad?CC.terracotta:CC.forestSage}}>{manageMsg.text}</p>
              </div>
            )}

            <div className="space-y-3">
              {upcoming.map(a=>(
                <div key={a.id} className="p-4 rounded-3xl"
                  style={{backgroundColor:CC.lightIvory,boxShadow:'0 4px 24px rgba(53,92,77,0.06)'}}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p style={{fontWeight:700,color:CC.primaryText,fontSize:'0.92rem'}}>{a.counselorName}</p>
                      <p style={{fontSize:'0.8rem',color:CC.mutedOlive,marginTop:2}}>
                        {a.date} · {a.time} · {a.mode==='offline'?'In person':a.sessionType==='chat'?'Chat':'Video'}
                        {a.rescheduleCount?` · moved ${a.rescheduleCount}×`:''}
                      </p>
                      {a.reason&&(
                        <p style={{fontSize:'0.76rem',color:CC.mutedOlive,marginTop:3,fontStyle:'italic'}}>“{a.reason}”</p>
                      )}
                      {!!(a.documents||[]).length&&(
                        <div className="flex gap-2 flex-wrap mt-2">
                          {a.documents.map((d:any)=>(
                            <button key={d.id}
                              onClick={()=>api.download(`/appointments/${a.id}/documents/${d.id}`,d.name).catch((e:any)=>flashManage(e.message,true))}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                              style={{backgroundColor:CC.softSage,border:'none',cursor:'pointer',fontSize:'0.72rem',color:CC.primaryText}}>
                              <Paperclip size={10}/> {d.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>openReschedule(a)}
                        className="px-3 py-2 rounded-xl"
                        style={{backgroundColor:manageId===a.id?CC.forestSage:CC.softSage,
                                color:manageId===a.id?'white':CC.primaryText,
                                border:'none',cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                        Reschedule
                      </button>
                      <button onClick={()=>downloadDetails(a)}
                        className="px-3 py-2 rounded-xl flex items-center gap-1.5"
                        style={{backgroundColor:CC.softSage,color:CC.primaryText,border:'none',cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                        <Download size={12}/> Details
                      </button>
                      <button onClick={()=>doCancel(a)}
                        className="px-3 py-2 rounded-xl"
                        style={{backgroundColor:'transparent',color:CC.terracotta,
                                border:`1.5px solid ${CC.terracotta}`,cursor:'pointer',fontSize:'0.78rem',fontWeight:600}}>
                        Cancel
                      </button>
                    </div>
                  </div>

                  {manageId===a.id&&(
                    <div className="mt-4 pt-4" style={{borderTop:`1px solid ${CC.softSage}`}}>
                      <p style={{fontSize:'0.8rem',fontWeight:600,color:CC.primaryText,marginBottom:8}}>Pick a new time</p>
                      {!reSlots.length?(
                        <p style={{fontSize:'0.8rem',color:CC.mutedOlive}}>No openings in the next 30 days.</p>
                      ):(
                        <>
                          <div className="flex gap-2 overflow-x-auto pb-2 mb-2" style={{scrollbarWidth:'none'}}>
                            {reSlots.map((d:any)=>(
                              <button key={d.iso} onClick={()=>{setReDate(d.date);setReTime('');}}
                                className="flex-shrink-0 px-3 py-2 rounded-2xl text-center"
                                style={{backgroundColor:reDate===d.date?CC.forestSage:CC.softSage,
                                        color:reDate===d.date?'white':CC.primaryText,border:'none',cursor:'pointer',minWidth:60}}>
                                <div style={{fontSize:'0.66rem',opacity:0.85}}>{d.dayLabel}</div>
                                <div style={{fontWeight:700,fontSize:'0.9rem'}}>{d.dayNum}</div>
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {(reSlots.find((d:any)=>d.date===reDate)?.slots||[]).map((sl:any)=>(
                              <button key={sl.iso} disabled={sl.booked} onClick={()=>setReTime(sl.time)}
                                className="px-3 py-1.5 rounded-xl"
                                style={{backgroundColor:reTime===sl.time?CC.forestSage:'transparent',
                                        color:reTime===sl.time?'white':sl.booked?CC.mutedOlive:CC.forestSage,
                                        border:`1.5px solid ${sl.booked?CC.softSage:CC.forestSage}`,
                                        fontSize:'0.76rem',fontWeight:600,
                                        textDecoration:sl.booked?'line-through':'none',
                                        cursor:sl.booked?'not-allowed':'pointer',opacity:sl.booked?0.5:1}}>
                                {sl.time}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button disabled={reBusy||!reDate||!reTime} onClick={()=>doReschedule(a)}
                              className="px-4 py-2 rounded-xl text-white"
                              style={{background:`linear-gradient(135deg,${CC.forestSage},${CC.darkForest})`,
                                      border:'none',fontSize:'0.8rem',fontWeight:700,
                                      cursor:reBusy?'wait':'pointer',opacity:(!reDate||!reTime)?0.5:1}}>
                              {reBusy?'Moving…':'Confirm new time'}
                            </button>
                            <button onClick={()=>setManageId(null)}
                              className="px-4 py-2 rounded-xl"
                              style={{backgroundColor:CC.softSage,color:CC.primaryText,border:'none',fontSize:'0.8rem',cursor:'pointer'}}>
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Col 1: Counselor + type ── */}
          <div className="space-y-5">
            <div className="p-5 rounded-3xl" style={{backgroundColor:CC.lightIvory,boxShadow:'0 4px 24px rgba(53,92,77,0.06)'}}>
              <p style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,color:CC.primaryText,marginBottom:12}}>Choose Counselor</p>
              <div className="space-y-3">
                {counselors.map(c=>(
                  <motion.button key={c.id} onClick={()=>setCounselor(c)} whileHover={{scale:1.01}}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                    style={{backgroundColor:counselor.id===c.id?`${CC.forestSage}10`:'transparent',border:`1.5px solid ${counselor.id===c.id?CC.forestSage:CC.softSage}`,cursor:'pointer'}}>
                    <img src={fileUrl(c.avatar)} alt={c.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p style={{fontWeight:600,color:CC.primaryText,fontSize:'0.85rem'}}>{c.name}</p>
                      <p style={{fontSize:'0.72rem',color:CC.mutedOlive}}>{c.specialty}</p>
                    </div>
                    <span style={{fontSize:'0.78rem',fontWeight:700,color:CC.forestSage,flexShrink:0}}>{money(c.price)}</span>
                    {counselor.id===c.id&&<CheckCircle size={14} color={CC.forestSage}/>}
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="p-5 rounded-3xl" style={{backgroundColor:CC.lightIvory,boxShadow:'0 4px 24px rgba(53,92,77,0.06)'}}>
              <p style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,color:CC.primaryText,marginBottom:12}}>Session Type</p>
              <div className="space-y-2">
                {SESSION_TYPES.map(t=>{
                  const Icon=t.icon;
                  return(
                    <motion.button key={t.id} onClick={()=>setSessionType(t.id)} whileHover={{scale:1.01}}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                      style={{backgroundColor:sessionType===t.id?CC.forestSage:CC.softSage,border:'none',cursor:'pointer'}}>
                      <Icon size={18} color={sessionType===t.id?'white':CC.mutedOlive}/>
                      <div>
                        <p style={{fontWeight:600,fontSize:'0.85rem',color:sessionType===t.id?'white':CC.primaryText}}>{t.label}</p>
                        <p style={{fontSize:'0.72rem',color:sessionType===t.id?'rgba(255,255,255,0.7)':CC.mutedOlive}}>{t.desc}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── How you'll meet ── */}
            <div className="p-5 rounded-3xl" style={{backgroundColor:CC.lightIvory,boxShadow:'0 4px 24px rgba(53,92,77,0.06)'}}>
              <p style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,color:CC.primaryText,marginBottom:12}}>How you'll meet</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  {id:'online',label:'Online',desc:'Video or chat'},
                  // Seed data stores an em-dash for "not set", which is truthy —
                  // so a plain `||` would print the dash as if it were an address.
                  {id:'offline',label:'In person',
                   desc:(counselor.location||'').replace(/^[—\-]$/,'')||'At the practice'},
                ] as const).map(m=>(
                  <button key={m.id} onClick={()=>setMode(m.id)}
                    className="p-3 rounded-2xl text-left"
                    style={{backgroundColor:mode===m.id?CC.forestSage:CC.softSage,border:'none',cursor:'pointer'}}>
                    <p style={{fontWeight:600,fontSize:'0.85rem',color:mode===m.id?'white':CC.primaryText}}>{m.label}</p>
                    <p style={{fontSize:'0.7rem',color:mode===m.id?'rgba(255,255,255,0.7)':CC.mutedOlive}}>{m.desc}</p>
                  </button>
                ))}
              </div>
              {mode==='offline'&&(
                <p style={{fontSize:'0.74rem',color:CC.mutedOlive,marginTop:10,lineHeight:1.5}}>
                  In-person sessions have no video link — you'll meet at the counselor's practice.
                </p>
              )}
            </div>

            {/* ── What you'd like to work on ── */}
            <div className="p-5 rounded-3xl" style={{backgroundColor:CC.lightIvory,boxShadow:'0 4px 24px rgba(53,92,77,0.06)'}}>
              <p style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,color:CC.primaryText,marginBottom:4}}>
                What would you like to focus on?
              </p>
              <p style={{fontSize:'0.74rem',color:CC.mutedOlive,marginBottom:10}}>
                Optional — helps your counselor prepare.
              </p>
              <textarea
                value={reason}
                onChange={e=>setReason(e.target.value.slice(0,500))}
                rows={3}
                placeholder="e.g. Work stress and trouble sleeping"
                className="w-full p-3 rounded-2xl outline-none resize-none"
                style={{backgroundColor:CC.softSage,border:`1.5px solid transparent`,color:CC.primaryText,fontSize:'0.85rem',lineHeight:1.6}}
                onFocus={e=>(e.target.style.borderColor=CC.forestSage)}
                onBlur={e=>(e.target.style.borderColor='transparent')}
              />
              <p style={{fontSize:'0.7rem',color:CC.mutedOlive,textAlign:'right',marginTop:4}}>{reason.length}/500</p>

              {/* Attachments — uploaded once the booking exists */}
              <div className="mt-3">
                <label
                  className="flex items-center justify-center gap-2 py-2.5 rounded-2xl cursor-pointer"
                  style={{backgroundColor:CC.softSage,color:CC.primaryText,fontSize:'0.82rem',fontWeight:600}}>
                  <Paperclip size={14}/> Attach a document
                  <input type="file" className="hidden"
                    onChange={e=>{
                      const f=e.target.files?.[0];
                      if(!f) return;
                      if(f.size>15*1024*1024){ setBookError(`"${f.name}" is over the 15 MB limit`); e.target.value=''; return; }
                      setPending(p=>[...p,f].slice(0,3));
                      setBookError('');
                      e.target.value='';
                    }}/>
                </label>
                <p style={{fontSize:'0.7rem',color:CC.mutedOlive,marginTop:6}}>
                  Intake forms, prior reports — PDF, Word or images, up to 3 files.
                </p>
                {pending.map((f,i)=>(
                  <div key={i} className="flex items-center gap-2 mt-2 p-2 rounded-xl" style={{backgroundColor:CC.softSage}}>
                    <Paperclip size={12} color={CC.mutedOlive}/>
                    <span className="flex-1 truncate" style={{fontSize:'0.76rem',color:CC.primaryText}}>{f.name}</span>
                    <button onClick={()=>setPending(p=>p.filter((_,x)=>x!==i))}
                      style={{background:'none',border:'none',cursor:'pointer',color:CC.mutedOlive,display:'flex'}}>
                      <X size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Col 2: Calendar ── */}
          <div className="p-5 rounded-3xl" style={{backgroundColor:CC.lightIvory,boxShadow:'0 4px 24px rgba(53,92,77,0.06)'}}>
            <div className="flex items-center justify-between mb-4">
              <motion.button onClick={prevMo} whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                style={{width:32,height:32,borderRadius:10,backgroundColor:CC.softSage,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronLeft size={16} color={CC.primaryText}/>
              </motion.button>
              <p style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,color:CC.primaryText,fontSize:'0.95rem'}}>
                {MONTHS[mo]} {yr}
              </p>
              <motion.button onClick={nextMo} whileHover={{scale:1.08}} whileTap={{scale:0.92}}
                style={{width:32,height:32,borderRadius:10,backgroundColor:CC.softSage,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ChevronRight size={16} color={CC.primaryText}/>
              </motion.button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d=><p key={d} style={{textAlign:'center',fontSize:'0.66rem',fontWeight:600,color:CC.mutedOlive,padding:'2px 0'}}>{d}</p>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d,i)=>{
                if(!d) return <div key={i}/>;
                const past=isPast(yr,mo,d);
                const isToday=yr===today.getFullYear()&&mo===today.getMonth()&&d===today.getDate();
                const sel=day===d;
                return(
                  <motion.button key={i} onClick={()=>!past&&setDay(d)}
                    whileHover={!past?{scale:1.1}:{}} whileTap={!past?{scale:0.95}:{}}
                    style={{height:34,borderRadius:10,border:'none',cursor:past?'default':'pointer',
                      backgroundColor:sel?CC.forestSage:isToday?`${CC.terracotta}20`:'transparent',
                      color:sel?'white':past?`${CC.mutedOlive}50`:isToday?CC.terracotta:CC.primaryText,
                      fontSize:'0.8rem',fontWeight:sel||isToday?700:400,transition:'all 0.15s'}}>
                    {d}
                  </motion.button>
                );
              })}
            </div>
            {day&&(
              <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="mt-4 p-3 rounded-xl"
                style={{backgroundColor:`${CC.forestSage}10`}}>
                <p style={{fontSize:'0.78rem',color:CC.forestSage,fontWeight:600}}>
                  <Calendar size={12} style={{display:'inline',marginRight:4}}/>{MONTHS[mo]} {day}, {yr}
                </p>
              </motion.div>
            )}
          </div>

          {/* ── Col 3: Slots + summary ── */}
          <div className="space-y-5">
            <div className="p-5 rounded-3xl" style={{backgroundColor:CC.lightIvory,boxShadow:'0 4px 24px rgba(53,92,77,0.06)'}}>
              <p style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,color:CC.primaryText,marginBottom:12}}>Available Times</p>
              {!day?(
                <div className="text-center py-8">
                  <p style={{fontSize:'2rem',marginBottom:8}}>📅</p>
                  <p style={{color:CC.mutedOlive,fontSize:'0.82rem'}}>Select a date first</p>
                </div>
              ):(
                loadingSlots ? (
                <p style={{color:CC.mutedOlive,fontSize:'0.82rem',padding:'20px 0',textAlign:'center'}}>Checking availability…</p>
              ) : !daySlots.length ? (
                <div className="text-center py-8">
                  <p style={{fontSize:'1.6rem',marginBottom:8}}>🌙</p>
                  <p style={{color:CC.mutedOlive,fontSize:'0.82rem',lineHeight:1.6}}>
                    {counselor.name.split(' ').slice(-1)[0]} isn't working that day.<br/>Try another date.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {/* Real openings from the counselor's own schedule */}
                  {daySlots.map((sl:any)=>{
                    const busy=sl.booked;
                    const sel=slot===sl.time;
                    return(
                      <motion.button key={sl.iso} onClick={()=>!busy&&setSlot(sl.time)}
                        disabled={busy}
                        title={busy?'Already booked':`Book ${sl.time}`}
                        whileHover={!busy?{scale:1.04}:{}} whileTap={!busy?{scale:0.96}:{}}
                        className="flex items-center justify-center gap-1.5"
                        style={{padding:'8px 0',borderRadius:10,border:'none',
                          backgroundColor:sel?CC.forestSage:busy?CC.softSage:CC.softSage,
                          color:sel?'white':busy?`${CC.mutedOlive}80`:CC.primaryText,
                          fontSize:'0.78rem',fontWeight:sel?700:500,
                          textDecoration:busy?'line-through':'none',
                          cursor:busy?'not-allowed':'pointer',opacity:busy?0.55:1}}>
                        {sl.time}
                      </motion.button>
                    );
                  })}
                </div>
              )
              )}
            </div>

            {bookError&&(
              <div className="p-3 rounded-2xl" style={{backgroundColor:'rgba(217,119,87,0.1)',border:`1px solid ${CC.terracotta}`}}>
                <p style={{fontSize:'0.8rem',color:CC.terracotta}}>{bookError}</p>
              </div>
            )}

            <AnimatePresence>
              {day&&slot&&(
                <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
                  className="p-5 rounded-3xl"
                  style={{background:`linear-gradient(145deg,${CC.forestSage},${CC.darkForest})`,boxShadow:`0 12px 32px rgba(53,92,77,0.25)`}}>
                  <p style={{fontFamily:"'Poppins',sans-serif",fontWeight:700,color:'white',marginBottom:12}}>Booking Summary</p>
                  {[
                    {label:'Counselor',value:counselor.name},
                    {label:'Date',value:`${MONTHS[mo]} ${day}, ${yr}`},
                    {label:'Time',value:slot},
                    {label:'Type',value:mode==='offline'?'In person':sessionType==='video'?'Video Session':'Chat Session'},
                    {label:gateway.enabled?'Pay now':'Cost',value:money(counselor.price)},
                  ].map(item=>(
                    <div key={item.label} className="flex justify-between mb-2">
                      <span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.76rem'}}>{item.label}</span>
                      <span style={{color:'white',fontSize:'0.76rem',fontWeight:600}}>{item.value}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 mt-1" style={{borderColor:'rgba(255,255,255,0.12)'}}>
                    <motion.button onClick={book} disabled={loading} whileHover={!loading?{scale:1.02,boxShadow:'0 8px 24px rgba(217,119,87,0.4)'}:{}}
                      whileTap={!loading?{scale:0.97}:{}}
                      className="w-full py-3 rounded-xl text-white flex items-center justify-center gap-2"
                      style={{background:CC.terracotta,border:'none',cursor:loading?'not-allowed':'pointer',fontWeight:700,fontSize:'0.9rem'}}>
                      {loading
                        ?<motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}}
                            style={{width:18,height:18,borderRadius:'50%',border:'2px solid white',borderTopColor:'transparent'}}/>
                        : gateway.enabled
                          ?<><CreditCard size={16}/> Pay {money(counselor.price)} &amp; Book</>
                          :<><CheckCircle size={16}/> Confirm Booking</>
                      }
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

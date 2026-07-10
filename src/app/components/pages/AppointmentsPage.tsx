import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock, Video, MessageCircle, CheckCircle, Calendar } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

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
      setCounselor((prev: any) => prev || list[0] || null);
    }).catch(() => {});
  }, []);
  const [sessionType, setSessionType] = useState('video');
  const [confirmed, setConfirmed]     = useState(false);
  const [loading, setLoading]         = useState(false);

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

  const book = async () => {
    setLoading(true);
    try {
      await api.post('/appointments', {
        counselorId: counselor.id,
        counselorName: counselor.name,
        counselorAvatar: counselor.avatar,
        sessionType,
        date: `${MONTHS[mo]} ${day}, ${yr}`,
        time: slot,
        price: counselor.price,
      });
      setConfirmed(true);
    } catch (err: any) {
      alert(err.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
              <img src={counselor.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover" />
              <div className="text-left">
                <p style={{fontWeight:700,color:CC.primaryText}}>{counselor.name}</p>
                <p style={{fontSize:'0.82rem',color:CC.mutedOlive}}>{counselor.specialty}</p>
                <p style={{fontSize:'0.8rem',color:CC.forestSage,fontWeight:600,marginTop:2}}>{MONTHS[mo]} {day} · {slot}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <motion.button onClick={()=>{setConfirmed(false);setDay(null);setSlot(null);}} whileHover={{scale:1.02}}
              className="flex-1 py-3 rounded-xl text-sm"
              style={{backgroundColor:CC.softSage,color:CC.primaryText,fontWeight:600,border:'none',cursor:'pointer'}}>
              Book Another
            </motion.button>
            <motion.button onClick={()=>navigate('/dashboard/video')} whileHover={{scale:1.02}}
              className="flex-1 py-3 rounded-xl text-sm text-white flex items-center justify-center gap-2"
              style={{background:`linear-gradient(135deg,${CC.forestSage},${CC.darkForest})`,border:'none',cursor:'pointer',fontWeight:600}}>
              <Video size={15} /> Join Session
            </motion.button>
          </div>
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
                    <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p style={{fontWeight:600,color:CC.primaryText,fontSize:'0.85rem'}}>{c.name}</p>
                      <p style={{fontSize:'0.72rem',color:CC.mutedOlive}}>{c.specialty}</p>
                    </div>
                    <span style={{fontSize:'0.78rem',fontWeight:700,color:CC.forestSage,flexShrink:0}}>₹{c.price}</span>
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
                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.map(s=>{
                    const selDateStr=day?`${MONTHS[mo]} ${day}, ${yr}`:'';
                    // Slot already booked with this counselor on this date
                    const booked=myAppointments.some(a=>a.counselorId===counselor.id&&a.date===selDateStr&&a.time===s&&a.status!=='cancelled');
                    // Slot time already passed (only applies when the selected day is today)
                    const now=new Date();
                    const isTodaySel=!!day&&yr===now.getFullYear()&&mo===now.getMonth()&&day===now.getDate();
                    const expired=isTodaySel&&slotMinutes(s)<=now.getHours()*60+now.getMinutes();
                    const busy=booked||expired;
                    const sel=slot===s;
                    return(
                      <motion.button key={s} onClick={()=>!busy&&setSlot(s)}
                        whileHover={!busy?{scale:1.04}:{}} whileTap={!busy?{scale:0.96}:{}}
                        className="flex items-center justify-center gap-1.5"
                        style={{padding:'8px 0',borderRadius:10,border:'none',
                          backgroundColor:sel?CC.forestSage:busy?CC.darkForest:CC.softSage,
                          color:sel?'white':busy?'rgba(255,255,255,0.4)':CC.primaryText,
                          fontSize:'0.76rem',fontWeight:sel?600:400,
                          cursor:busy?'not-allowed':'pointer',textDecoration:busy?'line-through':'none'}}>
                        <Clock size={11}/>{s}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

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
                    {label:'Type',value:sessionType==='video'?'Video Session':'Chat Session'},
                    {label:'Cost',value:`₹${counselor.price}`},
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

import { useState, useRef, useEffect } from 'react';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Video, Check, X, Calendar, Clock, MoreVertical, MessageSquare } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

type AppointmentStatus = 'confirmed' | 'pending' | 'rejected' | 'completed' | 'cancelled';

interface Appointment {
  id: string;
  patient: string;
  date: string;
  time: string;
  type: string;
  issue: string;
  status: AppointmentStatus;
  duration: string;
  notes: string;
}

const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
const SESSION_COLORS = ['#6FAF8F', '#7C6FFF', '#F9A825', '#E91E8C'];

interface ThreeDotsMenuProps {
  apptId: string;
  onAction: (action: string, id: string) => void;
}

function ThreeDotsMenu({ apptId, onAction }: ThreeDotsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { c, sh } = useTheme();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', color: c.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <MoreVertical size={12} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 34, width: 160,
          background: c.white, borderRadius: 10, border: `1px solid ${c.border}`,
          boxShadow: sh.modal, zIndex: 200, overflow: 'hidden',
        }}>
          {[
            { label: 'Edit', action: 'edit' },
            { label: 'Reschedule', action: 'reschedule' },
            { label: 'Cancel', action: 'cancel' },
            { label: 'Download Summary', action: 'download' },
          ].map(item => (
            <button
              key={item.action}
              onClick={(e) => { e.stopPropagation(); onAction(item.action, apptId); setOpen(false); }}
              style={{
                width: '100%', padding: '9px 14px', border: 'none',
                background: 'transparent', fontFamily: 'Inter', fontSize: 13,
                color: item.action === 'cancel' ? c.error : c.textPrimary,
                cursor: 'pointer', textAlign: 'left', display: 'block',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.veryLightSage; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AppointmentsPageProps {
  onNavigate: (page: string) => void;
}

export function AppointmentsPage({ onNavigate }: AppointmentsPageProps) {
  const { c, sh } = useTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Real appointments booked by users, live from the backend
  const loadAppointments = () => {
    api.get('/doctor/appointments').then(res => {
      const todayKey = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      setAppointments((res.data.appointments || []).map((a: any) => {
        const dayKey = (a.dateTime || '').slice(0, 10);
        const dateLabel = dayKey === todayKey ? 'Today' : dayKey === tomorrow ? 'Tomorrow'
          : new Date(a.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          id: a.id,
          patient: a.patient?.name || 'Patient',
          date: dateLabel,
          time: a.time,
          type: a.sessionType === 'video' ? 'Video' : 'Chat',
          issue: a.patient?.reason || 'General wellbeing',
          status: (a.status === 'confirmed' && new Date(a.dateTime) >= new Date() ? 'confirmed' : a.status) as AppointmentStatus,
          duration: '50 min',
          notes: `Booked ${new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · $${a.price}`,
          dateTime: a.dateTime,
        } as Appointment & { dateTime: string };
      }));
    }).catch(() => {});
  };
  useEffect(() => { loadAppointments(); }, []);

  const todaySessions = appointments
    .filter((a: any) => a.date === 'Today' && a.status !== 'cancelled')
    .map((a: any, i: number) => {
      const d = new Date(a.dateTime);
      const end = new Date(d.getTime() + 50 * 60000);
      const fmt = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
      return { time: fmt(d), end: fmt(end), patient: a.patient, color: SESSION_COLORS[i % SESSION_COLORS.length] };
    });

  const statusConfig: Record<AppointmentStatus, { label: string; bg: string; color: string }> = {
    confirmed: { label: 'Confirmed', bg: c.veryLightSage, color: c.primary },
    pending: { label: 'Pending', bg: '#FFF9E6', color: c.warning },
    rejected: { label: 'Rejected', bg: '#FFEBEE', color: c.error },
    completed: { label: 'Completed', bg: '#E8F5E9', color: c.success },
    cancelled: { label: 'Cancelled', bg: c.background, color: c.textMuted },
  };

  const filters = ['all', 'confirmed', 'pending', 'completed', 'cancelled', 'rejected'];

  const filtered = appointments.filter(a => {
    const matchesFilter = activeFilter === 'all' || a.status === activeFilter;
    const matchesSearch = a.patient.toLowerCase().includes(search.toLowerCase()) || a.issue.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedAppt = appointments.find(a => a.id === selected);

  const updateStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    // Persist to the backend ('rejected' is stored as 'cancelled')
    const serverStatus = status === 'rejected' ? 'cancelled' : status;
    api.put(`/doctor/appointments/${id}`, { status: serverStatus }).catch(() => {});
  };

  const handleMenuAction = (action: string, id: string) => {
    if (action === 'cancel') updateStatus(id, 'cancelled');
  };

  return (
    <div style={{ padding: '28px', fontFamily: 'Inter', display: 'flex', gap: 24, height: '100%', boxSizing: 'border-box' }}>
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['list', 'calendar'].map(v => (
              <button
                key={v}
                onClick={() => setView(v as 'list' | 'calendar')}
                style={{
                  padding: '8px 18px', borderRadius: 10, border: `1px solid ${c.border}`,
                  fontFamily: 'Inter', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: view === v ? c.primary : 'transparent',
                  color: view === v ? 'white' : c.textSecondary,
                  transition: 'all 0.2s',
                }}
              >
                {v === 'list' ? 'List View' : 'Calendar View'}
              </button>
            ))}
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: c.primary, color: 'white',
            fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={15} /> New Appointment
          </button>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: c.textMuted }} />
            <input
              placeholder="Search patients or issues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px 9px 34px', borderRadius: 10,
                border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13,
                color: c.textPrimary, background: c.white, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '5px 13px', borderRadius: 20,
                border: `1px solid ${activeFilter === f ? c.primary : c.border}`,
                background: activeFilter === f ? c.veryLightSage : 'transparent',
                color: activeFilter === f ? c.primary : c.textSecondary,
                fontFamily: 'Inter', fontSize: 12, fontWeight: activeFilter === f ? 600 : 400,
                cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s',
              }}
            >
              {f === 'all'
                ? `All (${appointments.length})`
                : `${f.charAt(0).toUpperCase() + f.slice(1)} (${appointments.filter(a => a.status === f).length})`}
            </button>
          ))}
        </div>

        {view === 'list' ? (
          <div style={{ background: c.white, borderRadius: 18, border: `1px solid ${c.border}`, overflow: 'hidden', boxShadow: sh.card, flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}`, background: c.background, position: 'sticky', top: 0 }}>
                  {['Patient', 'Date & Time', 'Type', 'Issue', 'Duration', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 14px', textAlign: 'left', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: c.textMuted, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((appt, i) => {
                  const st = statusConfig[appt.status] || statusConfig.confirmed;
                  return (
                    <tr
                      key={appt.id}
                      onClick={() => setSelected(appt.id === selected ? null : appt.id)}
                      style={{
                        borderBottom: i < filtered.length - 1 ? `1px solid ${c.border}` : 'none',
                        cursor: 'pointer',
                        background: selected === appt.id ? c.veryLightSage : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (selected !== appt.id) (e.currentTarget as HTMLTableRowElement).style.background = c.background; }}
                      onMouseLeave={(e) => { if (selected !== appt.id) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                            {appt.patient.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: c.textPrimary, whiteSpace: 'nowrap' }}>{appt.patient}</span>
                        </div>
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textPrimary }}>{appt.date}</div>
                        <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted }}>{appt.time}</div>
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'Inter', color: c.textSecondary, whiteSpace: 'nowrap' }}>
                          {appt.type === 'Video' ? <Video size={12} /> : <MessageSquare size={12} />} {appt.type}
                        </div>
                      </td>
                      <td style={{ padding: '13px 14px', fontFamily: 'Inter', fontSize: 13, color: c.textSecondary }}>{appt.issue}</td>
                      <td style={{ padding: '13px 14px', fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, whiteSpace: 'nowrap' }}>{appt.duration}</td>
                      <td style={{ padding: '13px 14px' }}>
                        <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'Inter', background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '13px 14px' }}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          {appt.status === 'pending' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateStatus(appt.id, 'confirmed'); }}
                                title="Accept"
                                style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#E8F5E9', color: c.success, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateStatus(appt.id, 'rejected'); }}
                                title="Reject"
                                style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#FFEBEE', color: c.error, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <X size={12} />
                              </button>
                            </>
                          )}
                          {appt.status === 'confirmed' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); onNavigate('video'); }}
                                style={{ padding: '4px 9px', borderRadius: 7, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                Join
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateStatus(appt.id, 'completed'); }}
                                style={{ padding: '4px 9px', borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', color: c.textSecondary, fontFamily: 'Inter', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                Complete
                              </button>
                            </>
                          )}
                          <ThreeDotsMenu apptId={appt.id} onAction={handleMenuAction} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Calendar View */
          <div style={{ background: c.white, borderRadius: 18, padding: 22, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textSecondary }}>
                  <ChevronLeft size={15} />
                </button>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 15, color: c.textPrimary }}>July 2026</span>
                <button style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textSecondary }}>
                  <ChevronRight size={15} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Day', 'Week', 'Month'].map(v => (
                  <button key={v} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, cursor: 'pointer', background: v === 'Month' ? c.primary : 'transparent', color: v === 'Month' ? 'white' : c.textSecondary }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: c.textMuted, padding: '6px 0' }}>{d}</div>
              ))}
              {Array.from({ length: 2 }, (_, i) => <div key={`empty-${i}`} style={{ height: 70 }} />)}
              {calendarDays.map(day => {
                const isToday = day === 2;
                const hasAppt = [2, 3, 5, 7, 9, 14, 16, 21, 24, 28].includes(day);
                return (
                  <div key={day} style={{
                    height: 70, padding: 7, borderRadius: 9,
                    background: isToday ? c.primary : hasAppt ? c.veryLightSage : 'transparent',
                    cursor: 'pointer',
                    border: isToday ? 'none' : `1px solid ${hasAppt ? c.border : 'transparent'}`,
                  }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? 'white' : c.textPrimary }}>{day}</div>
                    {hasAppt && (
                      <div style={{ marginTop: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ height: 3, borderRadius: 2, background: isToday ? 'rgba(255,255,255,0.5)' : c.primary }} />
                        {day === 2 && <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.4)' }} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${c.border}` }}>
              <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: c.textPrimary, marginBottom: 10 }}>Today's Sessions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {todaySessions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, background: `${s.color}10`, borderLeft: `3px solid ${s.color}` }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: s.color, width: 80, flexShrink: 0 }}>{s.time}–{s.end}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textPrimary }}>{s.patient}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Detail Drawer */}
      {selectedAppt && (
        <div style={{
          width: 300, background: c.white, borderRadius: 18, padding: 22,
          boxShadow: sh.card, border: `1px solid ${c.border}`,
          height: 'fit-content', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Appointment Details</h3>
            <button onClick={() => setSelected(null)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textMuted }}>
              <X size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 15 }}>
                {selectedAppt.patient.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: c.textPrimary }}>{selectedAppt.patient}</div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary }}>{selectedAppt.issue}</div>
              </div>
            </div>
            {[
              { label: 'Date', value: selectedAppt.date, icon: Calendar },
              { label: 'Time', value: selectedAppt.time, icon: Clock },
              { label: 'Duration', value: selectedAppt.duration, icon: Clock },
              { label: 'Session Type', value: selectedAppt.type, icon: Video },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${c.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Inter', fontSize: 12, color: c.textMuted }}>
                  <Icon size={12} /> {label}
                </div>
                <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 500, color: c.textPrimary }}>{value}</span>
              </div>
            ))}
            <div>
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, marginBottom: 5 }}>Session Notes</div>
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, lineHeight: 1.5, padding: '9px 11px', background: c.background, borderRadius: 9 }}>{selectedAppt.notes}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <button onClick={() => onNavigate('video')} style={{ width: '100%', padding: '10px', borderRadius: 11, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Join Video Session
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                <button onClick={() => { if (selected) updateStatus(selected, 'completed'); }} style={{ padding: '8px', borderRadius: 11, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, cursor: 'pointer' }}>Mark Complete</button>
                <button onClick={() => { if (selected) updateStatus(selected, 'cancelled'); setSelected(null); }} style={{ padding: '8px', borderRadius: 11, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.error, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

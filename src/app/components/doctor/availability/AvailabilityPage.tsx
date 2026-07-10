import { useState, useEffect } from 'react';
import { Clock, Plus, X } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DaySchedule = { active: boolean; slots: string[] };
type Schedule = Record<string, DaySchedule>;

const emptySchedule: Schedule = Object.fromEntries(days.map(d => [d, { active: false, slots: [] }]));

// Backend shape: { monday: { enabled, slots: [{start,end}] } } ⇄ UI shape: { Monday: { active, slots: ['09:00-10:00'] } }
const fromApi = (av: any): Schedule => {
  const out: Schedule = { ...emptySchedule };
  days.forEach(d => {
    const key = d.toLowerCase();
    const day = av?.[key];
    out[d] = {
      active: !!day?.enabled,
      slots: (day?.slots || []).map((sl: any) => `${sl.start}-${sl.end}`),
    };
  });
  return out;
};
const toApi = (sc: Schedule) => Object.fromEntries(days.map(d => [d.toLowerCase(), {
  enabled: sc[d].active,
  slots: sc[d].slots.map(sl => { const [start, end] = sl.split('-'); return { start, end }; }),
}]));

const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

export function AvailabilityPage() {
  const { c: colors, sh: shadows } = useTheme();
  const [schedule, setSchedule] = useState<Schedule>(emptySchedule);
  const [vacationMode, setVacationMode] = useState(false);
  const [breakStart, setBreakStart] = useState('12:30');
  const [breakEnd, setBreakEnd] = useState('13:30');
  const [autoReject, setAutoReject] = useState(false);
  const [bookedThisWeek, setBookedThisWeek] = useState(0);
  const [saved, setSaved] = useState(false);

  // Load the real availability from the backend
  useEffect(() => {
    api.get('/doctor/availability').then(res => {
      const av = res.data.availability || {};
      setSchedule(fromApi(av));
      if (av.settings) {
        setVacationMode(!!av.settings.vacationMode);
        setBreakStart(av.settings.breakStart || '12:30');
        setBreakEnd(av.settings.breakEnd || '13:30');
        setAutoReject(!!av.settings.autoReject);
      }
    }).catch(() => {});
    api.get('/doctor/appointments').then(res => {
      const now = new Date();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); weekStart.setHours(0,0,0,0);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      setBookedThisWeek((res.data.appointments || []).filter((a: any) => {
        const d = new Date(a.dateTime);
        return d >= weekStart && d < weekEnd && a.status !== 'cancelled';
      }).length);
    }).catch(() => {});
  }, []);

  const totalSlots = days.reduce((n, d) => n + (schedule[d].active ? schedule[d].slots.length : 0), 0);
  const allTimes = days.flatMap(d => schedule[d].active ? schedule[d].slots : []).flatMap(sl => sl.split('-'));
  const fmtHour = (t?: string) => {
    if (!t) return '—';
    const h = parseInt(t.split(':')[0], 10);
    return h >= 12 ? `${h === 12 ? 12 : h - 12} PM` : `${h} AM`;
  };
  const workingHours = allTimes.length ? `${fmtHour(allTimes.slice().sort()[0])} – ${fmtHour(allTimes.slice().sort().pop())}` : 'Not set';
  const bookedRate = totalSlots ? Math.min(100, Math.round((bookedThisWeek / totalSlots) * 100)) : 0;

  const persist = async (sc: Schedule) => {
    try {
      await api.put('/doctor/availability', {
        ...toApi(sc),
        settings: { vacationMode, breakStart, breakEnd, autoReject },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
  };

  const toggleDay = (day: string) => {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
  };

  const removeSlot = (day: string, slot: string) => {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], slots: prev[day].slots.filter(s => s !== slot) } }));
  };

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', gap: 24 }}>
      {/* Main schedule */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Working Hours', value: workingHours, color: colors.primary },
            { label: 'Slots This Week', value: `${totalSlots} slots`, color: '#7C6FFF' },
            { label: 'Booked Rate', value: `${bookedRate}%`, color: colors.success },
          ].map((s, i) => (
            <div key={i} style={{ background: colors.white, borderRadius: 16, padding: '16px 20px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Schedule Table */}
        <div style={{ background: colors.white, borderRadius: 20, boxShadow: shadows.card, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Weekly Schedule</h3>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Add Slot
            </button>
          </div>
          <div style={{ padding: '0 24px 24px' }}>
            {days.map(day => {
              const dayData = schedule[day];
              return (
                <div key={day} style={{ paddingTop: 20, paddingBottom: 20, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        onClick={() => toggleDay(day)}
                        style={{
                          width: 44, height: 24, borderRadius: 12,
                          background: dayData.active ? colors.primary : colors.border,
                          position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 3, left: dayData.active ? 23 : 3,
                          width: 18, height: 18, borderRadius: '50%', background: 'white',
                          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: dayData.active ? colors.textPrimary : colors.textMuted }}>{day}</span>
                    </div>
                    {dayData.active && (
                      <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500 }}>
                        <Plus size={13} /> Add slot
                      </button>
                    )}
                  </div>
                  {dayData.active && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {dayData.slots.map(slot => (
                        <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10, background: colors.veryLightSage, border: `1px solid ${colors.mintAccent}` }}>
                          <Clock size={12} color={colors.primary} />
                          <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: colors.primary }}>{slot}</span>
                          <button onClick={() => removeSlot(day, slot)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.primary, display: 'flex', alignItems: 'center', padding: 0 }}>
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                      {dayData.slots.length === 0 && (
                        <span style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>No slots added</span>
                      )}
                    </div>
                  )}
                  {!dayData.active && (
                    <span style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted }}>Day off</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Settings Panel */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16, flexShrink: 0 }}>
        {/* Vacation Mode */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 20, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Vacation Mode</h4>
            <div
              onClick={() => setVacationMode(!vacationMode)}
              style={{ width: 44, height: 24, borderRadius: 12, background: vacationMode ? colors.warning : colors.border, position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: vacationMode ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
          {vacationMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>From</label>
                <input type="date" defaultValue="2026-07-10" style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>To</label>
                <input type="date" defaultValue="2026-07-20" style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFF9E6', border: `1px solid #FFE082` }}>
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.warning, margin: 0 }}>⚠️ All appointments during this period will be automatically rejected.</p>
              </div>
            </div>
          )}
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: vacationMode ? '12px 0 0' : 0 }}>
            {vacationMode ? 'Vacation mode active' : 'Enable to block your calendar for vacation'}
          </p>
        </div>

        {/* Lunch Break */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 20, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Break Time</h4>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Start</label>
              <select value={breakStart} onChange={e => setBreakStart(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', cursor: 'pointer' }}>
                {timeSlots.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>End</label>
              <select value={breakEnd} onChange={e => setBreakEnd(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', cursor: 'pointer' }}>
                {timeSlots.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Auto Reject */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 20, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Auto-Reject</h4>
            <div onClick={() => setAutoReject(!autoReject)} style={{ width: 44, height: 24, borderRadius: 12, background: autoReject ? colors.error : colors.border, position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: autoReject ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0 }}>
            Automatically reject appointments outside working hours
          </p>
        </div>

        {/* Save Button */}
        <button onClick={() => persist(schedule)} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {saved ? 'Saved ✓' : 'Save Schedule'}
        </button>
      </div>
    </div>
  );
}

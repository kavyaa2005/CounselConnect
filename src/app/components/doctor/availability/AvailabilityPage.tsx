// Weekly availability + the rules that sit on top of it.
//
// This page is the single source of truth for when a client can book with this
// counselor: the schedule below is what /counselors/:id/slots reads.

import { useState, useEffect } from 'react';
import { Clock, Plus, X, AlertCircle } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DaySchedule = { active: boolean; slots: string[] };
type Schedule = Record<string, DaySchedule>;

const emptySchedule = (): Schedule =>
  Object.fromEntries(days.map(d => [d, { active: false, slots: [] as string[] }])) as Schedule;

// Backend shape: { monday: { enabled, slots: [{start,end}] } } ⇄ UI shape: { Monday: { active, slots: ['09:00-10:00'] } }
const fromApi = (av: any): Schedule => {
  const out = emptySchedule();
  days.forEach(d => {
    const day = av?.[d.toLowerCase()];
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

const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const sortSlots = (slots: string[]) =>
  [...slots].sort((a, b) => toMinutes(a.split('-')[0]) - toMinutes(b.split('-')[0]));

/** Today, as YYYY-MM-DD in the browser's own zone (never toISOString). */
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function AvailabilityPage() {
  const { c: colors, sh: shadows } = useTheme();
  const [schedule, setSchedule] = useState<Schedule>(emptySchedule());
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationFrom, setVacationFrom] = useState('');
  const [vacationTo, setVacationTo] = useState('');
  const [breakStart, setBreakStart] = useState('12:30');
  const [breakEnd, setBreakEnd] = useState('13:30');
  const [autoReject, setAutoReject] = useState(false);
  const [bookedThisWeek, setBookedThisWeek] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [dirty, setDirty] = useState(false);

  /* ── Add-slot editor ── */
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [slotError, setSlotError] = useState('');

  // Load the real availability from the backend
  useEffect(() => {
    api.get('/doctor/availability').then(res => {
      const av = res.data.availability || {};
      setSchedule(fromApi(av));
      const s = av.settings || {};
      setVacationMode(!!s.vacationMode);
      setVacationFrom(s.vacationFrom || '');
      setVacationTo(s.vacationTo || '');
      setBreakStart(s.breakStart || '12:30');
      setBreakEnd(s.breakEnd || '13:30');
      setAutoReject(!!s.autoReject);
      setDirty(false);
    }).catch(() => {});
    api.get('/doctor/appointments').then(res => {
      const now = new Date();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); weekStart.setHours(0, 0, 0, 0);
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
    const [hh, mm] = t.split(':');
    const h = parseInt(hh, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return mm === '00' ? `${h12} ${suffix}` : `${h12}:${mm} ${suffix}`;
  };
  const sorted = allTimes.slice().sort((a, b) => toMinutes(a) - toMinutes(b));
  const workingHours = sorted.length ? `${fmtHour(sorted[0])} – ${fmtHour(sorted[sorted.length - 1])}` : 'Not set';
  const bookedRate = totalSlots ? Math.min(100, Math.round((bookedThisWeek / totalSlots) * 100)) : 0;

  const mutate = (fn: (prev: Schedule) => Schedule) => {
    setSchedule(fn);
    setDirty(true);
    setSaved(false);
  };

  const persist = async () => {
    setSaveError('');
    try {
      await api.put('/doctor/availability', {
        ...toApi(schedule),
        settings: {
          vacationMode, vacationFrom, vacationTo,
          breakStart, breakEnd, autoReject,
        },
      });
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setSaveError(e.message || 'Could not save your schedule');
    }
  };

  const toggleDay = (day: string) => {
    mutate(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
  };

  const removeSlot = (day: string, slot: string) => {
    mutate(prev => ({ ...prev, [day]: { ...prev[day], slots: prev[day].slots.filter(s => s !== slot) } }));
  };

  const openAdd = (day: string) => {
    setAddingFor(day);
    setSlotError('');
    // Start where the day currently ends, so adding several in a row doesn't
    // mean re-picking the same times.
    const existing = sortSlots(schedule[day].slots);
    const lastEnd = existing.length ? existing[existing.length - 1].split('-')[1] : '09:00';
    const idx = timeSlots.indexOf(lastEnd);
    setNewStart(idx >= 0 && idx < timeSlots.length - 1 ? lastEnd : '09:00');
    setNewEnd(idx >= 0 && idx < timeSlots.length - 2 ? timeSlots[idx + 2] : '10:00');
  };

  /**
   * Both "Add Slot" buttons on this page were decorative — no onClick at all,
   * so a counselor could remove slots but never create one, and a fresh
   * account was stuck with whatever the defaults happened to be.
   */
  const addSlot = () => {
    if (!addingFor) return;
    const start = toMinutes(newStart);
    const end = toMinutes(newEnd);

    if (end <= start) { setSlotError('The end time has to be after the start time.'); return; }
    if (end - start < 30) { setSlotError('A slot needs to be at least 30 minutes.'); return; }

    const clash = schedule[addingFor].slots.find(sl => {
      const [s, e] = sl.split('-').map(toMinutes);
      return start < e && end > s;
    });
    if (clash) { setSlotError(`That overlaps ${clash} — adjust the times or remove the other slot.`); return; }

    const day = addingFor;
    mutate(prev => ({
      ...prev,
      [day]: {
        // Adding a slot to a day that's off would create availability nobody
        // can see, so turn the day on at the same time.
        active: true,
        slots: sortSlots([...prev[day].slots, `${newStart}-${newEnd}`]),
      },
    }));
    setAddingFor(null);
    setSlotError('');
  };

  const overlapsBreak = (slot: string) => {
    const [s, e] = slot.split('-').map(toMinutes);
    return s < toMinutes(breakEnd) && e > toMinutes(breakStart);
  };

  const vacationInvalid = !!(vacationMode && vacationFrom && vacationTo && vacationTo < vacationFrom);

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', gap: 24 }}>
      {/* Main schedule */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Status Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Working Hours', value: workingHours, color: colors.primary },
            { label: 'Slots This Week', value: `${totalSlots} slot${totalSlots === 1 ? '' : 's'}`, color: '#7C6FFF' },
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
            <div>
              <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Weekly Schedule</h3>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: '2px 0 0' }}>
                Clients can only book inside these windows
              </p>
            </div>
            <button
              onClick={() => openAdd(addingFor || 'Monday')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
                        role="switch"
                        aria-checked={dayData.active}
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
                    <button
                      onClick={() => openAdd(day)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500 }}>
                      <Plus size={13} /> Add slot
                    </button>
                  </div>

                  {/* Inline slot editor for this day */}
                  {addingFor === day && (
                    <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 12, background: colors.veryLightSage, border: `1px solid ${colors.mintAccent}` }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div>
                          <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>From</label>
                          <select value={newStart} onChange={e => { setNewStart(e.target.value); setSlotError(''); }}
                            style={{ padding: '8px 10px', borderRadius: 9, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', cursor: 'pointer' }}>
                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>To</label>
                          <select value={newEnd} onChange={e => { setNewEnd(e.target.value); setSlotError(''); }}
                            style={{ padding: '8px 10px', borderRadius: 9, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', cursor: 'pointer' }}>
                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <button onClick={addSlot}
                          style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Add
                        </button>
                        <button onClick={() => { setAddingFor(null); setSlotError(''); }}
                          style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid ${colors.border}`, background: 'transparent', color: colors.textSecondary, fontFamily: 'Inter', fontSize: 13, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                      {slotError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontFamily: 'Inter', fontSize: 12, color: colors.error }}>
                          <AlertCircle size={13} /> {slotError}
                        </div>
                      )}
                    </div>
                  )}

                  {dayData.active && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {sortSlots(dayData.slots).map(slot => {
                        const clipped = overlapsBreak(slot);
                        return (
                          <div key={slot} title={clipped ? `Your ${breakStart}–${breakEnd} break is held back from this window` : undefined}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 10, background: colors.veryLightSage, border: `1px solid ${clipped ? colors.warning : colors.mintAccent}` }}>
                            <Clock size={12} color={colors.primary} />
                            <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: colors.primary }}>{slot}</span>
                            {clipped && <span style={{ fontSize: 10, color: colors.warning, fontWeight: 600 }}>break</span>}
                            <button onClick={() => removeSlot(day, slot)} title="Remove this slot"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.primary, display: 'flex', alignItems: 'center', padding: 0 }}>
                              <X size={11} />
                            </button>
                          </div>
                        );
                      })}
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
              onClick={() => { setVacationMode(v => !v); setDirty(true); setSaved(false); }}
              role="switch"
              aria-checked={vacationMode}
              style={{ width: 44, height: 24, borderRadius: 12, background: vacationMode ? colors.warning : colors.border, position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ position: 'absolute', top: 3, left: vacationMode ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
          {vacationMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* These two inputs were `defaultValue="2026-07-10"` / "2026-07-20"
                  — hardcoded, uncontrolled, and never sent anywhere. */}
              <div>
                <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>From</label>
                <input type="date" value={vacationFrom} min={todayKey()}
                  onChange={e => { setVacationFrom(e.target.value); setDirty(true); setSaved(false); }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, background: colors.white, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>To</label>
                <input type="date" value={vacationTo} min={vacationFrom || todayKey()}
                  onChange={e => { setVacationTo(e.target.value); setDirty(true); setSaved(false); }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${vacationInvalid ? colors.error : colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, background: colors.white, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {vacationInvalid && (
                <div style={{ fontFamily: 'Inter', fontSize: 11.5, color: colors.error }}>The end date is before the start date.</div>
              )}
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFF9E6', border: '1px solid #FFE082' }}>
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.warning, margin: 0, lineHeight: 1.5 }}>
                  {vacationFrom && vacationTo
                    ? 'Clients see no bookable times in this range, and new requests that fall inside it are declined automatically.'
                    : 'Leave the dates empty to close your calendar indefinitely.'}
                </p>
              </div>
            </div>
          )}
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: vacationMode ? '12px 0 0' : 0 }}>
            {vacationMode ? 'Vacation mode active' : 'Enable to block your calendar for vacation'}
          </p>
        </div>

        {/* Lunch Break */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 20, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 6 }}>Break Time</h4>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: '0 0 14px' }}>Held back from every day's slots</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Start</label>
              <select value={breakStart} onChange={e => { setBreakStart(e.target.value); setDirty(true); setSaved(false); }} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', cursor: 'pointer' }}>
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>End</label>
              <select value={breakEnd} onChange={e => { setBreakEnd(e.target.value); setDirty(true); setSaved(false); }} style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, outline: 'none', cursor: 'pointer' }}>
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Auto Reject */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 20, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Auto-Reject</h4>
            <div
              onClick={() => { setAutoReject(v => !v); setDirty(true); setSaved(false); }}
              role="switch"
              aria-checked={autoReject}
              style={{ width: 44, height: 24, borderRadius: 12, background: autoReject ? colors.error : colors.border, position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ position: 'absolute', top: 3, left: autoReject ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
            {autoReject
              ? 'Requests landing outside your working hours or inside your break are declined the moment they arrive, with the reason sent to the client.'
              : 'Requests outside your working hours still reach your queue for you to decide.'}
          </p>
        </div>

        {/* Save */}
        <button
          onClick={persist}
          disabled={vacationInvalid}
          style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: vacationInvalid ? colors.border : colors.primary, color: 'white', fontFamily: 'Inter', fontSize: 14, fontWeight: 700, cursor: vacationInvalid ? 'not-allowed' : 'pointer' }}>
          {saved ? 'Saved ✓' : dirty ? 'Save Changes' : 'Save Schedule'}
        </button>
        {dirty && !saved && (
          <p style={{ fontFamily: 'Inter', fontSize: 11.5, color: colors.warning, margin: '-6px 0 0', textAlign: 'center' }}>
            Unsaved changes — nothing reaches your clients until you save.
          </p>
        )}
        {saveError && (
          <p style={{ fontFamily: 'Inter', fontSize: 11.5, color: colors.error, margin: '-6px 0 0', textAlign: 'center' }}>{saveError}</p>
        )}
      </div>
    </div>
  );
}

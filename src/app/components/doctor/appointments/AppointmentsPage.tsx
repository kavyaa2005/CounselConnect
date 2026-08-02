import { useState, useRef, useEffect } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, Video, Check, X, Calendar, Clock, MoreVertical, MessageSquare, Download, Sparkles } from 'lucide-react';
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

/* ── Reschedule panel ───────────────────────────────────────────────
   Appointments are stored with human dates ("December 3, 2026") because the
   patient-facing booking flow writes them that way. The native date input
   needs ISO, so this converts in both directions.                       */
function toISO(dateLabel: string, fallback?: string) {
  const d = new Date(fallback || dateLabel);
  if (isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function fromISO(iso: string) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function RescheduleBox({ appt, busy, onSave, onCancel }: any) {
  const { c } = useTheme();
  const [date, setDate] = useState(toISO(appt.date, (appt as any).dateTime));
  const [time, setTime] = useState(appt.time || '');
  const [type, setType] = useState(appt.type === 'Chat' ? 'chat' : 'video');
  const [err, setErr] = useState('');

  const save = () => {
    if (!date) return setErr('Pick a date');
    if (!time.trim()) return setErr('Pick a time');
    const when = new Date(`${fromISO(date)} ${time}`);
    if (isNaN(when.getTime())) return setErr('That time could not be read — try "2:00 PM"');
    setErr('');
    onSave(fromISO(date), time, type);
  };

  const field: any = {
    width: '100%', padding: '8px 10px', borderRadius: 9,
    border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12.5,
    color: c.textPrimary, background: c.white, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: 13, borderRadius: 12, background: c.veryLightSage, border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: c.textPrimary }}>Reschedule session</div>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={field} />
      <input value={time} onChange={e => setTime(e.target.value)} placeholder="2:00 PM" style={field} />
      <select value={type} onChange={e => setType(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
        <option value="video">Video session</option>
        <option value="chat">Chat session</option>
      </select>
      {err && <div style={{ fontSize: 11, color: c.error }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <button disabled={busy} onClick={save} style={{ padding: '8px', borderRadius: 9, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 12, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} style={{ padding: '8px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', color: c.textSecondary, fontFamily: 'Inter', fontSize: 12, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── New appointment modal ──────────────────────────────────────────
   A doctor can only schedule for a patient already related to them, so the
   picker is populated from /doctor/patients rather than a free-text field. */
function NewAppointmentModal({ onClose, onCreated }: any) {
  const { c, sh } = useTheme();
  const [patients, setPatients] = useState<any[]>([]);
  const [form, setForm] = useState({ patientId: '', date: '', time: '10:00 AM', sessionType: 'video', price: '', reason: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    api.get('/doctor/patients')
      .then(r => {
        const list = r.data.patients || [];
        setPatients(list);
        setForm(f => ({ ...f, patientId: f.patientId || list[0]?.id || '' }));
      })
      .catch(() => {});
  }, []);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    setServerError('');
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.patientId) e.patientId = 'Choose a patient';
    if (!form.date) e.date = 'Pick a date';
    if (!form.time.trim()) e.time = 'Enter a time';
    if (form.price && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)) {
      e.price = 'Fee must be a number';
    }
    if (form.date && form.time) {
      const when = new Date(`${fromISO(form.date)} ${form.time}`);
      if (isNaN(when.getTime())) e.time = 'Try a time like "2:00 PM"';
      else if (when.getTime() < Date.now()) e.date = 'That is in the past';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await api.post('/doctor/appointments', {
        patientId: form.patientId,
        date: fromISO(form.date),
        time: form.time,
        sessionType: form.sessionType,
        price: form.price ? Number(form.price) : undefined,
        reason: form.reason,
      });
      onCreated(`Session booked with ${res.data.appointment.patient?.name || 'patient'}`);
    } catch (err: any) {
      setServerError(err.message || 'Could not schedule that session');
    } finally { setSaving(false); }
  };

  const field = (bad?: string): any => ({
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1.5px solid ${bad ? c.error : c.border}`,
    fontFamily: 'Inter', fontSize: 13, color: c.textPrimary,
    background: c.white, outline: 'none', boxSizing: 'border-box',
  });
  const label = (t: string) => (
    <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: c.textPrimary, marginBottom: 6 }}>{t}</div>
  );
  const err = (m?: string) => m
    ? <div style={{ fontSize: 11, color: c.error, marginTop: 5 }}>{m}</div>
    : null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,32,27,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 460, maxHeight: '88vh', overflowY: 'auto', background: c.white, borderRadius: 20, padding: 26, boxShadow: sh.modal, fontFamily: 'Inter' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: c.textPrimary, margin: 0 }}>New Appointment</h3>
            <p style={{ fontSize: 12, color: c.textMuted, margin: '3px 0 0' }}>Schedule a session with one of your patients</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', color: c.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>

        {!patients.length && (
          <div style={{ padding: 14, borderRadius: 10, background: c.background, fontSize: 12.5, color: c.textSecondary, lineHeight: 1.6 }}>
            You have no patients yet. Once someone books with you or starts a conversation, you'll be able to schedule sessions for them here.
          </div>
        )}

        {!!patients.length && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
              {label('Patient')}
              <select value={form.patientId} onChange={e => set('patientId', e.target.value)} style={{ ...field(errors.patientId), cursor: 'pointer' }}>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {err(errors.patientId)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {label('Date')}
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={field(errors.date)} />
                {err(errors.date)}
              </div>
              <div>
                {label('Time')}
                <input value={form.time} onChange={e => set('time', e.target.value)} placeholder="10:00 AM" style={field(errors.time)} />
                {err(errors.time)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                {label('Format')}
                <select value={form.sessionType} onChange={e => set('sessionType', e.target.value)} style={{ ...field(), cursor: 'pointer' }}>
                  <option value="video">Video session</option>
                  <option value="chat">Chat session</option>
                </select>
              </div>
              <div>
                {label('Fee (optional)')}
                <input value={form.price} onChange={e => set('price', e.target.value)} placeholder="Your standard rate" style={field(errors.price)} />
                {err(errors.price)}
              </div>
            </div>

            <div>
              {label('Session focus (optional)')}
              <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. Review sleep hygiene plan" style={field()} />
            </div>

            {serverError && (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFEBEE', border: '1px solid #FFCDD2', fontSize: 12, color: c.error }}>
                {serverError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 9, marginTop: 4 }}>
              <button disabled={saving} onClick={submit} style={{ flex: 1, padding: '11px', borderRadius: 11, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 13.5, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Scheduling…' : 'Schedule Session'}
              </button>
              <button onClick={onClose} style={{ padding: '11px 20px', borderRadius: 11, border: `1px solid ${c.border}`, background: 'transparent', color: c.textSecondary, fontFamily: 'Inter', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
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
  const [showNew, setShowNew] = useState(false);
  // First of the month currently on screen, plus the day the user clicked.
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [calDay, setCalDay] = useState<string | null>(null);
  const [calScope, setCalScope] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [summaryFor, setSummaryFor] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3200);
  };

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
          reason: a.reason || '',
          mode: a.mode || 'online',
          documents: a.documents || [],
          rejectionReason: a.rejectionReason || '',
          aiSummary: a.aiSummary || null,
          createdAt: a.createdAt,
        } as Appointment & { dateTime: string };
      }));
    }).catch(() => {});
  };
  useEffect(() => { loadAppointments(); }, []);

  const dayKey = (d: Date) => {
    // Local-date key: toISOString() would shift by the timezone offset and
    // put late-evening sessions on the wrong day.
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
  };

  // How many live sessions fall on each date — drives the dots in the grid.
  const byDay = appointments.reduce((acc: Record<string, number>, a: any) => {
    if (a.status === 'cancelled' || !a.dateTime) return acc;
    const k = dayKey(new Date(a.dateTime));
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const monthLabel = calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstWeekday = calMonth.getDay();
  const daysInMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  const todayKey = dayKey(new Date());
  const shiftMonth = (n: number) => {
    setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1));
    setCalDay(null);
  };

  // Sessions listed under the grid, scoped to the selected day / its week / the month.
  const scopedSessions = (() => {
    const anchorKey = calDay || todayKey;
    const anchor = new Date(`${anchorKey}T00:00:00`);
    return appointments
      .filter((a: any) => a.status !== 'cancelled' && a.dateTime)
      .filter((a: any) => {
        const d = new Date(a.dateTime);
        if (calScope === 'Day') return dayKey(d) === anchorKey;
        if (calScope === 'Month') {
          return d.getMonth() === calMonth.getMonth() && d.getFullYear() === calMonth.getFullYear();
        }
        const start = new Date(anchor); start.setDate(anchor.getDate() - anchor.getDay());
        const end = new Date(start); end.setDate(start.getDate() + 7);
        return d >= start && d < end;
      })
      .sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .map((a: any, i: number) => {
        const d = new Date(a.dateTime);
        const end = new Date(d.getTime() + 50 * 60000);
        const fmt = (x: Date) => `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
        return {
          id: a.id,
          time: fmt(d), end: fmt(end),
          patient: a.patient,
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          status: a.status,
          color: SESSION_COLORS[i % SESSION_COLORS.length],
        };
      });
  })();

  const scopeLabel = calScope === 'Day'
    ? (calDay ? new Date(`${calDay}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : "Today's sessions")
    : calScope === 'Week' ? 'This week' : monthLabel;

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

  const filters = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

  // Requests waiting on a decision — oldest first, they've waited longest.
  const requests = appointments
    .filter((a: any) => a.status === 'pending')
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const filtered = appointments.filter(a => {
    const matchesFilter = activeFilter === 'all' || a.status === activeFilter;
    const matchesSearch = a.patient.toLowerCase().includes(search.toLowerCase()) || a.issue.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedAppt = appointments.find(a => a.id === selected);

  const updateStatus = (id: string, status: AppointmentStatus) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    // 'rejected' is now a real status the client is told about — it used to be
    // silently stored as 'cancelled', which lost the distinction entirely.
    api.put(`/doctor/appointments/${id}`, { status })
      .then(() => loadAppointments())
      .catch((e: any) => flash(e.message || 'Could not update', true));
  };

  /** Accepts a request — the client can only pay once this happens. */
  const acceptRequest = async (id: string) => {
    setBusy(true);
    try {
      await api.put(`/doctor/appointments/${id}/accept`);
      flash('Session confirmed — the client has been notified');
      loadAppointments();
    } catch (e: any) { flash(e.message || 'Could not accept', true); }
    finally { setBusy(false); }
  };

  /** Declines a request, optionally telling the client why. */
  const rejectRequest = async (id: string, reason: string) => {
    setBusy(true);
    try {
      await api.put(`/doctor/appointments/${id}/reject`, { reason });
      flash('Request declined');
      setRejecting(null);
      setRejectReason('');
      loadAppointments();
    } catch (e: any) { flash(e.message || 'Could not decline', true); }
    finally { setBusy(false); }
  };

  /** Generates the AI summary for one session. */
  const generateSummary = async (id: string) => {
    setSummaryBusy(true);
    setSummaryFor(id);
    try {
      const res = await api.post(`/doctor/appointments/${id}/summarise`);
      setSummary(res.data.summary);
      flash('Session summary generated');
      loadAppointments();
    } catch (e: any) {
      flash(e.message || 'Could not summarise', true);
      setSummaryFor(null);
    } finally { setSummaryBusy(false); }
  };

  /** Ticks a follow-up action off — this is a worklist, not a suggestion. */
  const toggleAction = async (id: string, index: number) => {
    try {
      const res = await api.put(`/doctor/appointments/${id}/actions/${index}`);
      setSummary(res.data.summary);
    } catch (e: any) { flash(e.message || 'Could not update', true); }
  };

  const downloadSummary = async (id: string) => {
    try {
      flash('Preparing summary…');
      await api.download(`/doctor/appointments/${id}/summary.pdf`);
      flash('Summary downloaded');
    } catch (e: any) {
      flash(e.message || 'Could not generate the summary', true);
    }
  };

  const handleMenuAction = (action: string, id: string) => {
    if (action === 'cancel') updateStatus(id, 'cancelled');
    if (action === 'download') downloadSummary(id);
    // Edit and reschedule open the same panel — the only editable fields on an
    // appointment are its date, time and format.
    if (action === 'edit' || action === 'reschedule') { setSelected(id); setRescheduling(id); }
  };

  const saveReschedule = async (id: string, date: string, time: string, sessionType: string) => {
    setBusy(true);
    try {
      await api.put(`/doctor/appointments/${id}`, { date, time, sessionType });
      flash('Session rescheduled');
      setRescheduling(null);
      loadAppointments();
    } catch (e: any) {
      flash(e.message || 'Could not reschedule', true);
    } finally { setBusy(false); }
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
          <button
            onClick={() => setShowNew(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 10, border: 'none',
              background: c.primary, color: 'white',
              fontFamily: 'Inter', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
            <Plus size={15} /> New Appointment
          </button>
        </div>


        {/* ── Requests waiting on you ── */}
        {!!requests.length && (
          <div style={{ background: '#FFF9E6', borderRadius: 18, border: '1px solid #FFE082', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: c.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={16} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: c.textPrimary, margin: 0 }}>
                  {requests.length} session request{requests.length === 1 ? '' : 's'} waiting on you
                </p>
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, margin: '2px 0 0' }}>
                  Nothing is charged to the client until you accept.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.map((r: any) => (
                <div key={r.id} style={{ background: c.white, borderRadius: 12, padding: '12px 14px', border: `1px solid ${c.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                      {r.patient.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <p style={{ fontFamily: 'Inter', fontSize: 13.5, fontWeight: 700, color: c.textPrimary, margin: 0 }}>{r.patient}</p>
                      <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: '2px 0 0' }}>
                        {r.date} · {r.time} · {r.mode === 'offline' ? 'In person' : r.type}
                      </p>
                      {r.reason && (
                        <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, margin: '4px 0 0', fontStyle: 'italic' }}>
                          “{r.reason}”
                        </p>
                      )}
                      {!!(r.documents || []).length && (
                        <p style={{ fontFamily: 'Inter', fontSize: 11.5, color: c.primary, margin: '4px 0 0' }}>
                          📎 {r.documents.length} file{r.documents.length === 1 ? '' : 's'} attached
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button disabled={busy} onClick={() => acceptRequest(r.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 9, border: 'none', background: c.success, color: 'white', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                        <Check size={13} /> Accept
                      </button>
                      <button disabled={busy} onClick={() => { setRejecting(rejecting === r.id ? null : r.id); setRejectReason(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 9, border: `1px solid ${c.error}`, background: 'transparent', color: c.error, fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                        <X size={13} /> Decline
                      </button>
                    </div>
                  </div>

                  {rejecting === r.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
                      <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, margin: '0 0 6px' }}>
                        Why? The client will see this — optional, but a reason is kinder than silence.
                      </p>
                      <input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="e.g. Fully booked that morning — try Thursday"
                        style={{ width: '100%', padding: '9px 11px', borderRadius: 9, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.white, outline: 'none', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
                        <button disabled={busy} onClick={() => rejectRequest(r.id, rejectReason)}
                          style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: c.error, color: 'white', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
                          {busy ? 'Declining…' : 'Confirm decline'}
                        </button>
                        <button onClick={() => setRejecting(null)}
                          style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${c.border}`, background: 'transparent', color: c.textSecondary, fontFamily: 'Inter', fontSize: 12.5, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                                onClick={(e) => { e.stopPropagation(); acceptRequest(appt.id); }}
                                title="Accept"
                                style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#E8F5E9', color: c.success, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelected(appt.id); setRejecting(appt.id); }}
                                title="Decline"
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
                <button onClick={() => shiftMonth(-1)} title="Previous month" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textSecondary }}>
                  <ChevronLeft size={15} />
                </button>
                <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 15, color: c.textPrimary, minWidth: 130, textAlign: 'center' }}>{monthLabel}</span>
                <button onClick={() => shiftMonth(1)} title="Next month" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textSecondary }}>
                  <ChevronRight size={15} />
                </button>
                <button
                  onClick={() => { const d = new Date(); setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setCalDay(null); }}
                  style={{ marginLeft: 4, padding: '5px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, cursor: 'pointer' }}>
                  Today
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['Day', 'Week', 'Month'] as const).map(v => (
                  <button key={v} onClick={() => setCalScope(v)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${calScope === v ? c.primary : c.border}`, fontFamily: 'Inter', fontSize: 12, cursor: 'pointer', background: calScope === v ? c.primary : 'transparent', color: calScope === v ? 'white' : c.textSecondary }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: c.textMuted, padding: '6px 0' }}>{d}</div>
              ))}
              {/* Blanks so the 1st lands on the right weekday */}
              {Array.from({ length: firstWeekday }, (_, i) => <div key={`empty-${i}`} style={{ height: 70 }} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const key = dayKey(new Date(calMonth.getFullYear(), calMonth.getMonth(), day));
                const isToday = key === todayKey;
                const count = byDay[key] || 0;
                const isSelected = calDay === key;
                return (
                  <div
                    key={day}
                    onClick={() => { setCalDay(isSelected ? null : key); setCalScope('Day'); }}
                    title={count ? `${count} session${count === 1 ? '' : 's'}` : 'No sessions'}
                    style={{
                      height: 70, padding: 7, borderRadius: 9, cursor: 'pointer',
                      background: isToday ? c.primary : isSelected ? c.veryLightSage : count ? `${c.primary}0C` : 'transparent',
                      border: isSelected && !isToday ? `1.5px solid ${c.primary}` : `1px solid ${count || isToday ? c.border : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: isToday || count ? 700 : 500, color: isToday ? 'white' : c.textPrimary }}>{day}</div>
                    {count > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* One bar per session, capped at three */}
                        {Array.from({ length: Math.min(count, 3) }, (_, k) => (
                          <div key={k} style={{ height: 3, borderRadius: 2, background: isToday ? 'rgba(255,255,255,0.6)' : c.primary }} />
                        ))}
                        {count > 3 && (
                          <span style={{ fontSize: 9, color: isToday ? 'rgba(255,255,255,0.8)' : c.textMuted }}>+{count - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{scopeLabel}</div>
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted }}>
                  {scopedSessions.length} session{scopedSessions.length === 1 ? '' : 's'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {!scopedSessions.length && (
                  <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Inter', fontSize: 13, color: c.textMuted }}>
                    Nothing booked for this {calScope.toLowerCase()}.
                  </div>
                )}
                {scopedSessions.map((sess: any) => (
                  <div
                    key={sess.id}
                    onClick={() => { setView('list'); setSelected(sess.id); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, cursor: 'pointer', background: `${sess.color}10`, borderLeft: `3px solid ${sess.color}` }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: sess.color, width: 80, flexShrink: 0 }}>{sess.time}–{sess.end}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, flex: 1 }}>{sess.patient}</div>
                    {calScope !== 'Day' && <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted }}>{sess.date}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <NewAppointmentModal
          onClose={() => setShowNew(false)}
          onCreated={(msg: string) => { setShowNew(false); flash(msg); loadAppointments(); }}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '11px 20px', borderRadius: 12, zIndex: 400,
          background: toast.bad ? '#FFEBEE' : c.primary,
          color: toast.bad ? c.error : 'white',
          border: toast.bad ? `1px solid #FFCDD2` : 'none',
          fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
        }}>
          {toast.text}
        </div>
      )}

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
            {(selectedAppt as any).reason && (
              <div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, marginBottom: 5 }}>Client's focus</div>
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, lineHeight: 1.5, padding: '9px 11px', background: c.veryLightSage, borderRadius: 9, fontStyle: 'italic' }}>
                  “{(selectedAppt as any).reason}”
                </div>
              </div>
            )}

            {!!((selectedAppt as any).documents || []).length && (
              <div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, marginBottom: 5 }}>Client attachments</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(selectedAppt as any).documents.map((d: any) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 8, background: c.background }}>
                      <Download size={11} color={c.primary} />
                      <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selectedAppt as any).rejectionReason && (
              <div>
                <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, marginBottom: 5 }}>You declined because</div>
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.error, lineHeight: 1.5, padding: '9px 11px', background: '#FFEBEE', borderRadius: 9 }}>
                  {(selectedAppt as any).rejectionReason}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, marginBottom: 5 }}>Booking</div>
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, lineHeight: 1.5, padding: '9px 11px', background: c.background, borderRadius: 9 }}>{selectedAppt.notes}</div>
            </div>

            {/* ── AI session summary ── */}
            <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: c.textPrimary }}>Session summary</span>
                <button
                  onClick={() => generateSummary(selectedAppt.id)}
                  disabled={summaryBusy}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 11.5, fontWeight: 600, cursor: summaryBusy ? 'wait' : 'pointer' }}>
                  <Sparkles size={11} /> {summaryBusy && summaryFor === selectedAppt.id ? 'Reading…' : (selectedAppt as any).aiSummary ? 'Regenerate' : 'Generate'}
                </button>
              </div>

              {(() => {
                // Prefer the freshly generated one, else whatever is stored
                const sum = (summaryFor === selectedAppt.id && summary)
                  || (selectedAppt as any).aiSummary;
                if (!sum) {
                  return (
                    <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, lineHeight: 1.6, margin: 0 }}>
                      Built from this session's notes, the client's mood either side of it, and what they asked to work on.
                    </p>
                  );
                }
                return (
                  <div>
                    <div style={{ padding: '11px 12px', borderRadius: 10, background: c.veryLightSage, marginBottom: 10 }}>
                      <p style={{ fontFamily: 'Inter', fontSize: 12.5, color: c.textSecondary, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                        {sum.summary}
                      </p>
                    </div>

                    {(sum.moodBefore != null || sum.moodAfter != null) && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        {[['Before', sum.moodBefore], ['After', sum.moodAfter]].map(([lab, val]: any) => (
                          <div key={lab} style={{ flex: 1, padding: '8px 10px', borderRadius: 9, background: c.background, textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 800, color: c.primary }}>
                              {val != null ? `${val}/10` : '—'}
                            </div>
                            <div style={{ fontFamily: 'Inter', fontSize: 10.5, color: c.textMuted }}>Mood {lab.toLowerCase()}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!!sum.actions?.length && (
                      <>
                        <p style={{ fontFamily: 'Inter', fontSize: 11.5, fontWeight: 700, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 6px' }}>
                          Follow-up
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {sum.actions.map((a: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => toggleAction(selectedAppt.id, i)}
                              style={{
                                display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left',
                                padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                                border: `1px solid ${a.priority === 'high' && !a.done ? '#FFCDD2' : c.border}`,
                                background: a.done ? c.background : a.priority === 'high' ? '#FFF5F5' : c.white,
                                opacity: a.done ? 0.6 : 1,
                              }}>
                              <span style={{
                                width: 15, height: 15, borderRadius: 4, flexShrink: 0, marginTop: 1,
                                border: `1.5px solid ${a.done ? c.success : c.border}`,
                                background: a.done ? c.success : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {a.done && <Check size={10} color="white" />}
                              </span>
                              <span style={{ flex: 1 }}>
                                <span style={{ display: 'block', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600, color: c.textPrimary, textDecoration: a.done ? 'line-through' : 'none' }}>
                                  {a.label}
                                </span>
                                <span style={{ display: 'block', fontFamily: 'Inter', fontSize: 11, color: c.textMuted, marginTop: 1 }}>
                                  {a.reason}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {rescheduling === selectedAppt.id && (
              <RescheduleBox
                appt={selectedAppt}
                busy={busy}
                onCancel={() => setRescheduling(null)}
                onSave={(d: string, t: string, st: string) => saveReschedule(selectedAppt.id, d, t, st)}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <button onClick={() => onNavigate('video')} style={{ width: '100%', padding: '10px', borderRadius: 11, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Join Video Session
              </button>
              <button onClick={() => downloadSummary(selectedAppt.id)} style={{ width: '100%', padding: '9px', borderRadius: 11, border: `1px solid ${c.border}`, background: 'transparent', color: c.textSecondary, fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={13} /> Download Summary (PDF)
              </button>
              <button onClick={() => setRescheduling(rescheduling === selectedAppt.id ? null : selectedAppt.id)} style={{ width: '100%', padding: '9px', borderRadius: 11, border: `1px solid ${c.border}`, background: 'transparent', color: c.textSecondary, fontFamily: 'Inter', fontSize: 12, cursor: 'pointer' }}>
                {rescheduling === selectedAppt.id ? 'Close reschedule' : 'Reschedule'}
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

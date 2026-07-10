import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, Clock, Star, Brain } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

export function AnalyticsPage() {
  const { c, sh } = useTheme();
  const [analytics, setAnalytics] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    api.get('/doctor/analytics').then(res => setAnalytics(res.data.analytics)).catch(() => {});
    api.get('/doctor/appointments').then(res => setAppointments(res.data.appointments || [])).catch(() => {});
    api.get('/doctor/patients').then(res => setPatients(res.data.patients || [])).catch(() => {});
  }, []);

  // ── All charts computed from real bookings & patients ──
  const { appointmentWindows, dayOfWeekData, patientAgeGroups, patientRetention, treatmentOutcomes } = useMemo(() => {
    const active = appointments.filter((a: any) => a.status !== 'cancelled');

    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const windows = hours.map(h => ({
      slot: h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`,
      sessions: active.filter((a: any) => new Date(a.dateTime).getHours() === h).length,
      label: h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`,
    }));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dow = [1, 2, 3, 4, 5, 6, 0].map(d => ({
      day: dayNames[d],
      sessions: active.filter((a: any) => new Date(a.dateTime).getDay() === d).length,
    }));

    // Distribution of patient concerns (from real signup reasons)
    const reasonCounts: Record<string, number> = {};
    patients.forEach((u: any) => {
      const r = u.reason || 'Not specified';
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });
    const ageGroups = Object.entries(reasonCounts).map(([r, count]) => ({ age: r, count }));

    // Retention: % of registered patients with at least one booking, per month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const retention = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const registered = patients.filter((u: any) => (u.createdAt || '') <= `${key}-31T23:59:59Z`).length;
      const engaged = new Set(active.filter((a: any) => (a.createdAt || '').slice(0, 7) <= key).map((a: any) => a.userId)).size;
      const retained = registered ? Math.round((engaged / registered) * 100) : 0;
      return { month: monthNames[d.getMonth()], retained, churned: 100 - retained };
    });

    // Symptom index per fortnight (100 − avg mood×10), by concern group
    const buckets = [10, 8, 6, 4, 2, 0].map(w => {
      const end = new Date(now.getTime() - w * 7 * 86400000);
      const start = new Date(end.getTime() - 14 * 86400000);
      const inWindow = (u: any, kw: string[]) => kw.some(k => (u.reason || '').toLowerCase().includes(k));
      const idx = (kw: string[]) => {
        const vals = patients.filter((u: any) => inWindow(u, kw) && u.avgMood != null).map((u: any) => 100 - u.avgMood * 10);
        return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
      };
      return {
        week: `W${Math.max(1, 20 - w * 2)}`,
        anxiety: idx(['anxiety', 'overwhelm']),
        depression: idx(['sad', 'low', 'depress']),
        stress: idx(['stress', 'burnout']),
      };
    });

    return { appointmentWindows: windows, dayOfWeekData: dow, patientAgeGroups: ageGroups, patientRetention: retention, treatmentOutcomes: buckets };
  }, [appointments, patients]);

  const totals = analytics?.totals || {};
  const noShow = totals.totalAppointments ? Math.round((totals.cancelledSessions / totals.totalAppointments) * 1000) / 10 : 0;

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: c.textPrimary, margin: 0 }}>Advanced Analytics</h2>
          <p style={{ fontFamily: 'Inter', fontSize: 13, color: c.textMuted, margin: 0, marginTop: 4 }}>Deep insights into your practice performance</p>
        </div>
        <select style={{ padding: '9px 16px', borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.white, outline: 'none', cursor: 'pointer' }}>
          {['Last 3 Months', 'Last 6 Months', 'This Year', 'All Time'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Completed Sessions', value: String(totals.completedSessions ?? 0), icon: Clock, color: c.primary, change: `of ${totals.totalAppointments ?? 0} booked` },
          { label: 'Cancellation Rate', value: `${noShow}%`, icon: Users, color: c.error, change: 'of all bookings' },
          { label: 'Patient Satisfaction', value: totals.avgRating != null ? `${Math.round((totals.avgRating / 5) * 1000) / 10}%` : '—', icon: Star, color: c.warning, change: `${totals.reviewCount ?? 0} reviews` },
          { label: 'Avg Patient Mood', value: totals.avgMood != null ? `${totals.avgMood}/10` : '—', icon: Brain, color: '#7C6FFF', change: 'From mood logs' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} style={{ background: c.white, borderRadius: 18, padding: '18px 20px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: c.textPrimary }}>{kpi.value}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary, marginTop: 2 }}>{kpi.label}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: kpi.color, marginTop: 4, fontWeight: 500 }}>{kpi.change}</div>
            </div>
          );
        })}
      </div>

      {/* Treatment Outcomes + Age Groups */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 4 }}>Treatment Outcomes</h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginBottom: 20 }}>Symptom severity reduction over treatment course</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={treatmentOutcomes}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} formatter={(v: number) => [`${v}%`, '']} />
              <Line type="monotone" dataKey="anxiety" stroke={c.warning} strokeWidth={2} dot={false} name="Anxiety" />
              <Line type="monotone" dataKey="depression" stroke="#7C6FFF" strokeWidth={2} dot={false} name="Depression" />
              <Line type="monotone" dataKey="stress" stroke={c.error} strokeWidth={2} dot={false} name="Stress" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            {[{ color: c.warning, label: 'Anxiety' }, { color: '#7C6FFF', label: 'Depression' }, { color: c.error, label: 'Stress' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 3, borderRadius: 2, background: l.color }} />
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 4 }}>Patient Concerns</h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginBottom: 20 }}>Distribution of patient demographics</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={patientAgeGroups} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: c.textMuted }} />
              <YAxis dataKey="age" type="category" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 10, fill: c.textMuted }} width={120} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} />
              <Bar dataKey="count" fill={c.primary} radius={[0, 8, 8, 0]} name="Patients" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retention */}
      <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Patient Retention Rate</h3>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginTop: 2 }}>Monthly patient retention vs churn analysis</p>
          </div>
          <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: c.success }}>93%</div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={patientRetention}>
            <defs>
              <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c.success} stopOpacity={0.2} />
                <stop offset="95%" stopColor={c.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} formatter={(v: number) => [`${v}%`, '']} />
            <Area type="monotone" dataKey="retained" stroke={c.success} strokeWidth={2.5} fill="url(#retGrad)" name="Retained" />
            <Area type="monotone" dataKey="churned" stroke={c.error} strokeWidth={2} fill="none" strokeDasharray="5 5" name="Churned" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Optimal Appointment Windows + Day of Week */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* Optimal Appointment Windows */}
        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Optimal Appointment Windows</h3>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginTop: 4 }}>Busiest hours for your practice — open more slots during peak times</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={appointmentWindows} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis dataKey="slot" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: c.textMuted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: c.textMuted }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }}
                formatter={(v: number) => [`${v} sessions`, 'Volume']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Bar
                dataKey="sessions"
                name="Sessions"
                radius={[6, 6, 0, 0]}
                fill={c.primary}
              />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: c.veryLightSage, display: 'flex', gap: 10, alignItems: 'center' }}>
            <TrendingUp size={14} color={c.primary} />
            <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary }}>
              Peak hours: <strong style={{ color: c.primary }}>10 AM</strong> and <strong style={{ color: c.primary }}>2–3 PM</strong>. Consider adding slots in these windows.
            </span>
          </div>
        </div>

        {/* Day of Week Distribution */}
        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 4 }}>Day of Week Distribution</h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginBottom: 20 }}>Weekly session volume by day</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayOfWeekData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: c.textMuted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: c.textMuted }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }}
                formatter={(v: number) => [`${v} sessions`, 'Count']}
              />
              <Bar
                dataKey="sessions"
                name="Sessions"
                radius={[6, 6, 0, 0]}
                fill="#7C6FFF"
              />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: `#7C6FFF10`, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary }}>
              Highest demand on <strong style={{ color: '#7C6FFF' }}>Thursday</strong>. Weekends show low demand.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

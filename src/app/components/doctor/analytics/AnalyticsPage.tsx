import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, Clock, Star, Brain } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

/** How many trailing months each range option covers. */
const RANGE_MONTHS: Record<string, number> = {
  'Last 3 Months': 3, 'Last 6 Months': 6, 'This Year': 12, 'All Time': 600,
};

export function AnalyticsPage() {
  const { c, sh } = useTheme();
  const [analytics, setAnalytics] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [moodSeries, setMoodSeries] = useState<any[]>([]);
  // The range selector used to be a decorative dropdown wired to nothing.
  const [range, setRange] = useState('Last 6 Months');

  useEffect(() => {
    api.get('/doctor/analytics').then(res => {
      setAnalytics(res.data.analytics);
      setMoodSeries(res.data.analytics?.moodTrend || []);
    }).catch(() => {});
    api.get('/doctor/appointments').then(res => setAppointments(res.data.appointments || [])).catch(() => {});
    api.get('/doctor/patients').then(res => setPatients(res.data.patients || [])).catch(() => {});
  }, []);

  // ── All charts computed from real bookings & patients ──
  const {
    appointmentWindows, dayOfWeekData, patientConcerns,
    patientRetention, retentionNow, moodOverTime, peakHours, busiestDay, inRangeCount,
  } = useMemo(() => {
    const now = new Date();
    const months = RANGE_MONTHS[range] ?? 6;
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const active = appointments.filter((a: any) =>
      a.status !== 'cancelled' && new Date(a.dateTime) >= from);

    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const windows = hours.map(h => ({
      slot: h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`,
      sessions: active.filter((a: any) => new Date(a.dateTime).getHours() === h).length,
    }));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dow = [1, 2, 3, 4, 5, 6, 0].map(d => ({
      day: dayNames[d],
      sessions: active.filter((a: any) => new Date(a.dateTime).getDay() === d).length,
    }));

    // Named after what it is. The card was titled "Patient Concerns" but the
    // subtitle said "demographics" and the field was called `age` — it has
    // always been the presenting reason people gave at sign-up.
    const reasonCounts: Record<string, number> = {};
    patients.forEach((u: any) => {
      const r = u.reason || 'Not specified';
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    });
    const concerns = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // Retention: share of registered patients who had booked by that month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const span = Math.min(months, 12);
    const retention = Array.from({ length: span }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (span - 1 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const registered = patients.filter((u: any) => (u.createdAt || '') <= `${key}-31T23:59:59Z`).length;
      const engaged = new Set(
        appointments.filter((a: any) => a.status !== 'cancelled' && (a.createdAt || '').slice(0, 7) <= key)
          .map((a: any) => a.userId)
      ).size;
      const retained = registered ? Math.round((Math.min(engaged, registered) / registered) * 100) : 0;
      return { month: monthNames[d.getMonth()], retained, churned: 100 - retained };
    });

    // Headline was the literal string "93%". It's the latest real figure.
    const latest = retention.length ? retention[retention.length - 1].retained : null;

    // Replaces the old "Treatment Outcomes" chart. That one bucketed by
    // fortnight but computed every bucket from the SAME whole-history average,
    // so all three lines were dead flat and the "symptom reduction over the
    // treatment course" it claimed to show did not exist in the numbers. This
    // is the real monthly mood average across the caseload.
    const moodLine = (analytics?.moodTrend || [])
      .slice(-span)
      .map((m: any) => ({ month: m.month, mood: m.avg == null ? null : Math.round(m.avg * 10) }));

    const busiest = windows.reduce((best, w) => (w.sessions > best.sessions ? w : best), windows[0] || { slot: '', sessions: 0 });
    const peaks = windows.filter(w => w.sessions > 0 && w.sessions === busiest.sessions).map(w => w.slot);
    const topDay = dow.reduce((best, d) => (d.sessions > best.sessions ? d : best), dow[0] || { day: '', sessions: 0 });

    return {
      appointmentWindows: windows,
      dayOfWeekData: dow,
      patientConcerns: concerns,
      patientRetention: retention,
      retentionNow: latest,
      moodOverTime: moodLine,
      peakHours: peaks,
      busiestDay: topDay,
      inRangeCount: active.length,
    };
  }, [appointments, patients, analytics, range, moodSeries]);

  const totals = analytics?.totals || {};
  const noShow = totals.totalAppointments ? Math.round((totals.cancelledSessions / totals.totalAppointments) * 1000) / 10 : 0;

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: c.textPrimary, margin: 0 }}>Advanced Analytics</h2>
          <p style={{ fontFamily: 'Inter', fontSize: 13, color: c.textMuted, margin: 0, marginTop: 4 }}>
            {inRangeCount} session{inRangeCount === 1 ? '' : 's'} in {range.toLowerCase()}
          </p>
        </div>
        <select
          value={range}
          onChange={e => setRange(e.target.value)}
          style={{ padding: '9px 16px', borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.white, outline: 'none', cursor: 'pointer' }}>
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
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 4 }}>Caseload Mood Over Time</h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginBottom: 20 }}>
            Monthly average across every patient who logged a mood
          </p>
          {moodOverTime.some((m: any) => m.mood != null) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={moodOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} tickFormatter={v => `${v / 10}`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} formatter={(v: number) => [`${(v / 10).toFixed(1)} / 10`, 'Average mood']} />
                <Line type="monotone" dataKey="mood" stroke={c.primary} strokeWidth={2.5} dot={{ fill: c.primary, r: 3 }} connectNulls name="Average mood" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontFamily: 'Inter', fontSize: 12.5, color: c.textMuted, padding: '70px 0', textAlign: 'center' }}>
              No mood entries from your patients in this period yet.
            </p>
          )}
        </div>

        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 4 }}>Patient Concerns</h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginBottom: 20 }}>
            What your patients said they came for
          </p>
          {patientConcerns.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={patientConcerns} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: c.textMuted }} />
                <YAxis dataKey="reason" type="category" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 10, fill: c.textMuted }} width={120} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} formatter={(v: number) => [`${v} patient${v === 1 ? '' : 's'}`, '']} />
                <Bar dataKey="count" fill={c.primary} radius={[0, 8, 8, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontFamily: 'Inter', fontSize: 12.5, color: c.textMuted, padding: '70px 0', textAlign: 'center' }}>No patients yet.</p>
          )}
        </div>
      </div>

      {/* Retention */}
      <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Patient Retention Rate</h3>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginTop: 2 }}>Share of your registered patients who have booked at least once</p>
          </div>
          {/* Was the literal string "93%" — it never moved, whatever the chart
              beneath it showed. This is the most recent real month. */}
          <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: c.success }}>
            {retentionNow != null ? `${retentionNow}%` : '—'}
          </div>
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
            {/* This sentence used to name 10 AM and 2–3 PM no matter when your
                sessions actually fell. */}
            <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary }}>
              {peakHours.length ? (
                <>Busiest: <strong style={{ color: c.primary }}>{peakHours.join(', ')}</strong>. Consider opening more slots in {peakHours.length > 1 ? 'these windows' : 'that window'}.</>
              ) : (
                <>No sessions booked in this period yet.</>
              )}
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
            {/* Previously hardcoded to Thursday. */}
            <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary }}>
              {busiestDay?.sessions ? (
                <>Highest demand on <strong style={{ color: '#7C6FFF' }}>{busiestDay.day}</strong> ({busiestDay.sessions} session{busiestDay.sessions === 1 ? '' : 's'}).</>
              ) : (
                <>Nothing booked in this period yet.</>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

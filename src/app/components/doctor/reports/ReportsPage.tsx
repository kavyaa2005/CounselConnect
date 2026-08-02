import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, FileText, TrendingUp, Users, Calendar, Star, Clock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../ThemeContext';
import { colors as staticColors } from '../colors';
import { api } from '../../../lib/api';

const PIE_COLORS = [staticColors.primary, '#7C6FFF', staticColors.warning, '#E91E8C', staticColors.success, staticColors.textMuted];

export function ReportsPage() {
  const { c: colors, sh: shadows } = useTheme();
  const [analytics, setAnalytics] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [period, setPeriod] = useState('This Month');
  const [exporting, setExporting] = useState('');
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3200);
  };

  const exportAs = async (fmt: string) => {
    setExporting(fmt);
    try {
      // PDF renders a branded document; Excel and CSV share the CSV writer,
      // which Excel opens natively.
      const query = fmt === 'PDF' ? 'pdf' : 'csv';
      await api.download(`/doctor/reports/export?format=${query}&period=${encodeURIComponent(period)}`);
      flash(`${fmt} report downloaded`);
    } catch (e: any) {
      flash(e.message || `Could not export ${fmt}`, true);
    } finally { setExporting(''); }
  };

  useEffect(() => {
    api.get('/doctor/analytics').then(res => setAnalytics(res.data.analytics)).catch(() => {});
    api.get('/doctor/patients').then(res => setPatients(res.data.patients || [])).catch(() => {});
    api.get('/doctor/feedback').then(res => setFeedback(res.data)).catch(() => {});
    api.get('/doctor/appointments').then(res => setAppointments(res.data.appointments || [])).catch(() => {});
  }, []);

  // ── All report data computed from real records ──
  const patientGrowth = analytics?.patientGrowth || [];
  const revenueMonthly = (analytics?.revenue || []).map((r: any, i: number) => ({
    ...r,
    sessions: appointments.filter((a: any) => a.status !== 'cancelled' &&
      new Date(a.dateTime).getMonth() === new Date(new Date().getFullYear(), new Date().getMonth() - (6 - i), 1).getMonth()).length,
  }));
  const recoveryRate = (analytics?.moodTrend || []).map((m: any) => ({ month: m.month, rate: m.avg != null ? m.avg * 10 : 0 }));

  const issueDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    patients.forEach((u: any) => { const r = u.reason || 'Others'; counts[r] = (counts[r] || 0) + 1; });
    const total = patients.length || 1;
    return Object.entries(counts).map(([name, n], i) => ({
      name, value: Math.round((n / total) * 100), color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [patients]);

  const ratingData = (feedback?.distribution || []).map((d: any) => ({
    label: `${d.star} Star${d.star > 1 ? 's' : ''}`,
    count: d.count,
    pct: feedback?.total ? Math.round((d.count / feedback.total) * 100) : 0,
  }));

  const sessionDuration = useMemo(() => {
    const video = appointments.filter((a: any) => a.sessionType === 'video' && a.status !== 'cancelled').length;
    const chat = appointments.filter((a: any) => a.sessionType === 'chat' && a.status !== 'cancelled').length;
    return [
      { duration: 'Video 50 min', count: video },
      { duration: 'Chat 50 min', count: chat },
    ];
  }, [appointments]);

  const totals = analytics?.totals || {};

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '11px 20px', borderRadius: 12, zIndex: 400,
          background: toast.bad ? '#FFEBEE' : colors.primary,
          color: toast.bad ? colors.error : 'white',
          fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
        }}>{toast.text}</div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Reports & Analytics</h2>
          <p style={{ fontFamily: 'Inter', fontSize: 13, color: colors.textMuted, margin: 0, marginTop: 4 }}>Comprehensive overview of your practice performance</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{ padding: '9px 16px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, background: colors.white, outline: 'none', cursor: 'pointer' }}>
            {['This Month', 'Last Month', 'Last 3 Months', 'This Year', 'All Time'].map(o => <option key={o}>{o}</option>)}
          </select>
          {['PDF', 'Excel', 'CSV'].map(fmt => (
            <button
              key={fmt}
              onClick={() => exportAs(fmt)}
              disabled={!!exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 13, color: colors.textSecondary, cursor: exporting ? 'wait' : 'pointer', opacity: exporting && exporting !== fmt ? 0.5 : 1 }}>
              <Download size={14} /> {exporting === fmt ? 'Preparing…' : fmt}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Patients', value: String(totals.totalPatients ?? 0), icon: Users, change: 'registered', color: colors.primary },
          { label: 'Total Sessions', value: String(totals.totalAppointments ?? 0), icon: Calendar, change: 'booked', color: '#7C6FFF' },
          { label: 'Avg Rating', value: totals.avgRating != null ? `${totals.avgRating}★` : '—', icon: Star, change: `${totals.reviewCount ?? 0} reviews`, color: colors.warning },
          { label: 'Avg Mood', value: totals.avgMood != null ? `${totals.avgMood}/10` : '—', icon: TrendingUp, change: 'all patients', color: colors.success },
          { label: 'Revenue (mo)', value: `$${(totals.monthlyRevenue ?? 0).toLocaleString()}`, icon: Clock, change: 'this month', color: '#E91E8C' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} style={{ background: colors.white, borderRadius: 18, padding: '18px 20px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                  <Icon size={16} />
                </div>
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: colors.success, fontWeight: 600, background: '#E8F5E9', padding: '3px 7px', borderRadius: 8 }}>{kpi.change}</span>
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: colors.textPrimary }}>{kpi.value}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Revenue */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Revenue & Sessions</h3>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0, marginTop: 2 }}>Monthly earnings breakdown</p>
            </div>
            <div style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: '#7C6FFF' }}>
              ${revenueMonthly.reduce((sum: number, r: any) => sum + Number(r.revenue || 0), 0).toLocaleString()}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: colors.textMuted }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: colors.textMuted }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: colors.textMuted }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 12 }} formatter={(v: number, name) => [name === 'revenue' ? `$${v.toLocaleString()}` : v, name === 'revenue' ? 'Revenue' : 'Sessions']} />
              <Bar yAxisId="left" dataKey="revenue" fill="#7C6FFF" radius={[6, 6, 0, 0]} opacity={0.85} />
              <Bar yAxisId="right" dataKey="sessions" fill={colors.lightSage} radius={[6, 6, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Issue Distribution Pie */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 4 }}>Issue Distribution</h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0, marginBottom: 16 }}>Most common concerns</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={issueDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                {issueDistribution.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {!issueDistribution.length && (
              <div style={{ fontFamily: 'Inter', fontSize: 12.5, color: colors.textMuted, textAlign: 'center' }}>No patient data yet</div>
            )}
            {issueDistribution.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                  <span style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary }}>{item.name}</span>
                </div>
                <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Patient Growth */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Patient Growth</h3>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={patientGrowth}>
              <defs>
                <linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 10, fill: colors.textMuted }} />
              {/* auto-scaled: a fixed [160,260] window hid every real value */}
              <YAxis domain={['auto', 'auto']} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 10, fill: colors.textMuted }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 11 }} />
              <Area type="monotone" dataKey="patients" stroke={colors.primary} strokeWidth={2} fill="url(#pgGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery Rate */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Recovery Rate</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={recoveryRate}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 10, fill: colors.textMuted }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 10, fill: colors.textMuted }} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 11 }} formatter={(v: number) => [`${v}%`, 'Recovery Rate']} />
              <Line type="monotone" dataKey="rate" stroke={colors.success} strokeWidth={2.5} dot={{ fill: colors.success, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ratings */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Patient Ratings</h3>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 800, color: colors.warning }}>
                {feedback?.avg != null ? feedback.avg : '—'}
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted }}>
                {feedback?.total || 0} review{feedback?.total === 1 ? '' : 's'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!ratingData.length && (
              <div style={{ fontFamily: 'Inter', fontSize: 12.5, color: colors.textMuted, padding: '18px 0', textAlign: 'center' }}>No reviews yet</div>
            )}
            {ratingData.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textSecondary, width: 44 }}>{r.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: colors.border, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, borderRadius: 4, background: colors.warning }} />
                </div>
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, width: 30, textAlign: 'right' }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Session Duration */}
      <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
        <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 20 }}>Session Duration Distribution</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={sessionDuration} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: colors.textMuted }} />
            <YAxis dataKey="duration" type="category" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: colors.textMuted }} width={60} />
            <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 12 }} />
            <Bar dataKey="count" fill={colors.primary} radius={[0, 6, 6, 0]} name="Sessions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

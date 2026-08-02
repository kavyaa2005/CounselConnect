import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, Calendar, CheckCircle, Clock, TrendingUp, Star,
  Plus, Video, FileText, BarChart2, Settings2, ArrowRight, ArrowUp, ArrowDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

function StatCard({ icon, label, value, change, changeLabel, color, onNavigate: _nav }: {
  icon: React.ReactNode; label: string; value: string; change: number;
  changeLabel: string; color: string; onNavigate?: (page: string) => void;
}) {
  const { c, sh } = useTheme();
  const isPositive = change >= 0;
  return (
    <div
      style={{
        background: c.white, borderRadius: 20, padding: '22px', boxShadow: sh.card,
        border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column',
        gap: 14, transition: 'box-shadow 0.2s', cursor: 'default',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = sh.hover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = sh.card; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
          {icon}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, fontFamily: 'Inter',
          color: isPositive ? c.success : c.error, background: isPositive ? '#E8F5E9' : '#FFEBEE',
          padding: '3px 7px', borderRadius: 7,
        }}>
          {isPositive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{Math.abs(change)}%
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'Inter', fontSize: 26, fontWeight: 800, color: c.textPrimary, lineHeight: 1 }}>{value}</div>
        <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, marginTop: 4 }}>{label}</div>
        <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted, marginTop: 2 }}>{changeLabel}</div>
      </div>
    </div>
  );
}

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { c, sh } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [moodByPatient, setMoodByPatient] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get('/doctor/dashboard').then(res => setStats(res.data.stats)).catch(() => {});
    api.get('/doctor/patients').then(res => {
      const map: Record<string, string> = {};
      (res.data.patients || []).forEach((p: any) => { if (p.lastMood) map[p.id] = p.lastMood.emoji; });
      setMoodByPatient(map);
    }).catch(() => {});
  }, []);

  if (!stats) {
    return <div style={{ padding: 32, fontFamily: 'Inter', color: c.textMuted }}>Loading dashboard…</div>;
  }

  // ── All chart & list data comes from the backend ──
  const weeklyAppointments = stats.weeklyAppointments || [];
  const moodData = (stats.moodTrend || []).map((m: any) => ({ month: m.month, avg: m.avg ?? 0 }));
  const revenueData = stats.revenue || [];
  const upcomingAppointments = (stats.todaysAppointments?.length ? stats.todaysAppointments : stats.upcomingAppointments || []).map((a: any) => ({
    id: a.id,
    patient: a.patient?.name || 'Patient',
    time: a.time,
    type: a.sessionType === 'video' ? 'Video' : 'Chat',
    mood: moodByPatient[a.userId] || '🙂',
    status: a.status === 'completed' ? 'confirmed' : a.status === 'confirmed' ? 'confirmed' : 'pending',
  }));
  const recentActivity = stats.recentActivity || [];

  const pieColors: Record<string, string> = {
    Completed: c.primary, Missed: c.error, Upcoming: c.warning, Cancelled: c.textMuted,
  };
  const sessionPie = (stats.sessionPie || []).map((x: any) => ({ ...x, color: pieColors[x.name] || c.textMuted }));

  const totals = stats.totals || {};
  const completionRate = totals.totalAppointments
    ? Math.round((totals.completedSessions / totals.totalAppointments) * 1000) / 10
    : 0;
  const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const growth = stats.patientGrowth || [];
  const patientChange = growth.length >= 2 && growth[growth.length - 2].patients
    ? Math.round(((growth[growth.length - 1].patients - growth[growth.length - 2].patients) / growth[growth.length - 2].patients) * 100)
    : 0;
  const revChange = revenueData.length >= 2 && revenueData[revenueData.length - 2].revenue
    ? Math.round(((revenueData[revenueData.length - 1].revenue - revenueData[revenueData.length - 2].revenue) / revenueData[revenueData.length - 2].revenue) * 100)
    : 0;

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 26 }}>
      {/* Welcome Banner */}
      <div style={{
        background: `linear-gradient(135deg, #2D4A3E 0%, ${c.primary} 100%)`,
        borderRadius: 22, padding: '30px 38px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', right: 120, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginBottom: 7 }}>{greeting}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, marginBottom: 7 }}>{stats.doctor?.name}</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
            You have <strong style={{ color: 'white' }}>{stats.todaysAppointments?.length || 0} session{(stats.todaysAppointments?.length || 0) === 1 ? '' : 's'}</strong> today
            {(stats.pendingRequests || 0) > 0
              ? <> and <strong style={{ color: 'white' }}>{stats.pendingRequests} request{stats.pendingRequests === 1 ? '' : 's'}</strong> waiting on you</>
              : <> — no requests waiting</>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          {[
            { label: 'Today\'s Sessions', value: String(stats.todaysAppointments?.length || 0), icon: Calendar },
            // Requests waiting on a decision — previously this tile didn't exist
            // and the underlying field was counting confirmed sessions.
            { label: 'Pending Requests', value: String(stats.pendingRequests || 0), icon: Clock, alert: (stats.pendingRequests || 0) > 0 },
            { label: 'Total Patients', value: String(stats.totalPatients || 0), icon: Users },
            { label: 'Avg Mood Score', value: totals.avgMood != null ? String(totals.avgMood) : '—', icon: TrendingUp },
            { label: 'Patient Rating', value: totals.avgRating != null ? `${totals.avgRating}★` : '—', icon: Star },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} style={{
                background: (stat as any).alert ? 'rgba(255,214,102,0.28)' : 'rgba(255,255,255,0.12)',
                border: (stat as any).alert ? '1px solid rgba(255,214,102,0.7)' : '1px solid transparent',
                borderRadius: 14, padding: '14px 18px', textAlign: 'center', minWidth: 92,
              }}>
                <Icon size={17} color="rgba(255,255,255,0.8)" style={{ marginBottom: 7 }} />
                <div style={{ fontSize: 21, fontWeight: 800, color: 'white' }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1 }}>{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Requests waiting on a decision */}
      {!!(stats.pendingList || []).length && (
        <div style={{ background: '#FFF9E6', border: '1px solid #FFE082', borderRadius: 18, padding: 18, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color={c.warning} />
              <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: c.textPrimary }}>
                {stats.pendingRequests} session request{stats.pendingRequests === 1 ? '' : 's'} waiting
              </span>
            </div>
            <button onClick={() => onNavigate('appointments')}
              style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: c.warning, color: 'white', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              Review now
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(stats.pendingList || []).map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 10, background: c.white }}>
                <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 600, color: c.textPrimary, flex: 1 }}>
                  {r.patient?.name || 'A patient'}
                </span>
                <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted }}>
                  {r.date} · {r.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        <StatCard icon={<Users size={20} />} label="Total Patients" value={String(totals.totalPatients ?? 0)} change={patientChange} changeLabel="vs last month" color={c.primary} />
        <StatCard icon={<Calendar size={20} />} label="Total Sessions" value={String(totals.totalAppointments ?? 0)} change={revChange} changeLabel="vs last month" color="#7C6FFF" />
        <StatCard icon={<CheckCircle size={20} />} label="Completion Rate" value={`${completionRate}%`} change={0} changeLabel="of all sessions" color={c.success} />
        <StatCard icon={<TrendingUp size={20} />} label="Avg Patient Mood" value={totals.avgMood != null ? `${totals.avgMood}/10` : '—'} change={0} changeLabel="recent entries" color={c.warning} />
      </div>

      {/* Quick Actions */}
      <div style={{ background: c.white, borderRadius: 18, padding: '22px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 14 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'New Appointment', icon: Plus, page: 'appointments', color: c.primary },
            { label: 'Start Session', icon: Video, page: 'video', color: '#7C6FFF' },
            { label: 'View Reports', icon: BarChart2, page: 'reports', color: c.warning },
            { label: 'Add Notes', icon: FileText, page: 'notes', color: '#E91E8C' },
            { label: 'Availability', icon: Settings2, page: 'availability', color: c.success },
          ].map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => onNavigate(action.page)}
                style={{
                  flex: 1, padding: '14px 10px', borderRadius: 12, border: `1px solid ${c.border}`,
                  background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 7, transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = `${action.color}10`;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = action.color;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = c.border;
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${action.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color }}>
                  <Icon size={17} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.textPrimary }}>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div style={{ background: c.white, borderRadius: 18, padding: '22px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Weekly Appointments</h3>
              <p style={{ fontSize: 12, color: c.textMuted, margin: 0, marginTop: 2 }}>This week's session overview</p>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: c.textSecondary }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c.primary }} /> Scheduled
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: c.textSecondary }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c.mintAccent }} /> Completed
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyAppointments} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} />
              <Bar dataKey="appointments" fill={c.primary} radius={[5, 5, 0, 0]} name="Scheduled" />
              <Bar dataKey="completed" fill={c.mintAccent} radius={[5, 5, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: c.white, borderRadius: 18, padding: '22px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 4 }}>Session Status</h3>
          <p style={{ fontSize: 12, color: c.textMuted, margin: 0, marginBottom: 18 }}>This month breakdown</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={sessionPie} cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3} dataKey="value">
                {sessionPie.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {sessionPie.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: c.textSecondary }}>{item.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: c.textPrimary }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ background: c.white, borderRadius: 18, padding: '22px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Patient Mood Improvement</h3>
              <p style={{ fontSize: 12, color: c.textMuted, margin: 0, marginTop: 2 }}>Average mood score across all patients</p>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.primary }}>{totals.avgMood != null ? `${totals.avgMood}/10` : '—'}</div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={moodData}>
              <defs>
                <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={c.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
              <YAxis domain={[4, 10]} axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} />
              <Area type="monotone" dataKey="avg" stroke={c.primary} strokeWidth={2.5} fill="url(#moodGrad)" dot={{ fill: c.primary, r: 4 }} name="Mood Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: c.white, borderRadius: 18, padding: '22px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Revenue Overview</h3>
              <p style={{ fontSize: 12, color: c.textMuted, margin: 0, marginTop: 2 }}>Monthly earnings from sessions</p>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#7C6FFF' }}>{'$' + (totals.monthlyRevenue ?? 0).toLocaleString()}</div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#7C6FFF" strokeWidth={2.5} dot={{ fill: '#7C6FFF', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 18 }}>
        {/* Today's Appointments */}
        <div style={{ background: c.white, borderRadius: 18, padding: '22px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Today's Appointments</h3>
            <button onClick={() => onNavigate('appointments')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: c.primary, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {upcomingAppointments.map(appt => (
              <div key={appt.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 14px', borderRadius: 12, background: c.background, border: `1px solid ${c.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${c.primary}, ${c.lightSage})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 12,
                  }}>
                    {appt.patient.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: c.textPrimary }}>{appt.patient}</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 12, color: c.textSecondary }}>{appt.time} · {appt.type} Session</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ fontSize: 17 }}>{appt.mood}</span>
                  <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'Inter', background: appt.status === 'confirmed' ? c.veryLightSage : '#FFF9E6', color: appt.status === 'confirmed' ? c.primary : c.warning }}>
                    {appt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </span>
                  <button onClick={() => onNavigate('video')} style={{ padding: '5px 11px', borderRadius: 7, border: 'none', background: c.primary, color: 'white', fontFamily: 'Inter', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background: c.white, borderRadius: 18, padding: '22px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 18 }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentActivity.map((item, i) => (
              <div key={item.id} style={{
                display: 'flex', gap: 11,
                paddingBottom: i < recentActivity.length - 1 ? 14 : 0,
                marginBottom: i < recentActivity.length - 1 ? 14 : 0,
                borderBottom: i < recentActivity.length - 1 ? `1px solid ${c.border}` : 'none',
              }}>
                <div style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                <div>
                  <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, lineHeight: 1.4 }}>{item.text}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted, marginTop: 3 }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

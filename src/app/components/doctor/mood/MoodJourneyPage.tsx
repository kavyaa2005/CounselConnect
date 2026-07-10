import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Heart, TrendingUp, TrendingDown, Users, Activity } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const MOOD_EMOJI: Record<number, string> = { 1: '😔', 2: '😐', 3: '🙂', 4: '😊', 5: '😄' };

export function MoodJourneyPage() {
  const { c, sh } = useTheme();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [patientList, setPatientList] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [allMoods, setAllMoods] = useState<any[]>([]);

  // Real patients + their mood entries
  useEffect(() => {
    api.get('/doctor/patients').then(res => {
      const list = res.data.patients || [];
      setPatientList(list);
      setSelectedPatientId(prev => prev || list[0]?.id || null);
      // Aggregate all mood entries across patients for the trend charts
      Promise.all(list.map((u: any) => api.get(`/doctor/patients/${u.id}`).then(r => r.data.patient.moods || []).catch(() => [])))
        .then(results => setAllMoods(results.flat()));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;
    api.get(`/doctor/patients/${selectedPatientId}`).then(res => setDetail(res.data.patient)).catch(() => {});
  }, [selectedPatientId]);

  // Build trend series from real entries (mood value 1–5 → 0–10 scale)
  const { weeklyMood, monthlyMood, yearlyMood, heatmapData, avgMood } = useMemo(() => {
    const byKey = (fmt: (d: Date) => string, keys: string[]) => {
      const buckets: Record<string, number[]> = {};
      allMoods.forEach((m: any) => {
        const k = fmt(new Date(m.createdAt));
        (buckets[k] = buckets[k] || []).push(m.value * 2);
      });
      return keys.map(k => ({ key: k, avg: buckets[k]?.length ? Math.round((buckets[k].reduce((a, b) => a + b, 0) / buckets[k].length) * 10) / 10 : 0 }));
    };
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(now.getDate() - (6 - i)); return d; });
    const weekly = last7.map(d => {
      const key = d.toISOString().slice(0, 10);
      const vals = allMoods.filter((m: any) => (m.createdAt || '').slice(0, 10) === key).map((m: any) => m.value * 2);
      return { day: dayNames[d.getDay()], avg: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0 };
    });
    const monthly = [3, 2, 1, 0].map(w => {
      const end = new Date(now.getTime() - w * 7 * 86400000);
      const start = new Date(end.getTime() - 7 * 86400000);
      const vals = allMoods.filter((m: any) => { const d = new Date(m.createdAt); return d > start && d <= end; }).map((m: any) => m.value * 2);
      return { week: `W${4 - w}`, avg: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0 };
    });
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const vals = allMoods.filter((m: any) => (m.createdAt || '').slice(0, 7) === key).map((m: any) => m.value * 2);
      return { month: monthNames[d.getMonth()], avg: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0 };
    });
    const heatmap = Array.from({ length: 35 }, (_, i) => {
      const d = new Date(now); d.setDate(now.getDate() - (34 - i));
      const key = d.toISOString().slice(0, 10);
      const vals = allMoods.filter((m: any) => (m.createdAt || '').slice(0, 10) === key).map((m: any) => m.value * 2);
      return {
        day: i,
        value: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
        date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      };
    });
    const all = allMoods.map((m: any) => m.value * 2);
    const avg = all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 10) / 10 : null;
    return { weeklyMood: weekly, monthlyMood: monthly, yearlyMood: yearly, heatmapData: heatmap, avgMood: avg };
  }, [allMoods]);

  const patientMoodTimeline = (detail?.moods || []).slice(-6).reverse().map((m: any, i: number) => ({
    id: m.id || i,
    patient: detail?.name,
    date: new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    mood: m.value * 2,
    emoji: m.emoji || MOOD_EMOJI[m.value] || '🙂',
    note: m.notes || m.label || 'No note added',
    stressLevel: Math.max(0, 10 - m.value * 2),
  }));

  const selectedPatient = detail?.name || '';
  const trackedCount = patientList.filter(p => p.moodCount > 0).length;
  const completed = detail?.appointments?.filter((a: any) => a.status === 'completed').length || 0;
  const totalAppts = detail?.appointments?.length || 0;

  const chartData = activeTab === 'weekly' ? weeklyMood : activeTab === 'monthly' ? monthlyMood : yearlyMood;
  const chartKey = activeTab === 'weekly' ? 'day' : activeTab === 'monthly' ? 'week' : 'month';

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Doctor-viewing-patient banner */}
      <div style={{
        background: `linear-gradient(135deg, ${c.primary}15, ${c.veryLightSage})`,
        borderRadius: 16,
        padding: '20px 28px',
        border: `1px solid ${c.mintAccent}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: c.textPrimary, margin: 0 }}>
              Patient Mood Monitoring
            </h2>
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, margin: 0, marginTop: 3 }}>
              Track and analyze your patients' emotional wellbeing across all sessions
            </p>
          </div>
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 20, background: `${c.primary}20`, border: `1px solid ${c.primary}40` }}>
          <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: c.primary }}>Doctor View</span>
        </div>
      </div>

      {/* Header stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {[
          { label: 'Avg Mood Score', value: avgMood != null ? String(avgMood) : '—', icon: Heart, change: 'All patient entries', color: c.primary },
          { label: 'Mood Entries', value: String(allMoods.length), icon: TrendingUp, change: 'Logged in total', color: c.success },
          { label: 'Stress Level', value: avgMood != null ? `${Math.max(0, Math.round((10 - avgMood) * 10) / 10)}/10` : '—', icon: TrendingDown, change: 'Estimated from mood', color: c.warning },
          { label: 'Patients Tracked', value: String(patientList.length), icon: Users, change: `${trackedCount} logging moods`, color: '#7C6FFF' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{ background: c.white, borderRadius: 20, padding: '20px 24px', boxShadow: sh.card, border: `1px solid ${c.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                  <Icon size={18} />
                </div>
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: 24, fontWeight: 800, color: c.textPrimary }}>{stat.value}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, marginTop: 2 }}>{stat.label}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: stat.color, marginTop: 4, fontWeight: 500 }}>{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* Mood Chart + Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Trend Chart */}
        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Mood Journey Trend</h3>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginTop: 2 }}>Average across all patients</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['weekly', 'monthly', 'yearly'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 11, cursor: 'pointer', background: activeTab === tab ? c.primary : 'transparent', color: activeTab === tab ? 'white' : c.textSecondary, textTransform: 'capitalize' }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="moodJourneyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={c.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
              <XAxis dataKey={chartKey} axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 12, background: c.white, color: c.textPrimary }} />
              <Area type="monotone" dataKey="avg" stroke={c.primary} strokeWidth={2.5} fill="url(#moodJourneyGrad)" dot={{ fill: c.primary, r: 4 }} name="Mood Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mood Heatmap */}
        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 4 }}>Mood Heatmap</h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginBottom: 16 }}>June - July 2026</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: 10, color: c.textMuted, paddingBottom: 4 }}>{d}</div>
            ))}
            {heatmapData.map((cell, i) => {
              const intensity = cell.value / 10;
              return (
                <div
                  key={i}
                  title={`${cell.date}: ${cell.value}/10`}
                  style={{
                    height: 24, borderRadius: 4, cursor: 'pointer',
                    background: `rgba(111, 175, 143, ${intensity * 0.85 + 0.05})`,
                    border: `1px solid rgba(111, 175, 143, ${intensity * 0.3 + 0.1})`,
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.15)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
            <span style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>Low</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((o, i) => (
                <div key={i} style={{ width: 14, height: 9, borderRadius: 2, background: `rgba(111, 175, 143, ${o})` }} />
              ))}
            </div>
            <span style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>High</span>
          </div>
        </div>
      </div>

      {/* Patient Timeline */}
      <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0 }}>Individual Mood Timeline</h3>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: '4px 0 0', fontStyle: 'italic' }}>
              Viewing: Patient Reported Mood Data
            </p>
          </div>
          <select
            value={selectedPatientId || ''}
            onChange={e => setSelectedPatientId(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${c.border}`, fontFamily: 'Inter', fontSize: 13, color: c.textPrimary, background: c.background, outline: 'none', cursor: 'pointer' }}
          >
            {patientList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16 }}>
          {patientMoodTimeline.length === 0 && (
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: c.textMuted, margin: 0 }}>This patient hasn't logged any moods yet.</p>
          )}
          {patientMoodTimeline.map((entry: any, i: number) => (
            <div key={entry.id} style={{ display: 'flex', gap: 20, paddingBottom: i < patientMoodTimeline.length - 1 ? 20 : 0, marginBottom: i < patientMoodTimeline.length - 1 ? 20 : 0, borderBottom: i < patientMoodTimeline.length - 1 ? `1px solid ${c.border}` : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{entry.emoji}</div>
                {i < patientMoodTimeline.length - 1 && <div style={{ width: 2, flex: 1, background: c.border, marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: c.textPrimary }}>Mood Score: {entry.mood}/10</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, marginLeft: 12 }}>{entry.date}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>Stress Level</div>
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      {Array.from({ length: 10 }, (_, j) => (
                        <div key={j} style={{ width: 7, height: 7, borderRadius: 2, background: j < entry.stressLevel ? c.warning : c.border }} />
                      ))}
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, margin: 0, lineHeight: 1.5 }}>{entry.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Journey Summary */}
      <div style={{ background: `linear-gradient(135deg, ${c.primary}08, ${c.veryLightSage})`, borderRadius: 20, padding: 24, border: `1px solid ${c.mintAccent}` }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
          </div>
          <div>
            <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 12 }}>AI Journey Summary — {selectedPatient || '…'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'Sessions Completed', value: `${completed}/${totalAppts || '—'}` },
                { label: 'Goals Set', value: String(detail?.goals?.length || 0) },
                { label: 'Mood Entries', value: String(detail?.moods?.length || 0) },
                { label: 'Avg Mood', value: detail?.moods?.length ? `${Math.round((detail.moods.reduce((a: number, m: any) => a + m.value * 2, 0) / detail.moods.length) * 10) / 10}/10` : '—' },
                { label: 'Risk Level', value: detail?.moods?.length ? ((detail.moods.slice(-5).reduce((a: number, m: any) => a + m.value, 0) / Math.min(5, detail.moods.length)) >= 3 ? 'Low' : 'Elevated') : '—' },
                { label: 'Focus Area', value: detail?.reason || 'General' },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted }}>{item.label}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, marginTop: 2 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

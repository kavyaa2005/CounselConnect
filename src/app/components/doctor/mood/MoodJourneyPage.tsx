import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Heart, TrendingUp, TrendingDown, Users, Activity, RefreshCw, Info } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const MOOD_EMOJI: Record<number, string> = { 1: '😔', 2: '😐', 3: '🙂', 4: '😊', 5: '😄' };
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ALL = '__all__';

/** Local YYYY-MM-DD — avoids the timezone shift you get from toISOString(). */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const avgOf = (vals: number[]) =>
  vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;

export function MoodJourneyPage() {
  const { c, sh } = useTheme();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [patientList, setPatientList] = useState<any[]>([]);
  const [moodsByPatient, setMoodsByPatient] = useState<Record<string, any[]>>({});
  const [detailByPatient, setDetailByPatient] = useState<Record<string, any>>({});
  const [scope, setScope] = useState<string>(ALL);   // ALL or a patient id
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ─────────── load every patient's moods once, then switch instantly ─────────── */

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await api.get('/doctor/patients');
      const list = res.data.patients || [];
      setPatientList(list);

      const details = await Promise.all(
        list.map((u: any) =>
          api.get(`/doctor/patients/${u.id}`)
            .then(r => r.data.patient)
            .catch(() => null)
        )
      );

      const moodMap: Record<string, any[]> = {};
      const detailMap: Record<string, any> = {};
      details.forEach((d: any, i: number) => {
        const id = list[i].id;
        detailMap[id] = d;
        moodMap[id] = d?.moods || [];
      });
      setMoodsByPatient(moodMap);
      setDetailByPatient(detailMap);
    } catch (e: any) {
      setError(e?.message || 'Could not load patient mood data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ─────────── the selection drives everything below ─────────── */

  const isAll = scope === ALL;
  const detail = isAll ? null : detailByPatient[scope];

  const scopedMoods: any[] = useMemo(() => {
    if (isAll) return Object.values(moodsByPatient).flat();
    return moodsByPatient[scope] || [];
  }, [isAll, scope, moodsByPatient]);

  const scopeLabel = isAll
    ? 'All patients'
    : (detail?.name || patientList.find(p => p.id === scope)?.name || 'Patient');

  /* ─────────── series, computed from whatever is in scope ─────────── */

  const { weeklyMood, monthlyMood, yearlyMood, heatmapData, heatmapRange, avgMood, lastLogged } =
    useMemo(() => {
      const now = new Date();

      // Last 7 days. `null` (not 0) when nothing was logged — a missing entry is
      // not a mood of zero, and plotting it as zero makes the line lie.
      const weekly = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        const k = dayKey(d);
        return {
          day: DAY_NAMES[d.getDay()],
          fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avg: avgOf(scopedMoods
            .filter((m: any) => dayKey(new Date(m.createdAt)) === k)
            .map((m: any) => m.value * 2)),
        };
      });

      const monthly = [3, 2, 1, 0].map(w => {
        const end = new Date(now.getTime() - w * 7 * 86400000);
        const start = new Date(end.getTime() - 7 * 86400000);
        return {
          week: `W${4 - w}`,
          fullDate: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          avg: avgOf(scopedMoods
            .filter((m: any) => {
              const d = new Date(m.createdAt);
              return d > start && d <= end;
            })
            .map((m: any) => m.value * 2)),
        };
      });

      const yearly = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return {
          month: MONTH_NAMES[d.getMonth()],
          fullDate: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
          avg: avgOf(scopedMoods
            .filter((m: any) => {
              const md = new Date(m.createdAt);
              return `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}` === key;
            })
            .map((m: any) => m.value * 2)),
        };
      });

      // 35-day heatmap ending today, aligned so the grid starts on a Sunday
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(now.getDate() - 34);
      start.setDate(start.getDate() - start.getDay());

      const cells = Array.from({ length: 35 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const k = dayKey(d);
        const vals = scopedMoods
          .filter((m: any) => dayKey(new Date(m.createdAt)) === k)
          .map((m: any) => m.value * 2);
        return {
          day: i,
          value: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
          count: vals.length,
          future: d > end,
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });

      const range = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      const all = scopedMoods.map((m: any) => m.value * 2);
      const sorted = [...scopedMoods].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

      return {
        weeklyMood: weekly,
        monthlyMood: monthly,
        yearlyMood: yearly,
        heatmapData: cells,
        heatmapRange: range,
        avgMood: avgOf(all),
        lastLogged: sorted[0] ? new Date(sorted[0].createdAt) : null,
      };
    }, [scopedMoods]);

  /* ─────────── timeline + summary follow the same selection ─────────── */

  const timelineSource = [...scopedMoods]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 8);

  const ownerName = (m: any) => patientList.find(x => x.id === m.userId)?.name || '';

  const patientMoodTimeline = timelineSource.map((m: any, i: number) => ({
    id: m.id || i,
    who: isAll ? ownerName(m) : scopeLabel,
    date: new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    mood: m.value * 2,
    emoji: m.emoji || MOOD_EMOJI[m.value] || '🙂',
    note: m.notes || m.label || 'No note added',
    stressLevel: Math.max(0, 10 - m.value * 2),
  }));

  const trackedCount = patientList.filter(p => (p.moodCount || 0) > 0).length;
  const completed = detail?.appointments?.filter((a: any) => a.status === 'completed').length || 0;
  const totalAppts = detail?.appointments?.length || 0;

  const chartData = activeTab === 'weekly' ? weeklyMood : activeTab === 'monthly' ? monthlyMood : yearlyMood;
  const chartKey = activeTab === 'weekly' ? 'day' : activeTab === 'monthly' ? 'week' : 'month';
  const chartHasData = chartData.some((d: any) => d.avg !== null);

  // Which ranges actually hold entries for the current scope — so the doctor
  // isn't left guessing why a chart looks empty
  const rangeHasData: Record<string, boolean> = {
    weekly: weeklyMood.some((d: any) => d.avg !== null),
    monthly: monthlyMood.some((d: any) => d.avg !== null),
    yearly: yearlyMood.some((d: any) => d.avg !== null),
  };
  const suggestedRange = (['monthly', 'yearly', 'weekly'] as const).find(r => r !== activeTab && rangeHasData[r]);

  // Two patients can share a display name — show the email to tell them apart
  const nameCounts = patientList.reduce((acc: Record<string, number>, p) => {
    acc[p.name] = (acc[p.name] || 0) + 1;
    return acc;
  }, {});
  const optionLabel = (p: any) => {
    const base = nameCounts[p.name] > 1 ? `${p.name} (${p.email})` : p.name;
    return `${base} — ${p.moodCount || 0} ${p.moodCount === 1 ? 'entry' : 'entries'}`;
  };

  const selectStyle = {
    padding: '9px 14px', borderRadius: 10, border: `1px solid ${c.border}`,
    fontFamily: 'Inter', fontSize: 13, color: c.textPrimary,
    background: c.white, outline: 'none', cursor: 'pointer', minWidth: 250,
  } as const;

  const MoodTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (p?.avg === null || p?.avg === undefined) return null;
    return (
      <div style={{
        background: c.white, border: `1px solid ${c.border}`, borderRadius: 12,
        padding: '10px 14px', fontFamily: 'Inter', fontSize: 12, boxShadow: sh.card,
      }}>
        <div style={{ color: c.textMuted, marginBottom: 4 }}>{p.fullDate || label}</div>
        <div style={{ color: c.textPrimary, fontWeight: 700 }}>Mood {p.avg}/10</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 32, fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: 10 }}>
        <RefreshCw size={16} className="animate-spin" color={c.primary} />
        <span style={{ color: c.textMuted, fontSize: 14 }}>Loading patient mood data…</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Banner + the one selector that drives the whole page ── */}
      <div style={{
        background: `linear-gradient(135deg, ${c.primary}15, ${c.veryLightSage})`,
        borderRadius: 16, padding: '20px 28px', border: `1px solid ${c.mintAccent}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
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
              {isAll
                ? 'Showing combined data across all your patients'
                : `Showing ${scopeLabel} only — every chart below reflects this patient`}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: c.textSecondary }}>
            Viewing
          </label>
          <select value={scope} onChange={e => setScope(e.target.value)} style={selectStyle}>
            <option value={ALL}>
              All patients — {Object.values(moodsByPatient).flat().length} entries
            </option>
            {patientList.map(p => (
              <option key={p.id} value={p.id}>{optionLabel(p)}</option>
            ))}
          </select>
          <button onClick={() => load(true)} title="Refresh"
            style={{
              width: 38, height: 38, borderRadius: 10, border: `1px solid ${c.border}`,
              background: c.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <RefreshCw size={15} color={c.textSecondary} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: `${c.error}10`, border: `1px solid ${c.error}33`, borderRadius: 14, padding: 16 }}>
          <p style={{ margin: 0, color: c.error, fontSize: 13.5 }}>{error}</p>
        </div>
      )}

      {/* ── Stats, scoped ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {[
          {
            label: 'Avg Mood Score',
            value: avgMood != null ? `${avgMood}/10` : '—',
            icon: Heart,
            change: isAll ? 'Across all patients' : `${scopeLabel}'s average`,
            color: c.primary,
          },
          {
            label: 'Mood Entries',
            value: String(scopedMoods.length),
            icon: TrendingUp,
            change: lastLogged
              ? `Last logged ${lastLogged.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : 'Nothing logged yet',
            color: c.success,
          },
          {
            label: 'Stress Level',
            value: avgMood != null ? `${Math.max(0, Math.round((10 - avgMood) * 10) / 10)}/10` : '—',
            icon: TrendingDown,
            change: 'Estimated from mood',
            color: c.warning,
          },
          {
            label: isAll ? 'Patients Tracked' : 'Sessions',
            value: isAll ? String(patientList.length) : `${completed}/${totalAppts || 0}`,
            icon: Users,
            change: isAll ? `${trackedCount} logging moods` : 'Completed / booked',
            color: '#7C6FFF',
          },
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

      {/* ── Trend + Heatmap, both scoped ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0 }}>
                Mood Journey Trend
              </h3>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginTop: 2 }}>
                {isAll ? 'Average across all patients' : scopeLabel}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['weekly', 'monthly', 'yearly'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  title={rangeHasData[tab] ? `${tab} — has entries` : `${tab} — no entries for ${scopeLabel}`}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1px solid ${c.border}`,
                    fontFamily: 'Inter', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize',
                    background: activeTab === tab ? c.primary : 'transparent',
                    color: activeTab === tab ? 'white' : c.textSecondary,
                    display: 'flex', alignItems: 'center', gap: 5,
                    opacity: !rangeHasData[tab] && activeTab !== tab ? 0.55 : 1,
                  }}>
                  {tab}
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: rangeHasData[tab]
                      ? (activeTab === tab ? 'rgba(255,255,255,0.9)' : c.success)
                      : 'transparent',
                  }} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="moodJourneyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={c.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false} />
                <XAxis dataKey={chartKey} axisLine={false} tickLine={false}
                  tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
                <YAxis domain={[0, 10]} axisLine={false} tickLine={false}
                  tick={{ fontFamily: 'Inter', fontSize: 12, fill: c.textMuted }} />
                <Tooltip content={<MoodTooltip />} />
                {/* connectNulls bridges days with no entry instead of dropping to 0 */}
                <Area type="monotone" dataKey="avg" stroke={c.primary} strokeWidth={2.5}
                  fill="url(#moodJourneyGrad)" dot={{ fill: c.primary, r: 4 }}
                  connectNulls name="Mood Score" />
              </AreaChart>
            </ResponsiveContainer>

            {!chartHasData && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                background: `${c.white}D9`, borderRadius: 12,
              }}>
                <Info size={18} color={c.textMuted} />
                <p style={{ fontFamily: 'Inter', fontSize: 13, color: c.textSecondary, margin: 0, fontWeight: 500 }}>
                  No {activeTab} entries {isAll ? '' : `for ${scopeLabel}`}
                </p>
                {suggestedRange ? (
                  <button onClick={() => setActiveTab(suggestedRange)}
                    style={{
                      marginTop: 2, padding: '6px 14px', borderRadius: 8, border: 'none',
                      background: c.primary, color: 'white', fontFamily: 'Inter',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                    }}>
                    View {suggestedRange} instead
                  </button>
                ) : (
                  <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0 }}>
                    {scopedMoods.length === 0
                      ? 'This patient has never logged a mood.'
                      : 'No entries fall inside any of these ranges.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 4 }}>
            Mood Heatmap
          </h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: 0, marginBottom: 16 }}>
            {heatmapRange}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: 10, color: c.textMuted, paddingBottom: 4 }}>{d}</div>
            ))}
            {heatmapData.map((cell: any, i: number) => {
              const has = cell.value !== null;
              const intensity = has ? cell.value / 10 : 0;
              return (
                <div key={i}
                  title={
                    cell.future ? `${cell.date} — upcoming`
                      : has ? `${cell.date}: ${cell.value}/10 (${cell.count} ${cell.count === 1 ? 'entry' : 'entries'})`
                        : `${cell.date}: no entry`
                  }
                  style={{
                    height: 24, borderRadius: 4, cursor: 'pointer',
                    background: cell.future
                      ? 'transparent'
                      : has ? `rgba(111, 175, 143, ${intensity * 0.85 + 0.12})` : c.background,
                    border: cell.future
                      ? `1px dashed ${c.border}`
                      : `1px solid ${has ? `rgba(111, 175, 143, ${intensity * 0.3 + 0.15})` : c.border}`,
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
              {[0.15, 0.35, 0.55, 0.75, 0.95].map((o, i) => (
                <div key={i} style={{ width: 14, height: 9, borderRadius: 2, background: `rgba(111, 175, 143, ${o})` }} />
              ))}
            </div>
            <span style={{ fontFamily: 'Inter', fontSize: 10, color: c.textMuted }}>High</span>
          </div>
          <p style={{ fontFamily: 'Inter', fontSize: 11, color: c.textMuted, margin: '10px 0 0', textAlign: 'center' }}>
            {scopedMoods.length === 0 ? 'No entries to plot yet' : `${scopedMoods.length} entries · ${scopeLabel}`}
          </p>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ background: c.white, borderRadius: 20, padding: 24, boxShadow: sh.card, border: `1px solid ${c.border}` }}>
        <div>
          <h3 style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 700, color: c.textPrimary, margin: 0 }}>
            {isAll ? 'Recent Mood Entries' : 'Individual Mood Timeline'}
          </h3>
          <p style={{ fontFamily: 'Inter', fontSize: 12, color: c.textMuted, margin: '4px 0 0' }}>
            {isAll ? 'Latest entries from all patients' : `Patient-reported data · ${scopeLabel}`}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16 }}>
          {patientMoodTimeline.length === 0 && (
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: c.textMuted, margin: 0 }}>
              {isAll
                ? 'None of your patients have logged a mood yet.'
                : `${scopeLabel} hasn't logged any moods yet.`}
            </p>
          )}
          {patientMoodTimeline.map((entry: any, i: number) => (
            <div key={entry.id} style={{
              display: 'flex', gap: 20,
              paddingBottom: i < patientMoodTimeline.length - 1 ? 20 : 0,
              marginBottom: i < patientMoodTimeline.length - 1 ? 20 : 0,
              borderBottom: i < patientMoodTimeline.length - 1 ? `1px solid ${c.border}` : 'none',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{entry.emoji}</div>
                {i < patientMoodTimeline.length - 1 && <div style={{ width: 2, flex: 1, background: c.border, marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: c.textPrimary }}>
                      Mood Score: {entry.mood}/10
                    </span>
                    {isAll && entry.who && (
                      <span style={{
                        fontFamily: 'Inter', fontSize: 11, marginLeft: 10, padding: '2px 8px',
                        borderRadius: 20, background: c.veryLightSage, color: c.primary, fontWeight: 600,
                      }}>{entry.who}</span>
                    )}
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

      {/* ── Summary ── */}
      <div style={{ background: `linear-gradient(135deg, ${c.primary}08, ${c.veryLightSage})`, borderRadius: 20, padding: 24, border: `1px solid ${c.mintAccent}` }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: c.textPrimary, margin: 0, marginBottom: 12 }}>
              AI Journey Summary — {scopeLabel}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {(isAll
                ? [
                    { label: 'Patients', value: String(patientList.length) },
                    { label: 'Logging Moods', value: String(trackedCount) },
                    { label: 'Total Entries', value: String(scopedMoods.length) },
                    { label: 'Avg Mood', value: avgMood != null ? `${avgMood}/10` : '—' },
                    { label: 'Needs Attention', value: String(patientList.filter(p => p.avgMood != null && p.avgMood < 5).length) },
                    { label: 'Last Entry', value: lastLogged ? lastLogged.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' },
                  ]
                : [
                    { label: 'Sessions Completed', value: `${completed}/${totalAppts || 0}` },
                    { label: 'Goals Set', value: String(detail?.goals?.length || 0) },
                    { label: 'Mood Entries', value: String(scopedMoods.length) },
                    { label: 'Avg Mood', value: avgMood != null ? `${avgMood}/10` : '—' },
                    {
                      label: 'Risk Level',
                      value: scopedMoods.length
                        ? ((scopedMoods.slice(-5).reduce((a: number, m: any) => a + m.value, 0) / Math.min(5, scopedMoods.length)) >= 3 ? 'Low' : 'Elevated')
                        : '—',
                    },
                    { label: 'Focus Area', value: detail?.reason || 'General' },
                  ]
              ).map((item, i) => (
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

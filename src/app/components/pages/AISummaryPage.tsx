import { motion } from 'motion/react';
import { Download, Share2, Sparkles, TrendingUp, Award, Brain, Calendar, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { CC } from '../../lib/colors';

// Fallback skeleton data (null values = no line drawn until real data loads)
// Real week labels even before the API responds, so the axis never shows
// placeholder "Wk 1…8" text that looks like wrong dates.
const FALLBACK_MOOD_HISTORY = Array.from({ length: 8 }, (_, i) => {
  const end = new Date();
  end.setDate(end.getDate() - (7 - i) * 7);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return {
    week: i === 7 ? 'This week' : start.toLocaleDateString('en-US', o),
    rangeLabel: `${start.toLocaleDateString('en-US', o)} – ${end.toLocaleDateString('en-US', o)}`,
    entries: 0,
    mood: null,
  };
});

/** Shows the exact date range behind each point — the axis alone was ambiguous. */
function MoodWeekTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      backgroundColor: CC.lightIvory, border: `1px solid ${CC.softSage}`,
      borderRadius: 12, padding: '10px 14px', fontSize: '0.82rem',
      boxShadow: '0 4px 16px rgba(53,92,77,0.12)',
    }}>
      <div style={{ color: CC.mutedOlive, fontSize: '0.75rem' }}>{d.rangeLabel || d.week}</div>
      <div style={{ color: CC.primaryText, fontWeight: 700, marginTop: 3 }}>
        {d.mood !== null ? `Mood ${d.mood}%` : 'No entries this week'}
      </div>
      {d.entries > 0 && (
        <div style={{ color: CC.mutedOlive, fontSize: '0.74rem', marginTop: 2 }}>
          {d.entries} {d.entries === 1 ? 'entry' : 'entries'} logged
        </div>
      )}
    </div>
  );
}
const FALLBACK_GROWTH_DATA = [
  { area: 'Anxiety', before: 0, after: 0 }, { area: 'Confidence', before: 0, after: 0 },
  { area: 'Sleep', before: 0, after: 0 },   { area: 'Focus', before: 0, after: 0 },
  { area: 'Relationships', before: 0, after: 0 },
];
const FALLBACK_RADAR_DATA = [
  { subject: 'Emotional Reg.', A: 0 }, { subject: 'Anxiety Mgmt', A: 0 },
  { subject: 'Self-Awareness', A: 0 }, { subject: 'Resilience', A: 0 },
  { subject: 'Social Skills', A: 0 },  { subject: 'Sleep Quality', A: 0 },
];

const badges = [
  { emoji: '🔥', title: '7-Day Streak', desc: 'Logged mood 7 days in a row' },
  { emoji: '🌟', title: 'First Week', desc: 'Completed first week' },
  { emoji: '📈', title: 'Trending Up', desc: 'Mood improved 5 days straight' },
  { emoji: '💪', title: 'Milestone', desc: 'Completed 10 sessions' },
];

const aiRecs = [
  { icon: '🧘', title: 'Continue daily mindfulness', desc: 'Your mood scores peak on days with morning routines. Consider extending to 10 minutes.' },
  { icon: '😴', title: 'Prioritize sleep consistency', desc: 'Going to bed at the same time improved your next-day mood by an average of 12 points.' },
  { icon: '🌿', title: 'Nature exposure', desc: 'Outdoor activities correlate strongly with your highest mood entries. Aim for 20 min daily.' },
];

export function AISummaryPage() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    api.get('/ai/summary').then(res => setSummary(res.data)).catch(() => {});
  }, []);

  // Use API data when available, fall back to placeholders
  const liveBadges    = summary ? (summary.badges || [])          : badges;
  const liveRecs      = summary ? (summary.recommendations || []) : aiRecs;
  const growthScore   = summary?.growthScore   ?? 82;
  const sessionsDone  = summary?.sessionsCompleted ?? 14;
  const daysTracked   = summary?.daysTracked   ?? 25;
  const journalCount  = summary?.journalEntries ?? 0;

  // Chart data — live from API, fallback to empty skeleton
  const liveMoodHistory = summary ? (summary.moodHistory8Weeks || [])  : FALLBACK_MOOD_HISTORY;
  const liveRadarData   = summary ? (summary.wellnessDimensions || []) : FALLBACK_RADAR_DATA;
  const liveGrowthData  = summary ? (summary.growthComparison || [])   : FALLBACK_GROWTH_DATA;
  const hasChartData    = !!summary;

  const handleShare = async () => {
    const text = `My CounselConnect Wellness Summary:
🧠 Growth Score: ${growthScore}/100
📅 Sessions Completed: ${sessionsDone}
📔 Journal Entries: ${journalCount}
❤️ Days Tracked: ${daysTracked}`;
    if (navigator.share) {
      await navigator.share({ title: 'My Wellness Journey', text });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Summary copied to clipboard!');
    }
  };

  const handleDownload = () => {
    alert('PDF download will be available in a future update. Your data is safely stored.');
  };

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
          <div>
            <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>Your wellness report</p>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText }}>
              AI Journey Summary
            </h1>
            <p style={{ color: CC.mutedOlive, marginTop: 4, fontSize: '0.88rem' }}>Based on {daysTracked} days of data · {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              onClick={handleShare}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
              style={{ backgroundColor: CC.softSage, color: CC.primaryText, fontWeight: 600 }}
              whileHover={{ scale: 1.03 }}
            >
              <Share2 size={15} /> Share Report
            </motion.button>
            <motion.button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
              whileHover={{ scale: 1.03 }}
            >
              <Download size={15} /> Download PDF
            </motion.button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Days Tracked', value: String(daysTracked), icon: TrendingUp, color: CC.forestSage, sub: daysTracked > 0 ? 'Keep going!' : 'Start logging today' },
            { label: 'Sessions Completed', value: String(sessionsDone), icon: Calendar, color: CC.terracotta, sub: sessionsDone > 0 ? 'Great progress!' : 'Book your first session' },
            { label: 'Growth Score', value: `${growthScore}/100`, icon: Brain, color: CC.darkForest, sub: growthScore >= 70 ? 'Top 15% of users' : 'Building momentum' },
            { label: 'Journal Entries', value: String(journalCount), icon: Heart, color: CC.terracotta, sub: journalCount > 0 ? 'Keep reflecting!' : 'Write your first entry' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-5 rounded-2xl"
                style={{ backgroundColor: CC.lightIvory, boxShadow: '0 2px 16px rgba(53,92,77,0.05)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${s.color}15` }}>
                  <Icon size={18} color={s.color} />
                </div>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: CC.primaryText }}>{s.value}</p>
                <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, marginTop: 2 }}>{s.label}</p>
                <p style={{ fontSize: '0.7rem', color: s.color, marginTop: 4, fontWeight: 600 }}>{s.sub}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Mood history chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-3xl"
            style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
          >
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 4 }}>Mood Progress</h2>
            <p style={{ color: CC.mutedOlive, fontSize: '0.82rem', marginBottom: 16 }}>
              Last 8 weeks · each point is that week's average
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={liveMoodHistory} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CC.softSage} />
                <XAxis dataKey="week" tick={{ fill: CC.mutedOlive, fontSize: 10.5 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: CC.mutedOlive, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<MoodWeekTooltip />} />
                <Line
                  type="monotone" dataKey="mood" stroke={CC.forestSage} strokeWidth={3}
                  dot={{ fill: CC.forestSage, strokeWidth: 0, r: 5 }} activeDot={{ r: 7 }}
                  connectNulls isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            {liveMoodHistory.every((d: any) => d.mood === null) && (
              <p style={{ color: CC.mutedOlive, fontSize: '0.8rem', textAlign: 'center', marginTop: -110, marginBottom: 90 }}>
                No moods logged in the last 8 weeks yet
              </p>
            )}
          </motion.div>

          {/* Radar chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-3xl"
            style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
          >
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 4 }}>Wellness Dimensions</h2>
            <p style={{ color: CC.mutedOlive, fontSize: '0.82rem', marginBottom: 8 }}>Current performance across all areas</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={liveRadarData}>
                <PolarGrid stroke={CC.softSage} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: CC.mutedOlive, fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="A" stroke={CC.forestSage} fill={CC.forestSage} fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Growth comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-6 rounded-3xl mb-6"
          style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
        >
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 16 }}>
            Before & After Comparison
          </h2>
          {!hasChartData && (
            <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, marginBottom: 12 }}>
              Log your mood a few times to unlock your personal before &amp; after comparison.
            </p>
          )}
          <div className="space-y-4">
            {liveGrowthData.map(item => (
              <div key={item.area}>
                <div className="flex justify-between mb-2">
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: CC.primaryText }}>{item.area}</span>
                  <span style={{ fontSize: '0.82rem', color: CC.forestSage, fontWeight: 600 }}>
                    +{item.after - item.before}pts
                  </span>
                </div>
                <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: CC.softSage }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.before}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="absolute left-0 top-0 h-full rounded-full opacity-30"
                    style={{ backgroundColor: CC.mutedOlive }}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.after}%` }}
                    transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${CC.forestSage}, ${CC.terracotta})` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: '0.7rem', color: CC.mutedOlive }}>Start: {item.before}%</span>
                  <span style={{ fontSize: '0.7rem', color: CC.forestSage, fontWeight: 600 }}>Now: {item.after}%</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-3xl"
            style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Award size={18} color={CC.terracotta} />
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText }}>Achievements</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {liveBadges.map((badge: any) => (
                <div key={badge.title} className="p-4 rounded-2xl flex gap-3 items-center" style={{ backgroundColor: CC.softSage }}>
                  <span style={{ fontSize: '1.8rem' }}>{badge.emoji}</span>
                  <div>
                    <p style={{ fontWeight: 600, color: CC.forestSage, fontSize: '0.82rem' }}>{badge.title}</p>
                    <p style={{ color: CC.mutedOlive, fontSize: '0.7rem' }}>{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="p-6 rounded-3xl"
            style={{ background: `linear-gradient(145deg, ${CC.darkForest}, ${CC.forestSage})`, boxShadow: '0 4px 24px rgba(40,70,58,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={18} color={CC.terracotta} />
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: 'white' }}>AI Recommendations</h2>
            </div>
            <div className="space-y-4">
              {liveRecs.map((rec: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex gap-3 p-4 rounded-2xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{rec.icon}</span>
                  <div>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '0.88rem', marginBottom: 4 }}>{rec.title}</p>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', lineHeight: 1.5 }}>{rec.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

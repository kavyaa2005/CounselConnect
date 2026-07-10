import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Calendar, TrendingUp, Sparkles, Clock, ArrowRight, Heart, Brain } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { CC } from '../../lib/colors';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

const FALLBACK_CHART = [
  { day: 'Mon', value: null }, { day: 'Tue', value: null }, { day: 'Wed', value: null },
  { day: 'Thu', value: null }, { day: 'Fri', value: null }, { day: 'Sat', value: null }, { day: 'Sun', value: null },
];

const moods = [
  { emoji: '😄', label: 'Great', value: 5 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '😔', label: 'Low', value: 2 },
  { emoji: '😢', label: 'Hard', value: 1 },
];

const formatApptDate = (dateStr: string) => {
  // Handles both "2026-07-06" and "July 6, 2026" formats
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(dateStr + 'T00:00:00') : new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long' });
};

function getHour() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function DashboardHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user ? user.firstName : 'Alex';

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodLogged, setMoodLogged] = useState(false);

  // Live data state
  const [moodStats, setMoodStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>(FALLBACK_CHART);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [recCounselors, setRecCounselors] = useState<any[]>([]);

  useEffect(() => {
    api.get('/mood/stats').then(res => {
      setMoodStats(res.data);
      if (res.data?.weekData?.length) setChartData(res.data.weekData);
      if (res.data?.alreadyLoggedToday) setMoodLogged(true); // locked until tomorrow
    }).catch(() => {});

    api.get('/appointments').then(res => {
      setAppointments(res.data?.appointments || []);
    }).catch(() => {});

    api.get('/ai/insights').then(res => {
      setInsights(res.data?.insights || []);
    }).catch(() => {});

    api.get('/counselors').then(res => {
      const list = res.data?.counselors || [];
      setRecCounselors(list.slice(0, 2).map((c: any) => ({
        name: c.name,
        specialty: c.specialty,
        avatar: c.image,
        match: Math.min(99, Math.round(c.rating * 17 + 14)),
      })));
    }).catch(() => {});
  }, []);

  const logMood = async (val: number) => {
    setSelectedMood(val);
    const moodMap: Record<number, { label: string; emoji: string }> = {
      5: { label: 'Great', emoji: '😄' },
      4: { label: 'Good', emoji: '🙂' },
      3: { label: 'Okay', emoji: '😐' },
      2: { label: 'Low', emoji: '😔' },
      1: { label: 'Hard', emoji: '😢' },
    };
    try {
      await api.post('/mood', { value: val, ...moodMap[val] });
      // Refresh stats after logging
      api.get('/mood/stats').then(res => {
        setMoodStats(res.data);
        if (res.data?.weekData?.length) setChartData(res.data.weekData);
      }).catch(() => {});
    } catch { /* non-blocking */ }
    setTimeout(() => setMoodLogged(true), 600);
  };

  // Derived values
  const streak = moodStats?.streak ?? 0;
  const weekAvg = moodStats?.weekAvg ?? 0;
  const upcoming = appointments.filter(a => a.status !== 'cancelled').slice(0, 2);
  const nextAppt = upcoming[0];

  const quickStats = [
    {
      label: 'Sessions Booked',
      value: appointments.length > 0 ? String(appointments.length) : '0',
      icon: Calendar, color: CC.forestSage,
      change: appointments.length > 0 ? `${appointments.length} total` : 'Book your first',
    },
    {
      label: 'Mood Streak',
      value: streak > 0 ? `${streak} day${streak !== 1 ? 's' : ''}` : 'Start today',
      icon: Heart, color: CC.terracotta,
      change: streak > 0 ? '🔥 Keep it up!' : 'Log your mood daily',
    },
    {
      label: 'Weekly Mood Avg',
      value: weekAvg > 0 ? `${weekAvg}%` : '--',
      icon: TrendingUp, color: CC.darkForest,
      change: weekAvg > 0 ? 'Based on your logs' : 'Log mood to unlock',
    },
    {
      label: 'Next Session',
      value: nextAppt ? formatApptDate(nextAppt.date) : 'None booked',
      icon: Clock, color: CC.mutedOlive,
      change: nextAppt ? nextAppt.time : 'Find a counselor',
    },
  ];

  const aiInsightText = insights[0]?.text
    || 'Start logging your mood daily to unlock personalized AI insights tailored to your wellness journey.';
  const aiStatText = weekAvg > 0
    ? `Weekly mood avg: ${weekAvg}%`
    : insights[1]?.text || 'Track consistently for deeper insights';

  return (
    <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>
          Good {getHour()}, {displayName} 👋
        </p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText }}>
          Your Wellness Dashboard
        </h1>
      </motion.div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-5 rounded-2xl"
              style={{ backgroundColor: CC.lightIvory, boxShadow: '0 2px 16px rgba(53,92,77,0.06)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon size={17} color={stat.color} />
                </div>
              </div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: CC.primaryText }}>{stat.value}</p>
              <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, marginTop: 2 }}>{stat.label}</p>
              <p style={{ fontSize: '0.72rem', color: stat.color, marginTop: 4, fontWeight: 600 }}>{stat.change}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mood check-in */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-3xl"
            style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
                  How are you feeling today?
                </h2>
                <p style={{ fontSize: '0.8rem', color: CC.mutedOlive, marginTop: 2 }}>Daily check-in helps track your journey</p>
              </div>
              <span style={{ fontSize: '0.75rem', color: CC.forestSage, fontWeight: 600, backgroundColor: CC.softSage, padding: '4px 10px', borderRadius: 20 }}>
                {streak > 0 ? `Day ${streak} streak 🔥` : 'Start your streak!'}
              </span>
            </div>

            {!moodLogged ? (
              <div className="flex gap-3 justify-center">
                {moods.map((m) => (
                  <motion.button
                    key={m.value}
                    onClick={() => logMood(m.value)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
                    style={{
                      backgroundColor: selectedMood === m.value ? CC.softSage : 'transparent',
                      border: `1.5px solid ${selectedMood === m.value ? CC.forestSage : CC.softSage}`,
                    }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>{m.emoji}</span>
                    <span style={{ fontSize: '0.72rem', color: CC.mutedOlive, fontWeight: 500 }}>{m.label}</span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <p style={{ fontSize: '1.5rem', marginBottom: 6 }}>✨</p>
                <p style={{ fontWeight: 700, color: CC.forestSage, fontFamily: "'Poppins', sans-serif" }}>Mood logged!</p>
                <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, marginTop: 4 }}>Great — your AI insights are updating.</p>
              </motion.div>
            )}
          </motion.div>

          {/* Mood trend mini chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-3xl"
            style={{ backgroundColor: CC.darkForest, boxShadow: '0 4px 24px rgba(40,70,58,0.2)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: 'white' }}>
                  Mood Trend
                </h2>
                <p style={{ fontSize: '0.78rem', color: CC.mutedOlive }}>This week</p>
              </div>
              {weekAvg > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: 'rgba(217,119,87,0.2)' }}>
                  <TrendingUp size={13} color={CC.terracotta} />
                  <span style={{ fontSize: '0.8rem', color: CC.terracotta, fontWeight: 600 }}>{weekAvg}% avg</span>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={chartData}>
                <Line type="monotone" dataKey="value" stroke={CC.terracotta} strokeWidth={2.5} dot={false} connectNulls={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: CC.darkForest, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 10, color: 'white', fontSize: '0.8rem' }}
                  formatter={(v: any) => v !== null ? [v + '%', 'Mood'] : ['No data', 'Mood']}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-1">
              {chartData.map((d: any) => (
                <span key={d.day} style={{ fontSize: '0.7rem', color: CC.mutedOlive }}>{d.day}</span>
              ))}
            </div>
            <motion.button
              onClick={() => navigate('/dashboard/mood')}
              className="mt-4 w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              Full Mood Tracker <ArrowRight size={14} />
            </motion.button>
          </motion.div>

          {/* Upcoming sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-3xl"
            style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
                Upcoming Sessions
              </h2>
              <button
                onClick={() => navigate('/dashboard/appointments')}
                style={{ fontSize: '0.8rem', color: CC.forestSage, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all
              </button>
            </div>
            {upcoming.length === 0 ? (
              <div className="text-center py-6">
                <p style={{ fontSize: '1.8rem', marginBottom: 8 }}>📅</p>
                <p style={{ fontSize: '0.88rem', color: CC.mutedOlive }}>No upcoming sessions yet.</p>
                <motion.button
                  onClick={() => navigate('/dashboard/find-counselor')}
                  className="mt-3 px-4 py-2 rounded-xl text-sm"
                  style={{ background: CC.forestSage, color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  whileHover={{ scale: 1.03 }}
                >
                  Find a Counselor
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((appt: any, i: number) => (
                  <motion.div
                    key={appt.id}
                    className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ backgroundColor: i === 0 ? `${CC.forestSage}08` : 'transparent', border: `1px solid ${CC.softSage}` }}
                    whileHover={{ backgroundColor: `${CC.forestSage}06` }}
                  >
                    <img src={appt.counselorAvatar} alt={appt.counselorName} className="w-11 h-11 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }}>{appt.counselorName}</p>
                      <p style={{ fontSize: '0.78rem', color: CC.mutedOlive }}>
                        {appt.sessionType === 'video' ? 'Video Session' : appt.sessionType === 'chat' ? 'Text Session' : 'Session'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: i === 0 ? CC.forestSage : CC.primaryText }}>
                        {formatApptDate(appt.date)}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: CC.mutedOlive }}>{appt.time}</p>
                    </div>
                    {i === 0 && (
                      <motion.button
                        onClick={() => navigate('/dashboard/video')}
                        className="px-3 py-1.5 rounded-xl text-xs text-white"
                        style={{ background: CC.forestSage, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        Join
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Insight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-6 rounded-3xl text-white"
            style={{ background: `linear-gradient(145deg, ${CC.forestSage}, ${CC.darkForest})`, boxShadow: `0 12px 32px rgba(53,92,77,0.25)` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} color={CC.terracotta} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>AI Insight</span>
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', marginBottom: 14 }}>
              {aiInsightText}
            </p>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <TrendingUp size={14} color={CC.softSage} />
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{aiStatText}</span>
            </div>
          </motion.div>

          {/* Recommended counselors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-3xl"
            style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText }}>
                Recommended
              </h2>
              <button
                onClick={() => navigate('/dashboard/find-counselor')}
                style={{ fontSize: '0.8rem', color: CC.forestSage, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                See all
              </button>
            </div>
            <div className="space-y-4">
              {recCounselors.map((c, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ border: `1px solid ${CC.softSage}` }}
                  whileHover={{ backgroundColor: `${CC.forestSage}05` }}
                >
                  <img src={c.avatar} alt={c.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.85rem' }}>{c.name}</p>
                    <p style={{ fontSize: '0.72rem', color: CC.mutedOlive }}>{c.specialty}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: `${CC.forestSage}15`, color: CC.forestSage, fontWeight: 600 }}
                    >
                      {c.match}% match
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.button
              onClick={() => navigate('/dashboard/ai-match')}
              className="mt-4 w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${CC.terracotta}, #c4623e)`, color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              whileHover={{ scale: 1.02 }}
            >
              <Brain size={15} /> Run AI Match
            </motion.button>
          </motion.div>

          {/* Journey progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="p-6 rounded-3xl"
            style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}
          >
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: CC.primaryText, marginBottom: 16 }}>
              Journey Progress
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Anxiety Management', value: Math.min(99, (weekAvg || 50)), color: CC.forestSage },
                { label: 'Self Confidence', value: Math.min(99, Math.max(20, (weekAvg || 40) - 14)), color: CC.terracotta },
                { label: 'Sleep Quality', value: Math.min(99, Math.max(30, (weekAvg || 60) + 10)), color: CC.darkForest },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1.5">
                    <span style={{ fontSize: '0.8rem', color: CC.primaryText, fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: '0.8rem', color: item.color, fontWeight: 600 }}>{item.value}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: CC.softSage }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                      className="h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/dashboard/journey')}
              className="mt-4 text-sm flex items-center gap-1"
              style={{ color: CC.forestSage, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              View full timeline <ArrowRight size={14} />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

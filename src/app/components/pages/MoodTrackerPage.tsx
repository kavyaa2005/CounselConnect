import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, Award, PenLine, Plus, Trash2, Tag, Calendar, Search, BookOpen, Lock, Eye, Clock, FileText, Download } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

/* ── chart fallbacks (shown until API responds) ── */
const WEEK_FALLBACK = [
  { day: 'Mon', mood: null }, { day: 'Tue', mood: null }, { day: 'Wed', mood: null },
  { day: 'Thu', mood: null }, { day: 'Fri', mood: null }, { day: 'Sat', mood: null }, { day: 'Sun', mood: null },
];
const MONTH_FALLBACK = [
  { week: 'Wk 1', mood: null }, { week: 'Wk 2', mood: null },
  { week: 'Wk 3', mood: null }, { week: 'Wk 4', mood: null },
];
const moods = [
  { emoji: '😄', label: 'Amazing', value: 5, color: '#4CAF50' },
  { emoji: '🙂', label: 'Good',    value: 4, color: CC.forestSage },
  { emoji: '😐', label: 'Okay',    value: 3, color: CC.mutedOlive },
  { emoji: '😔', label: 'Low',     value: 2, color: CC.terracotta },
  { emoji: '😢', label: 'Hard',    value: 1, color: '#c0392b' },
];
const DEFAULT_BADGES = [
  { emoji: '🌱', title: 'First Log',    desc: 'Log your first mood',       earned: false },
  { emoji: '🔥', title: '7-Day Streak', desc: 'Log mood 7 days in a row',  earned: false },
  { emoji: '🌟', title: 'First Session',desc: 'Book your first session',   earned: false },
  { emoji: '💪', title: 'Milestone',    desc: 'Complete 10 sessions',      earned: false },
];

/* ── journal seed entries (only shown before API responds) ── */
const seedEntries: any[] = [
  {
    id: 1, date: '2026-06-25', moodEmoji: '🙂', moodLabel: 'Good',
    title: 'A quiet morning victory',
    content: 'I tried the breathing exercise before my presentation today. For the first time in months I felt genuinely steady — not "pushing through it" steady, but actually calm. The 4-7-8 technique is becoming second nature.\n\nSmall win: I made eye contact with three people in the room and meant it.',
    tags: ['anxiety', 'breathing', 'progress'],
    color: CC.forestSage,
  },
  {
    id: 2, date: '2026-06-23', moodEmoji: '😐', moodLabel: 'Okay',
    title: 'Harder than expected',
    content: 'Study group ran two hours over. Felt the familiar tightness by the end but I named it — "this is overwhelm, not emergency" — and that actually helped a little. Dr. Chen said labeling emotions reduces their intensity. She was right.\n\nNote to self: schedule buffer time between sessions. The back-to-back is unsustainable.',
    tags: ['stress', 'naming emotions', 'boundaries'],
    color: CC.mutedOlive,
  },
  {
    id: 3, date: '2026-06-20', moodEmoji: '😄', moodLabel: 'Amazing',
    title: 'Something shifted today',
    content: 'Woke up and the first thought wasn\'t dread. It was just... nothing particular. A blank page. I sat with it for a full five minutes and then made coffee.\n\nI think that\'s what peace feels like. I\'d forgotten.',
    tags: ['morning', 'peace', 'gratitude'],
    color: '#4CAF50',
  },
];

const journalTags = ['anxiety', 'stress', 'gratitude', 'progress', 'boundaries', 'relationships', 'peace', 'work', 'sleep', 'exercise', 'breathing', 'therapy'];

/* ─────────────────────────────────────── */

export function MoodTrackerPage() {
  /* Tabs */
  const [activeTab, setActiveTab] = useState<'tracker' | 'journal' | 'history' | 'reports'>('tracker');

  /* Mood tracker state */
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [trackerNotes, setTrackerNotes] = useState('');
  // How strongly the feeling is felt (1–10). Separate from `value` (1–5),
  // which stays as-is so every existing chart keeps working.
  const [intensity, setIntensity] = useState(5);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [logged, setLogged] = useState(false);
  const [chartView, setChartView] = useState<'week' | 'month'>('week');
  const [weekData, setWeekData] = useState<any[]>(WEEK_FALLBACK);
  const [monthData, setMonthData] = useState<any[]>(MONTH_FALLBACK);
  const [moodStreak, setMoodStreak] = useState(0);
  const [moodBadges, setMoodBadges] = useState(DEFAULT_BADGES);

  /* Journal state */
  const [entries, setEntries] = useState<any[]>([]);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '', moodEmoji: '', moodLabel: '', tags: [] as string[], isPrivate: false });
  const [journalSearch, setJournalSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState<string | null>(null);

  /** Flip an existing entry between shared and private. */
  const toggleEntryPrivacy = async (entry: any) => {
    const next = !entry.isPrivate;
    setSavingPrivacy(entry.id);
    // Optimistic — the toggle should feel instant
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isPrivate: next } : e));
    setSelectedEntry((e: any) => e && e.id === entry.id ? { ...e, isPrivate: next } : e);
    try {
      await api.put(`/journal/${entry.id}`, { isPrivate: next });
    } catch {
      // Roll back if the server refused
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, isPrivate: !next } : e));
      setSelectedEntry((e: any) => e && e.id === entry.id ? { ...e, isPrivate: !next } : e);
    } finally {
      setSavingPrivacy(null);
    }
  };

  /* Mood emoji/color helpers */
  const MOOD_EMOJI: Record<string, string> = { Amazing: '😄', Great: '😄', Good: '🙂', Okay: '😐', Low: '😔', Hard: '😢' };
  const MOOD_COLOR: Record<string, string> = { Amazing: '#4CAF50', Great: '#4CAF50', Good: CC.forestSage, Okay: CC.mutedOlive, Low: CC.terracotta, Hard: '#c0392b' };

  const mapApiEntries = (raw: any[]) => raw.map(e => ({
    id: e.id,
    date: (e.createdAt || e.updatedAt || '').split('T')[0] || e.date || '',
    moodEmoji: MOOD_EMOJI[e.mood] || '😐',
    moodLabel: e.mood || 'Okay',
    title: e.title,
    content: e.content,
    tags: e.tags || [],
    color: MOOD_COLOR[e.mood] || CC.mutedOlive,
    isPrivate: !!e.isPrivate,
  }));

  const [lockedToday, setLockedToday] = useState(false);

  // History tab
  const [history, setHistory] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyMore, setHistoryMore] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);

  // Reports tab
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month'>('week');
  const [report, setReport] = useState<any>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3000);
  };

  const loadHistory = (offset = 0) => {
    setHistoryBusy(true);
    api.get(`/mood/history?limit=30&offset=${offset}`)
      .then(r => {
        setHistory(prev => offset ? [...prev, ...(r.data.entries || [])] : (r.data.entries || []));
        setHistoryTotal(r.data.total || 0);
        setHistoryMore(!!r.data.hasMore);
      })
      .catch(() => {})
      .finally(() => setHistoryBusy(false));
  };

  useEffect(() => { if (activeTab === 'history') loadHistory(0); }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'reports') return;
    setReportBusy(true);
    api.get(`/mood/report?period=${reportPeriod}`)
      .then(r => setReport(r.data))
      .catch(() => setReport(null))
      .finally(() => setReportBusy(false));
  }, [activeTab, reportPeriod]);

  const downloadReport = async () => {
    try {
      await api.download(`/mood/report.pdf?period=${reportPeriod}`);
      flash('Report downloaded');
    } catch (e: any) { flash(e.message || 'Download failed', true); }
  };

  const fetchMoodStats = () => {
    api.get('/mood/stats').then(res => {
      const d = res.data;
      setMoodStreak(d.streak || 0);
      setLockedToday(!!d.alreadyLoggedToday);
      if (d.weekData?.length) {
        setWeekData(d.weekData.map((x: any) => ({ day: x.day, mood: x.value })));
      }
    }).catch(() => {});
  };

  useEffect(() => {
    // Load journal entries
    api.get('/journal').then(res => {
      const raw = res.data?.entries || [];
      if (raw.length > 0) setEntries(mapApiEntries(raw));
    }).catch(() => {});

    // Load mood stats + chart
    fetchMoodStats();

    // Load badges from AI summary
    api.get('/ai/summary').then(res => {
      const b = res.data?.badges;
      if (b?.length) setMoodBadges(b);
    }).catch(() => {});
  }, []);

  const logMood = async () => {
    if (!selectedMood) return;
    const moodMap: Record<number, { label: string; emoji: string }> = {
      5: { label: 'Amazing', emoji: '😄' },
      4: { label: 'Good', emoji: '🙂' },
      3: { label: 'Okay', emoji: '😐' },
      2: { label: 'Low', emoji: '😔' },
      1: { label: 'Hard', emoji: '😢' },
    };
    try {
      await api.post('/mood', {
        value: selectedMood,
        ...moodMap[selectedMood],
        intensity,
        tags: moodTags,
        notes: trackerNotes,
      });
      fetchMoodStats(); // refresh chart + streak
      setLogged(true);
      setLockedToday(true);
      setTimeout(() => setLogged(false), 3000);
    } catch (err: any) {
      if (err?.status === 409) setLockedToday(true);
    }
    setTrackerNotes('');
    setSelectedMood(null);
    setMoodTags([]);
    setIntensity(5);
  };

  const saveEntry = async () => {
    if (!draft.title.trim() || !draft.content.trim()) return;
    const m = moods.find(m => m.value === (selectedMood ?? 3)) ?? moods[1];
    try {
      const res = await api.post('/journal', {
        title: draft.title,
        content: draft.content,
        moodEmoji: m.emoji,
        moodLabel: m.label,
        moodColor: m.color,
        tags: draft.tags,
        isPrivate: draft.isPrivate,
      });
      const newEntry = {
        id: res.data.entry.id,
        date: res.data.entry.date,
        moodEmoji: m.emoji,
        moodLabel: m.label,
        title: draft.title,
        content: draft.content,
        tags: draft.tags,
        color: m.color,
        isPrivate: draft.isPrivate,
      };
      setEntries(prev => [newEntry, ...prev]);
    } catch {
      // Fallback: keep local if API fails
      const newEntry = {
        id: Date.now(), date: new Date().toISOString().split('T')[0],
        moodEmoji: m.emoji, moodLabel: m.label,
        title: draft.title, content: draft.content,
        tags: draft.tags, color: m.color,
      };
      setEntries(prev => [newEntry, ...prev]);
    }
    setDraft({ title: '', content: '', moodEmoji: '', moodLabel: '', tags: [], isPrivate: false });
    setComposing(false);
    setSelectedMood(null);
  };

  const deleteEntry = async (id: number) => {
    try {
      await api.delete(`/journal/${id}`);
    } catch { /* proceed with local removal even if API fails */ }
    setEntries(prev => prev.filter(e => e.id !== id));
    if (selectedEntry?.id === id) setSelectedEntry(null);
  };

  const toggleTag = (tag: string) =>
    setDraft(d => ({
      ...d, tags: d.tags.includes(tag) ? d.tags.filter(t => t !== tag) : [...d.tags, tag],
    }));

  const filteredEntries = entries.filter(e =>
    !journalSearch ||
    e.title.toLowerCase().includes(journalSearch.toLowerCase()) ||
    e.content.toLowerCase().includes(journalSearch.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>Track & reflect</p>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 20 }}>
          Mood & Journal
        </h1>

        {toast && (
          <div className="fixed bottom-6 left-1/2 px-5 py-3 rounded-2xl z-50"
            style={{ transform: 'translateX(-50%)',
                     backgroundColor: toast.bad ? 'rgba(217,119,87,0.95)' : CC.forestSage,
                     color: 'white', fontSize: '0.85rem', fontWeight: 600,
                     boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
            {toast.text}
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-2xl mb-8" style={{ backgroundColor: CC.softSage, width: 'fit-content' }}>
          {([
            { key: 'tracker', icon: TrendingUp, label: 'Mood Tracker' },
            { key: 'history', icon: Clock, label: 'History' },
            { key: 'reports', icon: FileText, label: 'Reports' },
            { key: 'journal', icon: BookOpen, label: 'My Journal' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-200"
              style={{
                backgroundColor: activeTab === tab.key ? CC.lightIvory : 'transparent',
                color: activeTab === tab.key ? CC.primaryText : CC.mutedOlive,
                fontWeight: activeTab === tab.key ? 600 : 400,
                boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
              }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── MOOD TRACKER TAB ── */}
          {activeTab === 'tracker' && (
            <motion.div
              key="tracker"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Check-in card */}
                <div className="space-y-5">
                  <div className="p-6 rounded-3xl" style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}>
                    <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 3 }}>
                      How are you today?
                    </h2>
                    <p style={{ color: CC.mutedOlive, fontSize: '0.8rem', marginBottom: 18 }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="flex flex-col gap-2.5 mb-5">
                      {moods.map(m => (
                        <motion.button
                          key={m.value}
                          onClick={() => setSelectedMood(m.value)}
                          className="flex items-center gap-3 p-3.5 rounded-2xl transition-all"
                          style={{
                            backgroundColor: selectedMood === m.value ? `${m.color}15` : 'transparent',
                            border: `1.5px solid ${selectedMood === m.value ? m.color : CC.softSage}`,
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{m.emoji}</span>
                          <span style={{ color: selectedMood === m.value ? m.color : CC.primaryText, fontWeight: selectedMood === m.value ? 600 : 400, fontSize: '0.88rem' }}>
                            {m.label}
                          </span>
                          {selectedMood === m.value && (
                            <div className="ml-auto w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.color }}>
                              <svg width="8" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                    <textarea
                      value={trackerNotes}
                      onChange={e => setTrackerNotes(e.target.value)}
                      placeholder="What's on your mind? (optional)"
                      rows={2}
                      className="w-full px-4 py-3 rounded-2xl outline-none resize-none mb-4"
                      style={{ backgroundColor: CC.softSage, border: '1.5px solid transparent', color: CC.primaryText, fontSize: '0.85rem', lineHeight: 1.6 }}
                      onFocus={e => (e.target.style.border = `1.5px solid ${CC.forestSage}`)}
                      onBlur={e => (e.target.style.border = '1.5px solid transparent')}
                    />
                    {/* How strongly? — a separate dimension from which mood */}
                    {selectedMood && !lockedToday && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mb-4 overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText }}>
                            How strongly?
                          </label>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: CC.forestSage }}>{intensity}/10</span>
                        </div>
                        <input
                          type="range" min={1} max={10} value={intensity}
                          onChange={e => setIntensity(Number(e.target.value))}
                          aria-label="Mood intensity"
                          className="w-full"
                          style={{ accentColor: CC.forestSage }}
                        />
                        <div className="flex justify-between" style={{ fontSize: '0.68rem', color: CC.mutedOlive }}>
                          <span>Barely</span><span>Moderately</span><span>Overwhelming</span>
                        </div>

                        <p className="mt-3 mb-2" style={{ fontSize: '0.82rem', fontWeight: 600, color: CC.primaryText }}>
                          What's behind it? <span style={{ fontWeight: 400, color: CC.mutedOlive }}>(optional)</span>
                        </p>
                        <div className="flex gap-1.5 flex-wrap">
                          {['work', 'study', 'sleep', 'family', 'health', 'money', 'relationships', 'social'].map(t => {
                            const on = moodTags.includes(t);
                            return (
                              <button key={t}
                                onClick={() => setMoodTags(p => on ? p.filter(x => x !== t) : [...p, t].slice(0, 6))}
                                className="px-2.5 py-1 rounded-full"
                                style={{
                                  backgroundColor: on ? CC.forestSage : CC.softSage,
                                  color: on ? 'white' : CC.mutedOlive,
                                  border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: on ? 600 : 400,
                                }}>
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {logged ? (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-2">
                          <p style={{ color: CC.forestSage, fontWeight: 600 }}>✨ Mood logged!</p>
                        </motion.div>
                      ) : (
                        <motion.button
                          onClick={logMood}
                          disabled={!selectedMood || lockedToday}
                          className="w-full py-3.5 rounded-2xl text-white"
                          style={{ background: selectedMood && !lockedToday ? `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` : CC.mutedOlive, fontWeight: 600, cursor: selectedMood && !lockedToday ? 'pointer' : 'not-allowed' }}
                          whileHover={selectedMood && !lockedToday ? { scale: 1.02 } : {}}
                        >
                          {lockedToday ? "Logged for today 🔒 Come back tomorrow" : "Log Today's Mood"}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Streak */}
                  <div className="p-5 rounded-3xl text-white" style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginBottom: 3 }}>Current streak</p>
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem' }}>
                          {moodStreak > 0 ? `${moodStreak} day${moodStreak !== 1 ? 's' : ''} 🔥` : 'Start today! 🌱'}
                        </p>
                      </div>
                      <TrendingUp size={26} color={CC.softSage} style={{ opacity: 0.5 }} />
                    </div>
                  </div>
                </div>

                {/* Charts + badges */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Chart */}
                  <div className="p-6 rounded-3xl" style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 24px rgba(53,92,77,0.06)' }}>
                    <div className="flex items-center justify-between mb-5">
                      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText }}>Mood Trends</h2>
                      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: CC.softSage }}>
                        {(['week', 'month'] as const).map(v => (
                          <button key={v} onClick={() => setChartView(v)} className="px-3 py-1.5 rounded-lg text-xs transition-all" style={{ backgroundColor: chartView === v ? CC.forestSage : 'transparent', color: chartView === v ? 'white' : CC.mutedOlive, fontWeight: chartView === v ? 600 : 400 }}>
                            {v === 'week' ? 'Week' : 'Month'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      {chartView === 'week' ? (
                        <LineChart data={weekData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CC.softSage} />
                          <XAxis dataKey="day" tick={{ fill: CC.mutedOlive, fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: CC.mutedOlive, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: CC.lightIvory, border: `1px solid ${CC.softSage}`, borderRadius: 12, fontSize: '0.82rem' }} formatter={(v: any) => [v + '%', '']} />
                          <Line type="monotone" dataKey="mood" stroke={CC.forestSage} strokeWidth={2.5} dot={{ fill: CC.forestSage, r: 4, strokeWidth: 0 }} name="Mood" />
                          <Line type="monotone" dataKey="energy" stroke={CC.terracotta} strokeWidth={2} dot={{ fill: CC.terracotta, r: 3, strokeWidth: 0 }} name="Energy" strokeDasharray="4 4" />
                        </LineChart>
                      ) : (
                        <BarChart data={monthData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CC.softSage} />
                          <XAxis dataKey="week" tick={{ fill: CC.mutedOlive, fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: CC.mutedOlive, fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: CC.lightIvory, border: `1px solid ${CC.softSage}`, borderRadius: 12, fontSize: '0.82rem' }} formatter={(v: any) => [v + '%', 'Avg. Mood']} />
                          <Bar dataKey="mood" fill={CC.forestSage} radius={[8, 8, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* AI Insights */}
                  <div className="p-6 rounded-3xl" style={{ backgroundColor: CC.darkForest }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={17} color={CC.terracotta} />
                      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: 'white' }}>AI Insights</h2>
                    </div>
                    <div className="space-y-3">
                      {[
                        { icon: '📈', text: 'Mood improved 27% vs. last week. Your breathing techniques are having a measurable effect.' },
                        { icon: '😴', text: 'Wednesday dips are consistent. Consider a lighter schedule or mindful break on Wednesdays.' },
                        { icon: '🌿', text: 'Your highest mood days all include outdoor activity. Aim for 20 min outside daily.' },
                      ].map((item, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex gap-3 p-3.5 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                          <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.83rem', lineHeight: 1.6 }}>{item.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="p-6 rounded-3xl" style={{ backgroundColor: CC.lightIvory, boxShadow: '0 4px 20px rgba(53,92,77,0.06)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Award size={17} color={CC.terracotta} />
                      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText }}>Growth Badges</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {moodBadges.map((badge: any) => (
                        <div key={badge.title} className="p-3.5 rounded-2xl flex gap-3 items-center" style={{ backgroundColor: badge.earned ? `${CC.forestSage}10` : CC.softSage, border: `1px solid ${badge.earned ? CC.forestSage + '30' : 'transparent'}`, opacity: badge.earned ? 1 : 0.5 }}>
                          <span style={{ fontSize: '1.5rem', filter: badge.earned ? 'none' : 'grayscale(1)' }}>{badge.emoji}</span>
                          <div>
                            <p style={{ fontWeight: 600, color: badge.earned ? CC.forestSage : CC.mutedOlive, fontSize: '0.82rem' }}>{badge.title}</p>
                            <p style={{ color: CC.mutedOlive, fontSize: '0.7rem', lineHeight: 1.4 }}>{badge.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── JOURNAL TAB ── */}

          {/* ── HISTORY ── */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: CC.primaryText }}>
                    Every entry you've logged
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, marginTop: 2 }}>
                    {historyTotal} {historyTotal === 1 ? 'entry' : 'entries'} on record
                  </p>
                </div>
              </div>

              {!history.length && !historyBusy && (
                <div className="p-10 rounded-3xl text-center" style={{ backgroundColor: CC.lightIvory }}>
                  <p style={{ fontSize: '2rem', marginBottom: 8 }}>🌱</p>
                  <p style={{ color: CC.mutedOlive, fontSize: '0.88rem' }}>
                    No entries yet. Log your first mood on the Tracker tab.
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                {history.map((h: any) => (
                  <div key={h.id} className="p-4 rounded-3xl flex items-start gap-4"
                    style={{ backgroundColor: CC.lightIvory, boxShadow: '0 2px 12px rgba(53,92,77,0.05)' }}>
                    <div className="text-center flex-shrink-0" style={{ width: 46 }}>
                      <div style={{ fontSize: '1.6rem', lineHeight: 1.1 }}>{h.emoji}</div>
                      <div style={{ fontSize: '0.68rem', color: CC.mutedOlive, marginTop: 2 }}>{h.label}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontWeight: 600, fontSize: '0.86rem', color: CC.primaryText }}>{h.dateLabel}</span>
                        {typeof h.intensity === 'number' && (
                          <span className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: CC.softSage, color: CC.forestSage, fontSize: '0.68rem', fontWeight: 700 }}>
                            intensity {h.intensity}/10
                          </span>
                        )}
                      </div>
                      {!!(h.tags || []).length && (
                        <div className="flex gap-1.5 flex-wrap mt-1.5">
                          {h.tags.map((t: string) => (
                            <span key={t} className="px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: CC.softSage, color: CC.mutedOlive, fontSize: '0.68rem' }}>#{t}</span>
                          ))}
                        </div>
                      )}
                      {h.notes && (
                        <p style={{ fontSize: '0.83rem', color: CC.primaryText, marginTop: 6, lineHeight: 1.6 }}>{h.notes}</p>
                      )}
                      {h.journal && (
                        <div className="mt-2 pl-2.5" style={{ borderLeft: `2px solid ${CC.forestSage}` }}>
                          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: CC.forestSage }}>
                            Journal: {h.journal.title}
                          </p>
                          <p style={{ fontSize: '0.78rem', color: CC.mutedOlive, lineHeight: 1.5 }}>
                            {String(h.journal.content || '').slice(0, 120)}
                            {String(h.journal.content || '').length > 120 ? '…' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {historyMore && (
                <button onClick={() => loadHistory(history.length)} disabled={historyBusy}
                  className="w-full mt-4 py-3 rounded-2xl"
                  style={{ backgroundColor: CC.softSage, color: CC.primaryText, border: 'none',
                           cursor: historyBusy ? 'wait' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                  {historyBusy ? 'Loading…' : `Load more (${historyTotal - history.length} left)`}
                </button>
              )}
            </motion.div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.15rem', color: CC.primaryText }}>
                    Mood report
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: CC.mutedOlive, marginTop: 2 }}>
                    The last 6 {reportPeriod === 'month' ? 'months' : 'weeks'}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: CC.softSage }}>
                    {(['week', 'month'] as const).map(v => (
                      <button key={v} onClick={() => setReportPeriod(v)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ backgroundColor: reportPeriod === v ? CC.forestSage : 'transparent',
                                 color: reportPeriod === v ? 'white' : CC.mutedOlive,
                                 border: 'none', cursor: 'pointer', fontWeight: reportPeriod === v ? 600 : 400 }}>
                        {v === 'week' ? 'Weekly' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                  <button onClick={downloadReport}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl"
                    style={{ backgroundColor: CC.forestSage, color: 'white', border: 'none',
                             cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                    <Download size={13} /> PDF
                  </button>
                </div>
              </div>

              {reportBusy && <p style={{ color: CC.mutedOlive, fontSize: '0.85rem' }}>Building your report…</p>}

              {!reportBusy && report && (
                <>
                  <div className="p-5 rounded-3xl mb-5" style={{ backgroundColor: CC.lightIvory }}>
                    <p style={{ fontSize: '0.92rem', color: CC.primaryText, lineHeight: 1.7 }}>{report.narrative}</p>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'Average mood', value: report.overall != null ? `${report.overall}/10` : '—' },
                      { label: 'Entries', value: report.totalEntries },
                      { label: 'Streak', value: `${report.streak} day${report.streak === 1 ? '' : 's'}` },
                      { label: 'Change', value: report.change == null ? '—' : `${report.change > 0 ? '+' : ''}${report.change}` },
                    ].map(k => (
                      <div key={k.label} className="p-4 rounded-2xl" style={{ backgroundColor: CC.lightIvory }}>
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.4rem', color: CC.forestSage }}>{k.value}</p>
                        <p style={{ fontSize: '0.74rem', color: CC.mutedOlive, marginTop: 2 }}>{k.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bars — a gap where nothing was logged, never a zero */}
                  <div className="p-5 rounded-3xl mb-5" style={{ backgroundColor: CC.lightIvory }}>
                    <div className="flex items-end gap-3" style={{ height: 160 }}>
                      {report.series.map((b: any, i: number) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                          {b.avg == null ? (
                            <div style={{ fontSize: '0.66rem', color: CC.mutedOlive, marginBottom: 6 }}>no data</div>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: CC.forestSage, marginBottom: 4 }}>{b.avg}</span>
                              <div style={{
                                width: '100%', borderRadius: '8px 8px 0 0',
                                height: `${Math.max(4, (b.avg / 10) * 118)}px`,
                                background: `linear-gradient(180deg, ${CC.forestSage}, ${CC.darkForest})`,
                              }} />
                            </>
                          )}
                          <span style={{ fontSize: '0.66rem', color: CC.mutedOlive, marginTop: 6, textAlign: 'center' }}>{b.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!!report.topTags?.length && (
                    <div className="p-5 rounded-3xl" style={{ backgroundColor: CC.lightIvory }}>
                      <p style={{ fontWeight: 700, color: CC.primaryText, marginBottom: 10, fontSize: '0.92rem' }}>
                        What came up most
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {report.topTags.map((t: any) => (
                          <span key={t.tag} className="px-3 py-1.5 rounded-full"
                            style={{ backgroundColor: CC.softSage, color: CC.forestSage, fontSize: '0.8rem', fontWeight: 600 }}>
                            {t.tag} · {t.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'journal' && (
            <motion.div
              key="journal"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Entry list + compose */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Search + new entry */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={14} color={CC.mutedOlive} className="absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={journalSearch}
                        onChange={e => setJournalSearch(e.target.value)}
                        placeholder="Search entries..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none text-sm"
                        style={{ backgroundColor: CC.lightIvory, border: `1px solid ${CC.softSage}`, color: CC.primaryText }}
                        onFocus={e => (e.target.style.borderColor = CC.forestSage)}
                        onBlur={e => (e.target.style.borderColor = CC.softSage)}
                      />
                    </div>
                    <motion.button
                      onClick={() => { setComposing(true); setSelectedEntry(null); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                      whileHover={{ scale: 1.04 }}
                    >
                      <Plus size={15} /> New Entry
                    </motion.button>
                  </div>

                  {/* Entry cards list */}
                  <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 520 }}>
                    {filteredEntries.length === 0 && (
                      <div className="text-center py-12">
                        <PenLine size={32} color={CC.softSage} className="mx-auto mb-3" />
                        <p style={{ color: CC.mutedOlive, fontSize: '0.88rem' }}>No entries yet. Start writing!</p>
                      </div>
                    )}
                    {filteredEntries.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => { setSelectedEntry(entry); setComposing(false); }}
                        className="p-4 rounded-2xl cursor-pointer transition-all"
                        style={{
                          backgroundColor: selectedEntry?.id === entry.id ? CC.lightIvory : 'transparent',
                          border: `1px solid ${selectedEntry?.id === entry.id ? CC.forestSage + '40' : CC.softSage}`,
                          boxShadow: selectedEntry?.id === entry.id ? '0 4px 16px rgba(53,92,77,0.08)' : 'none',
                        }}
                        whileHover={{ backgroundColor: `${CC.forestSage}05` }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '1.1rem' }}>{entry.moodEmoji}</span>
                            <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.88rem', lineHeight: 1.3 }}>{entry.title}</p>
                          </div>
                          {entry.isPrivate && (
                            <span
                              title="Private — your counselor cannot see this"
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md shrink-0"
                              style={{ backgroundColor: 'rgba(217,119,87,0.12)' }}
                            >
                              <Lock size={10} color={CC.terracotta} />
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, marginBottom: 8, lineHeight: 1.5 }}>
                          {entry.content.slice(0, 70)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1 flex-wrap">
                            {entry.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-full" style={{ fontSize: '0.65rem', backgroundColor: `${entry.color}15`, color: entry.color, fontWeight: 600 }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: CC.mutedOlive }}>
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Write / Read panel */}
                <div className="lg:col-span-3">
                  <AnimatePresence mode="wait">
                    {/* ── Composer ── */}
                    {composing && (
                      <motion.div
                        key="compose"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-3xl overflow-hidden"
                        style={{ backgroundColor: CC.lightIvory, boxShadow: '0 8px 40px rgba(53,92,77,0.1)' }}
                      >
                        {/* Composer header */}
                        <div className="relative h-36 overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1598826739205-d09823c3bc3d?w=800&q=80" alt="" className="w-full h-full object-cover" style={{ opacity: 0.55 }} />
                          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(40,70,58,0.4), rgba(40,70,58,0.8))` }} />
                          <div className="absolute bottom-4 left-5">
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>New Journal Entry</p>
                            <p style={{ color: 'white', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '1.1rem' }}>
                              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <div className="p-6">
                          {/* Mood for entry */}
                          <div className="mb-5">
                            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: CC.primaryText, marginBottom: 8 }}>How are you feeling right now?</p>
                            <div className="flex gap-2">
                              {moods.map(m => (
                                <motion.button
                                  key={m.value}
                                  onClick={() => setSelectedMood(selectedMood === m.value ? null : m.value)}
                                  className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                                  style={{
                                    backgroundColor: selectedMood === m.value ? `${m.color}18` : 'transparent',
                                    border: `1.5px solid ${selectedMood === m.value ? m.color : CC.softSage}`,
                                  }}
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.93 }}
                                >
                                  <span style={{ fontSize: '1.3rem' }}>{m.emoji}</span>
                                  <span style={{ fontSize: '0.62rem', color: selectedMood === m.value ? m.color : CC.mutedOlive, fontWeight: selectedMood === m.value ? 600 : 400 }}>{m.label}</span>
                                </motion.button>
                              ))}
                            </div>
                          </div>

                          {/* Title */}
                          <input
                            value={draft.title}
                            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                            placeholder="Give this entry a title..."
                            className="w-full outline-none mb-3"
                            style={{ fontSize: '1.15rem', fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, background: 'transparent', border: 'none', borderBottom: `1.5px solid ${CC.softSage}`, paddingBottom: 8 }}
                            onFocus={e => (e.target.style.borderBottomColor = CC.forestSage)}
                            onBlur={e => (e.target.style.borderBottomColor = CC.softSage)}
                          />

                          {/* Body */}
                          <textarea
                            value={draft.content}
                            onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
                            placeholder="Write freely... this is your safe space. What happened today? How did it make you feel? What are you grateful for? What would you like to let go of?"
                            rows={7}
                            className="w-full outline-none resize-none mb-4"
                            style={{ fontSize: '0.9rem', color: CC.primaryText, lineHeight: 1.8, background: 'transparent', border: 'none', padding: '8px 0' }}
                          />

                          {/* Tags */}
                          <div className="mb-5">
                            <div className="flex items-center gap-2 mb-2">
                              <Tag size={13} color={CC.mutedOlive} />
                              <span style={{ fontSize: '0.75rem', color: CC.mutedOlive, fontWeight: 600 }}>Add tags</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {journalTags.map(tag => (
                                <motion.button
                                  key={tag}
                                  onClick={() => toggleTag(tag)}
                                  className="px-2.5 py-1 rounded-full text-xs"
                                  style={{
                                    backgroundColor: draft.tags.includes(tag) ? CC.forestSage : CC.softSage,
                                    color: draft.tags.includes(tag) ? 'white' : CC.primaryText,
                                    fontWeight: draft.tags.includes(tag) ? 600 : 400,
                                  }}
                                  whileHover={{ scale: 1.06 }}
                                >
                                  {draft.tags.includes(tag) && '✓ '}{tag}
                                </motion.button>
                              ))}
                            </div>
                          </div>

                          {/* Share with counselor */}
                          <div className="mb-5">
                            <button
                              onClick={() => setDraft(d => ({ ...d, isPrivate: !d.isPrivate }))}
                              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-colors"
                              style={{
                                backgroundColor: draft.isPrivate ? 'rgba(217,119,87,0.08)' : CC.softSage,
                                border: `1.5px solid ${draft.isPrivate ? CC.terracotta : 'transparent'}`,
                              }}
                            >
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: draft.isPrivate ? CC.terracotta : CC.forestSage }}
                              >
                                {draft.isPrivate
                                  ? <Lock size={15} color="white" />
                                  : <Eye size={15} color="white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: '0.83rem', fontWeight: 600, color: CC.primaryText }}>
                                  {draft.isPrivate ? 'Private — just for you' : 'Visible to your counselor'}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, marginTop: 1 }}>
                                  {draft.isPrivate
                                    ? 'Your counselor will not be able to read this entry.'
                                    : 'Tap to keep this entry private instead.'}
                                </p>
                              </div>
                              <div
                                className="shrink-0 rounded-full relative transition-colors"
                                style={{
                                  width: 42, height: 24,
                                  backgroundColor: draft.isPrivate ? CC.terracotta : CC.forestSage,
                                }}
                              >
                                <div
                                  className="absolute rounded-full bg-white transition-all"
                                  style={{ width: 18, height: 18, top: 3, left: draft.isPrivate ? 21 : 3 }}
                                />
                              </div>
                            </button>
                          </div>

                          {/* Save */}
                          <div className="flex gap-3">
                            <motion.button
                              onClick={saveEntry}
                              disabled={!draft.title.trim() || !draft.content.trim()}
                              className="flex-1 py-3.5 rounded-2xl text-white text-sm"
                              style={{ background: (draft.title && draft.content) ? `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` : CC.mutedOlive, fontWeight: 600, cursor: (draft.title && draft.content) ? 'pointer' : 'not-allowed' }}
                              whileHover={(draft.title && draft.content) ? { scale: 1.02 } : {}}
                            >
                              Save Entry
                            </motion.button>
                            <button onClick={() => setComposing(false)} className="px-5 py-3.5 rounded-2xl text-sm" style={{ backgroundColor: CC.softSage, color: CC.mutedOlive }}>
                              Discard
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Entry viewer ── */}
                    {selectedEntry && !composing && (
                      <motion.div
                        key={selectedEntry.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-3xl overflow-hidden"
                        style={{ backgroundColor: CC.lightIvory, boxShadow: '0 8px 40px rgba(53,92,77,0.1)' }}
                      >
                        {/* Entry photo header */}
                        <div className="relative h-40 overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1598826739205-d09823c3bc3d?w=800&q=80" alt="" className="w-full h-full object-cover" style={{ opacity: 0.5 }} />
                          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(40,70,58,0.3), rgba(40,70,58,0.85))` }} />
                          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span style={{ fontSize: '1.3rem' }}>{selectedEntry.moodEmoji}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{selectedEntry.moodLabel}</span>
                              </div>
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                                <Calendar size={10} style={{ display: 'inline', marginRight: 4 }} />
                                {new Date(selectedEntry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                            </div>
                            <motion.button
                              onClick={() => deleteEntry(selectedEntry.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(217,119,87,0.25)' }}
                              whileHover={{ backgroundColor: 'rgba(217,119,87,0.5)' }}
                            >
                              <Trash2 size={13} color={CC.terracotta} />
                            </motion.button>
                          </div>
                        </div>

                        <div className="p-6">
                          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.3rem', color: CC.primaryText, marginBottom: 14 }}>
                            {selectedEntry.title}
                          </h2>
                          <div className="mb-5" style={{ color: CC.primaryText, fontSize: '0.9rem', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
                            {selectedEntry.content}
                          </div>
                          {selectedEntry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-4 border-t" style={{ borderColor: CC.softSage }}>
                              {selectedEntry.tags.map(tag => (
                                <span key={tag} className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: `${selectedEntry.color}15`, color: selectedEntry.color, fontWeight: 600 }}>
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* ── Change your mind about sharing, any time ── */}
                          <div className="mt-5 pt-5 border-t" style={{ borderColor: CC.softSage }}>
                            <button
                              onClick={() => toggleEntryPrivacy(selectedEntry)}
                              disabled={savingPrivacy === selectedEntry.id}
                              className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-colors"
                              style={{
                                backgroundColor: selectedEntry.isPrivate ? 'rgba(217,119,87,0.08)' : CC.softSage,
                                border: `1.5px solid ${selectedEntry.isPrivate ? CC.terracotta : 'transparent'}`,
                                cursor: savingPrivacy === selectedEntry.id ? 'wait' : 'pointer',
                                opacity: savingPrivacy === selectedEntry.id ? 0.7 : 1,
                              }}
                            >
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: selectedEntry.isPrivate ? CC.terracotta : CC.forestSage }}>
                                {selectedEntry.isPrivate
                                  ? <Lock size={15} color="white" />
                                  : <Eye size={15} color="white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: '0.83rem', fontWeight: 600, color: CC.primaryText }}>
                                  {selectedEntry.isPrivate ? 'Private — just for you' : 'Shared with your counselor'}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: CC.mutedOlive, marginTop: 1 }}>
                                  {savingPrivacy === selectedEntry.id
                                    ? 'Saving…'
                                    : selectedEntry.isPrivate
                                      ? 'Tap to share this entry with your counselor'
                                      : 'Tap to make this entry private'}
                                </p>
                              </div>
                              <div className="shrink-0 rounded-full relative transition-colors"
                                style={{ width: 42, height: 24, backgroundColor: selectedEntry.isPrivate ? CC.terracotta : CC.forestSage }}>
                                <div className="absolute rounded-full bg-white transition-all"
                                  style={{ width: 18, height: 18, top: 3, left: selectedEntry.isPrivate ? 21 : 3 }} />
                              </div>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Empty state ── */}
                    {!selectedEntry && !composing && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-96 rounded-3xl"
                        style={{ backgroundColor: CC.lightIvory, border: `2px dashed ${CC.softSage}` }}
                      >
                        <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-5" style={{ backgroundColor: CC.softSage }}>
                          <BookOpen size={28} color={CC.mutedOlive} />
                        </div>
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 8 }}>
                          Your journal is your safe space
                        </p>
                        <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', textAlign: 'center', maxWidth: 280, lineHeight: 1.6, marginBottom: 20 }}>
                          Writing about your day helps process emotions and builds self-awareness over time.
                        </p>
                        <motion.button
                          onClick={() => setComposing(true)}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm"
                          style={{ background: `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})`, fontWeight: 600 }}
                          whileHover={{ scale: 1.04 }}
                        >
                          <PenLine size={15} /> Write Your First Entry
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

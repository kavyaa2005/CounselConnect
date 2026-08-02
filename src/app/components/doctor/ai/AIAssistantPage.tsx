import { useState, useEffect, useMemo } from 'react';
import { Bot, AlertTriangle, TrendingUp, Brain, Zap, Heart, FileText, ChevronRight, Send, Sparkles } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

// Technique library, scored per patient rather than fixed. Each entry declares
// which presenting concerns it suits and the mood band it works best in, so the
// match percentage moves when you switch patient.
const TECHNIQUE_LIBRARY = [
  { name: 'Cognitive Restructuring', icon: '🧠', tags: ['anxiety', 'stress', 'overwhelm', 'depression'], band: [4, 10], desc: 'Challenges the thoughts driving the distress' },
  { name: 'Mindfulness-Based CBT', icon: '🧘', tags: ['anxiety', 'stress', 'burnout', 'overwhelm'], band: [4, 10], desc: 'Pairs awareness practice with cognitive work' },
  { name: '5-4-3-2-1 Grounding', icon: '⚓', tags: ['anxiety', 'panic', 'trauma', 'ptsd', 'overwhelm'], band: [0, 6], desc: 'Fast regulation during acute episodes' },
  { name: 'Behavioural Activation', icon: '⚡', tags: ['depression', 'low', 'burnout', 'grief'], band: [0, 6], desc: 'Rebuilds routine and counters avoidance' },
  { name: 'Sleep Hygiene Protocol', icon: '🌙', tags: ['insomnia', 'sleep', 'stress', 'burnout'], band: [0, 10], desc: 'Structured wind-down and sleep scheduling' },
  { name: 'Relapse Prevention Planning', icon: '🛡️', tags: ['addiction', 'depression', 'anxiety'], band: [6, 10], desc: 'Consolidates gains once mood is stable' },
  { name: 'Exposure Hierarchy', icon: '🪜', tags: ['phobia', 'anxiety', 'ptsd', 'trauma'], band: [5, 10], desc: 'Graded exposure once coping skills are in place' },
  { name: 'Self-Compassion Practice', icon: '💚', tags: ['self-esteem', 'grief', 'depression', 'burnout'], band: [0, 10], desc: 'Targets harsh self-criticism' },
];

export function AIAssistantPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { c: colors, sh: shadows } = useTheme();
  const [patientList, setPatientList] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [thinking, setThinking] = useState(false);

  // Real patients and their data drive every insight on this page
  useEffect(() => {
    api.get('/doctor/patients').then(res => {
      const list = res.data.patients || [];
      setPatientList(list);
      setSelectedPatient(prev => prev || list[0]?.name || '');
    }).catch(() => {});
  }, []);

  const current = patientList.find(u => u.name === selectedPatient);
  useEffect(() => {
    if (!current?.id) return;
    api.get(`/doctor/patients/${current.id}`).then(res => setDetail(res.data.patient)).catch(() => {});
  }, [current?.id]);

  const patients = patientList.map(u => u.name);

  // Trend projection from the patient's real mood history
  const moodPrediction = useMemo(() => {
    const moods = (detail?.moods || []).map((m: any) => m.value * 2);
    const base = moods.length ? moods[moods.length - 1] : 5;
    const slope = moods.length >= 2 ? (moods[moods.length - 1] - moods[0]) / Math.max(1, moods.length - 1) : 0;
    return ['Today', '+1d', '+2d', '+3d', '+4d', '+5d', '+6d'].map((day, i) => ({
      day, score: Math.max(1, Math.min(10, Math.round((base + slope * i) * 10) / 10)),
    }));
  }, [detail]);

  const wellnessRadar = useMemo(() => {
    const avg = current?.avgMood ?? 5;
    const stress = Math.max(0, Math.min(100, Math.round((10 - avg) * 10)));
    const positive = Math.max(0, Math.min(100, Math.round(avg * 10)));
    return [
      { subject: 'Anxiety', A: stress },
      { subject: 'Low Mood', A: Math.max(0, stress - 10) },
      { subject: 'Stress', A: stress },
      { subject: 'Sleep', A: positive - 10 },
      { subject: 'Social', A: positive },
      { subject: 'Energy', A: positive - 5 },
    ];
  }, [current]);

  // Alerts generated from real mood + engagement data
  const aiAlerts = useMemo(() => patientList.slice(0, 5).map((u: any) => {
    if (u.avgMood != null && u.avgMood < 4) {
      return { type: 'high', icon: '🔴', patient: u.name, alert: 'Low mood trend detected', desc: `Average mood ${u.avgMood}/10 across recent entries. Immediate attention recommended.`, action: 'View Patient' };
    }
    if (u.moodCount === 0) {
      return { type: 'medium', icon: '🟡', patient: u.name, alert: 'No mood data logged', desc: 'Patient has not logged any moods yet. Consider encouraging daily tracking.', action: 'Send Message' };
    }
    return { type: 'low', icon: '🟢', patient: u.name, alert: 'Stable engagement', desc: `${u.moodCount} mood entr${u.moodCount === 1 ? 'y' : 'ies'} logged · avg ${u.avgMood}/10. Recommend positive reinforcement.`, action: 'Add Note' };
  }), [patientList]);

  // Every answer is composed on the backend from this doctor's real records,
  // so the reply changes with the question AND with the underlying data.
  // Header tiles, all derived — these used to be four hardcoded strings.
  const stats = useMemo(() => {
    const moods = (detail?.moods || []).map((m: any) => m.value).filter((v: any) => typeof v === 'number');
    const appts = detail?.appointments || [];
    const done = appts.filter((a: any) => a.status === 'completed').length;
    const avg = current?.avgMood;

    // Trend = second half of the mood history against the first half.
    let delta: number | null = null;
    if (moods.length >= 4) {
      const mid = Math.floor(moods.length / 2);
      const a = moods.slice(0, mid).reduce((x: number, y: number) => x + y, 0) / mid;
      const b = moods.slice(mid).reduce((x: number, y: number) => x + y, 0) / (moods.length - mid);
      delta = Math.round((b - a) * 20) / 10; // on the 0–10 scale
    }

    const risk = avg == null ? 'Unknown' : avg < 4 ? 'High' : avg < 6 ? 'Moderate' : 'Low';
    const riskColor = avg == null ? colors.textMuted : avg < 4 ? colors.error : avg < 6 ? colors.warning : colors.success;

    return [
      {
        label: 'Mood Score',
        value: avg != null ? `${avg}/10` : '—',
        change: delta != null ? `${delta >= 0 ? '+' : ''}${delta}` : `${moods.length} entries`,
        color: colors.primary,
      },
      {
        label: 'Engagement',
        value: appts.length ? `${Math.round((done / appts.length) * 100)}%` : '—',
        change: `${done}/${appts.length} done`,
        color: colors.success,
      },
      { label: 'Risk Level', value: risk, change: avg != null ? `avg ${avg}` : 'no data', color: riskColor },
      { label: 'Sessions', value: String(appts.length), change: `${done} completed`, color: '#7C6FFF' },
    ];
  }, [current, detail, colors]);

  // Techniques ranked against this patient's concern and current mood band.
  const techniques = useMemo(() => {
    const focus = String(current?.reason || '').toLowerCase();
    const avg = current?.avgMood ?? 5;
    return TECHNIQUE_LIBRARY
      .map(t => {
        const tagHit = t.tags.some(tag => focus.includes(tag));
        const inBand = avg >= t.band[0] && avg <= t.band[1];
        // Weighted so a concern match matters more than the mood band.
        const score = 55 + (tagHit ? 28 : 0) + (inBand ? 14 : 0);
        return {
          ...t,
          match: Math.min(97, score),
          desc: `${t.desc}${tagHit ? ` — matches "${current?.reason}"` : ''}${!inBand ? ' (better suited to a different mood band right now)' : ''}`,
        };
      })
      .sort((a, b) => b.match - a.match)
      .slice(0, 4);
  }, [current]);

  const handleSend = async (preset?: string) => {
    const question = (preset ?? input).trim();
    if (!question || thinking) return;
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setInput('');
    setThinking(true);
    try {
      const res = await api.post('/doctor/ai/ask', { question, patientId: current?.id });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', text: e.message || 'I could not answer that just now.' }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter', display: 'flex', gap: 24, height: '100%', overflow: 'hidden' }}>
      {/* Left: AI Analysis Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
        {/* Patient Selector */}
        <div style={{ background: colors.white, borderRadius: 20, padding: '20px 24px', boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${colors.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color={colors.primary} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>AI Patient Analysis</h3>
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0 }}>Powered by CounselConnect AI</p>
              </div>
            </div>
            <select
              value={selectedPatient}
              onChange={e => setSelectedPatient(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, background: colors.background, outline: 'none', cursor: 'pointer' }}
            >
              {patients.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {stats.map((stat, i) => (
              <div key={i} style={{ padding: '12px', borderRadius: 14, background: `${stat.color}08`, border: `1px solid ${stat.color}20`, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{stat.label}</div>
                <div style={{ fontFamily: 'Inter', fontSize: 10, color: colors.success, fontWeight: 600, marginTop: 2 }}>{stat.change}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Mood Prediction */}
          <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingUp size={16} color={colors.primary} />
              <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>7-Day Mood Prediction</h3>
              <span style={{ padding: '2px 8px', borderRadius: 8, background: colors.veryLightSage, color: colors.primary, fontSize: 10, fontWeight: 600 }}>AI</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={moodPrediction}>
                <defs>
                  <linearGradient id="moodPredGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: colors.textMuted }} />
                <YAxis domain={[5, 10]} axisLine={false} tickLine={false} tick={{ fontFamily: 'Inter', fontSize: 11, fill: colors.textMuted }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke={colors.primary} strokeWidth={2} fill="url(#moodPredGrad)" strokeDasharray="5 5" dot={{ fill: colors.primary, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Wellness Radar */}
          <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Brain size={16} color="#7C6FFF" />
              <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Wellness Profile</h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={wellnessRadar}>
                <PolarGrid stroke={colors.border} />
                <PolarAngleAxis dataKey="subject" tick={{ fontFamily: 'Inter', fontSize: 10, fill: colors.textMuted }} />
                <Radar name="Patient" dataKey="A" stroke={colors.primary} fill={colors.primary} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Alerts */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={16} color={colors.warning} />
            <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>AI Alerts & Recommendations</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {aiAlerts.map((alert, i) => (
              <div key={i} style={{
                padding: '14px 16px', borderRadius: 14,
                background: alert.type === 'high' ? '#FFEBEE' : alert.type === 'medium' ? '#FFF9E6' : colors.veryLightSage,
                border: `1px solid ${alert.type === 'high' ? '#FFCDD2' : alert.type === 'medium' ? '#FFE082' : colors.mintAccent}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{alert.icon}</span>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: colors.textPrimary }}>{alert.patient}</span>
                      <span style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary }}>· {alert.alert}</span>
                    </div>
                    <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, margin: 0 }}>{alert.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('patients')}
                  style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white, fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: colors.textSecondary, cursor: 'pointer', flexShrink: 0, marginLeft: 16 }}
                >
                  {alert.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Technique Recommendations */}
        <div style={{ background: colors.white, borderRadius: 20, padding: 24, boxShadow: shadows.card, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={16} color={colors.primary} />
            <h3 style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Suggested Techniques</h3>
            <span style={{ fontSize: 12, color: colors.textMuted }}>for {selectedPatient}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {techniques.map((t, i) => (
              <div key={i} style={{ padding: '14px', borderRadius: 14, background: colors.background, border: `1px solid ${colors.border}`, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = colors.primary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = colors.border; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 13, color: colors.textPrimary }}>{t.name}</span>
                  </div>
                  <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, color: colors.primary, background: colors.veryLightSage, padding: '2px 8px', borderRadius: 8 }}>{t.match}%</span>
                </div>
                <p style={{ fontFamily: 'Inter', fontSize: 11, color: colors.textSecondary, margin: 0, lineHeight: 1.4 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: AI Chat */}
      <div style={{ width: 360, background: colors.white, borderRadius: 20, border: `1px solid ${colors.border}`, boxShadow: shadows.card, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${colors.primary}, ${colors.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: colors.textPrimary }}>CounselAI</div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, color: colors.success }}>● Online · Ready</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: colors.veryLightSage, border: `1px solid ${colors.mintAccent}` }}>
            <p style={{ fontFamily: 'Inter', fontSize: 13, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
              I'm your counseling assistant. I read your real patient records — mood history, sessions, notes and reviews — and answer from them. Ask about a patient by name, your schedule, who's at risk, mood trends, ratings, revenue, or what technique to try next.
            </p>
          </div>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '88%',
                padding: '12px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.role === 'user' ? colors.primary : colors.background,
                border: msg.role === 'ai' ? `1px solid ${colors.border}` : 'none',
                fontFamily: 'Inter', fontSize: 13, color: msg.role === 'user' ? 'white' : colors.textPrimary, lineHeight: 1.5,
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: colors.background, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textMuted }}>
              Reading your records…
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0 }}>Suggested questions:</p>
            {[
              selectedPatient ? `Summarise notes for ${selectedPatient}` : 'Summarise my caseload',
              'Which patients are at risk?',
              'What does my schedule look like?',
              selectedPatient ? `How is ${selectedPatient}'s mood trending?` : 'How are mood trends overall?',
              'What are my ratings like?',
              'What technique should I try next?',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', fontFamily: 'Inter', fontSize: 12, color: colors.textSecondary, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = colors.primary; (e.currentTarget as HTMLButtonElement).style.color = colors.primary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border; (e.currentTarget as HTMLButtonElement).style.color = colors.textSecondary; }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={thinking ? 'Thinking…' : 'Ask about a patient, your schedule, risk…'}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, background: colors.background, outline: 'none' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={thinking}
              style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: colors.primary, cursor: thinking ? 'wait' : 'pointer', opacity: thinking ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

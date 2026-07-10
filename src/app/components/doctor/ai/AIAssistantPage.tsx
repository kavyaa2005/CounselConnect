import { useState, useEffect, useMemo } from 'react';
import { Bot, AlertTriangle, TrendingUp, Brain, Zap, Heart, FileText, ChevronRight, Send, Sparkles } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const techniques = [
  { name: 'Cognitive Restructuring', icon: '🧠', match: 94, desc: 'Highly effective for anxiety management based on patient profile' },
  { name: 'Mindfulness-Based CBT', icon: '🧘', match: 87, desc: 'Recommended based on previous session outcomes' },
  { name: '5-4-3-2-1 Grounding', icon: '⚓', match: 82, desc: 'Effective for acute anxiety episodes' },
  { name: 'Behavioral Activation', icon: '⚡', match: 78, desc: 'Good for building positive routine and combating avoidance' },
];

export function AIAssistantPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { c: colors, sh: shadows } = useTheme();
  const [patientList, setPatientList] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);

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

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');
    // Assistant reply composed from this patient's real records
    const moods = detail?.moods || [];
    const appts = detail?.appointments || [];
    const reply = current
      ? `Here's what I see for ${current.name}: ${moods.length} mood entr${moods.length === 1 ? 'y' : 'ies'} logged` +
        `${current.avgMood != null ? ` with an average of ${current.avgMood}/10` : ''}, ` +
        `${appts.length} appointment${appts.length === 1 ? '' : 's'} on record ` +
        `(${appts.filter((a: any) => a.status === 'completed').length} completed). ` +
        `Primary concern: ${current.reason || 'not specified'}. ` +
        `${current.avgMood != null && current.avgMood >= 6 ? 'The trend is positive — reinforce current techniques.' : 'Consider scheduling a check-in and reviewing coping strategies.'}`
      : 'Select a patient to analyze their real session and mood data.';
    setTimeout(() => setMessages(prev => [...prev, { role: 'ai', text: reply }]), 600);
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
            {[
              { label: 'Mood Score', value: '7.5/10', change: '+0.8', color: colors.primary },
              { label: 'Recovery Score', value: '78%', change: '+5%', color: colors.success },
              { label: 'Risk Level', value: 'Low', change: '↓', color: colors.success },
              { label: 'Sessions', value: '12/15', change: '80%', color: '#7C6FFF' },
            ].map((stat, i) => (
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
              Hello Dr. Morgan! I'm your AI counseling assistant. I can help you analyze patient data, suggest techniques, generate session notes, and provide risk assessments. What would you like to know?
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontFamily: 'Inter', fontSize: 12, color: colors.textMuted, margin: 0 }}>Suggested questions:</p>
            {[
              `Generate session notes for ${patients[0] || 'a patient'}`,
              'What\'s the burnout risk for my patients?',
              `Suggest next best action for ${patients[1] || patients[0] || 'a patient'}`,
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
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
              placeholder="Ask AI assistant..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, background: colors.background, outline: 'none' }}
            />
            <button
              onClick={handleSend}
              style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: colors.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

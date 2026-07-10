import { useState, useEffect } from 'react';
import {
  Mic, MicOff, Camera, CameraOff, Monitor, PhoneOff, MessageSquare,
  Users, MoreVertical, Hand, Circle, Share2, PenTool, Bot, Clock,
  Paperclip, Send, X, Maximize2
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

const aiSuggestions = [
  { type: 'technique', icon: '💡', title: 'Suggested Technique', text: 'Consider introducing the 5-4-3-2-1 grounding technique based on patient\'s anxiety pattern.' },
  { type: 'insight', icon: '📊', title: 'Session Insight', text: 'Patient\'s mood has improved 34% since last session. Engagement level: High.' },
  { type: 'followup', icon: '📋', title: 'Follow-up Reminder', text: 'Assign homework: Complete daily mood journal for next 7 days.' },
];

export function VideoSessionPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [patientName, setPatientName] = useState('Patient');
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Real patient from the next confirmed appointment + live thread
  useEffect(() => {
    api.get('/doctor/appointments').then(res => {
      const appts = (res.data.appointments || []).filter((a: any) => a.status === 'confirmed');
      const next = appts.find((a: any) => new Date(a.dateTime) >= new Date()) || appts[appts.length - 1];
      if (next?.patient) {
        setPatientName(next.patient.name);
        api.get(`/doctor/messages/${next.patient.id}`).then(r => {
          setChatMessages((r.data.messages || []).slice(-5).map((m: any, i: number) => ({
            id: m.id || i,
            sender: m.fromDoctor ? 'You' : next.patient.name,
            text: m.text,
            time: m.time,
            self: m.fromDoctor,
          })));
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const { c: colors, sh: shadows } = useTheme();
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [recording, setRecording] = useState(false);

  return (
    <div style={{
      height: '100%',
      background: '#0F1923',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter',
      position: 'relative',
    }}>
      {/* Session Header */}
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4444', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>LIVE</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Session with {patientName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: 20 }}>
            <Clock size={12} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>32:14</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setRecording(!recording)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none',
              background: recording ? '#FF444420' : 'rgba(255,255,255,0.1)',
              color: recording ? '#FF4444' : 'rgba(255,255,255,0.7)',
              fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Circle size={8} fill={recording ? '#FF4444' : 'transparent'} />
            {recording ? 'Recording' : 'Record'}
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none',
              background: showAI ? `${colors.primary}30` : 'rgba(255,255,255,0.1)',
              color: showAI ? colors.lightSage : 'rgba(255,255,255,0.7)',
              fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Bot size={13} /> AI Assistant
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'Inter', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <MessageSquare size={13} /> Chat
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video Area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {/* Patient Video (Main) */}
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: 20,
            background: 'linear-gradient(145deg, #1a2a3a 0%, #0d1f2d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 28, margin: '0 auto 16px' }}>
                SC
              </div>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{patientName}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Patient · Camera Off</div>
            </div>

            {/* Patient name tag */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, padding: '6px 12px', borderRadius: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: colors.success }} />
              <span style={{ fontSize: 12, color: 'white', fontWeight: 500 }}>{patientName}</span>
            </div>

            {/* Fullscreen button */}
            <button style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Doctor PiP */}
          <div style={{
            position: 'absolute',
            bottom: 40,
            right: 40,
            width: 180,
            height: 130,
            borderRadius: 14,
            background: 'linear-gradient(145deg, #2a3a4a 0%, #1d2d3d 100%)',
            border: '2px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: 'pointer',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Inter', fontWeight: 700, fontSize: 14, margin: '0 auto 8px' }}>
                DR
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Dr. Rachel</div>
            </div>
            <div style={{ position: 'absolute', bottom: 8, left: 8, padding: '3px 8px', borderRadius: 12, background: 'rgba(0,0,0,0.5)', fontSize: 10, color: 'white' }}>You</div>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && !showAI && (
          <div style={{
            width: 320, background: '#131f2b', borderLeft: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white' }}>Session Chat</span>
              <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {chatMessages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.self ? 'flex-end' : 'flex-start' }}>
                  {!msg.self && <div style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{msg.sender}</div>}
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: msg.self ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: msg.self ? colors.primary : 'rgba(255,255,255,0.08)',
                    fontFamily: 'Inter', fontSize: 13, color: 'white', lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontFamily: 'Inter', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{msg.time}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '9px 14px', borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.08)', fontFamily: 'Inter', fontSize: 13, color: 'white', outline: 'none' }}
                />
                <button style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: colors.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Sidebar */}
        {showAI && (
          <div style={{
            width: 320, background: '#131f2b', borderLeft: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bot size={16} color={colors.lightSage} />
                <span style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: 600, color: 'white' }}>AI Assistant</span>
              </div>
              <button onClick={() => setShowAI(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiSuggestions.map((s, i) => (
                <div key={i} style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: colors.lightSage }}>{s.title}</span>
                  </div>
                  <p style={{ fontFamily: 'Inter', fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.5 }}>{s.text}</p>
                  <button style={{ marginTop: 10, padding: '6px 12px', borderRadius: 8, border: `1px solid ${colors.primary}40`, background: `${colors.primary}15`, color: colors.lightSage, fontFamily: 'Inter', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    Apply Suggestion
                  </button>
                </div>
              ))}
              <div style={{ padding: '14px', borderRadius: 14, background: '#FF444410', border: '1px solid #FF444430' }}>
                <div style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#FF8888', marginBottom: 6 }}>⚠️ Mood Alert</div>
                <p style={{ fontFamily: 'Inter', fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Patient's voice pattern suggests mild distress. Consider checking in on emotional state.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div style={{
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={() => setMicOn(!micOn)}
          style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none',
            background: micOn ? 'rgba(255,255,255,0.12)' : '#FF444430',
            color: micOn ? 'white' : '#FF4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          onClick={() => setCameraOn(!cameraOn)}
          style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none',
            background: cameraOn ? 'rgba(255,255,255,0.12)' : '#FF444430',
            color: cameraOn ? 'white' : '#FF4444', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {cameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
        </button>
        <button style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Monitor size={20} />
        </button>
        <button style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PenTool size={20} />
        </button>
        <button style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paperclip size={20} />
        </button>
        <button style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hand size={20} />
        </button>
        <button style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.12)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} />
        </button>
        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            background: '#FF3B3B', color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(255,59,59,0.4)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}

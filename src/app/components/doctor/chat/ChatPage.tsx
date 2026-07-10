import { useState, useEffect } from 'react';
import { Search, Send, Paperclip, Smile, Phone, Video, MoreVertical, Circle } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';

export function ChatPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { c: colors, sh: shadows } = useTheme();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  // Real patient conversations (refreshes every 5s)
  useEffect(() => {
    const load = () => api.get('/doctor/conversations').then(res => {
      const list = (res.data.conversations || []).map((t: any) => ({
        id: t.id,
        name: t.patient?.name || 'Patient',
        lastMsg: t.lastMsg,
        time: t.time,
        unread: t.unread,
        online: true,
        avatar: (t.patient?.name || 'P').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
      }));
      setConversations(list);
      setSelected(prev => prev || list[0]?.id || null);
    }).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  // Message history for the selected patient (polls for new messages)
  useEffect(() => {
    if (!selected) return;
    const load = () => api.get(`/doctor/messages/${selected}`).then(res => {
      setMessages((res.data.messages || []).map((m: any) => ({
        id: m.id,
        sender: m.fromDoctor ? 'You' : conversations.find(cv => cv.id === selected)?.name || 'Patient',
        text: m.text,
        time: m.time,
        self: m.fromDoctor,
        read: m.fromDoctor ? m.read : true,
      })));
    }).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [selected]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selected) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now(), sender: 'You', text, time, self: true, read: false }]);
    setInput('');
    try { await api.post(`/doctor/messages/${selected}`, { text }); } catch { /* next poll reconciles */ }
  };

  const selectedConv = conversations.find(c => c.id === selected);

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'Inter' }}>
      {/* Conversation List */}
      <div style={{ width: 320, background: colors.white, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 16px', borderBottom: `1px solid ${colors.border}` }}>
          <h2 style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, marginBottom: 16 }}>Messages</h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
            <input
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 14px 9px 34px', borderRadius: 10, border: `1px solid ${colors.border}`, fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, background: colors.background, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              style={{
                padding: '12px', borderRadius: 14, cursor: 'pointer',
                background: selected === conv.id ? colors.veryLightSage : 'transparent',
                border: `1px solid ${selected === conv.id ? colors.border : 'transparent'}`,
                marginBottom: 4, display: 'flex', gap: 12, alignItems: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (selected !== conv.id) (e.currentTarget as HTMLDivElement).style.background = colors.background; }}
              onMouseLeave={(e) => { if (selected !== conv.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                  {conv.avatar}
                </div>
                {conv.online && (
                  <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: colors.success, border: '2px solid white' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.name}</span>
                  <span style={{ fontSize: 11, color: colors.textMuted, flexShrink: 0, marginLeft: 8 }}>{conv.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{conv.lastMsg}</span>
                  {conv.unread > 0 && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: colors.primary, color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 6 }}>
                      {conv.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: colors.background }}>
        {!selectedConv && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: 14 }}>
            No patient conversations yet
          </div>
        )}
        {selectedConv && (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px 24px', background: colors.white, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${colors.primary}, ${colors.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                    {selectedConv.avatar}
                  </div>
                  {selectedConv.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: colors.success, border: '2px solid white' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: colors.textPrimary }}>{selectedConv.name}</div>
                  <div style={{ fontSize: 12, color: selectedConv.online ? colors.success : colors.textMuted }}>
                    {selectedConv.online ? '● Online' : '○ Offline'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onNavigate('video')} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary }}>
                  <Video size={16} />
                </button>
                <button style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary }}>
                  <Phone size={16} />
                </button>
                <button style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary }}>
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ textAlign: 'center', fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.self ? 'flex-end' : 'flex-start' }}>
                  {!msg.self && <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>{msg.sender}</div>}
                  <div style={{
                    maxWidth: '65%',
                    padding: '12px 16px',
                    borderRadius: msg.self ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.self ? colors.primary : colors.white,
                    color: msg.self ? 'white' : colors.textPrimary,
                    fontSize: 14,
                    lineHeight: 1.5,
                    boxShadow: msg.self ? 'none' : shadows.card,
                    border: msg.self ? 'none' : `1px solid ${colors.border}`,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                    {msg.time}{msg.self && (msg.read ? ' · Read' : ' · Sent')}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '16px 24px', background: colors.white, borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <button style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                  <Paperclip size={16} />
                </button>
                <div style={{ flex: 1, borderRadius: 14, border: `1.5px solid ${colors.border}`, background: colors.background, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '11px 0', border: 'none', background: 'transparent', fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none' }}
                  />
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex' }}>
                    <Smile size={18} />
                  </button>
                </div>
                <button onClick={sendMessage} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: colors.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Search, Send, Paperclip, Smile, Phone, Video, MoreVertical, Circle } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';
import { ChatChannel } from '../../../lib/chatClient';

export function ChatPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { c: colors, sh: shadows } = useTheme();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [live, setLive] = useState(false);
  const chatRef = useRef<ChatChannel | null>(null);
  const selectedRef = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  /* Live channel — same design as the client side: the socket delivers the
     instant copy, REST remains the source of truth, polling is the fallback. */
  useEffect(() => {
    const ch = new ChatChannel({
      onMessage: (msg, from) => {
        if (from.role !== 'user' || from.id !== selectedRef.current) {
          // A message for a thread that isn't open — bump its unread badge
          setConversations(prev => prev.map(c =>
            c.id === from.id ? { ...c, unread: (c.unread || 0) + 1, lastMsg: msg?.text } : c));
          return;
        }
        setMessages(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, {
          id: msg.id, sender: 'Patient', text: msg.text, time: msg.time,
          self: false, read: true, attachment: msg.attachment || null,
        }]);
      },
      onTyping: (from, isTyping) => {
        if (from.id === selectedRef.current) setPeerTyping(isTyping);
      },
      onRead: () => setMessages(prev => prev.map(m => m.self ? { ...m, read: true } : m)),
      onConnectionChange: setLive,
    });
    chatRef.current = ch;
    setLive(ch.live);
    return () => { ch.destroy(); chatRef.current = null; };
  }, []);

  // Close the overflow menu / emoji tray on an outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) setShowMenu(false);
      if (emojiRef.current && !emojiRef.current.contains(t)) setShowEmoji(false);
    };
    if (showMenu || showEmoji) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showMenu, showEmoji]);

  // Real patient conversations (refreshes every 5s)
  useEffect(() => {
    const load = () => api.get('/doctor/conversations').then(res => {
      const list = (res.data.conversations || []).map((t: any) => ({
        id: t.id,
        name: t.patient?.name || 'Patient',
        lastMsg: t.lastMsg,
        time: t.time,
        unread: t.unread,
        hasThread: !!t.hasThread,
        online: true,
        avatar: (t.patient?.name || 'P').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
      }));
      setConversations(list);
      // Prefer opening a live thread; fall back to the first patient so the
      // doctor can always start a conversation rather than staring at an
      // empty pane until the patient writes first.
      setSelected(prev => prev || list.find((x: any) => x.hasThread)?.id || list[0]?.id || null);
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
    setPeerTyping(false);
    const interval = setInterval(load, live ? 20000 : 5000);
    return () => clearInterval(interval);
  }, [selected, live]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selected) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now(), sender: 'You', text, time, self: true, read: false }]);
    setConversations(prev => prev.map(cv =>
      cv.id === selected ? { ...cv, hasThread: true, lastMsg: text, time } : cv));
    setInput('');
    const peer = { id: selected, role: 'user' as const };
    chatRef.current?.stopTyping(peer);

    // Socket first, REST only if it didn't take — never both.
    const sent = await chatRef.current?.send(peer, text);
    if (!sent) {
      try { await api.post(`/doctor/messages/${selected}`, { text }); }
      catch { /* next poll reconciles */ }
    }
  };

  const selectedConv = conversations.find(c => c.id === selected);

  /**
   * Attaching a file stores it in the patient's documents and drops a line in
   * the thread, so the patient sees it was shared and the doctor can find it
   * again on the Documents page.
   */
  const attachFile = async (file: File) => {
    if (!selected) return;
    if (file.size > 25 * 1024 * 1024) { flash('That file is over the 25 MB limit', true); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'resource');
      fd.append('patientId', selected);
      await api.upload('/doctor/documents/upload', fd);
      const note = `Shared a file: ${file.name}`;
      await api.post(`/doctor/messages/${selected}`, { text: note });
      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { id: Date.now(), sender: 'You', text: note, time, self: true, read: false }]);
      flash('File shared and saved to Documents');
    } catch (e: any) {
      flash(e.message || 'Could not share that file', true);
    } finally { setUploading(false); }
  };

  const insertEmoji = (e: string) => {
    setInput(v => v + e);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  /** Saves the visible thread as a plain-text transcript. */
  const exportConversation = () => {
    if (!selectedConv) return;
    const header = `Conversation with ${selectedConv.name}\nExported ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    const body = messages.map(m => `[${m.time}] ${m.self ? 'You' : selectedConv.name}: ${m.text}`).join('\n');
    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${selectedConv.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setShowMenu(false);
    flash('Transcript downloaded');
  };

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'Inter' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '11px 20px', borderRadius: 12, zIndex: 400,
          background: toast.bad ? '#FFEBEE' : colors.primary,
          color: toast.bad ? colors.error : 'white',
          fontFamily: 'Inter', fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
        }}>{toast.text}</div>
      )}
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
          {[
            { label: 'Inbox', items: conversations.filter(c => c.hasThread) },
            { label: 'All Patients', items: conversations.filter(c => !c.hasThread) },
          ].map(group => {
            const items = group.items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
            if (!items.length) return null;
            return (
              <div key={group.label}>
                <div style={{ padding: '10px 12px 6px', fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: colors.textMuted, textTransform: 'uppercase' }}>
                  {group.label} · {items.length}
                </div>
                {items.map(conv => (
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
            );
          })}
          {!conversations.length && (
            <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 12, color: colors.textMuted, lineHeight: 1.6 }}>
              No patients yet. Once someone books a session with you they'll appear here.
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: colors.background }}>
        {!selectedConv && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: 14 }}>
            No patients yet
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
                <button onClick={() => onNavigate('video')} title="Start a call" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary }}>
                  <Phone size={16} />
                </button>
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button onClick={() => setShowMenu(m => !m)} title="More" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textSecondary }}>
                    <MoreVertical size={16} />
                  </button>
                  {showMenu && (
                    <div style={{
                      position: 'absolute', right: 0, top: 42, width: 210, zIndex: 200,
                      background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`,
                      boxShadow: shadows.modal, overflow: 'hidden',
                    }}>
                      {[
                        { label: 'View patient record', run: () => { setShowMenu(false); onNavigate('patients'); } },
                        { label: 'Start video session', run: () => { setShowMenu(false); onNavigate('video'); } },
                        { label: 'Open their journals', run: () => { setShowMenu(false); onNavigate('journals'); } },
                        { label: 'Write a note', run: () => { setShowMenu(false); onNavigate('notes'); } },
                        { label: 'Export transcript', run: exportConversation },
                      ].map(item => (
                        <button key={item.label} onClick={item.run}
                          style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', fontFamily: 'Inter', fontSize: 13, color: colors.textPrimary, cursor: 'pointer', textAlign: 'left', display: 'block' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = colors.veryLightSage; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ textAlign: 'center', fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
              {!messages.length && (
                <div style={{ textAlign: 'center', fontSize: 13, color: colors.textMuted, padding: '32px 20px', lineHeight: 1.7 }}>
                  No messages with <strong style={{ color: colors.textSecondary }}>{selectedConv.name}</strong> yet.<br />
                  Send the first one below — they'll see it in their CounselConnect inbox.
                </div>
              )}
              {peerTyping && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '18px 18px 18px 4px', background: colors.white, border: `1px solid ${colors.border}`, fontSize: 13, color: colors.textMuted }}>
                  {selectedConv?.name?.split(' ')[0] || 'They'} is typing…
                </div>
              )}
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
                    {msg.attachment?.kind === 'voice' ? (
                      <audio controls preload="none"
                        src={`${(import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api'}/doctor/messages/${selected}/attachments/${msg.attachment.id}`}
                        style={{ height: 32, maxWidth: 210 }} />
                    ) : msg.attachment ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Paperclip size={13} /> {msg.attachment.name}
                      </span>
                    ) : msg.text}
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
                <input ref={fileInput} type="file" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) attachFile(f); e.target.value = ''; }} />
                <button
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  title={uploading ? 'Uploading…' : 'Attach a file'}
                  style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: 'transparent', cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: uploading ? colors.primary : colors.textMuted }}>
                  <Paperclip size={16} />
                </button>
                <div style={{ flex: 1, borderRadius: 14, border: `1.5px solid ${colors.border}`, background: colors.background, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      if (selected) chatRef.current?.typing({ id: selected, role: 'user' });
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '11px 0', border: 'none', background: 'transparent', fontFamily: 'Inter', fontSize: 14, color: colors.textPrimary, outline: 'none' }}
                  />
                  <div ref={emojiRef} style={{ position: 'relative' }}>
                    <button onClick={() => setShowEmoji(v => !v)} title="Emoji"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: showEmoji ? colors.primary : colors.textMuted, display: 'flex' }}>
                      <Smile size={18} />
                    </button>
                    {showEmoji && (
                      <div style={{
                        position: 'absolute', bottom: 34, right: 0, width: 232, padding: 10, zIndex: 200,
                        background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`,
                        boxShadow: shadows.modal, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3,
                      }}>
                        {['🙂','😊','👍','🙏','❤️','✨','🌱','💪','😌','🤝','👏','🎉','☀️','🌙','💭','📌','✅','⏰','📄','🧘','😔','😢','😟','🫂']
                          .map(e => (
                            <button key={e} onClick={() => insertEmoji(e)}
                              style={{ fontSize: 17, padding: '3px 0', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 6 }}
                              onMouseEnter={ev => { (ev.currentTarget as HTMLButtonElement).style.background = colors.veryLightSage; }}
                              onMouseLeave={ev => { (ev.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                              {e}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
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

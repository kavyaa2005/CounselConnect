import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Search, Paperclip, Smile, Pin, Mic, Square } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';
import { ChatChannel, VoiceRecorder } from '../../lib/chatClient';
import { getSocket } from '../../lib/callClient';

const quickReplies = ["Feeling much better today! 😊", "Can we reschedule?", "I have a question", "Thank you!"];

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Arriving from a counselor's profile ("Send Message") should open THAT thread,
  // not whichever conversation happens to be first.
  const requestedId = searchParams.get('counselor');

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeCon, setActiveCon] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<ChatChannel | null>(null);
  const recRef = useRef<VoiceRecorder | null>(null);
  const recTimer = useRef<any>(null);
  const activeRef = useRef<any>(null);

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3000);
  };

  // Keep a ref of the open thread so socket handlers (bound once) always see
  // the current one rather than a stale closure.
  useEffect(() => { activeRef.current = activeCon; }, [activeCon]);

  const mapMsg = (m: any, con: any) => ({
    id: m.id,
    sender: m.isMe ? 'Me' : con?.name,
    text: m.text,
    time: m.time,
    isMe: m.isMe,
    read: m.read,
    attachment: m.attachment || null,
    avatar: con?.avatar,
  });

  /* ── Live channel ──
     Messages still persist over REST; the socket just delivers them instantly.
     Polling below stays as a fallback for when the socket is down.          */
  useEffect(() => {
    const ch = new ChatChannel({
      onMessage: (msg, from) => {
        const con = activeRef.current;
        // Only append if the sender is the thread currently on screen
        if (con && from.role === 'doctor' && msg && con.id) {
          setMessages(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, mapMsg(msg, con)]);
        }
        setConversations(prev => prev.map(c =>
          c.id === (con?.id) ? { ...c, hasThread: true, lastMsg: msg?.text, time: msg?.time } : c));
      },
      onTyping: (from, isTyping) => {
        const con = activeRef.current;
        if (con && from.id === con.id) setTyping(isTyping);
      },
      onRead: () => {
        setMessages(prev => prev.map(m => m.isMe ? { ...m, read: true } : m));
      },
      onConnectionChange: setLive,
    });
    chatRef.current = ch;
    setLive(ch.live);
    return () => { ch.destroy(); chatRef.current = null; };
  }, []);

  const peer = activeCon ? { id: activeCon.id, role: 'doctor' as const } : null;

  /* Real presence over the socket — the same source the video lobby uses. */
  useEffect(() => {
    if (!conversations.length) return;
    const sock = getSocket();

    const refresh = () => {
      sock.emit('presence:list',
        { contacts: conversations.map((c: any) => ({ id: c.id, role: 'doctor' })) },
        (res: any) => { if (res?.online) setOnlineIds(new Set(res.online)); });
    };
    const onPresence = ({ id, online }: any) => {
      setOnlineIds(prev => {
        const next = new Set(prev);
        if (online) next.add(id); else next.delete(id);
        return next;
      });
    };
    sock.on('presence:update', onPresence);
    refresh();
    const poll = setInterval(refresh, 15000);
    return () => { clearInterval(poll); sock.off('presence:update', onPresence); };
  }, [conversations.length]);

  const isOnline = (id: string) => onlineIds.has(id);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation list: real counselors + live threads (refreshes every 5s)
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const [counselorsRes, convsRes] = await Promise.all([
          api.get('/counselors'),
          api.get('/messages/conversations'),
        ]);
        const threads = convsRes.data.conversations || [];
        const list = (counselorsRes.data.counselors || []).map((c: any) => {
          const t = threads.find((x: any) => x.counselorId === c.id);
          return {
            id: c.id,
            name: c.name,
            avatar: c.image,
            // `available` is the counselor's "accepting new clients" flag —
            // a profile setting, not presence. Showing it as "Online now"
            // told people someone was there when they weren't.
            acceptingClients: c.available,
            hasThread: !!t,
            lastMsg: t ? t.lastMsg : 'Start a conversation',
            time: t ? t.time : '',
            unread: t ? t.unread : 0,
          };
        });
        setConversations(list);
        setActiveCon((prev: any) => {
          // A counselor named in the URL always wins on first load
          if (requestedId) {
            const wanted = list.find((x: any) => x.id === requestedId);
            if (wanted && (!prev || prev.id !== wanted.id)) return wanted;
          }
          return prev || list.find((x: any) => x.hasThread) || list[0] || null;
        });
      } catch { /* keep current list */ }
    };
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedId]);

  // Drop the param once it has been applied, otherwise the 5s refresh would
  // keep yanking the user back to that thread.
  useEffect(() => {
    if (requestedId && activeCon?.id === requestedId) {
      const next = new URLSearchParams(searchParams);
      next.delete('counselor');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedId, activeCon]);

  // Load message history when conversation changes
  useEffect(() => {
    if (!activeCon) return;
    const loadHistory = async () => {
      try {
        const res = await api.get(`/messages/${activeCon.id}`);
        setMessages(res.data.messages.map((m: any) => mapMsg(m, activeCon)));
      } catch { /* keep current messages */ }
    };
    loadHistory();
    // Opening a thread clears its unread badge for the other side
    api.post(`/messages/${activeCon.id}/read`).catch(() => {});
    if (peer) chatRef.current?.markRead(peer);
    setTyping(false);

    // Fallback poll. Slow while the socket is live (a safety net against a
    // missed event), brisk when it isn't — that's the old behaviour.
    const interval = setInterval(loadHistory, live ? 20000 : 5000);
    return () => clearInterval(interval);
  }, [activeCon?.id, live]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || !activeCon) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const tempId = `tmp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, sender: 'Me', text: msg, time, isMe: true, pending: true }]);
    setInput('');
    if (peer) chatRef.current?.stopTyping(peer);

    // Socket first; REST if the socket didn't take it. Never both — that
    // would write the message twice.
    let saved = peer ? await chatRef.current?.send(peer, msg) : null;
    if (!saved) {
      try {
        const res = await api.post('/messages/send', { counselorId: activeCon.id, text: msg });
        saved = res.data?.sent || res.data?.message || null;
      } catch {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, failed: true, pending: false } : m));
        return;
      }
    }
    setMessages(prev => prev.map(m => m.id === tempId
      ? { ...m, id: saved?.id || m.id, time: saved?.time || m.time, pending: false }
      : m));
    setConversations(prev => prev.map(c =>
      c.id === activeCon.id ? { ...c, hasThread: true, lastMsg: msg, time } : c));
  };

  /* ── attachments ── */
  const sendFile = async (file: File, kind: 'file' | 'voice' = 'file', duration?: number) => {
    if (!activeCon) return;
    if (file.size > 15 * 1024 * 1024) { flash('That file is over the 15 MB limit', true); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      if (duration) fd.append('duration', String(duration));
      const res = await api.upload(`/messages/${activeCon.id}/attach`, fd);
      setMessages(prev => [...prev, mapMsg(res.data.message, activeCon)]);
      setConversations(prev => prev.map(c =>
        c.id === activeCon.id ? { ...c, hasThread: true, lastMsg: res.data.message.text } : c));
    } catch (e: any) {
      flash(e.message || 'Could not send that file', true);
    } finally { setUploading(false); }
  };

  /* ── voice notes ── */
  const toggleRecording = async () => {
    if (recording) {
      const rec = recRef.current;
      setRecording(false);
      clearInterval(recTimer.current);
      const out = await rec?.stop();
      recRef.current = null;
      setRecSecs(0);
      if (out && out.duration >= 1) {
        await sendFile(new File([out.blob], `voice-note.${out.ext}`, { type: out.blob.type }), 'voice', out.duration);
      }
      return;
    }
    if (!VoiceRecorder.supported) { flash('Voice notes need a modern browser with microphone access', true); return; }
    try {
      const rec = new VoiceRecorder();
      await rec.start();
      recRef.current = rec;
      setRecording(true);
      setRecSecs(0);
      recTimer.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch {
      flash('Microphone access was blocked — allow it in your browser address bar', true);
    }
  };

  useEffect(() => () => { clearInterval(recTimer.current); recRef.current?.cancel(); }, []);

  const toastEl = toast && (
    <div className="fixed bottom-6 left-1/2 px-5 py-3 rounded-2xl z-50"
      style={{ transform: 'translateX(-50%)',
               backgroundColor: toast.bad ? 'rgba(217,119,87,0.95)' : CC.forestSage,
               color: 'white', fontSize: '0.85rem', fontWeight: 600,
               boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}>
      {toast.text}
    </div>
  );

  if (!activeCon) {
    return <div style={{ height: 'calc(100vh - 80px)', backgroundColor: CC.luxuryBg }} />;
  }

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', backgroundColor: CC.luxuryBg }}>
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r" style={{ backgroundColor: CC.lightIvory, borderColor: CC.softSage }}>
        <div className="p-5 border-b" style={{ borderColor: CC.softSage }}>
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: CC.primaryText, marginBottom: 12 }}>Messages</h2>
          <div className="relative">
            <Search size={15} color={CC.mutedOlive} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none text-sm"
              style={{ backgroundColor: CC.softSage, color: CC.primaryText, border: 'none' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {[
              { label: 'Inbox', items: conversations.filter(c => c.hasThread) },
              { label: 'All Doctors', items: conversations.filter(c => !c.hasThread) },
            ].filter(section => section.items.some(c => c.name.toLowerCase().includes(search.toLowerCase()))).map(section => (
            <div key={section.label}>
            <p className="px-3 py-2 text-xs uppercase tracking-wider" style={{ color: CC.mutedOlive, fontWeight: 600 }}>{section.label}</p>
            {section.items.filter(c =>
              c.name.toLowerCase().includes(search.toLowerCase())
            ).map(con => (
              <motion.button
                key={con.id}
                onClick={() => setActiveCon(con)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                style={{
                  backgroundColor: activeCon.id === con.id ? `${CC.forestSage}12` : 'transparent',
                  border: `1px solid ${activeCon.id === con.id ? CC.forestSage + '30' : 'transparent'}`,
                }}
                whileHover={{ backgroundColor: `${CC.forestSage}08` }}
              >
                <div className="relative flex-shrink-0">
                  {con.avatar ? (
                    <img src={con.avatar} alt={con.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: CC.forestSage }}>
                      <span style={{ fontWeight: 700 }}>{con.name[0]}</span>
                    </div>
                  )}
                  {isOnline(con.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: '#22c55e' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.875rem' }}>{con.name}</p>
                    <p style={{ fontSize: '0.7rem', color: CC.mutedOlive }}>{con.time}</p>
                  </div>
                  <p className="truncate" style={{ fontSize: '0.78rem', color: CC.mutedOlive, marginTop: 2 }}>{con.lastMsg}</p>
                </div>
                {con.unread > 0 && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: CC.terracotta }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{con.unread}</span>
                  </div>
                )}
              </motion.button>
            ))}
            </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: CC.lightIvory, borderColor: CC.softSage }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={activeCon.avatar} alt={activeCon.name} className="w-10 h-10 rounded-xl object-cover" />
              {isOnline(activeCon.id) && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: '#22c55e' }} />
              )}
            </div>
            <div>
              <p style={{ fontWeight: 700, color: CC.primaryText, fontSize: '0.95rem' }}>{activeCon.name}</p>
              <p style={{ fontSize: '0.75rem', color: isOnline(activeCon.id) ? '#22c55e' : CC.mutedOlive }}>
                {isOnline(activeCon.id)
                  ? 'Online now'
                  : activeCon.acceptingClients ? 'Offline · usually replies within a day' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Call / video / overflow removed — none of them did anything,
                and calling lives on the Video Sessions page where presence
                and permissions are handled properly. */}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {toastEl}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.isMe ? 'flex-row-reverse' : ''}`}
            >
              {!msg.isMe && (
                <img src={(msg as any).avatar} alt={msg.sender} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className={`max-w-[65%] ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{
                    backgroundColor: msg.isMe ? CC.forestSage : CC.lightIvory,
                    color: msg.isMe ? 'white' : CC.primaryText,
                    borderRadius: msg.isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {msg.attachment?.kind === 'voice' ? (
                    <audio
                      controls
                      preload="none"
                      src={`${(import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api'}/messages/${activeCon.id}/attachments/${msg.attachment.id}`}
                      style={{ height: 34, maxWidth: 220 }}
                    />
                  ) : msg.attachment ? (
                    <button
                      onClick={() => api.download(
                        `/messages/${activeCon.id}/attachments/${msg.attachment.id}`,
                        msg.attachment.name
                      ).catch((e: any) => flash(e.message, true))}
                      className="flex items-center gap-2"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                               color: msg.isMe ? 'white' : CC.primaryText, textAlign: 'left' }}
                    >
                      <Paperclip size={14} />
                      <span style={{ fontSize: '0.85rem', textDecoration: 'underline' }}>{msg.attachment.name}</span>
                    </button>
                  ) : (
                    <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{msg.text}</p>
                  )}
                </div>
                <p style={{ fontSize: '0.7rem', color: msg.failed ? CC.terracotta : CC.mutedOlive }}>
                  {msg.failed ? 'Not sent — tap to retry' : msg.pending ? 'Sending…' : msg.time}
                  {msg.isMe && !msg.pending && !msg.failed && msg.read ? ' · Read' : ''}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {typing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex gap-3 items-end"
              >
                <img src={activeCon.avatar} alt="avatar" className="w-9 h-9 rounded-xl object-cover" />
                <div className="px-4 py-3 rounded-2xl flex gap-1.5 items-center" style={{ backgroundColor: CC.lightIvory, borderRadius: '20px 20px 20px 4px' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CC.mutedOlive }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies */}
        <div className="px-6 pb-2 flex gap-2 overflow-x-auto">
          {quickReplies.map(qr => (
            <motion.button
              key={qr}
              onClick={() => sendMessage(qr)}
              className="px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: CC.softSage, color: CC.forestSage, fontWeight: 500, border: `1px solid ${CC.forestSage}30` }}
              whileHover={{ scale: 1.04, backgroundColor: `${CC.forestSage}15` }}
            >
              {qr}
            </motion.button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t flex items-end gap-3" style={{ backgroundColor: CC.lightIvory, borderColor: CC.softSage }}>
          <motion.button
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: CC.softSage }}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            whileHover={{ scale: 1.08 }}
          >
            <Paperclip size={17} color={uploading ? CC.forestSage : CC.mutedOlive} />
          </motion.button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); if (peer) chatRef.current?.typing(peer); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type your message..."
              rows={1}
              className="w-full px-4 py-3 rounded-2xl outline-none resize-none"
              style={{ backgroundColor: CC.softSage, color: CC.primaryText, fontSize: '0.9rem', border: '1.5px solid transparent', maxHeight: 100 }}
              onFocus={e => (e.target.style.border = `1.5px solid ${CC.forestSage}`)}
              onBlur={e => (e.target.style.border = '1.5px solid transparent')}
            />
          </div>
          <motion.button
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: CC.softSage }}
            whileHover={{ scale: 1.08 }}
          >
            <Smile size={17} color={CC.mutedOlive} />
          </motion.button>
          {recording && (
            <div className="absolute -top-11 left-0 right-0 flex items-center justify-center gap-2 py-2 rounded-2xl"
              style={{ backgroundColor: CC.terracotta, color: 'white', fontSize: '0.8rem', fontWeight: 600 }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'white' }} />
              Recording {String(Math.floor(recSecs / 60)).padStart(2, '0')}:{String(recSecs % 60).padStart(2, '0')} — tap stop to send
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ''; }}
          />

          {/* Voice note */}
          <motion.button
            onClick={toggleRecording}
            title={recording ? 'Stop and send' : 'Record a voice note'}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: recording ? CC.terracotta : CC.softSage }}
            whileHover={{ scale: 1.08 }}
          >
            {recording
              ? <Square size={14} color="white" fill="white" />
              : <Mic size={17} color={CC.mutedOlive} />}
          </motion.button>

          <motion.button
            onClick={() => sendMessage()}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: input.trim() ? `linear-gradient(135deg, ${CC.forestSage}, ${CC.darkForest})` : CC.softSage }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send size={17} color={input.trim() ? 'white' : CC.mutedOlive} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Search, MoreVertical, Phone, Video, Paperclip, Smile, Pin } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

const quickReplies = ["Feeling much better today! 😊", "Can we reschedule?", "I have a question", "Thank you!"];

export function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeCon, setActiveCon] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
            online: c.available,
            hasThread: !!t,
            lastMsg: t ? t.lastMsg : 'Start a conversation',
            time: t ? t.time : '',
            unread: t ? t.unread : 0,
          };
        });
        setConversations(list);
        setActiveCon((prev: any) => prev || list.find((x: any) => x.hasThread) || list[0] || null);
      } catch { /* keep current list */ }
    };
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load message history when conversation changes
  useEffect(() => {
    if (!activeCon) return;
    const loadHistory = async () => {
      try {
        const res = await api.get(`/messages/${activeCon.id}`);
        const serverMsgs = res.data.messages.map((m: any) => ({
          id: m.id,
          sender: m.isMe ? 'Me' : activeCon.name,
          text: m.text,
          time: m.time,
          isMe: m.isMe,
          avatar: activeCon.avatar,
        }));
        setMessages(serverMsgs);
      } catch { /* keep current messages */ }
    };
    loadHistory();
    // Poll so the doctor's replies appear in near real-time
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, [activeCon?.id]);

  const sendMessage = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const optimistic = { id: Date.now(), sender: 'Me', text: msg, time, isMe: true };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    try {
      await api.post('/messages/send', { counselorId: activeCon.id, text: msg });
      setConversations(prev => prev.map(c => c.id === activeCon.id ? { ...c, hasThread: true, lastMsg: msg, time } : c));
    } catch { /* message stays optimistic; next poll reconciles */ }
  };

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
                  {con.online && (
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
              {activeCon.online && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: '#22c55e' }} />
              )}
            </div>
            <div>
              <p style={{ fontWeight: 700, color: CC.primaryText, fontSize: '0.95rem' }}>{activeCon.name}</p>
              <p style={{ fontSize: '0.75rem', color: activeCon.online ? '#22c55e' : CC.mutedOlive }}>
                {activeCon.online ? 'Online now' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[Phone, Video, MoreVertical].map((Icon, i) => (
              <motion.button
                key={i}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: CC.softSage }}
                whileHover={{ scale: 1.08, backgroundColor: `${CC.forestSage}15` }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={17} color={CC.primaryText} />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{msg.text}</p>
                </div>
                <p style={{ fontSize: '0.7rem', color: CC.mutedOlive }}>{msg.time}</p>
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
            whileHover={{ scale: 1.08 }}
          >
            <Paperclip size={17} color={CC.mutedOlive} />
          </motion.button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
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

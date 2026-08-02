import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Send, Paperclip, Smile, Phone, Video, MoreHorizontal } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const conversations = [
  { id: 1, name: "Dr. Sarah Lee", avatar: "SL", color: "#5E8B7E", lastMsg: "Patient follow-up scheduled for Monday.", time: "2m", unread: 2, online: true },
  { id: 2, name: "Dr. James Park", avatar: "JP", color: "#2D6A4F", lastMsg: "I need help with session #S-1042", time: "15m", unread: 0, online: true },
  { id: 3, name: "Sarah Chen", avatar: "SC", color: "#42A5F5", lastMsg: "Thank you for the appointment!", time: "1h", unread: 1, online: false },
  { id: 4, name: "Dr. Lisa Wong", avatar: "LW", color: "#D8A48F", lastMsg: "Documents submitted for verification.", time: "2h", unread: 0, online: true },
  { id: 5, name: "Michael Johnson", avatar: "MJ", color: "#FFC107", lastMsg: "Can I reschedule my session?", time: "3h", unread: 0, online: false },
  { id: 6, name: "Dr. Robert Kim", avatar: "RK", color: "#EF5350", lastMsg: "Report attached.", time: "Yesterday", unread: 0, online: false },
];

type Message = { id: number; from: "admin" | "other"; text: string; time: string };

const initialMessages: Record<number, Message[]> = {
  1: [
    { id: 1, from: "other", text: "Hi, I wanted to update you on Sarah Chen's progress.", time: "10:20 AM" },
    { id: 2, from: "admin", text: "Thanks for the update, Dr. Lee. How is she doing?", time: "10:22 AM" },
    { id: 3, from: "other", text: "She's making great progress with the breathing techniques. I've scheduled a follow-up.", time: "10:24 AM" },
    { id: 4, from: "other", text: "Patient follow-up scheduled for Monday.", time: "10:25 AM" },
  ],
  2: [
    { id: 1, from: "other", text: "Hello Admin, I need help with session #S-1042", time: "9:45 AM" },
    { id: 2, from: "admin", text: "Of course, Dr. Park. What's the issue?", time: "9:50 AM" },
  ],
  3: [
    { id: 1, from: "other", text: "Thank you for the appointment!", time: "8:30 AM" },
  ],
};

export function Messages(_props?: any) {
  const { t } = useTheme();
  const [activeConv, setActiveConv] = useState(conversations[0]);
  const [messages, setMessages] = useState<Record<number, Message[]>>(initialMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredConvs = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentMessages = messages[activeConv.id] || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length, activeConv.id]);

  function sendMessage() {
    if (!input.trim()) return;
    const newMsg: Message = { id: Date.now(), from: "admin", text: input.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => ({ ...prev, [activeConv.id]: [...(prev[activeConv.id] || []), newMsg] }));
    setInput("");

    setTyping(true);
    setTimeout(() => {
      const reply: Message = { id: Date.now() + 1, from: "other", text: "Got it, I'll look into that right away.", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setMessages(prev => ({ ...prev, [activeConv.id]: [...(prev[activeConv.id] || []), reply] }));
      setTyping(false);
    }, 2000);
  }

  return (
    <div className="p-6 h-full" style={{ fontFamily: "'Inter', sans-serif", background: t.bg }}>
      <div className="rounded-2xl border overflow-hidden flex h-[calc(100vh-10rem)]"
        style={{ background: t.card, borderColor: t.border, boxShadow: t.shadow }}>

        {/* Sidebar */}
        <div className="w-72 border-r flex flex-col shrink-0" style={{ borderColor: t.border }}>
          <div className="p-4 border-b" style={{ borderColor: t.border }}>
            <h3 className="font-semibold mb-3" style={{ color: t.text, fontFamily: "'Poppins', sans-serif" }}>Messages</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: t.muted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border outline-none transition-all"
                style={{ background: t.input, borderColor: t.inputBorder, color: t.text }}
                onFocus={e => e.target.style.borderColor = "#5E8B7E"}
                onBlur={e => e.target.style.borderColor = t.inputBorder} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConvs.map(conv => (
              <button key={conv.id} onClick={() => setActiveConv(conv)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-b text-left transition-colors"
                style={{
                  borderColor: t.border,
                  background: activeConv.id === conv.id ? t.card2 : "transparent",
                }}
                onMouseEnter={e => { if (activeConv.id !== conv.id) (e.currentTarget as HTMLElement).style.background = t.hover; }}
                onMouseLeave={e => { if (activeConv.id !== conv.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: conv.color }}>
                    {conv.avatar}
                  </div>
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                      style={{ background: "#4CAF50", borderColor: t.card }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate" style={{ color: t.text }}>{conv.name}</span>
                    <span className="text-xs ml-1 shrink-0" style={{ color: t.muted }}>{conv.time}</span>
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: t.textSec }}>{conv.lastMsg}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: "#5E8B7E" }}>
                    {conv.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: t.border }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: activeConv.color }}>
                  {activeConv.avatar}
                </div>
                {activeConv.online && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2"
                    style={{ background: "#4CAF50", borderColor: t.card }} />
                )}
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: t.text }}>{activeConv.name}</div>
                <div className="text-xs" style={{ color: activeConv.online ? "#4CAF50" : t.muted }}>
                  {activeConv.online ? "Online" : "Offline"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ color: "#5E8B7E", background: t.card2 }}>
                <Phone className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ color: "#5E8B7E", background: t.card2 }}>
                <Video className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ color: t.muted, background: t.card2 }}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {currentMessages.map((msg, i) => (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`flex ${msg.from === "admin" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-xs">
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.from === "admin" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={msg.from === "admin" ? {
                      background: "linear-gradient(135deg, #5E8B7E, #2D6A4F)", color: "white"
                    } : { background: t.card2, color: t.text }}>
                    {msg.text}
                  </div>
                  <div className={`text-xs mt-1 ${msg.from === "admin" ? "text-right" : ""}`}
                    style={{ color: t.muted }}>
                    {msg.time}
                  </div>
                </div>
              </motion.div>
            ))}
            <AnimatePresence>
              {typing && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2">
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1"
                    style={{ background: t.card2 }}>
                    {[0, 1, 2].map(j => (
                      <motion.div key={j} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: t.muted }}
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: j * 0.15 }} />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: t.muted }}>typing...</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t" style={{ borderColor: t.border }}>
            <div className="flex items-center gap-3 p-3 rounded-2xl border"
              style={{ background: t.input, borderColor: t.inputBorder }}>
              <button className="transition-colors" style={{ color: t.muted }}>
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="transition-colors" style={{ color: t.muted }}>
                <Smile className="w-4 h-4" />
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 text-sm bg-transparent outline-none"
                style={{ color: t.text }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50"
                style={{ background: "#5E8B7E" }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

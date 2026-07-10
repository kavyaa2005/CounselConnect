import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, MessageSquare, FileText, Wifi, Clock } from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';

export function VideoPage() {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [sessionTime, setSessionTime] = useState('00:00');
  const [counselorName, setCounselorName] = useState('Your Counselor');
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Live session timer
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      setSessionTime(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Pull the real counselor from the user's next confirmed appointment
  useEffect(() => {
    api.get('/appointments').then(res => {
      const appts = (res.data.appointments || [])
        .filter((a: any) => a.status === 'confirmed')
        .sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      const next = appts.find((a: any) => new Date(a.dateTime) >= new Date()) || appts[appts.length - 1];
      if (next) {
        setCounselorName(next.counselorName);
        api.get(`/messages/${next.counselorId}`).then(r => {
          setChatMessages((r.data.messages || []).slice(-6).map((m: any) => ({ text: m.text, isMe: m.isMe })));
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)', backgroundColor: '#0f1a16' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#22c55e' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Session in progress</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock size={14} color="rgba(255,255,255,0.5)" />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontFamily: 'monospace' }}>{sessionTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi size={14} color="#22c55e" />
            <span style={{ color: '#22c55e', fontSize: '0.78rem' }}>Excellent</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: CC.terracotta }}>
            <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>CC</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem' }}>CounselConnect</span>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 relative rounded-3xl overflow-hidden" style={{ backgroundColor: '#1a2820' }}>
            {/* Counselor video */}
            <img
              src="https://images.unsplash.com/photo-1714976694867-bc0e012fab70?w=1200&h=700&fit=crop"
              alt="Session"
              className="w-full h-full object-cover"
              style={{ opacity: 0.9 }}
            />

            {/* Overlay gradient */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(15,26,22,0.2) 0%, transparent 30%, transparent 70%, rgba(15,26,22,0.6) 100%)' }} />

            {/* Counselor name badge */}
            <div className="absolute top-4 left-4 px-3 py-2 rounded-xl flex items-center gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              <span style={{ color: 'white', fontSize: '0.82rem', fontWeight: 600 }}>{counselorName}</span>
            </div>

            {/* Self video (PiP) */}
            <motion.div
              drag
              dragMomentum={false}
              className="absolute bottom-4 right-4 rounded-2xl overflow-hidden"
              style={{ width: 180, height: 130, backgroundColor: '#28463a', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', cursor: 'grab' }}
              whileDrag={{ cursor: 'grabbing' }}
            >
              {videoOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <VideoOff size={24} color="rgba(255,255,255,0.4)" />
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 4 }}>Camera off</p>
                </div>
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1768828246616-e86833c66dea?w=200&h=150&fit=crop"
                  alt="You"
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.9 }}
                />
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <span style={{ color: 'white', fontSize: '0.65rem' }}>You</span>
              </div>
            </motion.div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 py-2">
            <motion.button
              onClick={() => setMuted(!muted)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: muted ? CC.terracotta : 'rgba(255,255,255,0.1)' }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              {muted ? <MicOff size={20} color="white" /> : <Mic size={20} color="white" />}
            </motion.button>

            <motion.button
              onClick={() => setVideoOff(!videoOff)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: videoOff ? CC.terracotta : 'rgba(255,255,255,0.1)' }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              {videoOff ? <VideoOff size={20} color="white" /> : <Video size={20} color="white" />}
            </motion.button>

            <motion.button
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileHover={{ scale: 1.08 }}
            >
              <Monitor size={20} color="white" />
            </motion.button>

            <motion.button
              onClick={() => { setChatOpen(!chatOpen); setNotesOpen(false); }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: chatOpen ? CC.forestSage : 'rgba(255,255,255,0.1)' }}
              whileHover={{ scale: 1.08 }}
            >
              <MessageSquare size={20} color="white" />
            </motion.button>

            <motion.button
              onClick={() => { setNotesOpen(!notesOpen); setChatOpen(false); }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: notesOpen ? CC.forestSage : 'rgba(255,255,255,0.1)' }}
              whileHover={{ scale: 1.08 }}
            >
              <FileText size={20} color="white" />
            </motion.button>

            {/* End call */}
            <motion.button
              className="px-6 h-12 rounded-2xl flex items-center gap-2 text-white"
              style={{ backgroundColor: '#e53e3e', fontWeight: 600, fontSize: '0.9rem' }}
              whileHover={{ scale: 1.05, backgroundColor: '#c53030' }}
              whileTap={{ scale: 0.97 }}
            >
              <PhoneOff size={18} />
              End Session
            </motion.button>
          </div>
        </div>

        {/* Side panel */}
        <AnimatePresence>
          {(chatOpen || notesOpen) && (
            <motion.div
              initial={{ opacity: 0, width: 0, x: 20 }}
              animate={{ opacity: 1, width: 320, x: 0 }}
              exit={{ opacity: 0, width: 0, x: 20 }}
              className="flex-shrink-0 rounded-3xl overflow-hidden flex flex-col"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {chatOpen && (
                <>
                  <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>Session Chat</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.isMe ? 'justify-end' : ''}`}>
                        <div
                          className="max-w-[80%] px-3 py-2 rounded-xl"
                          style={{
                            backgroundColor: msg.isMe ? CC.forestSage : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: '0.82rem',
                            lineHeight: 1.5,
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <input
                      placeholder="Type a message..."
                      className="w-full px-3 py-2.5 rounded-xl outline-none text-sm"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'white', border: 'none' }}
                    />
                  </div>
                </>
              )}

              {notesOpen && (
                <>
                  <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>Session Notes</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 2 }}>Private notes for this session</p>
                  </div>
                  <div className="flex-1 p-4">
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Take notes during your session..."
                      className="w-full h-full outline-none resize-none bg-transparent"
                      style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.88rem', lineHeight: 1.7 }}
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

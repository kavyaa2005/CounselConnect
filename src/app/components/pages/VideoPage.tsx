// Client-side video / voice sessions.
//
// The WebRTC engine lives in lib/callClient.ts — this page is the lobby, the
// in-call surface and the controls. Media flows browser-to-browser; the
// backend only relays signalling.

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, MessageSquare,
  Clock, Send, Search, AlertCircle, Loader2, CheckCircle, History, Phone, ArrowLeft,
} from 'lucide-react';
import { CC } from '../../lib/colors';
import { api } from '../../lib/api';
import { CallSession, getSocket, checkVideoSupport } from '../../lib/callClient';
import type { CallStatus, IncomingCall } from '../../lib/callClient';
import { takePendingCall, onPendingCall } from '../../lib/callInbox';
import { useMediaStream } from '../../lib/useMediaStream';

export function VideoPage() {
  /* ── lobby ── */
  const [contacts, setContacts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  /* ── call ── */
  const [status, setStatus] = useState<CallStatus>('idle');
  const [peer, setPeer] = useState<any | null>(null);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState('');
  /** Voice-only is a deliberate choice, not just a no-camera fallback. */
  const [audioOnly, setAudioOnly] = useState(false);

  /* ── in-call controls ── */
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [peerState, setPeerState] = useState<{ muted?: boolean; videoOff?: boolean }>({});
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [seconds, setSeconds] = useState(0);

  // Streams live in state, not just refs: getUserMedia resolves while the
  // lobby is still on screen, so the <video> element doesn't exist yet.
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Callback-ref binding: attaches whichever arrives second, the stream or the
  // element, and calls play() explicitly. See lib/useMediaStream.ts.
  const localVideo = useMediaStream(localStream);
  const remoteVideo = useMediaStream(remoteStream);
  const sessionRef = useRef<CallSession | null>(null);
  const support = checkVideoSupport();

  /* ─────────── lobby data ─────────── */
  const loadLobby = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [c, h] = await Promise.all([
        api.get('/video/contacts'),
        api.get('/video/history'),
      ]);
      setContacts(c.data.contacts || []);
      setHistory(h.data.history || []);
    } catch (e: any) {
      setLoadError(e.message || 'Could not load your counselors');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadLobby(); }, [loadLobby]);

  /* ─────────── presence + incoming ─────────── */
  useEffect(() => {
    if (!contacts.length) return;
    const sock = getSocket();

    const refreshPresence = () => {
      sock.emit('presence:list',
        { contacts: contacts.map(c => ({ id: c.id, role: c.role })) },
        (res: any) => { if (res?.online) setOnlineIds(new Set(res.online)); });
    };

    const onPresence = ({ id, online }: any) => {
      setOnlineIds(prev => {
        const next = new Set(prev);
        if (online) next.add(id); else next.delete(id);
        return next;
      });
    };
    const onIncoming = (p: IncomingCall) => setIncoming(p);
    const onCancelled = () => setIncoming(null);

    sock.on('presence:update', onPresence);
    sock.on('call:incoming', onIncoming);
    sock.on('call:cancelled', onCancelled);
    refreshPresence();
    const poll = setInterval(refreshPresence, 15000);

    return () => {
      clearInterval(poll);
      sock.off('presence:update', onPresence);
      sock.off('call:incoming', onIncoming);
      sock.off('call:cancelled', onCancelled);
    };
  }, [contacts]);

  /* ─────────── timer ─────────── */
  // Anchored to a start timestamp rather than counted in ticks: a momentary
  // network drop used to send status back to 'connecting', which reset the
  // clock to 00:00 mid-session.
  const startedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (status === 'connected' && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    if (status === 'idle' || status === 'ended') {
      startedAtRef.current = null;
      setSeconds(0);
    }
  }, [status]);

  useEffect(() => {
    if (!['connected', 'connecting'].includes(status)) return;
    const tick = () => {
      if (startedAtRef.current !== null) {
        setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [status]);

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  /* ─────────── session wiring ─────────── */
  const buildSession = useCallback(() => {
    sessionRef.current?.destroy();
    const s = new CallSession({
      onStatus: (st, info) => {
        setStatus(st);
        if (st === 'ended') {
          setEndedReason(info?.reason || null);
          setTimeout(() => {
            setStatus('idle');
            setPeer(null);
            setEndedReason(null);
            setLocalStream(null);
            setRemoteStream(null);
            loadLobby();
          }, 1600);
        }
      },
      onLocalStream: setLocalStream,
      onRemoteStream: setRemoteStream,
      onPeerState: setPeerState,
      onError: (m) => setCallError(m),
      onDiagnostic: setDiagnostic,
    });
    sessionRef.current = s;
    return s;
  }, [loadLobby]);

  useEffect(() => () => { sessionRef.current?.destroy(); }, []);

  /* ─────────── placing a call ─────────── */
  async function startCall(contact: any, voiceOnly = false) {
    setCallError(null);
    setDiagnostic('');
    setPeer(contact);
    setAudioOnly(voiceOnly);
    setMicOn(true);
    setCameraOn(!voiceOnly);
    setStatus('calling');

    const s = buildSession();
    try {
      const res = await s.call(contact.id, contact.role, { audioOnly: voiceOnly });
      if (!res.ok) {
        setCallError(
          res.error === 'offline' ? `${contact.name} isn't online right now.`
          : res.error === 'timeout' ? 'No answer.'
          : res.error === 'not-connected' ? 'You can only call your own counselor.'
          : 'Could not start the call.'
        );
        setStatus('idle');
        setPeer(null);
      }
    } catch (e: any) {
      setCallError(e.message || 'Could not start the call');
      setStatus('idle');
      setPeer(null);
    }
  }

  /* ─────────── answering ─────────── */
  const answerCall = useCallback(async (call: IncomingCall, known?: any) => {
    const voiceOnly = !!(call as any).audioOnly;
    const contact = known || {
      id: call.from.id, role: call.from.role, name: call.fromName, avatar: '',
    };
    setIncoming(null);
    setPeer(contact);
    setAudioOnly(voiceOnly);
    setMicOn(true);
    setCameraOn(!voiceOnly);
    setCallError(null);
    setDiagnostic('');
    // Switch to the call screen on the click, not several seconds later.
    // accept() awaits the socket and then getUserMedia — including the camera
    // permission prompt — and only emits 'connecting' afterwards, so answering
    // used to leave you staring at the lobby wondering if it had worked.
    setStatus('connecting');

    const s = buildSession();
    try {
      await s.accept(call.callId, { audioOnly: voiceOnly });
    } catch (e: any) {
      setCallError(e.message || 'Could not answer');
      setStatus('idle');
      setPeer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildSession]);

  /* Accepting from the global ringer.
     Two paths, because the ringer can fire on any screen:
       • queued before this page existed → drained here on mount
       • accepted while this page is already open → delivered by subscription,
         which is the case the old mount-only read silently dropped. */
  useEffect(() => {
    const handed = takePendingCall();
    if (handed) answerCall(handed);
    return onPendingCall(call => answerCall(call));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerCall]);

  const acceptIncoming = () => {
    if (!incoming) return;
    answerCall(incoming, contacts.find(c => c.id === incoming.from.id));
  };
  const declineIncoming = () => {
    if (!incoming) return;
    new CallSession({}).reject(incoming.callId);
    setIncoming(null);
  };

  /* ─────────── in-call controls ─────────── */
  function hangUp() {
    if (status === 'calling') sessionRef.current?.cancel();
    else sessionRef.current?.end();
    setStatus('ended');
    setEndedReason('you-hung-up');
    setTimeout(() => {
      setStatus('idle'); setPeer(null); setEndedReason(null);
      setLocalStream(null); setRemoteStream(null); loadLobby();
    }, 1600);
  }

  /** Ends whatever is happening and returns to the lobby immediately. */
  function leaveSession() {
    if (['calling', 'connecting', 'connected'].includes(status)) {
      if (status === 'calling') sessionRef.current?.cancel();
      else sessionRef.current?.end();
    }
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setStatus('idle');
    setPeer(null);
    setEndedReason(null);
    setLocalStream(null);
    setRemoteStream(null);
    loadLobby();
  }

  function toggleMic() { const n = !micOn; setMicOn(n); sessionRef.current?.setMuted(!n); }
  function toggleCam() { const n = !cameraOn; setCameraOn(n); sessionRef.current?.setVideoOff(!n); }

  async function toggleShare() {
    if (!sessionRef.current) return;
    if (sharing) { await sessionRef.current.stopScreenShare(); setSharing(false); }
    else { setSharing(await sessionRef.current.startScreenShare()); }
  }

  /* ─────────── chat ─────────── */
  useEffect(() => {
    if (!['connecting', 'connected'].includes(status) || !peer?.id) return;
    const load = () => api.get(`/messages/${peer.id}`)
      .then(r => setChatMessages((r.data.messages || []).slice(-20)))
      .catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [status, peer?.id]);

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || !peer?.id) return;
    setChatInput('');
    setChatMessages(m => [...m, { id: Date.now(), text, isMe: true, time: 'now' }]);
    try { await api.post('/messages/send', { counselorId: peer.id, text }); } catch { /* local echo kept */ }
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.subtitle || '').toLowerCase().includes(search.toLowerCase())
  );

  const inCall = ['calling', 'connecting', 'connected', 'ended'].includes(status);

  /* ─────────── incoming banner ─────────── */
  const incomingBanner = incoming && (
    <motion.div
      initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
      style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
        background: 'white', borderRadius: 20, padding: '16px 20px', minWidth: 340,
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)', border: `1px solid ${CC.softSage}`,
      }}>
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: CC.forestSage }}>
          <Phone size={18} color="white" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <p style={{ fontWeight: 700, color: CC.primaryText, fontSize: '0.94rem' }}>{incoming.fromName}</p>
          <p style={{ color: CC.mutedOlive, fontSize: '0.78rem' }}>
            Incoming {(incoming as any).audioOnly ? 'voice' : 'video'} call…
          </p>
        </div>
        <button onClick={declineIncoming} className="px-3 py-2 rounded-xl"
          style={{ background: '#FEF2F2', color: '#EF5350', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          Decline
        </button>
        <button onClick={acceptIncoming} className="px-3 py-2 rounded-xl"
          style={{ background: CC.forestSage, color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
          Answer
        </button>
      </div>
    </motion.div>
  );

  /* ═══════════════ LOBBY ═══════════════ */
  if (!inCall) {
    return (
      <div className="p-8" style={{ backgroundColor: CC.luxuryBg, minHeight: '100%' }}>
        <AnimatePresence>{incomingBanner}</AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p style={{ color: CC.mutedOlive, fontSize: '0.875rem', marginBottom: 4 }}>Talk face to face</p>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: '1.9rem', color: CC.primaryText, marginBottom: 24 }}>
            Video Sessions
          </h1>

          {!support.ok && (
            <div className="p-4 rounded-2xl mb-5 flex items-start gap-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <AlertCircle size={18} color="#EF5350" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ color: '#B91C1C', fontSize: '0.85rem', lineHeight: 1.6 }}>{support.reason}</p>
            </div>
          )}

          {callError && (
            <div className="p-4 rounded-2xl mb-5 flex items-start gap-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <AlertCircle size={18} color="#EF5350" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ color: '#B91C1C', fontSize: '0.85rem', lineHeight: 1.6 }}>{callError}</p>
            </div>
          )}

          {/* Counselors */}
          <div className="rounded-3xl overflow-hidden mb-5"
            style={{ background: 'white', border: `1px solid ${CC.softSage}`, boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
            <div className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${CC.softSage}` }}>
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '0.98rem', color: CC.primaryText }}>
                Your counselors
              </h2>
              <div className="relative">
                <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: CC.mutedOlive }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  style={{
                    paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                    borderRadius: 12, border: `1px solid ${CC.softSage}`, background: CC.luxuryBg,
                    fontSize: '0.82rem', color: CC.primaryText, outline: 'none', width: 200,
                  }} />
              </div>
            </div>

            {loading && (
              <div className="px-6 py-10 flex items-center justify-center gap-2">
                <Loader2 size={16} color={CC.mutedOlive} className="animate-spin" />
                <span style={{ color: CC.mutedOlive, fontSize: '0.85rem' }}>Loading…</span>
              </div>
            )}

            {loadError && (
              <div className="px-6 py-8 text-center">
                <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', marginBottom: 10 }}>{loadError}</p>
                <button onClick={loadLobby} className="px-4 py-2 rounded-xl"
                  style={{ background: CC.forestSage, color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Try again
                </button>
              </div>
            )}

            {!loading && !loadError && !filtered.length && (
              <div className="px-6 py-10 text-center">
                <p style={{ fontSize: '1.6rem', marginBottom: 8 }}>💬</p>
                <p style={{ color: CC.mutedOlive, fontSize: '0.85rem', lineHeight: 1.7 }}>
                  You can call a counselor once you've booked a session or started a conversation with them.
                </p>
              </div>
            )}

            {!loading && filtered.map(c => {
              const online = onlineIds.has(c.id);
              const callable = online && support.ok;
              return (
                <div key={c.id} className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${CC.softSage}66` }}>
                  <div className="relative shrink-0">
                    {c.avatar
                      ? <img src={c.avatar} alt={c.name} className="w-11 h-11 rounded-2xl object-cover" />
                      : <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                          style={{ background: CC.softSage, color: CC.forestSage, fontWeight: 700 }}>
                          {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>}
                    <span style={{
                      position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%',
                      background: online ? '#22c55e' : CC.mutedOlive, border: '2px solid white',
                    }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.9rem' }} className="truncate">{c.name}</p>
                    <p style={{ color: online ? '#22c55e' : CC.mutedOlive, fontSize: '0.76rem' }}>
                      {online ? 'Available now' : 'Offline'}
                    </p>
                  </div>

                  {/* Voice and video are separate deliberate choices */}
                  <button onClick={() => startCall(c, true)} disabled={!callable}
                    title={callable ? `Voice call ${c.name}` : 'Not available'}
                    className="px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0"
                    style={{
                      background: callable ? CC.softSage : 'transparent',
                      color: callable ? CC.forestSage : CC.mutedOlive,
                      border: `1px solid ${CC.softSage}`,
                      cursor: callable ? 'pointer' : 'not-allowed',
                      opacity: callable ? 1 : 0.5, fontSize: '0.8rem', fontWeight: 600,
                    }}>
                    <Phone size={14} /> Voice
                  </button>
                  <button onClick={() => startCall(c)} disabled={!callable}
                    title={callable ? `Video call ${c.name}` : 'Not available'}
                    className="px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0"
                    style={{
                      background: callable ? CC.forestSage : CC.softSage,
                      color: callable ? 'white' : CC.mutedOlive,
                      border: 'none', cursor: callable ? 'pointer' : 'not-allowed',
                      opacity: callable ? 1 : 0.6, fontSize: '0.8rem', fontWeight: 600,
                    }}>
                    <Video size={14} /> Video
                  </button>
                </div>
              );
            })}
          </div>

          {/* Recent calls */}
          {history.length > 0 && (
            <div className="rounded-3xl overflow-hidden"
              style={{ background: 'white', border: `1px solid ${CC.softSage}`, boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
              <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${CC.softSage}` }}>
                <History size={16} color={CC.forestSage} />
                <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: '0.98rem', color: CC.primaryText }}>
                  Recent calls
                </h2>
              </div>
              {history.slice(0, 6).map(call => (
                <div key={call.id} className="px-6 py-3.5 flex items-center gap-3" style={{ borderBottom: `1px solid ${CC.softSage}66` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: call.status === 'ended' ? '#EAF7EA' : call.status === 'missed' ? '#FEF2F2' : CC.softSage }}>
                    {call.status === 'ended'
                      ? <CheckCircle size={15} color="#22c55e" />
                      : <PhoneOff size={15} color={call.status === 'missed' ? '#EF5350' : CC.mutedOlive} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontWeight: 600, color: CC.primaryText, fontSize: '0.88rem' }} className="truncate">{call.peerName}</p>
                    <p style={{ color: CC.mutedOlive, fontSize: '0.76rem' }}>
                      {call.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} · {call.dateLabel}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: call.status === 'ended' ? CC.forestSage : CC.mutedOlive }}>
                    {call.status === 'ended' ? call.durationLabel
                      : call.status === 'missed' ? 'Missed'
                      : call.status === 'rejected' ? 'Declined' : 'Not connected'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  /* ═══════════════ IN CALL ═══════════════ */
  // Fixed to the viewport, not `height: 100%`.
  //
  // The dashboard renders pages inside a wrapper that only sets `min-height`,
  // and a percentage height resolves against a parent's *height* — min-height
  // doesn't establish one. So `height: 100%` computed to `auto` and the whole
  // call collapsed into a ~360px strip at the top of the page with the sidebar
  // and navbar still around it. Taking over the viewport also gives the client
  // the same distraction-free session the counselor already had.
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      display: 'flex', flexDirection: 'column',
      background: '#0F1512', fontFamily: 'Inter',
    }}>
      <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{peer?.name}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5 }}>
            {status === 'calling' ? 'Calling…'
              : status === 'connecting' ? 'Connecting…'
              : status === 'connected' ? `${audioOnly ? 'Voice call' : 'Video session'} · ${clock}`
              : 'Session ended'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {status === 'connected' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.08)', color: 'white', fontSize: 12 }}>
              <Clock size={12} /> {clock}
            </div>
          )}
          {/* The call now covers the whole viewport, so there has to be an
              unambiguous way out that isn't the red hang-up button. */}
          <button onClick={leaveSession} title="End the session and go back"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',
            }}>
            <ArrowLeft size={13} /> Leave session
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Stage */}
        <div style={{ flex: 1, position: 'relative', background: '#0B0F0D' }}>
          {/* The remote video stays mounted for as long as there is a stream,
              whatever the status says. It used to be swapped out for the
              placeholder whenever status wasn't exactly 'connected' — so a
              momentary drop destroyed the element, and with it the srcObject
              binding, leaving a permanently black stage. The placeholder now
              sits on top instead of replacing it. */}
          {!audioOnly && remoteStream && (
            <video
              {...remoteVideo.videoProps}
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#0B0F0D' }}
            />
          )}

          {(audioOnly || !remoteStream || status !== 'connected') && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
              background: '#0B0F0D',
            }}>
              <motion.div
                animate={status === 'connected' ? {} : { scale: [1, 1.06, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 92, height: 92, borderRadius: 28, background: 'rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {audioOnly ? <Phone size={34} color="rgba(255,255,255,0.75)" /> : <Video size={34} color="rgba(255,255,255,0.75)" />}
              </motion.div>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>{peer?.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                {status === 'calling' ? 'Ringing…'
                  : status === 'connecting' ? (diagnostic || 'Connecting…')
                  : status === 'connected' && audioOnly ? 'Voice call in progress'
                  : status === 'connected' ? 'Waiting for their video…'
                  : endedReason === 'you-hung-up' ? 'You ended the session'
                  : endedReason === 'declined' ? 'Call declined'
                  : 'Session ended'}
              </p>
            </div>
          )}

          {/* If the browser refuses to start playback there is nothing to see
              and no error anywhere — this at least gives a way through. */}
          {remoteVideo.blocked && status === 'connected' && !audioOnly && (
            <button onClick={remoteVideo.retry}
              style={{
                position: 'absolute', inset: 0, margin: 'auto', width: 210, height: 44,
                borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.92)', color: '#0F1512', fontWeight: 700, fontSize: 14,
              }}>
              Tap to start video
            </button>
          )}

          {status === 'connected' && (peerState.muted || peerState.videoOff) && (
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
              {peerState.muted && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 12 }}>
                  <MicOff size={12} /> Muted
                </span>
              )}
              {peerState.videoOff && !audioOnly && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 12 }}>
                  <VideoOff size={12} /> Camera off
                </span>
              )}
            </div>
          )}

          {/* Self view — pointless on a voice call */}
          {!audioOnly && (
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 190, height: 130, borderRadius: 16, overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.12)' }}>
              <video {...localVideo.videoProps} muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: cameraOn ? 'block' : 'none' }} />
              {!cameraOn && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <VideoOff size={22} color="rgba(255,255,255,0.4)" />
                </div>
              )}
              <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>
                You{!micOn && ' · muted'}
              </span>
            </div>
          )}
        </div>

        {/* Chat */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>Session chat</span>
                <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!chatMessages.length && (
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>No messages yet</p>
                )}
                {chatMessages.map((m, i) => (
                  <div key={m.id || i} style={{ display: 'flex', justifyContent: m.isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ padding: '8px 12px', borderRadius: 14, maxWidth: '85%', fontSize: 13, color: 'white', background: m.isMe ? CC.forestSage : 'rgba(255,255,255,0.09)' }}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 12, display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type a message…"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 12, fontSize: 13, fontFamily: 'Inter', background: 'rgba(255,255,255,0.07)', border: 'none', color: 'white', outline: 'none' }} />
                <button onClick={sendChat}
                  style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, border: 'none', cursor: 'pointer', background: CC.forestSage, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={15} color="white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Ctrl onClick={toggleMic} danger={!micOn} label={micOn ? 'Mute' : 'Unmute'}
          icon={micOn ? <Mic size={19} /> : <MicOff size={19} />} />
        {!audioOnly && (
          <>
            <Ctrl onClick={toggleCam} danger={!cameraOn} label={cameraOn ? 'Stop video' : 'Start video'}
              icon={cameraOn ? <Video size={19} /> : <VideoOff size={19} />} />
            <Ctrl onClick={toggleShare} active={sharing} label={sharing ? 'Stop sharing' : 'Share screen'}
              icon={sharing ? <MonitorOff size={19} /> : <Monitor size={19} />} />
          </>
        )}
        <Ctrl onClick={() => setShowChat(s => !s)} active={showChat} label="Chat"
          icon={<MessageSquare size={19} />} />
        <button onClick={hangUp}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', height: 48, marginLeft: 8,
            borderRadius: 16, border: 'none', cursor: 'pointer', background: '#EF4444',
            color: 'white', fontWeight: 600, fontSize: 14, fontFamily: 'Inter',
          }}>
          <PhoneOff size={18} /> {status === 'calling' ? 'Cancel' : 'End session'}
        </button>
      </div>
    </div>
  );
}

function Ctrl({ onClick, active, danger, icon, label }: any) {
  return (
    <button onClick={onClick} title={label} aria-label={label}
      style={{
        width: 48, height: 48, borderRadius: 16, border: 'none', cursor: 'pointer', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: danger ? '#EF4444' : active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)',
      }}>
      {icon}
    </button>
  );
}

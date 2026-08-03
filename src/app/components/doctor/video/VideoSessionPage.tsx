// Counselor-side video / voice sessions.
//
// Shares the WebRTC engine in lib/callClient.ts with the client panel. This
// page is the lobby (own clients only), the in-call surface and the controls.

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, Camera, CameraOff, Monitor, MonitorOff, PhoneOff, MessageSquare,
  Clock, Send, Video, Search, AlertCircle, Loader2, CheckCircle, History, Phone, ArrowLeft,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { api } from '../../../lib/api';
import { CallSession, getSocket, checkVideoSupport } from '../../../lib/callClient';
import type { CallStatus, IncomingCall } from '../../../lib/callClient';
import { takePendingCall } from '../../../lib/callInbox';

export function VideoSessionPage({ onNavigate, onCallStateChange }: {
  onNavigate: (page: string) => void;
  /** Lets the panel hide its chrome for an actual call, but not for the lobby. */
  onCallStateChange?: (inCall: boolean) => void;
}) {
  const { c: colors } = useTheme();

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

  /* ── in-call ── */
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [peerState, setPeerState] = useState<{ muted?: boolean; videoOff?: boolean }>({});
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [seconds, setSeconds] = useState(0);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
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
      setLoadError(e.message || 'Could not load your clients');
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
  useEffect(() => {
    if (status !== 'connected') { setSeconds(0); return; }
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
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
            setStatus('idle'); setPeer(null); setEndedReason(null);
            setLocalStream(null); setRemoteStream(null); loadLobby();
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

  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream, status]);
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream, status]);

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
          : res.error === 'not-connected' ? 'You can only call your own clients.'
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

  // Handed off from the global ringer on another screen
  useEffect(() => {
    const handed = takePendingCall();
    if (handed) answerCall(handed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acceptIncoming = () => {
    if (!incoming) return;
    answerCall(incoming, contacts.find(c => c.id === incoming.from.id));
  };
  const declineIncoming = () => {
    if (!incoming) return;
    new CallSession({}).reject(incoming.callId);
    setIncoming(null);
  };

  /* ─────────── controls ─────────── */
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
    const load = () => api.get(`/doctor/messages/${peer.id}`)
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
    setChatMessages(m => [...m, { id: Date.now(), text, fromDoctor: true, time: 'now' }]);
    try { await api.post(`/doctor/messages/${peer.id}`, { text }); } catch { /* local echo kept */ }
  }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.subtitle || '').toLowerCase().includes(search.toLowerCase())
  );

  const inCall = ['calling', 'connecting', 'connected', 'ended'].includes(status);

  // Tell the panel, so the sidebar and top nav only disappear during a call.
  useEffect(() => { onCallStateChange?.(inCall); }, [inCall, onCallStateChange]);

  // Never leave the panel stuck in immersive mode if this page unmounts
  // mid-call — e.g. the doctor navigates away with a browser gesture.
  useEffect(() => () => { onCallStateChange?.(false); }, [onCallStateChange]);

  /** Ends the call and returns to the lobby. */
  const leaveSession = () => {
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
  };

  /* ─────────── incoming banner ─────────── */
  const incomingBanner = incoming && (
    <motion.div
      initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
      style={{
        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
        background: colors.white, borderRadius: 20, padding: '16px 20px', minWidth: 340,
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)', border: `1px solid ${colors.border}`,
        fontFamily: 'Inter',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.div
          animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ width: 44, height: 44, borderRadius: 16, background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Phone size={18} color="white" />
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: colors.textPrimary, fontSize: 14 }}>{incoming.fromName}</p>
          <p style={{ color: colors.textMuted, fontSize: 12.5 }}>
            Incoming {(incoming as any).audioOnly ? 'voice' : 'video'} call…
          </p>
        </div>
        <button onClick={declineIncoming}
          style={{ padding: '8px 12px', borderRadius: 10, background: '#FFEBEE', color: colors.error, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
          Decline
        </button>
        <button onClick={acceptIncoming}
          style={{ padding: '8px 12px', borderRadius: 10, background: colors.primary, color: 'white', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
          Answer
        </button>
      </div>
    </motion.div>
  );

  /* ═══════════════ LOBBY ═══════════════ */
  if (!inCall) {
    return (
      <div style={{ padding: 28, fontFamily: 'Inter' }}>
        <AnimatePresence>{incomingBanner}</AnimatePresence>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary, margin: 0 }}>Video Sessions</h2>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '4px 0 22px' }}>
          Call a client you're already working with
        </p>

        {!support.ok && (
          <div style={{ padding: 16, borderRadius: 14, marginBottom: 18, background: '#FFEBEE', border: '1px solid #FFCDD2', display: 'flex', gap: 10 }}>
            <AlertCircle size={18} color={colors.error} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: colors.error, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{support.reason}</p>
          </div>
        )}
        {callError && (
          <div style={{ padding: 16, borderRadius: 14, marginBottom: 18, background: '#FFEBEE', border: '1px solid #FFCDD2', display: 'flex', gap: 10 }}>
            <AlertCircle size={18} color={colors.error} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: colors.error, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{callError}</p>
          </div>
        )}

        {/* Clients */}
        <div style={{ background: colors.white, borderRadius: 18, border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: 18 }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Your clients</h3>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                style={{ padding: '8px 12px 8px 32px', borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.background, fontSize: 13, color: colors.textPrimary, outline: 'none', width: 200, fontFamily: 'Inter' }} />
            </div>
          </div>

          {loading && (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} color={colors.textMuted} className="animate-spin" />
              <span style={{ color: colors.textMuted, fontSize: 13 }}>Loading…</span>
            </div>
          )}

          {loadError && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, fontSize: 13, marginBottom: 10 }}>{loadError}</p>
              <button onClick={loadLobby}
                style={{ padding: '8px 16px', borderRadius: 10, background: colors.primary, color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Try again
              </button>
            </div>
          )}

          {!loading && !loadError && !filtered.length && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 26, margin: '0 0 8px' }}>👥</p>
              <p style={{ color: colors.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Clients appear here once they've booked a session or started a conversation with you.
              </p>
            </div>
          )}

          {!loading && filtered.map(c => {
            const online = onlineIds.has(c.id);
            const callable = online && support.ok;
            return (
              <div key={c.id} style={{ padding: '14px 22px', borderBottom: `1px solid ${colors.border}66`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: `linear-gradient(135deg, ${colors.primary}, ${colors.lightSage})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                    {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <span style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%', background: online ? colors.success : colors.textMuted, border: `2px solid ${colors.white}` }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: colors.textPrimary, fontSize: 14, margin: 0 }}>{c.name}</p>
                  <p style={{ color: online ? colors.success : colors.textMuted, fontSize: 12, margin: 0 }}>
                    {online ? 'Available now' : 'Offline'}
                  </p>
                </div>

                {/* Voice and video are separate deliberate choices */}
                <button onClick={() => startCall(c, true)} disabled={!callable}
                  title={callable ? `Voice call ${c.name}` : 'Not available'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
                    background: callable ? colors.veryLightSage : 'transparent',
                    color: callable ? colors.primary : colors.textMuted,
                    border: `1px solid ${colors.border}`,
                    cursor: callable ? 'pointer' : 'not-allowed', opacity: callable ? 1 : 0.5,
                    fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter', flexShrink: 0,
                  }}>
                  <Phone size={13} /> Voice
                </button>
                <button onClick={() => startCall(c)} disabled={!callable}
                  title={callable ? `Video call ${c.name}` : 'Not available'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
                    background: callable ? colors.primary : colors.background,
                    color: callable ? 'white' : colors.textMuted,
                    border: 'none', cursor: callable ? 'pointer' : 'not-allowed', opacity: callable ? 1 : 0.6,
                    fontSize: 12.5, fontWeight: 600, fontFamily: 'Inter', flexShrink: 0,
                  }}>
                  <Video size={13} /> Video
                </button>
              </div>
            );
          })}
        </div>

        {/* Recent calls */}
        {history.length > 0 && (
          <div style={{ background: colors.white, borderRadius: 18, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <History size={16} color={colors.primary} />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>Recent calls</h3>
            </div>
            {history.slice(0, 6).map(call => (
              <div key={call.id} style={{ padding: '13px 22px', borderBottom: `1px solid ${colors.border}66`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: call.status === 'ended' ? '#E8F5E9' : call.status === 'missed' ? '#FFEBEE' : colors.background }}>
                  {call.status === 'ended'
                    ? <CheckCircle size={15} color={colors.success} />
                    : <PhoneOff size={15} color={call.status === 'missed' ? colors.error : colors.textMuted} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, color: colors.textPrimary, fontSize: 13.5, margin: 0 }}>{call.peerName}</p>
                  <p style={{ color: colors.textMuted, fontSize: 12, margin: 0 }}>
                    {call.direction === 'outgoing' ? 'Outgoing' : 'Incoming'} · {call.dateLabel}
                  </p>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: call.status === 'ended' ? colors.primary : colors.textMuted }}>
                  {call.status === 'ended' ? call.durationLabel
                    : call.status === 'missed' ? 'Missed'
                    : call.status === 'rejected' ? 'Declined' : 'Not connected'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════ IN CALL ═══════════════ */
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0F1512', fontFamily: 'Inter' }}>
      <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <p style={{ color: 'white', fontWeight: 700, fontSize: 15, margin: 0 }}>{peer?.name}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, margin: 0 }}>
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
          {/* An explicit way out, so the call is never a dead end */}
          <button
            onClick={leaveSession}
            title="End the session and go back"
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
        <div style={{ flex: 1, position: 'relative', background: '#0B0F0D' }}>
          {status === 'connected' && !audioOnly ? (
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              <motion.div
                animate={status === 'connected' ? {} : { scale: [1, 1.06, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{ width: 92, height: 92, borderRadius: 28, background: 'rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {audioOnly ? <Phone size={34} color="rgba(255,255,255,0.75)" /> : <Video size={34} color="rgba(255,255,255,0.75)" />}
              </motion.div>
              <p style={{ color: 'white', fontWeight: 600, fontSize: 16, margin: 0 }}>{peer?.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>
                {status === 'calling' ? 'Ringing…'
                  : status === 'connecting' ? (diagnostic || 'Connecting…')
                  : status === 'connected' ? 'Voice call in progress'
                  : endedReason === 'you-hung-up' ? 'You ended the session' : 'Session ended'}
              </p>
            </div>
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
                  <CameraOff size={12} /> Camera off
                </span>
              )}
            </div>
          )}

          {!audioOnly && (
            <div style={{ position: 'absolute', bottom: 20, right: 20, width: 190, height: 130, borderRadius: 16, overflow: 'hidden', background: '#111', border: '2px solid rgba(255,255,255,0.12)' }}>
              <video ref={localVideoRef} autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: cameraOn ? 'block' : 'none' }} />
              {!cameraOn && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CameraOff size={22} color="rgba(255,255,255,0.4)" />
                </div>
              )}
              <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 11.5, color: 'rgba(255,255,255,0.75)' }}>
                You{!micOn && ' · muted'}
              </span>
            </div>
          )}
        </div>

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
                  <div key={m.id || i} style={{ display: 'flex', justifyContent: m.fromDoctor ? 'flex-end' : 'flex-start' }}>
                    <div style={{ padding: '8px 12px', borderRadius: 14, maxWidth: '85%', fontSize: 13, color: 'white', background: m.fromDoctor ? colors.primary : 'rgba(255,255,255,0.09)' }}>
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
                  style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, border: 'none', cursor: 'pointer', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={15} color="white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Ctrl onClick={toggleMic} danger={!micOn} label={micOn ? 'Mute' : 'Unmute'}
          icon={micOn ? <Mic size={19} /> : <MicOff size={19} />} />
        {!audioOnly && (
          <>
            <Ctrl onClick={toggleCam} danger={!cameraOn} label={cameraOn ? 'Stop video' : 'Start video'}
              icon={cameraOn ? <Camera size={19} /> : <CameraOff size={19} />} />
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

// Global incoming-call ringer.
//
// Mounted once inside each panel shell so a call reaches you on any screen,
// not just the video page. Accepting stashes the call and navigates to the
// video screen, which answers it on mount.

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { getSocket, checkVideoSupport } from '../lib/callClient';
import type { IncomingCall } from '../lib/callClient';
import { setPendingCall } from '../lib/callInbox';
import { isLoggedIn } from '../lib/auth';

interface Props {
  /** Where to send the user when they accept. */
  onAccept: () => void;
  /** Suppress the ringer while the video page is already handling calls. */
  suppressed?: boolean;
  theme?: 'light' | 'dark';
}

export function IncomingCallRinger({ onAccept, suppressed, theme = 'light' }: Props) {
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const audioRef = useRef<{ ctx: AudioContext; timer: any } | null>(null);

  useEffect(() => {
    if (!isLoggedIn() || !checkVideoSupport().ok) return;
    const sock = getSocket();

    const onIncoming = (p: IncomingCall) => setIncoming(p);
    const onGone = () => setIncoming(null);

    sock.on('call:incoming', onIncoming);
    sock.on('call:cancelled', onGone);
    sock.on('call:ended', onGone);

    return () => {
      sock.off('call:incoming', onIncoming);
      sock.off('call:cancelled', onGone);
      sock.off('call:ended', onGone);
    };
  }, []);

  // A soft two-tone ring, synthesised so there's no audio file to ship
  useEffect(() => {
    const stop = () => {
      if (audioRef.current) {
        clearInterval(audioRef.current.timer);
        audioRef.current.ctx.close().catch(() => {});
        audioRef.current = null;
      }
    };

    if (!incoming || suppressed) { stop(); return; }

    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();

      const beep = () => {
        [0, 0.18].forEach((offset, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = i === 0 ? 660 : 880;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.16);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.18);
        });
      };

      beep();
      const timer = setInterval(beep, 2200);
      audioRef.current = { ctx, timer };
    } catch { /* audio is a nicety, never fatal */ }

    return stop;
  }, [incoming, suppressed]);

  if (!incoming || suppressed) return null;

  const dark = theme === 'dark';

  function accept() {
    setPendingCall(incoming);
    setIncoming(null);
    onAccept();
  }

  function decline() {
    getSocket().emit('call:reject', { callId: incoming!.callId });
    setIncoming(null);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.96 }}
        style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: 370, borderRadius: 24, overflow: 'hidden',
          background: dark ? '#161B27' : '#FFFFFF',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#E8EDEA'}`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ padding: '22px 24px 14px', textAlign: 'center' }}>
          <motion.div
            animate={{ scale: [1, 1.09, 1] }}
            transition={{ repeat: Infinity, duration: 1.3 }}
            style={{
              width: 62, height: 62, borderRadius: 18, margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #5E8B7E, #2D6A4F)',
              color: 'white', fontSize: 19, fontWeight: 700,
            }}
          >
            {incoming.fromName.slice(0, 2).toUpperCase()}
          </motion.div>
          <p style={{
            fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: dark ? '#94A3B8' : '#8A9A93', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Video size={12} /> Incoming video call
          </p>
          <h3 style={{
            fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18,
            color: dark ? '#E2E8F0' : '#2C3A34', marginTop: 4,
          }}>
            {incoming.fromName}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: 12, padding: '0 24px 22px' }}>
          <button onClick={decline}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: dark ? 'rgba(239,83,80,0.16)' : '#FEF2F2', color: '#EF5350',
              fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <PhoneOff size={16} /> Decline
          </button>
          <button onClick={accept}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: '#22c55e', color: 'white',
              fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            <Phone size={16} /> Accept
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

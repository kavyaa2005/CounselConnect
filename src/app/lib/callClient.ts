// Real WebRTC calling.
//
// Media never touches the server — the two browsers connect directly and the
// backend only relays the SDP offer/answer and ICE candidates needed to set
// that up. Public STUN servers handle NAT traversal.

import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

const SIGNAL_URL = (import.meta as any).env.VITE_API_URL
  ? String((import.meta as any).env.VITE_API_URL).replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ],
  },
];

const OFFER_RETRY_MS = 3000;
const MAX_OFFER_RETRIES = 4;
const CONNECT_TIMEOUT_MS = 30000;
/** How long the caller keeps ringing before giving up. */
const RING_TIMEOUT_MS = 45000;

export type CallStatus =
  | 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';

export interface IncomingCall {
  callId: string;
  from: { id: string; role: string };
  fromName: string;
  fromRole: string;
}

/* ───────────────── socket singleton ───────────────── */
//
// Critical: never tear down a socket that is merely *connecting* or
// *reconnecting*. Doing so orphans every listener bound to it — which silently
// kills an in-flight call. Only rebuild when the identity (token) changes.

let socket: Socket | null = null;
let socketToken: string | null = null;

export function getSocket(): Socket {
  const token = getToken();

  if (socket && socketToken === token) return socket;

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socketToken = token;
  socket = io(SIGNAL_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 600,
    reconnectionDelayMax: 4000,
    timeout: 12000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}

/** Resolves once the socket is actually connected (or rejects after `ms`). */
export function ensureConnected(ms = 10000): Promise<Socket> {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.off('connect', onOk);
      s.off('connect_error', onErr);
      reject(new Error('Could not reach the server. Is the backend running on port 5000?'));
    }, ms);
    const onOk = () => { clearTimeout(timer); s.off('connect_error', onErr); resolve(s); };
    const onErr = (e: any) => {
      clearTimeout(timer);
      s.off('connect', onOk);
      reject(new Error(e?.message || 'Could not connect to the call server'));
    };
    s.once('connect', onOk);
    s.once('connect_error', onErr);
  });
}

/* ───────────────── the call session ───────────────── */

interface CallCallbacks {
  onStatus?: (s: CallStatus, info?: any) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onPeerState?: (state: { muted?: boolean; videoOff?: boolean; sharing?: boolean }) => void;
  onError?: (message: string) => void;
  /** Human-readable progress, surfaced in the UI while connecting. */
  onDiagnostic?: (line: string) => void;
}

export type CallStats = {
  kbps: number;
  lossPct: number;
  rtt: number | null;
  quality: 'good' | 'fair' | 'poor';
};

export class CallSession {
  callId: string | null = null;

  private pc: RTCPeerConnection | null = null;
  /** Previous getStats() sample, for deriving bitrate from cumulative counters. */
  private lastStats: { at: number; bytes: number; lost: number; received: number } | null = null;
  /** True when this call was deliberately started as voice-only. */
  audioOnly = false;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private cb: CallCallbacks;
  private sock: Socket;

  private pendingIce: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private isCaller = false;
  private closed = false;
  /** Has this call ever reached a connected state? */
  private connected = false;
  /**
   * Is it connected *right now*?
   *
   * Kept apart from `connected` deliberately. A brief ICE `disconnected` used
   * to flip the UI to "Connecting…" and then never flip it back, because
   * markConnected() early-returned on `connected` still being true. The call
   * recovered underneath but the interface stayed on the connecting screen
   * forever — which also unmounted the remote <video> for good.
   */
  private live = false;

  private cachedAnswer: RTCSessionDescriptionInit | null = null;
  private offerTimer: any = null;
  private offerAttempts = 0;
  private connectTimer: any = null;
  private mediaFallbackTimer: any = null;
  private ringTimer: any = null;

  constructor(callbacks: CallCallbacks = {}) {
    this.cb = callbacks;
    this.sock = getSocket();
    this.bind();
  }

  private diag(line: string) {
    this.cb.onDiagnostic?.(line);
  }

  private bind() {
    this.sock.on('call:accepted', this.handleAccepted);
    this.sock.on('call:rejected', this.handleRejected);
    this.sock.on('call:cancelled', this.handleEnded);
    this.sock.on('call:ended', this.handleEnded);
    this.sock.on('webrtc:offer', this.handleOffer);
    this.sock.on('webrtc:answer', this.handleAnswer);
    this.sock.on('webrtc:ice', this.handleIce);
    this.sock.on('call:state', this.handlePeerState);
  }

  private unbind() {
    this.sock.off('call:accepted', this.handleAccepted);
    this.sock.off('call:rejected', this.handleRejected);
    this.sock.off('call:cancelled', this.handleEnded);
    this.sock.off('call:ended', this.handleEnded);
    this.sock.off('webrtc:offer', this.handleOffer);
    this.sock.off('webrtc:answer', this.handleAnswer);
    this.sock.off('webrtc:ice', this.handleIce);
    this.sock.off('call:state', this.handlePeerState);
  }

  /**
   * Camera + mic, or mic only.
   *
   * `audioOnly` is a deliberate choice by the caller — distinct from the
   * NotFoundError fallback below, which is what happens when someone simply
   * has no camera. A voice call shouldn't ask for camera permission at all.
   */
  async getMedia(audioOnly = false): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    this.audioOnly = audioOnly;

    if (audioOnly) {
      this.diag('Requesting microphone…');
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        this.diag('Microphone ready.');
        this.cb.onLocalStream?.(this.localStream);
        return this.localStream;
      } catch (err: any) {
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          throw new Error('Microphone access was blocked. Allow it from your browser address bar and try again.');
        }
        throw new Error('No microphone was found on this device.');
      }
    }

    this.diag('Requesting camera and microphone…');
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new Error('Camera and microphone access was blocked. Click the camera icon in your browser address bar, allow access, then try again.');
      }
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        // Fall back to audio-only rather than failing the whole call
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          this.diag('No camera found — continuing with audio only.');
        } catch {
          throw new Error('No camera or microphone was found on this device.');
        }
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        throw new Error('Your camera is already in use by another app (Zoom, Teams, Meet, another tab). Close it and try again.');
      } else {
        throw new Error('Could not start your camera: ' + (err?.message || name || 'unknown error'));
      }
    }
    this.diag('Camera ready.');
    this.cb.onLocalStream?.(this.localStream!);
    return this.localStream!;
  }

  private createPeer(): RTCPeerConnection {
    if (this.pc) return this.pc;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.diag('Created peer connection.');

    // Always attach local tracks before any offer/answer is generated
    this.localStream?.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream!);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate && this.callId) {
        this.sock.emit('webrtc:ice', { callId: this.callId, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams && e.streams[0];
      if (stream) {
        this.diag('Receiving their video.');
        this.cb.onRemoteStream?.(stream);

        // Last-resort net: if their media is arriving, the call works — even if
        // neither state flag ever settles. Never leave the user staring at
        // "Connecting…" while video is actually playing.
        if (!this.mediaFallbackTimer) {
          this.mediaFallbackTimer = setTimeout(() => this.markConnected(), 2500);
        }
      }
    };

    // Browsers are inconsistent about which of these two settles first — and on
    // the answering side `connectionState` sometimes never leaves "connecting"
    // even though media is flowing. Treat either as success.
    pc.oniceconnectionstatechange = () => {
      this.diag(`ICE: ${pc.iceConnectionState}`);
      const s = pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') this.markConnected();
      if (s === 'disconnected') this.markInterrupted();
      if (s === 'failed') {
        try { (pc as any).restartIce?.(); } catch { /* older browsers */ }
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.closed) return;
      const s = pc.connectionState;
      this.diag(`Peer connection: ${s}`);

      if (s === 'connected') this.markConnected();
      if (s === 'failed') {
        this.cb.onError?.(
          'Could not establish a direct connection. This usually means a firewall or VPN is blocking peer-to-peer video.'
        );
        this.hardEnd();
      }
      if (s === 'disconnected') this.markInterrupted();
    };

    this.pc = pc;
    return pc;
  }

  /**
   * Idempotent while the call is live, but it MUST fire again after a blip —
   * otherwise the interface never comes back from "Connecting…".
   */
  private markConnected() {
    if (this.closed || this.live) return;
    const first = !this.connected;
    this.connected = true;
    this.live = true;
    this.stopRinging();
    this.stopOfferRetries();
    this.clearConnectTimeout();
    this.diag(first ? 'Connected.' : 'Reconnected.');
    this.cb.onStatus?.('connected');
  }

  /** A temporary drop. The call is not over; the UI just shouldn't claim it's fine. */
  private markInterrupted() {
    if (this.closed || !this.live) return;
    this.live = false;
    this.diag('Connection interrupted — trying to recover…');
    this.cb.onStatus?.('connecting', { recovering: true });
  }

  private startConnectTimeout() {
    this.clearConnectTimeout();
    this.connectTimer = setTimeout(() => {
      if (!this.connected && !this.closed) {
        this.cb.onError?.('The call could not connect in time. Check that both sides allowed camera access, then try again.');
        this.hardEnd();
      }
    }, CONNECT_TIMEOUT_MS);
  }

  private clearConnectTimeout() {
    if (this.connectTimer) { clearTimeout(this.connectTimer); this.connectTimer = null; }
  }

  private stopOfferRetries() {
    if (this.offerTimer) { clearInterval(this.offerTimer); this.offerTimer = null; }
  }

  private stopRinging() {
    if (this.ringTimer) { clearTimeout(this.ringTimer); this.ringTimer = null; }
  }

  /* ── outgoing ── */

  async call(toId: string, toRole: string, opts: { audioOnly?: boolean } = {}): Promise<{ ok: boolean; error?: string }> {
    this.isCaller = true;
    await ensureConnected();
    await this.getMedia(!!opts.audioOnly);

    return new Promise((resolve) => {
      let settled = false;
      const guard = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.cb.onError?.('The server did not respond to the call request.');
        resolve({ ok: false, error: 'timeout' });
      }, 10000);

      this.sock.emit('call:invite', { toId, toRole, audioOnly: !!opts.audioOnly }, (res: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(guard);

        if (!res?.ok) {
          this.cb.onError?.(res?.error || 'Could not place the call');
          resolve({ ok: false, error: res?.error });
          return;
        }
        this.callId = res.callId;
        this.diag('Ringing…');
        this.cb.onStatus?.('calling', { peerName: res.peerName });

        // Nothing used to stop the caller ringing. If the other side never
        // picked up — or their accept was dropped — you sat on "Ringing…"
        // indefinitely with no way to tell the difference from a hang.
        this.stopRinging();
        this.ringTimer = setTimeout(() => {
          if (this.closed || this.connected) return;
          this.diag('No answer.');
          this.cb.onError?.(`${res.peerName || 'They'} didn't answer.`);
          this.cancel();
        }, RING_TIMEOUT_MS);

        resolve({ ok: true });
      });
    });
  }

  /** Caller: they picked up — build the offer and keep re-sending until answered. */
  private handleAccepted = async ({ callId }: any) => {
    if (callId !== this.callId || this.closed) return;
    this.stopRinging();
    this.diag('They answered. Negotiating…');
    this.cb.onStatus?.('connecting');
    this.startConnectTimeout();

    this.createPeer();
    await this.sendOffer();

    // Self-heal: if the answer never lands, re-send the offer a few times
    this.stopOfferRetries();
    this.offerTimer = setInterval(() => {
      if (this.remoteDescSet || this.connected || this.closed) {
        this.stopOfferRetries();
        return;
      }
      if (this.offerAttempts >= MAX_OFFER_RETRIES) {
        this.stopOfferRetries();
        return;
      }
      this.diag(`No answer yet — resending offer (${this.offerAttempts + 1}).`);
      this.sendOffer();
    }, OFFER_RETRY_MS);
  };

  private async sendOffer() {
    if (!this.pc || !this.callId || this.closed) return;
    try {
      this.offerAttempts++;
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      } as any);
      // Only set it the first time; renegotiating a stable pc would break it
      if (this.pc.signalingState === 'stable' || !this.pc.localDescription) {
        await this.pc.setLocalDescription(offer);
      }
      this.sock.emit('webrtc:offer', {
        callId: this.callId,
        sdp: this.pc.localDescription || offer,
      });
      this.diag('Offer sent.');
    } catch (e: any) {
      this.cb.onError?.('Failed to start the connection: ' + (e?.message || e));
    }
  }

  /* ── incoming ── */

  async accept(callId: string, opts: { audioOnly?: boolean } = {}) {
    this.isCaller = false;
    this.callId = callId;
    await ensureConnected();
    // Answer a voice call with voice — asking for camera permission on an
    // audio call is both jarring and unnecessary.
    await this.getMedia(!!opts.audioOnly);

    if (this.closed) return;
    this.cb.onStatus?.('connecting');
    this.startConnectTimeout();

    // Build the peer connection up front so tracks and ICE are ready the
    // instant the offer lands
    this.createPeer();

    this.sock.emit('call:accept', { callId }, (res: any) => {
      if (!res?.ok) {
        this.cb.onError?.(res?.error || 'Could not join the call');
        this.hardEnd();
      } else {
        this.diag('Joined. Waiting for their offer…');
      }
    });
  }

  reject(callId: string) {
    this.sock.emit('call:reject', { callId });
  }

  /** Callee: answer the offer. Re-answers idempotently if the offer repeats. */
  private handleOffer = async ({ callId, sdp }: any) => {
    if (callId !== this.callId || this.closed) return;

    try {
      const pc = this.createPeer();

      // A repeat of an offer we already answered — just re-send the answer
      if (this.remoteDescSet && this.cachedAnswer) {
        this.diag('Duplicate offer — resending answer.');
        this.sock.emit('webrtc:answer', { callId, sdp: this.cachedAnswer });
        return;
      }

      this.diag('Offer received.');
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      this.remoteDescSet = true;
      await this.flushIce();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.cachedAnswer = pc.localDescription || answer;

      this.sock.emit('webrtc:answer', { callId, sdp: this.cachedAnswer });
      this.diag('Answer sent.');
    } catch (e: any) {
      this.cb.onError?.('Failed to answer the connection: ' + (e?.message || e));
    }
  };

  private handleAnswer = async ({ callId, sdp }: any) => {
    if (callId !== this.callId || !this.pc || this.closed) return;
    if (this.remoteDescSet) return;               // already applied
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      this.remoteDescSet = true;
      this.stopOfferRetries();
      this.diag('Answer applied.');
      await this.flushIce();
    } catch (e: any) {
      this.cb.onError?.('Failed to complete the connection: ' + (e?.message || e));
    }
  };

  private handleIce = async ({ callId, candidate }: any) => {
    if (callId !== this.callId || !candidate || this.closed) return;
    // ICE can arrive before the remote description is in place
    if (!this.pc || !this.remoteDescSet) {
      this.pendingIce.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch { /* stray candidates are normal, non-fatal */ }
  };

  private async flushIce() {
    if (!this.pc) return;
    const queued = this.pendingIce.splice(0);
    for (const c of queued) {
      try { await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* non-fatal */ }
    }
    if (queued.length) this.diag(`Applied ${queued.length} queued network candidate(s).`);
  }

  private handleRejected = ({ callId }: any) => {
    if (callId !== this.callId) return;
    this.cb.onStatus?.('ended', { reason: 'declined' });
    this.cleanup();
  };

  private handleEnded = ({ callId }: any) => {
    if (callId !== this.callId) return;
    this.cb.onStatus?.('ended', { reason: 'peer-hung-up' });
    this.cleanup();
  };

  private handlePeerState = ({ callId, ...state }: any) => {
    if (callId !== this.callId) return;
    this.cb.onPeerState?.(state);
  };

  /* ── in-call controls ── */

  /**
   * Samples WebRTC transport stats for the on-screen quality badge.
   *
   * getStats() reports cumulative counters, so bitrate has to be derived by
   * diffing against the previous sample rather than read directly.
   */
  async getStats(): Promise<CallStats | null> {
    if (!this.pc) return null;
    try {
      const report = await this.pc.getStats();
      let inbound: any = null;
      let pair: any = null;

      report.forEach((s: any) => {
        if (s.type === 'inbound-rtp' && s.kind === 'video') inbound = s;
        if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated !== false) pair = s;
      });
      if (!inbound) return null;

      const now = inbound.timestamp;
      const bytes = inbound.bytesReceived || 0;
      const lost = inbound.packetsLost || 0;
      const received = inbound.packetsReceived || 0;

      const prev = this.lastStats;
      this.lastStats = { at: now, bytes, lost, received };

      // First sample has no baseline to diff against
      if (!prev || now <= prev.at) return null;

      const seconds = (now - prev.at) / 1000;
      const kbps = Math.round(((bytes - prev.bytes) * 8) / seconds / 1000);
      const deltaLost = lost - prev.lost;
      const deltaTotal = deltaLost + (received - prev.received);
      const lossPct = deltaTotal > 0 ? (deltaLost / deltaTotal) * 100 : 0;
      const rtt = pair?.currentRoundTripTime != null
        ? Math.round(pair.currentRoundTripTime * 1000)
        : null;

      // Bands chosen to match what a user actually perceives: video gets
      // visibly blocky below ~150 kbps, and conversation turns clumsy past
      // ~300 ms of round-trip delay.
      let quality: CallStats['quality'] = 'good';
      if (lossPct > 8 || kbps < 80 || (rtt != null && rtt > 400)) quality = 'poor';
      else if (lossPct > 3 || kbps < 200 || (rtt != null && rtt > 250)) quality = 'fair';

      return { kbps, lossPct: Math.round(lossPct * 10) / 10, rtt, quality };
    } catch {
      return null;
    }
  }

  /** Swaps the active camera or microphone mid-call without renegotiating. */
  async switchDevice(kind: 'video' | 'audio', deviceId: string): Promise<boolean> {
    if (!this.localStream) return false;
    try {
      const constraints: MediaStreamConstraints = kind === 'video'
        ? { video: { deviceId: { exact: deviceId } }, audio: false }
        : { audio: { deviceId: { exact: deviceId } }, video: false };

      const fresh = await navigator.mediaDevices.getUserMedia(constraints);
      const track = fresh.getTracks()[0];
      if (!track) return false;

      // replaceTrack keeps the existing SDP valid — no re-offer needed.
      const sender = this.pc?.getSenders().find(s => s.track?.kind === kind);
      if (sender) await sender.replaceTrack(track);

      const old = kind === 'video'
        ? this.localStream.getVideoTracks()[0]
        : this.localStream.getAudioTracks()[0];
      if (old) { this.localStream.removeTrack(old); old.stop(); }
      this.localStream.addTrack(track);

      this.cb.onLocalStream?.(this.localStream);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
    if (this.callId) this.sock.emit('call:state', { callId: this.callId, muted });
  }

  setVideoOff(off: boolean) {
    this.localStream?.getVideoTracks().forEach(t => { t.enabled = !off; });
    if (this.callId) this.sock.emit('call:state', { callId: this.callId, videoOff: off });
  }

  async startScreenShare(): Promise<boolean> {
    if (!this.pc) return false;
    try {
      this.screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      const track = this.screenStream!.getVideoTracks()[0];
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'video');
      if (!sender) return false;
      await sender.replaceTrack(track);
      track.onended = () => this.stopScreenShare();
      if (this.callId) this.sock.emit('call:state', { callId: this.callId, sharing: true });
      return true;
    } catch {
      return false;
    }
  }

  async stopScreenShare() {
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;
    const camTrack = this.localStream?.getVideoTracks()[0];
    const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
    if (camTrack && sender) await sender.replaceTrack(camTrack);
    if (this.callId) this.sock.emit('call:state', { callId: this.callId, sharing: false });
  }

  /* ── teardown ── */

  end() {
    if (this.callId) this.sock.emit('call:end', { callId: this.callId });
    this.cb.onStatus?.('ended', { reason: 'you-hung-up' });
    this.cleanup();
  }

  cancel() {
    if (this.callId) this.sock.emit('call:cancel', { callId: this.callId });
    this.cb.onStatus?.('ended', { reason: 'you-hung-up' });
    this.cleanup();
  }

  /** Ends the call because something went wrong, not because a human hung up. */
  private hardEnd() {
    if (this.callId) this.sock.emit('call:end', { callId: this.callId });
    this.cb.onStatus?.('ended', { reason: 'failed' });
    this.cleanup();
  }

  private cleanup() {
    this.closed = true;
    this.stopRinging();
    this.stopOfferRetries();
    this.clearConnectTimeout();
    if (this.mediaFallbackTimer) { clearTimeout(this.mediaFallbackTimer); this.mediaFallbackTimer = null; }

    try { this.pc?.close(); } catch { /* ignore */ }
    this.pc = null;
    this.lastStats = null;

    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;

    this.callId = null;
    this.remoteDescSet = false;
    this.cachedAnswer = null;
    this.pendingIce = [];
    this.offerAttempts = 0;
    this.connected = false;
    this.live = false;
  }

  /** Full teardown including socket listeners — call on unmount. */
  destroy() {
    this.cleanup();
    this.unbind();
  }
}

/** Ask the browser whether video calling is even possible here. */
export function checkVideoSupport(): { ok: boolean; reason?: string } {
  if (typeof window === 'undefined') return { ok: false, reason: 'No browser environment.' };

  const isSecure =
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

  if (!isSecure) {
    return {
      ok: false,
      reason: `Browsers only allow camera access over HTTPS or on localhost. You're on ${window.location.host} — open the app at http://localhost:5173 instead.`,
    };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'This browser does not expose camera access.' };
  }
  if (typeof RTCPeerConnection === 'undefined') {
    return { ok: false, reason: 'This browser does not support WebRTC.' };
  }
  return { ok: true };
}

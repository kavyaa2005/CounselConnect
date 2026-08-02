// Live chat over the existing Socket.IO connection.
//
// Design note: this deliberately sits *alongside* the REST endpoints rather
// than replacing them. REST remains the source of truth for history and
// persistence; the socket only delivers the live copy so neither side waits
// on a poll. If the socket is down the caller falls back to REST + polling,
// so a dropped websocket degrades to the previous behaviour instead of
// breaking chat outright.

import { getSocket } from './callClient';

export type ChatPeer = { id: string; role: 'user' | 'doctor' };

type Handlers = {
  onMessage?: (msg: any, from: { id: string; role: string }) => void;
  onTyping?: (from: { id: string; role: string }, typing: boolean) => void;
  onRead?: (from: { id: string; role: string }, at: string) => void;
  onConnectionChange?: (live: boolean) => void;
};

export class ChatChannel {
  private sock = getSocket();
  private h: Handlers;
  private typingTimer: any = null;
  private lastTypingSent = 0;

  constructor(handlers: Handlers = {}) {
    this.h = handlers;
    this.bind();
  }

  private handleMessage = (p: any) => {
    this.h.onMessage?.(p.message, { id: p.fromId, role: p.fromRole });
  };
  private handleTyping = (p: any) => {
    this.h.onTyping?.({ id: p.fromId, role: p.fromRole }, !!p.typing);
  };
  private handleRead = (p: any) => {
    this.h.onRead?.({ id: p.fromId, role: p.fromRole }, p.at);
  };
  private handleConnect = () => this.h.onConnectionChange?.(true);
  private handleDisconnect = () => this.h.onConnectionChange?.(false);

  private bind() {
    this.sock.on('chat:message', this.handleMessage);
    this.sock.on('chat:typing', this.handleTyping);
    this.sock.on('chat:read', this.handleRead);
    this.sock.on('connect', this.handleConnect);
    this.sock.on('disconnect', this.handleDisconnect);
  }

  get live() {
    return this.sock.connected;
  }

  /**
   * Sends a message.
   *
   * Resolves with the saved message when the socket round-trips, or null if
   * the socket isn't usable — the caller then falls back to the REST call so
   * nothing is lost.
   */
  send(to: ChatPeer, text: string): Promise<any | null> {
    if (!this.sock.connected) return Promise.resolve(null);
    return new Promise((resolve) => {
      // Never hang the UI on a socket that stops answering
      const guard = setTimeout(() => resolve(null), 2500);
      this.sock.emit('chat:send', { toId: to.id, toRole: to.role, text }, (res: any) => {
        clearTimeout(guard);
        resolve(res?.ok ? res.message : null);
      });
    });
  }

  /**
   * Signals that the local user is typing.
   *
   * Throttled to one emit per second while typing continues, then a single
   * "stopped" emit 1.8s after the last keystroke — otherwise every keypress
   * would put a packet on the wire.
   */
  typing(to: ChatPeer) {
    if (!this.sock.connected) return;
    const now = Date.now();
    if (now - this.lastTypingSent > 1000) {
      this.sock.emit('chat:typing', { toId: to.id, toRole: to.role, typing: true });
      this.lastTypingSent = now;
    }
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(to), 1800);
  }

  stopTyping(to: ChatPeer) {
    clearTimeout(this.typingTimer);
    this.lastTypingSent = 0;
    if (this.sock.connected) {
      this.sock.emit('chat:typing', { toId: to.id, toRole: to.role, typing: false });
    }
  }

  markRead(to: ChatPeer) {
    if (this.sock.connected) {
      this.sock.emit('chat:read', { toId: to.id, toRole: to.role });
    }
  }

  destroy() {
    clearTimeout(this.typingTimer);
    this.sock.off('chat:message', this.handleMessage);
    this.sock.off('chat:typing', this.handleTyping);
    this.sock.off('chat:read', this.handleRead);
    this.sock.off('connect', this.handleConnect);
    this.sock.off('disconnect', this.handleDisconnect);
  }
}

/** Records a voice note. Returns a Blob plus its duration in seconds. */
export class VoiceRecorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startedAt = 0;

  static get supported() {
    return typeof MediaRecorder !== 'undefined'
      && !!navigator.mediaDevices?.getUserMedia;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Let the browser pick — Safari won't do webm/opus.
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      .find(t => MediaRecorder.isTypeSupported(t));
    this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.chunks = [];
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start();
    this.startedAt = Date.now();
  }

  stop(): Promise<{ blob: Blob; duration: number; ext: string } | null> {
    return new Promise((resolve) => {
      if (!this.rec || this.rec.state === 'inactive') return resolve(null);
      this.rec.onstop = () => {
        const type = this.rec?.mimeType || 'audio/webm';
        const blob = new Blob(this.chunks, { type });
        const duration = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
        this.cleanup();
        resolve({ blob, duration, ext: type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm' });
      };
      this.rec.stop();
    });
  }

  cancel() {
    try { this.rec?.stop(); } catch { /* already stopped */ }
    this.cleanup();
  }

  private cleanup() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.rec = null;
    this.chunks = [];
  }
}

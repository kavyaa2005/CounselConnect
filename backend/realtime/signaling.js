// WebRTC signaling over Socket.IO.
//
// The server never sees audio or video — media flows browser-to-browser.
// It only (a) proves who each socket is, (b) enforces that the two parties are
// genuinely counselor + client, and (c) relays SDP/ICE between them.
//
// Relay is addressed to the peer's *account room* (e.g. "doctor:d1") rather
// than a per-call room. Account rooms are re-joined automatically on every
// reconnect, so a dropped websocket can never silently swallow an offer.

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt.utils');
const corsConfig = require('../config/cors.config');
const rel = require('../services/relationship.service');
const videoService = require('../services/video.service');
const messagesService = require('../services/messages.service');
const doctorService = require('../services/doctor.service');

const roomFor = (role, id) => `${role}:${id}`;

/** The other end of a call, relative to `me`. Null if `me` isn't on it. */
const peerOf = (call, me) => {
  if (!call) return null;
  if (me.role === 'user' && call.userId === me.id) {
    return { id: call.doctorId, role: 'doctor' };
  }
  if (me.role === 'doctor' && call.doctorId === me.id) {
    return { id: call.userId, role: 'user' };
  }
  return null;
};

function attachSignaling(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsConfig.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 25000,
    pingInterval: 10000,
  });

  // Anything left "ringing" from a previous run is dead
  videoService.closeStaleCalls();

  // ── Authentication: same JWT as the REST API ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));
    try {
      const decoded = verifyToken(token);
      socket.data.user = {
        id: decoded.id,
        role: decoded.role || 'user',
        email: decoded.email,
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const me = socket.data.user;
    socket.join(roomFor(me.role, me.id));

    const log = (...args) => {
      if (process.env.CALL_DEBUG === '1') {
        console.log(`[signal ${me.role}:${String(me.id).slice(0, 6)}]`, ...args);
      }
    };
    log('connected');

    const broadcastPresence = (online) => {
      videoService.getContacts(me).forEach(c => {
        io.to(roomFor(c.role, c.id)).emit('presence:update', {
          id: me.id, role: me.role, online,
        });
      });
    };

    broadcastPresence(true);

    socket.on('presence:list', async (_payload, ack) => {
      try {
        const contacts = videoService.getContacts(me);
        const online = [];
        for (const c of contacts) {
          const sockets = await io.in(roomFor(c.role, c.id)).fetchSockets();
          if (sockets.length) online.push({ id: c.id, role: c.role });
        }
        if (typeof ack === 'function') ack({ online });
      } catch {
        if (typeof ack === 'function') ack({ online: [] });
      }
    });

    /* ─────────── placing a call ─────────── */

    socket.on('call:invite', async ({ toId, toRole, audioOnly }, ack) => {
      const reply = (payload) => { if (typeof ack === 'function') ack(payload); };

      if (!toId || !toRole) return reply({ ok: false, error: 'Missing call target' });
      if (toRole === me.role) {
        return reply({ ok: false, error: 'Calls are only between a client and their counselor' });
      }

      // ── THE GUARD ── you can only reach your own counselor / your own client
      if (!rel.canConnect(me, { id: toId, role: toRole })) {
        return reply({ ok: false, error: 'You are not connected to this person' });
      }

      const targetSockets = await io.in(roomFor(toRole, toId)).fetchSockets();
      if (!targetSockets.length) {
        const missed = videoService.createCall(me, { id: toId, role: toRole });
        videoService.updateCall(missed.id, { status: 'missed' });
        return reply({ ok: false, error: 'They are offline right now', offline: true });
      }

      const call = videoService.createCall(me, { id: toId, role: toRole });
      log('invite →', toRole, toId, call.id);

      io.to(roomFor(toRole, toId)).emit('call:incoming', {
        audioOnly: !!audioOnly,
        callId: call.id,
        from: { id: me.id, role: me.role },
        fromName: me.role === 'user' ? call.userName : call.doctorName,
        fromRole: me.role,
        at: call.createdAt,
      });

      reply({
        ok: true,
        callId: call.id,
        peerName: me.role === 'user' ? call.doctorName : call.userName,
      });
    });

    /* ─────────── answering ─────────── */

    socket.on('call:accept', ({ callId }, ack) => {
      const call = videoService.getCall(callId);
      if (!call) return ack?.({ ok: false, error: 'Call not found' });

      const peer = peerOf(call, me);
      if (!peer) return ack?.({ ok: false, error: 'Not your call' });

      if (call.status !== 'active') {
        videoService.updateCall(callId, { status: 'active', startedAt: new Date().toISOString() });
      }
      log('accepted', callId, '→ telling', peer.role, peer.id);

      // Tell the original caller to start negotiating
      io.to(roomFor(peer.role, peer.id)).emit('call:accepted', { callId });
      ack?.({ ok: true, callId });
    });

    socket.on('call:reject', ({ callId }) => {
      const call = videoService.getCall(callId);
      if (!call) return;
      const peer = peerOf(call, me);
      if (!peer) return;
      videoService.updateCall(callId, { status: 'rejected' });
      io.to(roomFor(peer.role, peer.id)).emit('call:rejected', { callId });
    });

    socket.on('call:cancel', ({ callId }) => {
      const call = videoService.getCall(callId);
      if (!call) return;
      const peer = peerOf(call, me);
      if (!peer) return;
      videoService.updateCall(callId, { status: 'cancelled' });
      io.to(roomFor(peer.role, peer.id)).emit('call:cancelled', { callId });
    });

    /* ─────────── WebRTC relay ─────────── */
    // Addressed to the peer's account room, so it survives reconnects.

    const relay = (event) => (payload = {}, ack) => {
      const { callId } = payload;
      const call = videoService.getCall(callId);
      const peer = call && peerOf(call, me);
      if (!peer) {
        log('relay DROPPED', event, callId, '(not a participant)');
        return ack?.({ ok: false, error: 'Not a participant on this call' });
      }
      log('relay', event, '→', peer.role, peer.id);
      io.to(roomFor(peer.role, peer.id)).emit(event, payload);
      ack?.({ ok: true });
    };

    socket.on('webrtc:offer', relay('webrtc:offer'));
    socket.on('webrtc:answer', relay('webrtc:answer'));
    socket.on('webrtc:ice', relay('webrtc:ice'));
    socket.on('call:state', relay('call:state'));


    /* ─────────── chat ───────────
       Messages still go through REST for persistence and history; the socket
       carries the *live* copy so neither side waits on a poll. The REST poll
       is kept on the client as a fallback for when the socket is down, so a
       dropped websocket degrades to the old behaviour rather than breaking.  */

    // Who is the other party in a chat, and are they actually connected to me?
    const chatPeer = async (peerId, peerRole) => {
      if (me.role === 'user' && peerRole === 'doctor') {
        // peerId here is a counselorId — resolve it to the doctor account
        const doctor = require('../utils/fileStore.utils')
          .readStore('doctors.json').find(d => d.counselorId === peerId);
        if (!doctor) return null;
        if (!rel.canConnect({ id: me.id, role: 'user' }, { id: doctor.id, role: 'doctor' })) return null;
        return { id: doctor.id, role: 'doctor' };
      }
      if (me.role === 'doctor' && peerRole === 'user') {
        if (!rel.canConnect({ id: me.id, role: 'doctor' }, { id: peerId, role: 'user' })) return null;
        return { id: peerId, role: 'user' };
      }
      return null;
    };

    socket.on('chat:send', async ({ toId, toRole, text }, ack) => {
      const reply = (p) => { if (typeof ack === 'function') ack(p); };
      const body = String(text || '').trim();
      if (!body) return reply({ ok: false, error: 'empty' });

      const peer = await chatPeer(toId, toRole);
      if (!peer) return reply({ ok: false, error: 'not-connected' });

      try {
        let saved;
        if (me.role === 'user') {
          saved = messagesService.sendMessage(me.id, { counselorId: toId, text: body }).sent;
          // The doctor sees it from their own perspective
          io.to(roomFor('doctor', peer.id)).emit('chat:message', {
            fromId: me.id, fromRole: 'user',
            message: { ...saved, fromDoctor: false },
          });
        } else {
          saved = doctorService.sendDoctorMessage(me.id, toId, body);
          io.to(roomFor('user', peer.id)).emit('chat:message', {
            fromId: me.id, fromRole: 'doctor',
            message: saved,
          });
        }
        reply({ ok: true, message: saved });
      } catch (err) {
        reply({ ok: false, error: err.message });
      }
    });

    // Typing is transient — never persisted, just relayed to the other party.
    socket.on('chat:typing', async ({ toId, toRole, typing }) => {
      const peer = await chatPeer(toId, toRole);
      if (!peer) return;
      io.to(roomFor(peer.role, peer.id)).emit('chat:typing', {
        fromId: me.role === 'doctor'
          // The client keys threads by counselorId, not doctor account id
          ? (require('../utils/fileStore.utils').readStore('doctors.json')
              .find(d => d.id === me.id) || {}).counselorId
          : me.id,
        fromRole: me.role,
        typing: !!typing,
      });
    });

    socket.on('chat:read', async ({ toId, toRole }) => {
      const peer = await chatPeer(toId, toRole);
      if (!peer) return;
      io.to(roomFor(peer.role, peer.id)).emit('chat:read', {
        fromId: me.id, fromRole: me.role, at: new Date().toISOString(),
      });
    });

    /* ─────────── hanging up ─────────── */

    socket.on('call:end', ({ callId }) => {
      const call = videoService.getCall(callId);
      if (!call) return;
      const peer = peerOf(call, me);
      if (!peer) return;

      if (['ringing', 'active'].includes(call.status)) {
        videoService.updateCall(callId, { status: call.startedAt ? 'ended' : 'cancelled' });
      }
      log('ended', callId);
      io.to(roomFor(peer.role, peer.id)).emit('call:ended', { callId });
    });

    socket.on('disconnect', async () => {
      log('disconnected');
      // Give a reconnect a moment before declaring anyone offline or dead
      setTimeout(async () => {
        try {
          const remaining = await io.in(roomFor(me.role, me.id)).fetchSockets();
          if (remaining.length) return;   // another tab/reconnect is live

          broadcastPresence(false);

          // Close out any call this account still had open
          const open = require('../utils/fileStore.utils')
            .readStore('calls.json')
            .filter(c => ['ringing', 'active'].includes(c.status) &&
              ((me.role === 'user' && c.userId === me.id) ||
               (me.role === 'doctor' && c.doctorId === me.id)));

          open.forEach(c => {
            videoService.updateCall(c.id, { status: c.startedAt ? 'ended' : 'missed' });
            const peer = peerOf(c, me);
            if (peer) {
              io.to(roomFor(peer.role, peer.id))
                .emit('call:ended', { callId: c.id, reason: 'peer-disconnected' });
            }
          });
        } catch { /* shutting down */ }
      }, 4000);
    });
  });

  return io;
}

module.exports = { attachSignaling };

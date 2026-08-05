// Hand-off between the global incoming-call ringer and the video page.
//
// This used to be a bare `let pending` that the video page read once, in a
// mount effect. That only worked when accepting caused the page to mount:
//
//   • Accept from another screen  → navigate → page mounts → call collected. ✓
//   • Accept while already ON the video page → "navigate" to the route you are
//     already on → no remount → the effect never runs again → the accepted
//     call sits in this module forever. The caller keeps ringing, the callee
//     sees nothing happen, and the click appears to have done nothing. ✗
//
// The second case is the common one: you are most likely to be looking at the
// video screen when a call arrives. So the hand-off now notifies live
// subscribers as well as queueing, and the page handles both.

import type { IncomingCall } from './callClient';

type Listener = (call: IncomingCall) => void;

let pending: IncomingCall | null = null;
const listeners = new Set<Listener>();

/**
 * Offers a call to whoever is listening.
 *
 * If a video page is already mounted it answers immediately; otherwise the
 * call is queued for the next one to mount.
 */
export const setPendingCall = (call: IncomingCall | null) => {
  if (!call) { pending = null; return; }

  if (listeners.size) {
    // Deliver to the most recently mounted listener only — two video pages are
    // never both meant to answer the same call.
    const target = [...listeners][listeners.size - 1];
    pending = null;
    target(call);
    return;
  }
  pending = call;
};

/** Reads and clears in one step so a call is never answered twice. */
export const takePendingCall = (): IncomingCall | null => {
  const c = pending;
  pending = null;
  return c;
};

/**
 * Subscribe while a video page is mounted.
 *
 * Returns an unsubscribe function. The caller should also drain
 * `takePendingCall()` on mount to pick up anything queued before it existed.
 */
export const onPendingCall = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

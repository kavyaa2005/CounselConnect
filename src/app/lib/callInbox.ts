// A tiny hand-off between the global incoming-call ringer and the video page.
//
// The ringer can appear on any screen. When you accept, we stash the call here
// and navigate to the video page, which picks it up on mount and answers.

import type { IncomingCall } from './callClient';

let pending: IncomingCall | null = null;

export const setPendingCall = (call: IncomingCall | null) => { pending = call; };

/** Reads and clears in one step so a call is never answered twice. */
export const takePendingCall = (): IncomingCall | null => {
  const c = pending;
  pending = null;
  return c;
};

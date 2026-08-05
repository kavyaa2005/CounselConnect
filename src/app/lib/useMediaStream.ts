// Binds a MediaStream to a <video> element, reliably.
//
// The old approach was an effect that did `ref.current.srcObject = stream`,
// keyed on [stream, status]. Two things went wrong with it:
//
//   1. The element only existed while status was exactly 'connected', so if the
//      stream arrived at any other moment — or the status flickered back to
//      'connecting' during a brief ICE disconnect — the element unmounted and
//      the binding was lost. You were left looking at a black rectangle with
//      the call timer happily counting up.
//
//   2. Nothing ever called play(). `autoplay` alone is not dependable for a
//      stream assigned imperatively after mount, and when the browser refuses
//      it does so silently — again, a black rectangle and no error anywhere.
//
// A callback ref binds the moment the node exists, in either order, and play()
// is called explicitly so a refusal is something we can see and recover from.

import { useCallback, useEffect, useRef, useState } from 'react';

export function useMediaStream(stream: MediaStream | null) {
  const elRef = useRef<HTMLVideoElement | null>(null);
  /** True when the browser refused to start playback on its own. */
  const [blocked, setBlocked] = useState(false);

  const tryPlay = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const p = el.play();
    // Older browsers return undefined rather than a promise.
    if (p && typeof p.then === 'function') {
      p.then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      setBlocked(false);
    }
  }, []);

  const attach = useCallback((node: HTMLVideoElement | null) => {
    elRef.current = node;
    if (node && stream && node.srcObject !== stream) {
      node.srcObject = stream;
      tryPlay();
    }
  }, [stream, tryPlay]);

  // Covers the other order: the element was already mounted and the stream
  // turned up afterwards.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        tryPlay();
      }
    } else if (el.srcObject) {
      el.srcObject = null;
    }
  }, [stream, tryPlay]);

  return {
    /** Spread onto the <video>. */
    videoProps: {
      ref: attach,
      autoPlay: true,
      playsInline: true,
      onLoadedMetadata: tryPlay,
      // A stream that stalls and resumes shouldn't stay frozen.
      onPause: tryPlay,
    },
    blocked,
    retry: tryPlay,
  };
}

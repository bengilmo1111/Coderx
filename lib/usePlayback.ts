'use client';

/**
 * Drives the animation over a list of frames.
 *
 * Speed is a first-class control, not a debug feature: at 0.45x Henry can watch
 * the highlighted line move through a loop one statement at a time, which is
 * exactly the thing that makes a loop click.
 *
 * The clock lives in refs and the rAF callback writes plain values into state
 * once per frame. An earlier version advanced the frame from inside a setState
 * updater, which React is free to re-run — and it left playback wedged.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Frame } from '@/runtime/world';

export const SPEEDS = [
  { label: '🐌 Slow', value: 0.45 },
  { label: '▶︎ Normal', value: 1 },
  { label: '⚡️ Fast', value: 2.2 },
] as const;

const BASE_MS = 420;

export interface Playback {
  index: number;
  t: number;
  playing: boolean;
  done: boolean;
  play: () => void;
  pause: () => void;
  stepOnce: () => void;
  reset: () => void;
  speed: number;
  setSpeed: (n: number) => void;
}

export function usePlayback(frames: Frame[], onAdvance?: (index: number) => void): Playback {
  const [index, setIndex] = useState(0);
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const idxRef = useRef(0);
  const tRef = useRef(1);
  const advanceRef = useRef(onAdvance);
  advanceRef.current = onAdvance;

  const last = frames.length - 1;
  const done = frames.length === 0 || (index >= last && t >= 1);

  const reset = useCallback(() => {
    idxRef.current = 0;
    tRef.current = frames.length ? 0 : 1;
    setIndex(0);
    setT(tRef.current);
    setPlaying(false);
  }, [frames.length]);

  // A new run always starts from the top.
  useEffect(() => {
    reset();
  }, [frames, reset]);

  useEffect(() => {
    if (!playing || frames.length === 0) return;

    let raf = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - previous, 250); // a backgrounded tab shouldn't skip the whole run
      previous = now;

      let i = idxRef.current;
      let progress = tRef.current + dt / (BASE_MS / speed);

      while (progress >= 1 && i < frames.length - 1) {
        i += 1;
        progress -= 1;
        advanceRef.current?.(i);
      }

      if (i >= frames.length - 1 && progress >= 1) {
        idxRef.current = i;
        tRef.current = 1;
        setIndex(i);
        setT(1);
        setPlaying(false);
        return;
      }

      idxRef.current = i;
      tRef.current = progress;
      setIndex(i);
      setT(progress);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, frames]);

  const play = useCallback(() => {
    if (!frames.length) return;
    // Replaying a finished run starts it over rather than doing nothing.
    if (idxRef.current >= frames.length - 1 && tRef.current >= 1) {
      idxRef.current = 0;
      tRef.current = 0;
      setIndex(0);
      setT(0);
    }
    setPlaying(true);
  }, [frames.length]);

  const pause = useCallback(() => setPlaying(false), []);

  const stepOnce = useCallback(() => {
    setPlaying(false);
    const i = Math.min(frames.length - 1, idxRef.current + 1);
    idxRef.current = i;
    tRef.current = 1;
    setIndex(i);
    setT(1);
    advanceRef.current?.(i);
  }, [frames.length]);

  return { index, t, playing, done, play, pause, stepOnce, reset, speed, setSpeed };
}

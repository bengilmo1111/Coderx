'use client';

/**
 * Drives the animation over a list of frames.
 *
 * Speed is a first-class control, not a debug feature: at 0.4x Henry can watch
 * the highlighted line move through a loop one statement at a time, which is
 * exactly the thing that makes a loop click.
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

export function usePlayback(frames: Frame[], onFrame?: (i: number) => void): Playback {
  const [index, setIndex] = useState(0);
  const [t, setT] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const done = index >= frames.length - 1 && t >= 1;

  const reset = useCallback(() => {
    setIndex(0);
    setT(frames.length ? 0 : 1);
    setPlaying(false);
  }, [frames.length]);

  // A new run always starts from the top.
  useEffect(() => {
    reset();
  }, [frames, reset]);

  useEffect(() => {
    if (!playing) return;

    const tick = (now: number) => {
      const dt = last.current ? now - last.current : 16;
      last.current = now;

      setT((prevT) => {
        const step = dt / (BASE_MS / speed);
        const nextT = prevT + step;
        if (nextT < 1) return nextT;

        let stopped = false;
        setIndex((i) => {
          if (i >= frames.length - 1) {
            stopped = true;
            return i;
          }
          const n = i + 1;
          onFrameRef.current?.(n);
          return n;
        });
        if (stopped) {
          setPlaying(false);
          return 1;
        }
        return 0;
      });

      raf.current = requestAnimationFrame(tick);
    };

    last.current = 0;
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [playing, speed, frames.length]);

  const play = useCallback(() => {
    if (!frames.length) return;
    setPlaying(true);
  }, [frames.length]);

  const pause = useCallback(() => setPlaying(false), []);

  const stepOnce = useCallback(() => {
    setPlaying(false);
    setT(1);
    setIndex((i) => {
      const n = Math.min(frames.length - 1, i + 1);
      onFrameRef.current?.(n);
      return n;
    });
  }, [frames.length]);

  return { index, t, playing, done, play, pause, stepOnce, reset, speed, setSpeed };
}

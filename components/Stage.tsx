'use client';

import { useEffect, useRef } from 'react';
import { drawScene } from '@/runtime/render';
import type { Frame, WorldState } from '@/runtime/world';

/**
 * The canvas. Resizes to its container and redraws on every animation tick,
 * so the phone and the family computer get the same picture at the right size.
 */
export function Stage({
  world,
  frames,
  index,
  t,
}: {
  world: WorldState;
  frames: Frame[];
  index: number;
  t: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const current: Frame = frames[index] ?? { stmtId: '', world, effects: [] };
      const prev: Frame | null = index > 0 ? (frames[index - 1] ?? null) : null;
      drawScene(ctx, w, h, prev, current, t);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(box);
    return () => ro.disconnect();
  }, [world, frames, index, t]);

  return (
    <div ref={boxRef} className="panel dots h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

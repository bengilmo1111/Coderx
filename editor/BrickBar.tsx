'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { bricksFor, CATEGORY_STYLE, type Brick } from './bricks';
import { sfx } from '@/lib/sound';

/**
 * The palette, pinned to the bottom of the screen — the thumb zone on a phone.
 *
 * Chapter 1 page 6 has eight bricks, and on a desktop they ran off the edge with
 * no way to reach them: the row scrolled horizontally, but with the scrollbar
 * hidden and no arrows there was nothing to tell an 8-year-old it could. So:
 * where there is width to spare the row wraps instead, and where it must scroll
 * there are arrows and a fade at the edge. A child will not discover a hidden
 * scroll area; a child will press an arrow.
 */
export function BrickBar({
  brickIds,
  cast,
  variable,
  defined,
  onTap,
  onShowHelp,
}: {
  brickIds: string[];
  cast: string[];
  variable?: string;
  /** Commands he defined himself, which appear as bricks of their own. */
  defined?: string[];
  onTap: (brick: Brick) => void;
  onShowHelp: (brick: Brick) => void;
}) {
  const bricks = bricksFor(brickIds, cast, variable, defined);
  const scroller = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const refresh = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    refresh();
    el.addEventListener('scroll', refresh, { passive: true });
    const observer = new ResizeObserver(refresh);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', refresh);
      observer.disconnect();
    };
  }, [refresh, brickIds]);

  const nudge = (direction: -1 | 1) => {
    sfx.tap();
    scroller.current?.scrollBy({ left: direction * 160, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center gap-1 border-t-[3px] border-ink bg-white/70 px-2 py-1.5 backdrop-blur">
      {canScrollLeft && (
        <button type="button" onClick={() => nudge(-1)} aria-label="More bricks" className="chunk z-10 shrink-0 bg-white px-2">
          ‹
        </button>
      )}

      <div
        ref={scroller}
        data-testid="brick-scroller"
        className="flex flex-1 gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] lg:flex-wrap lg:overflow-x-visible [&::-webkit-scrollbar]:hidden"
      >
        {bricks.map((brick) => (
          <button
            key={brick.id}
            type="button"
            onClick={() => {
              sfx.tap();
              onTap(brick);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onShowHelp(brick);
            }}
            className={`chunk shrink-0 px-3 text-ink ${CATEGORY_STYLE[brick.category].className} font-[family-name:var(--font-code)] text-[15px]`}
          >
            {brick.label}
          </button>
        ))}
      </div>

      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute right-11 top-0 h-full w-8 bg-gradient-to-l from-white/90 to-transparent" />
          <button type="button" onClick={() => nudge(1)} aria-label="More bricks" className="chunk z-10 shrink-0 bg-white px-2">
            ›
          </button>
        </>
      )}
    </div>
  );
}

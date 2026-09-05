'use client';

import { bricksFor, CATEGORY_STYLE, type Brick } from './bricks';
import { sfx } from '@/lib/sound';

/**
 * The palette, pinned to the bottom of the screen — the thumb zone on a phone.
 *
 * Only the bricks a level actually needs appear. Choice paralysis is real at 8,
 * and a bar of twenty options is a bar he scrolls instead of a tool he uses.
 */
export function BrickBar({
  brickIds,
  onTap,
  onShowHelp,
}: {
  brickIds: string[];
  onTap: (brick: Brick) => void;
  onShowHelp: (brick: Brick) => void;
}) {
  const bricks = bricksFor(brickIds);

  return (
    <div className="border-t-[3px] border-ink bg-white/70 px-2 py-1.5 backdrop-blur">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            className={`chunk shrink-0 px-4 text-white ${CATEGORY_STYLE[brick.category].className} font-[family-name:var(--font-code)] text-[15px]`}
          >
            {brick.label}
          </button>
        ))}
      </div>
    </div>
  );
}

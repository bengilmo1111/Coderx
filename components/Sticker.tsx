'use client';

import { useState } from 'react';
import { STICKERS } from '@/progress/stickers';

/**
 * A sticker, drawn or emoji.
 *
 * Exactly the contract the cast art uses: a real picture if one has been
 * dropped into /public/stickers, the emoji if not, and never a broken image
 * icon in between. So the sticker wall can be illustrated one piece at a time
 * and never looks half-finished.
 *
 * Worth the trouble because the collection is the point. Henry said what
 * motivates him is levels and collecting, and twenty emoji on a wall is a
 * weaker prize than twenty things somebody drew for him.
 */
export function Sticker({ id, size = 48 }: { id: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const badge = STICKERS[id];
  if (!badge) return null;

  if (failed) {
    return (
      <span style={{ fontSize: size * 0.85, lineHeight: 1 }} aria-hidden="true">
        {badge.glyph}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/stickers/${id}.png`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}

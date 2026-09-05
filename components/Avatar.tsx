'use client';

import { useState } from 'react';
import { CHARACTERS, type CharacterKey } from '@/runtime/world';

/**
 * A cast member, outside the canvas.
 *
 * The game draws characters into a canvas; the home screen, the sign-in picker
 * and the header are ordinary DOM, so they need their own way in. Same
 * contract as the canvas though: real artwork if it is there, emoji if it is
 * not, and never a broken image icon in between.
 */
export function Avatar({ who, size = 44 }: { who: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const key = (who in CHARACTERS ? who : 'sniff') as CharacterKey;
  const character = CHARACTERS[key];

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-ink bg-white"
      // The art fills its square almost to the edge, so a round frame would
      // otherwise take the top off Sniff's head and the end of his tail.
      style={{ width: size, height: size, fontSize: size * 0.5, padding: Math.round(size * 0.1) }}
      title={character.label}
    >
      {failed ? (
        <span aria-hidden>{character.glyph}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/cast/${key}.png`}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      )}
    </span>
  );
}

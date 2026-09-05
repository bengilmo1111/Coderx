'use client';

import { CHARACTERS, type CharacterKey } from '@/runtime/world';
import { Avatar } from './Avatar';
import { sfx } from '@/lib/sound';

/** Everyone in the cast is pickable, villains included. That is the fun of it. */
export const PICKABLE: CharacterKey[] = ['sniff', 'kea', 'weka', 'bolt', 'nan', 'meatball', 'dragon'];

/**
 * Choosing who you are.
 *
 * Two brothers are about to share this, and the first thing that makes an
 * account feel like yours is the face on it. It is also the cheapest possible
 * way to tell two profiles apart on the sign-in screen at a glance, which
 * matters more when one of the two cannot reliably read the other's name.
 */
export function CharacterPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: CharacterKey) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {PICKABLE.map((key) => {
        const chosen = key === value;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={chosen}
            onClick={() => {
              sfx.tap();
              onChange(key);
            }}
            className={`chunk flex flex-col items-center gap-1 px-1 py-2 ${chosen ? 'bg-pop' : 'bg-white'}`}
          >
            <Avatar who={key} size={40} />
            <span className="text-[10px] font-black leading-tight">{CHARACTERS[key].label}</span>
          </button>
        );
      })}
    </div>
  );
}

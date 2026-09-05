'use client';

import { useState } from 'react';
import { PIN_EMOJI, PIN_LENGTH } from '@/lib/pin';
import { sfx } from '@/lib/sound';

/**
 * Four taps to sign in.
 *
 * No email, no password, no keyboard — an 8-year-old picks four pictures and
 * the device remembers him afterwards. It is about 20,000 combinations, which
 * is a guard against a sibling rather than an attacker, and that is the right
 * amount of security for a sticker collection.
 */
export function EmojiPin({
  title,
  subtitle,
  busy,
  error,
  onDone,
  onCancel,
}: {
  title: string;
  subtitle: string;
  busy?: boolean;
  error?: string | null;
  onDone: (pin: string[]) => void;
  onCancel?: () => void;
}) {
  const [pin, setPin] = useState<string[]>([]);

  const tap = (emoji: string) => {
    sfx.tap();
    const next = [...pin, emoji];
    setPin(next);
    if (next.length === PIN_LENGTH) {
      onDone(next);
      setPin([]);
    }
  };

  return (
    <div className="panel w-full max-w-sm p-5">
      <h2 className="title mb-1 text-2xl">{title}</h2>
      <p className="mb-4 text-sm font-bold opacity-60">{subtitle}</p>

      <div className="panel mb-4 flex items-center justify-center gap-2 py-3 text-3xl">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span key={i} className={pin[i] ? '' : 'opacity-20'}>
            {pin[i] ?? '⬜️'}
          </span>
        ))}
      </div>

      {error && <p className="mb-3 text-sm font-black text-red-600">{error}</p>}

      <div className="mb-4 grid grid-cols-4 gap-2">
        {PIN_EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={busy}
            onClick={() => tap(emoji)}
            className="chunk bg-white py-2 text-2xl"
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="chunk bg-white px-4">
            Back
          </button>
        )}
        <button
          type="button"
          onClick={() => setPin([])}
          disabled={pin.length === 0}
          className="chunk flex-1 bg-white py-3"
        >
          Start again
        </button>
      </div>
    </div>
  );
}

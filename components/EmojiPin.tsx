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
 *
 * Two things here exist for the hunt-and-peck typist specifically. Undo, so one
 * fat-fingered tap costs one tap rather than all four. And `confirm`, used when
 * a secret is being *set* rather than checked: a mis-tap while choosing is
 * invisible, unrecoverable and only discovered weeks later on a different
 * device, which is the worst shape a bug can have. Typing it twice catches it
 * while he is still sitting in front of it.
 */
export function EmojiPin({
  title,
  subtitle,
  busy,
  error,
  confirm = false,
  onDone,
  onCancel,
}: {
  title: string;
  subtitle: string;
  busy?: boolean;
  error?: string | null;
  /** Ask for it twice, and only report a pin that was entered the same way both times. */
  confirm?: boolean;
  onDone: (pin: string[]) => void;
  onCancel?: () => void;
}) {
  const [pin, setPin] = useState<string[]>([]);
  const [first, setFirst] = useState<string[] | null>(null);
  const [mismatch, setMismatch] = useState(false);

  const complete = (entered: string[]) => {
    if (!confirm) return onDone(entered);

    if (!first) {
      setFirst(entered);
      setMismatch(false);
      return;
    }
    if (first.join() === entered.join()) return onDone(entered);

    // Start the whole thing over rather than asking him to guess which of the
    // two attempts was the one he meant.
    sfx.tap();
    setFirst(null);
    setMismatch(true);
  };

  const tap = (emoji: string) => {
    sfx.tap();
    const next = [...pin, emoji];
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setPin([]);
      complete(next);
    }
  };

  const confirming = confirm && first !== null;

  return (
    <div className="panel w-full max-w-sm p-5">
      <h2 className="title mb-1 text-2xl">{confirming ? 'Once more' : title}</h2>
      <p className="mb-4 text-sm font-bold opacity-60">
        {confirming ? 'Tap the same four again, so we know it stuck.' : subtitle}
      </p>

      <div data-testid="pin-so-far" className="panel mb-4 flex items-center justify-center gap-2 py-3 text-3xl">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span key={i} className={pin[i] ? '' : 'opacity-20'}>
            {pin[i] ?? '⬜️'}
          </span>
        ))}
      </div>

      {mismatch && !error && (
        <p className="mb-3 text-sm font-black text-red-600">
          Those two were different. Have another go — you pick it, then tap it again.
        </p>
      )}
      {error && <p className="mb-3 text-sm font-black text-red-600">{error}</p>}

      <div className="mb-4 grid grid-cols-4 gap-2">
        {PIN_EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            disabled={busy}
            onClick={() => tap(emoji)}
            className="chunk bg-paper py-2 text-2xl"
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="chunk bg-paper px-4">
            Back
          </button>
        )}
        <button
          type="button"
          aria-label="Undo last picture"
          onClick={() => setPin((p) => p.slice(0, -1))}
          disabled={pin.length === 0}
          className="chunk bg-paper px-4 text-lg"
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={() => setPin([])}
          disabled={pin.length === 0}
          className="chunk flex-1 bg-paper py-3"
        >
          Start again
        </button>
      </div>
    </div>
  );
}

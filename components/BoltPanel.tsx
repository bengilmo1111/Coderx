'use client';

import { useState } from 'react';
import { sfx } from '@/lib/sound';

/**
 * Bolt's help buttons. Four fixed intents, no text box.
 *
 * "Make it sillier" is the important one — it is the only button that invites
 * him PAST the level rather than through it, and it is where accelerating
 * ahead actually comes from.
 */

export type Intent = 'stuck' | 'broke' | 'sillier' | 'learned';

const BUTTONS: { intent: Intent; label: string; cls: string }[] = [
  { intent: 'stuck', label: "I'm stuck", cls: 'bg-amber-300' },
  { intent: 'broke', label: 'Why did it break?', cls: 'bg-rose-300' },
  { intent: 'sillier', label: 'Make it sillier', cls: 'bg-fuchsia-300' },
  { intent: 'learned', label: 'What did I learn?', cls: 'bg-sky-300' },
];

export function BoltPanel({
  levelId,
  code,
  error,
  hintsUsed,
  onAsked,
}: {
  levelId: string;
  code: string;
  error?: string;
  hintsUsed: number;
  onAsked: (intent: Intent) => void;
}) {
  const [saying, setSaying] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async (intent: Intent) => {
    sfx.tap();
    setBusy(true);
    setSaying(null);
    onAsked(intent);
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, levelId, code, error, hintsUsed }),
      });
      const data = (await res.json()) as { text: string };
      setSaying(data.text);
    } catch {
      // Even a dead network must not leave a stuck child with nothing.
      setSaying("My aerial fell off. Try reading your code out loud — it works surprisingly often.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-3">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none">🤖</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide opacity-50">Bolt</p>
          <p className="min-h-10 text-[15px] font-bold leading-snug">
            {busy ? 'Thinking… (whirr)' : (saying ?? 'Tap a button if you want a hand. Asking is not cheating.')}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {BUTTONS.map((b) => (
          <button
            key={b.intent}
            type="button"
            disabled={busy}
            onClick={() => ask(b.intent)}
            className={`chunk px-2 text-[13px] ${b.cls}`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

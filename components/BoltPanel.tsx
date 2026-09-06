'use client';

import { useState } from 'react';
import { sfx } from '@/lib/sound';
import { learnedChoices, type Choice } from '@/curriculum/selfExplain';
import { getLevel } from '@/curriculum/levels';

/**
 * Bolt's help buttons. Four fixed intents, no text box.
 *
 * "Make it sillier" is the important one — it is the only button that invites
 * him PAST the level rather than through it, and it is where accelerating
 * ahead actually comes from.
 */

export type Intent = 'stuck' | 'broke' | 'sillier' | 'learned';

const BUTTONS: { intent: Intent; label: string; cls: string }[] = [
  { intent: 'stuck', label: "I'm stuck", cls: 'bg-sun' },
  { intent: 'broke', label: 'Why did it break?', cls: 'bg-rose-300' },
  { intent: 'sillier', label: 'Make it sillier', cls: 'bg-fuchsia-300' },
  { intent: 'learned', label: 'What did I learn?', cls: 'bg-sky' },
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
  /**
   * "What did I learn?" asks HIM first.
   *
   * Having a go at naming the idea does more than being told it, even when the
   * go is wrong — so Bolt waits, and then answers the answer.
   */
  const [choices, setChoices] = useState<Choice[] | null>(null);

  const ask = async (intent: Intent, choice?: string) => {
    sfx.tap();
    setChoices(null);
    setBusy(true);
    setSaying(null);
    onAsked(intent);
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, levelId, code, error, hintsUsed, choice }),
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
      {choices && (
        <div className="mt-3">
          <p className="mb-2 text-[13px] font-black">Have a go first — which one did you just use?</p>
          <div className="flex flex-col gap-2">
            {choices.map((c) => (
              <button
                key={c.text}
                type="button"
                onClick={() => void ask('learned', c.text)}
                className="chunk bg-white px-3 py-2 text-left text-[13px]"
              >
                {c.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {BUTTONS.map((b) => (
          <button
            key={b.intent}
            type="button"
            disabled={busy}
            onClick={() => {
              if (b.intent !== 'learned') return void ask(b.intent);
              // Ask him before Bolt gets a word in. If the level has no coding
              // idea to choose between, fall through to Bolt as before.
              const options = learnedChoices(getLevel(levelId)!);
              if (!options.length) return void ask(b.intent);
              sfx.tap();
              setSaying(null);
              setChoices(options);
            }}
            className={`chunk px-2 text-[13px] ${b.cls}`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

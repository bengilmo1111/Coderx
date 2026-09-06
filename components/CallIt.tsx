'use client';

import { sfx } from '@/lib/sound';

/**
 * Say what will happen, before you find out.
 *
 * A bottom sheet rather than a strip on the play screen, and that is a hard
 * constraint rather than a preference: the layout tests pin the code list to
 * over 180px at 390x660, and anything permanent would eat it. This appears when
 * he presses Run, takes one tap, and is gone.
 *
 * He can always just run it. Making the guess compulsory would turn Run into a
 * toll gate, and a mechanic he resents is worse than one he sometimes skips —
 * the XP for calling it is what does the persuading.
 */
export function CallIt({
  question,
  options,
  onCall,
  onSkip,
}: {
  question: string;
  options: string[];
  onCall: (choice: string) => void;
  onSkip: () => void;
}) {
  const choose = (choice: string) => {
    sfx.tap();
    onCall(choice);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onSkip}
    >
      <div
        data-testid="call-it"
        className="panel pop-in w-full max-w-lg rounded-b-none p-4 sm:rounded-b-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">🤖</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide opacity-50">Bolt</p>
            <h2 className="text-[15px] font-black leading-snug">{question}</h2>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
              className="chunk min-w-12 flex-1 bg-pop px-3 py-3 text-lg font-black"
            >
              {option}
            </button>
          ))}
        </div>

        {/* Deliberately quiet, and deliberately there. */}
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full text-center text-xs font-bold underline opacity-50"
        >
          Just run it
        </button>
      </div>
    </div>
  );
}

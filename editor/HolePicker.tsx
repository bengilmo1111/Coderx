'use client';

import { useState } from 'react';
import type { Expr, SlotKind } from '@/lang/types';
import { CHARACTERS, MODES, type CharacterKey, type Mode } from '@/runtime/world';
import { sfx } from '@/lib/sound';

/**
 * Filling in a gap, without a keyboard.
 *
 * Every slot type gets a purpose-built control rather than a text field:
 * a number wheel, a direction pad, a face picker, a word bank. This is the
 * whole reason a hunt-and-peck 8-year-old can write real code at speed.
 *
 * The word bank is the one place free text exists — and even there, tapping
 * words is the default and typing is the option, not the requirement.
 */

const WORD_BANK = [
  'case', 'closed', 'yes', 'no', 'stop', 'thief', 'oops', 'sorry', 'again', 'help',
  'good', 'dog', 'bin', 'day', 'mine', 'yum', 'run', 'hello', 'gotcha', 'nope',
];

export function HolePicker({
  slot,
  current,
  characters,
  onPick,
  onClose,
}: {
  slot: SlotKind;
  current: Expr | null;
  characters: string[];
  onPick: (e: Expr) => void;
  onClose: () => void;
}) {
  const choose = (e: Expr) => {
    sfx.place();
    onPick(e);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        data-testid="hole-picker"
        className="panel pop-in max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-b-none p-4 sm:rounded-b-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="title text-lg">{TITLES[slot]}</h2>
          <button type="button" onClick={onClose} className="chunk bg-white px-3 text-lg">
            ✕
          </button>
        </div>

        {slot === 'number' && <NumberPad current={current} onPick={choose} />}
        {slot === 'direction' && <DirectionPad onPick={choose} />}
        {slot === 'character' && <CharacterPad characters={characters} onPick={choose} />}
        {slot === 'text' && <WordBank current={current} onPick={choose} />}
        {slot === 'mode' && <ModePad onPick={choose} />}
        {slot === 'name' && <NamePad current={current} onPick={choose} />}
      </div>
    </div>
  );
}

const TITLES: Record<SlotKind, string> = {
  number: 'How many?',
  direction: 'Which way?',
  character: 'Who?',
  text: 'What do they say?',
  condition: 'When?',
  mode: 'Which shape?',
  name: 'What shall we call it?',
};

/** Names for a command he is inventing. Tapping beats typing; typing still works. */
const NAME_IDEAS = ['sweep', 'patrol', 'tidy', 'hop', 'dash', 'dig', 'dance', 'zigzag'];

function NumberPad({ current, onPick }: { current: Expr | null; onPick: (e: Expr) => void }) {
  const start = current?.kind === 'num' ? current.value : 3;
  const [n, setN] = useState(start);
  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-4">
        <button type="button" onClick={() => setN((v) => Math.max(0, v - 1))} className="chunk bg-white px-6 text-2xl">
          −
        </button>
        <div className="panel flex h-20 w-24 items-center justify-center text-5xl font-black">{n}</div>
        <button type="button" onClick={() => setN((v) => Math.min(99, v + 1))} className="chunk bg-white px-6 text-2xl">
          +
        </button>
      </div>
      <div className="mb-4 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setN(v)}
            className={`chunk text-lg ${n === v ? 'bg-pop' : 'bg-white'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onPick({ kind: 'num', value: n })} className="chunk w-full bg-emerald-400 py-3 text-lg">
        Use {n}
      </button>
    </div>
  );
}

function DirectionPad({ onPick }: { onPick: (e: Expr) => void }) {
  const btn = (name: string, label: string, cls: string) => (
    <button
      key={name}
      type="button"
      onClick={() => onPick({ kind: 'ident', name })}
      className={`chunk bg-sky-300 text-2xl ${cls}`}
    >
      {label}
    </button>
  );
  return (
    <div className="mx-auto grid w-56 grid-cols-3 grid-rows-3 gap-2">
      <div />
      {btn('up', '⬆︎', '')}
      <div />
      {btn('left', '⬅︎', '')}
      <div className="flex items-center justify-center text-3xl">🐕</div>
      {btn('right', '➡︎', '')}
      <div />
      {btn('down', '⬇︎', '')}
      <div />
    </div>
  );
}

function CharacterPad({ characters, onPick }: { characters: string[]; onPick: (e: Expr) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {characters.map((name) => {
        const c = CHARACTERS[name as CharacterKey];
        return (
          <button
            key={name}
            type="button"
            onClick={() => onPick({ kind: 'ident', name })}
            className="chunk flex items-center gap-2 bg-white px-3 py-2 text-left"
          >
            <span className="text-2xl">{c?.glyph ?? '❓'}</span>
            <span className="font-[family-name:var(--font-code)] text-sm">{name}</span>
          </button>
        );
      })}
    </div>
  );
}

function ModePad({ onPick }: { onPick: (e: Expr) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(MODES) as Mode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onPick({ kind: 'ident', name: mode })}
          className="chunk flex items-start gap-2 bg-white px-3 py-2 text-left"
        >
          <span className="text-2xl leading-tight">{MODES[mode].glyph}</span>
          <span className="min-w-0">
            <span className="block font-[family-name:var(--font-code)] text-sm">{mode}</span>
            <span className="block text-[11px] font-bold leading-snug opacity-65">{MODES[mode].power}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function NamePad({ current, onPick }: { current: Expr | null; onPick: (e: Expr) => void }) {
  const [name, setName] = useState(current?.kind === 'str' ? current.value : '');
  // A command name has to be a single word the parser can read back.
  const clean = name.trim().replace(/[^A-Za-z0-9_]/g, '');

  return (
    <div>
      <div className="panel mb-3 min-h-14 px-3 py-2 font-[family-name:var(--font-code)] text-lg font-bold">
        {clean ? `define ${clean} { }` : <span className="opacity-35">pick a name…</span>}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {NAME_IDEAS.map((n) => (
          <button key={n} type="button" onClick={() => setName(n)} className="chunk bg-white px-3 text-sm">
            {n}
          </button>
        ))}
      </div>
      <label className="mb-1 block text-xs font-bold uppercase opacity-55">or make one up</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 14))}
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className="panel mb-3 w-full px-3 py-2 font-[family-name:var(--font-code)] text-base"
        placeholder="yourCommand"
      />
      <button
        type="button"
        disabled={!clean}
        onClick={() => onPick({ kind: 'str', value: clean })}
        className="chunk w-full bg-emerald-400 py-3 text-lg"
      >
        Teach it
      </button>
    </div>
  );
}

function WordBank({ current, onPick }: { current: Expr | null; onPick: (e: Expr) => void }) {
  const [text, setText] = useState(current?.kind === 'str' ? current.value : '');
  const add = (w: string) => setText((t) => (t ? `${t} ${w}` : w));

  return (
    <div>
      <div className="panel mb-3 min-h-14 px-3 py-2 text-lg font-bold">
        {text || <span className="opacity-35">tap words below…</span>}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {WORD_BANK.map((w) => (
          <button key={w} type="button" onClick={() => add(w)} className="chunk bg-white px-3 text-sm">
            {w}
          </button>
        ))}
        <button type="button" onClick={() => add('!')} className="chunk bg-pop px-3 text-sm">
          !
        </button>
      </div>
      <label className="mb-1 block text-xs font-bold uppercase opacity-55">or type it yourself</label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 40))}
        maxLength={40}
        className="panel mb-3 w-full px-3 py-2 text-base"
        placeholder="your own words"
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => setText('')} className="chunk bg-white px-4">
          Clear
        </button>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => onPick({ kind: 'str', value: text.trim() })}
          className="chunk flex-1 bg-emerald-400 py-3 text-lg"
        >
          Say it
        </button>
      </div>
    </div>
  );
}

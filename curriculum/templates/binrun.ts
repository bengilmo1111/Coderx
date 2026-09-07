/**
 * BIN RUN — a street of bins, a fixed number of squares apart.
 *
 * Generalised from "Three Lots of Two" (chapter1/levels.ts), and chosen to go
 * first because of what it secretly is: `repeat 3 { move(sniff, right, 4) }` is
 * the array model of 3x4, walked out on a pavement. The scheduler can ask for
 * the three times table and get back a caper about a dog and some litter.
 *
 * The loop solution is always four statements whatever the numbers, and the
 * by-hand version is always 3n-1, so the budget that forces the loop falls out
 * of the parameters rather than being guessed at.
 *
 * Bands 1-3 only. The board is n*k+2 wide and the widest hand-written street is
 * twelve, so past 3x3 this template would be asking a phone to draw a street it
 * cannot draw. Bigger numbers want a grid, which is a different template.
 */

import { buildWorld } from '@/runtime/world';
import type { SkillId } from '../skills';
import type { Level } from '../types';
import { pick, rng } from '../rng';
import { registerTemplate, type LevelTemplate, type TemplateParams } from '../template';

/** How many bins, how far apart. Kept to n*k <= 10 so the street still fits. */
const SHAPES: Record<number, { n: number; k: number }[]> = {
  1: [{ n: 3, k: 1 }, { n: 4, k: 1 }],
  2: [{ n: 3, k: 2 }, { n: 4, k: 2 }],
  3: [{ n: 3, k: 3 }],
};

const NUM = ['zero', 'One', 'Two', 'Three', 'Four', 'Five'] as const;
const ORD = ['zeroth', 'single', 'second', 'third', 'fourth', 'fifth'] as const;

/** "every second square" — the load-bearing detail, in words rather than digits. */
function everyNth(k: number): string {
  return k === 1 ? 'every single square' : `every ${ORD[k]} square`;
}

/**
 * The villains. Scenery, never commandable — they are there to be looked at and
 * to be named in the briefing, which is what stops a generated street feeling
 * like a spreadsheet.
 */
const VILLAINS = [
  {
    who: 'nan' as const,
    briefing: (n: number, k: number) =>
      `Nan McSnap has been busy in the night. She has put a bin on ${everyNth(k)} — ${NUM[n].toLowerCase()} of them ` +
      `all the way down Kea Street — and a bag of rubbish on top of every single one, which she says is 'tidier'. ` +
      `It is not tidier. You could tell Sniff what to do at each bin one at a time, or you could tell him once.`,
  },
  {
    who: 'weka' as const,
    briefing: (n: number, k: number) =>
      `Whoever laid this street out did it to a pattern: ${NUM[n].toLowerCase()} bins, one on ${everyNth(k)}, ` +
      `each wearing a bag of rubbish like a hat. Weka says this was 'not him'. Weka is holding a chip packet ` +
      `while he says it. Find the spacing, and let the repeat do the boring part.`,
  },
  {
    who: 'kea' as const,
    briefing: (n: number, k: number) =>
      `A kea has been at the bins again. There are ${NUM[n].toLowerCase()} of them down the street, one on ` +
      `${everyNth(k)}, and every one has a bag of rubbish sitting on it. Sniff can sort the lot — but only if ` +
      `you work out how far apart they are before you start telling him anything.`,
  },
] as const;

const FLAVOUR_TITLES = [
  'Bin Day Again',
  'The Long Street',
  'Somebody Else Did This',
  'A Street of Hats',
] as const;

function titlesFor(n: number, k: number): string[] {
  if (k === 1) return [...FLAVOUR_TITLES, 'Bin After Bin After Bin'];
  const ordinal = ORD[k].replace(/^./, (c) => c.toUpperCase());
  return [`${NUM[n]} Lots of ${NUM[k]}`, `Every ${ordinal} Square`, ...FLAVOUR_TITLES];
}

function skillsFor(k: number): SkillId[] {
  const skills: SkillId[] = ['code.sequence', 'code.loops', 'maths.position', 'literacy.comprehension'];
  if (k === 1) skills.push('maths.counting');
  if (k >= 2) skills.push('maths.times-tables');
  if (k === 2 || k === 3) skills.push('maths.skip-counting');
  return skills;
}

/**
 * The loop is always four statements; doing it by hand is always 3n-1. One
 * spare line over the reference is enough to experiment in and nowhere near
 * enough to brute-force, which is the whole point of the budget.
 */
const PAR = 4;
const MAX_LINES = PAR + 1;
const unrolledLength = (n: number) => 3 * n - 1;

export const BINRUN: LevelTemplate = {
  id: 'binrun',
  teaches: ['code.loops', 'maths.times-tables', 'maths.skip-counting', 'maths.counting'],
  bands: [1, 3],

  emit(p: TemplateParams, id: string): Level {
    const next = rng(p.seed + p.band * 7919);
    const { n, k } = pick(next, SHAPES[p.band] ?? SHAPES[1]);
    const villain = pick(next, VILLAINS);
    const title = pick(next, titlesFor(n, k));

    // Bins at 0, k, 2k…, with rubbish on each, and two spare squares at the end:
    // one for Sniff to land on after the last step, one for whoever did this.
    const width = n * k + 2;
    const at = Array.from({ length: n }, (_, i) => i * k);
    const grid = Array.from({ length: width }, (_, x) => (at.includes(x) ? 'B' : '-')).join('');
    const step = k === 1 ? 'move(sniff, right)' : `move(sniff, right, ${k})`;

    return {
      id,
      // Cosmetic only — generated capers sit outside the chapter ladder.
      chapter: 0,
      index: 0,
      title,
      briefing: villain.briefing(n, k),
      goalText: `Bin all ${n} — in ${MAX_LINES} lines or fewer.`,
      makeWorld: () =>
        buildWorld({
          grid: [grid],
          sprites: {
            sniff: { character: 'sniff', x: 0, y: 0 },
            [villain.who]: { character: villain.who, x: width - 1, y: 0, facing: 'left' },
          },
          rubbish: at.map((x) => ({ x, y: 0 })),
        }),
      makeStarter: () => [],
      bricks: [k === 1 ? 'move' : 'move-n', 'grab', 'drop', 'repeat'],
      commandable: ['sniff'],
      // The budget lives HERE and not in maxLines: PlayScreen only uses maxLines
      // to draw the counter chip, so a goal that ignores size is a lesson that
      // quietly does not happen.
      goal: ({ world, size }) => world.binned === n && size <= MAX_LINES,
      reference: `repeat ${n} {\n  grab(sniff)\n  drop(sniff)\n  ${step}\n}`,
      par: PAR,
      maxLines: MAX_LINES,
      skills: skillsFor(k),
      hints: [
        'Do one bin by hand first. Grab it, drop it in, then step along. Now look at where he ends up.',
        `He lands on the next bin, with rubbish on it — so the same three commands work all over again. ` +
          `They are ${k} square${k === 1 ? '' : 's'} apart.`,
        `Wrap grab, drop and ${step} in a repeat ${n}. ${NUM[n]} goes of ${k} is ${n * k}.`,
        `Doing all ${n} by hand works, but it is ${unrolledLength(n)} lines and you have ${MAX_LINES}. ` +
          `The repeat is what shrinks it.`,
      ],
      reward: { xp: 30 + p.band * 10 },
      bridgeCard: 'loops',
    };
  },
};

registerTemplate(BINRUN);

/** Exported for the property test: the by-hand solution the budget must refuse. */
export function binrunBruteForce(n: number, k: number): string {
  const step = k === 1 ? 'move(sniff, right)' : `move(sniff, right, ${k})`;
  const lines: string[] = [];
  for (let i = 0; i < n; i += 1) {
    lines.push('grab(sniff)', 'drop(sniff)');
    if (i < n - 1) lines.push(step);
  }
  return lines.join('\n');
}

export { SHAPES as BINRUN_SHAPES, unrolledLength as binrunUnrolledLength };

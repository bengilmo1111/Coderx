/**
 * CHAPTER 1 — OPERATION BIN DAY
 *
 * The maths is in the shapes, not on a worksheet. Level 3 is 3 lots of 2.
 * Level 4 is skip counting in 2s. Level 5 is true/false reasoning. Henry will
 * only ever see bins, rubbish and a dog with poor judgement.
 *
 * Every `reference` string here is executed by tests/levels.test.ts and must
 * satisfy its own `goal` — that is what stops an unsolvable level shipping.
 */

import { parse } from '@/lang/parser';
import { buildWorld } from '@/runtime/world';
import type { Level } from '../types';

const grass = (n: number) => '.'.repeat(n);

export const CHAPTER1: Level[] = [
  {
    id: 'c1l1',
    chapter: 1,
    index: 1,
    title: 'Sniff Reports for Duty',
    briefing:
      "It is Bin Day in Kea Street, and somebody has knocked over a rubbish bag. Again. " +
      "Sniff the police dog is on the case, which is lucky, because Sniff is very good at two things: " +
      "sniffing, and doing exactly what he is told. That second one is where you come in.",
    goalText: 'Get the rubbish into the bin.',
    makeWorld: () =>
      buildWorld({
        grid: [grass(5), '---B.', grass(5)],
        sprites: { sniff: { character: 'sniff', x: 0, y: 1 } },
        rubbish: [{ x: 1, y: 1 }],
      }),
    makeStarter: () => [],
    bricks: ['move', 'grab', 'drop'],
    goal: ({ world }) => world.binned === 1,
    reference: `move(sniff, right)
grab(sniff)
move(sniff, right)
move(sniff, right)
drop(sniff)`,
    par: 5,
    skills: ['code.sequence', 'maths.position', 'literacy.comprehension'],
    hints: [
      'Sniff can only do one thing at a time, top to bottom. What is the very first thing he needs to do?',
      'He has to be standing ON the rubbish before he can grab it. Count the squares between him and it.',
      'Start with move(sniff, right) — then grab it, then walk to the bin.',
    ],
    reward: { xp: 30, sticker: 'sniff-badge' },
    bridgeCard: 'sequence',
  },

  {
    id: 'c1l2',
    chapter: 1,
    index: 2,
    title: 'The Long Street',
    briefing:
      "Kea Street got longer overnight. Nobody knows how. Bolt says this is 'probably fine' and then made " +
      "a noise like a toaster falling down some stairs. Walking one square at a time will take all day — " +
      "so tell Sniff how many squares to go in one command.",
    goalText: 'Bin the rubbish, but use the number box.',
    makeWorld: () =>
      buildWorld({
        grid: [grass(7), '-----B.', grass(7)],
        sprites: { sniff: { character: 'sniff', x: 0, y: 1 } },
        rubbish: [{ x: 2, y: 1 }],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'move', 'grab', 'drop'],
    goal: ({ world }) => world.binned === 1,
    reference: `move(sniff, right, 2)
grab(sniff)
move(sniff, right, 3)
drop(sniff)`,
    par: 4,
    skills: ['code.parameters', 'maths.counting', 'maths.position'],
    hints: [
      'The number in the box changes how far he goes. How many squares to the rubbish?',
      'Rubbish is 2 squares away. The bin is 3 squares past that.',
      'Try move(sniff, right, 2) first, then grab.',
    ],
    reward: { xp: 35, sticker: 'street-sign' },
    bridgeCard: 'parameters',
  },

  {
    id: 'c1l3',
    chapter: 1,
    index: 3,
    title: 'Three Lots of Two',
    briefing:
      "The bin is now six squares away, because Nan McSnap moved it in the night and pretended she " +
      "was 'just having a lovely walk'. Sniff has the rubbish already. Instead of writing move six times, " +
      "wrap it in a repeat — a repeat does the same thing again and again for you.",
    goalText: 'Use a repeat to cross all six squares.',
    makeWorld: () =>
      buildWorld({
        grid: [grass(8), '------B.', grass(8)],
        sprites: { sniff: { character: 'sniff', x: 0, y: 1 } },
        rubbish: [{ x: 0, y: 1 }],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'drop', 'repeat'],
    goal: ({ world }) => world.binned === 1,
    reference: `grab(sniff)
repeat 3 {
  move(sniff, right, 2)
}
drop(sniff)`,
    par: 4,
    skills: ['code.loops', 'maths.times-tables', 'maths.position'],
    hints: [
      'The rubbish is already under his nose. Grab it first, then worry about the walking.',
      'You need 6 squares. If he goes 2 squares each go, how many goes does he need?',
      'Three goes of two squares makes six. Try repeat 3 with move(sniff, right, 2) inside.',
    ],
    reward: { xp: 45, sticker: 'kea-feather' },
    bridgeCard: 'loops',
  },

  {
    id: 'c1l4',
    chapter: 1,
    index: 4,
    title: 'Bin, Rubbish, Bin, Rubbish',
    briefing:
      "Whoever laid out this street did it in a pattern: rubbish, bin, rubbish, bin, all the way along. " +
      "Weka says this was 'not him'. Weka is holding a chip packet while he says it. " +
      "Find the pattern, and let the repeat do the boring bit.",
    goalText: 'Bin all three pieces of rubbish.',
    makeWorld: () =>
      buildWorld({
        grid: [grass(7), '-B-B-B-', grass(7)],
        sprites: { sniff: { character: 'sniff', x: 0, y: 1 } },
        rubbish: [
          { x: 0, y: 1 },
          { x: 2, y: 1 },
          { x: 4, y: 1 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move', 'grab', 'drop', 'repeat'],
    goal: ({ world }) => world.binned === 3,
    reward: { xp: 55, sticker: 'weka-mugshot' },
    reference: `repeat 3 {
  grab(sniff)
  move(sniff, right)
  drop(sniff)
  move(sniff, right)
}`,
    par: 5,
    skills: ['code.loops', 'maths.skip-counting', 'maths.position'],
    hints: [
      'Do it once by hand first. Grab, step, drop, step. Now look at where he ends up.',
      'After one go he is standing on the next piece of rubbish. That means the same four commands work again.',
      'Put grab, move, drop, move inside a repeat 3.',
    ],
  },

  {
    id: 'c1l5',
    chapter: 1,
    index: 5,
    title: 'Some Squares Are Empty',
    briefing:
      "Every square on this street is a bin. Handy. But only SOME of them have rubbish on them, and if " +
      "Sniff tries to grab thin air he falls over and everyone laughs, including Nan. " +
      "You need a command that checks first: if there is rubbish here, then grab it.",
    goalText: 'Bin every piece — without grabbing at nothing.',
    makeWorld: () =>
      buildWorld({
        grid: [grass(6), 'BBBBB.', grass(6)],
        sprites: { sniff: { character: 'sniff', x: 0, y: 1 } },
        rubbish: [
          { x: 0, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move', 'grab', 'drop', 'repeat', 'if-rubbish'],
    goal: ({ world }) => world.binned === 3,
    reference: `repeat 5 {
  if rubbishHere(sniff) {
    grab(sniff)
    drop(sniff)
  }
  move(sniff, right)
}`,
    par: 5,
    skills: ['code.conditionals', 'maths.logic', 'code.loops'],
    hints: [
      'The if block asks a yes-or-no question and only runs the inside when the answer is yes.',
      'He is standing on a bin the whole time — so grab and drop can happen on the same square.',
      'Put grab and drop INSIDE the if, and the move outside it so he always keeps walking.',
    ],
    reward: { xp: 65, sticker: 'nan-wanted-poster' },
    bridgeCard: 'conditionals',
  },

  {
    id: 'c1l6',
    chapter: 1,
    index: 6,
    title: 'Operation Bin Day',
    briefing:
      "This is it. The whole street. The bins are every second square, the rubbish is somewhere among " +
      "them, and Nan McSnap is watching from behind a hedge with a thermos. Clean it up — and when you " +
      "are done, give Sniff something to say. He has earned a line.",
    goalText: 'Bin everything, then make Sniff say something.',
    makeWorld: () =>
      buildWorld({
        grid: [grass(11), 'B.B.B.B.B..', grass(11)],
        sprites: { sniff: { character: 'sniff', x: 0, y: 1 } },
        rubbish: [
          { x: 0, y: 1 },
          { x: 4, y: 1 },
          { x: 8, y: 1 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'move', 'grab', 'drop', 'repeat', 'if-rubbish', 'say', 'bark'],
    goal: ({ world, saids }) => world.binned === 3 && saids.some((s) => s.trim().length > 0),
    reference: `repeat 5 {
  if rubbishHere(sniff) {
    grab(sniff)
    drop(sniff)
  }
  move(sniff, right, 2)
}
say(sniff, "case closed")`,
    par: 6,
    skills: [
      'code.loops',
      'code.conditionals',
      'code.parameters',
      'maths.times-tables',
      'literacy.composition',
    ],
    hints: [
      'This is level 5 again, but the bins are further apart. What changes?',
      'The bins are every SECOND square now — so each step needs to be 2, not 1.',
      'Use move(sniff, right, 2) inside your repeat, and put a say at the very end.',
    ],
    reward: { xp: 100, sticker: 'bin-day-medal' },
  },
];

export const ALL_LEVELS: Level[] = [...CHAPTER1];

export function getLevel(id: string): Level | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export function nextLevelId(id: string): string | undefined {
  const i = ALL_LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? ALL_LEVELS[i + 1]?.id : undefined;
}

/** Parse a level's reference solution. Used by tests and by "show me" hints. */
export function referenceProgram(level: Level) {
  return parse(level.reference);
}

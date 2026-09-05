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

import { buildWorld } from '@/runtime/world';
import type { Level } from '../types';

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
        grid: ['---B-'],
        sprites: { sniff: { character: 'sniff', x: 0, y: 0 } },
        rubbish: [{ x: 1, y: 0 }],
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
        grid: ['-----B-'],
        sprites: { sniff: { character: 'sniff', x: 0, y: 0 } },
        rubbish: [{ x: 2, y: 0 }],
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
      "Nan McSnap has been busy in the night. She has put a bin on every second square, and a bag of " +
      "rubbish on top of every single one of them, which she says is 'tidier'. It is not tidier. " +
      "You could tell Sniff what to do at each bin one at a time — or you could tell him once, and use " +
      "a repeat to make him do it again and again.",
    goalText: 'Bin all three — in 5 lines or fewer.',
    makeWorld: () =>
      buildWorld({
        grid: ['B-B-B---'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          // Nan is named in the briefing; she should be visible in it too.
          nan: { character: 'nan', x: 7, y: 0, facing: 'left' },
        },
        rubbish: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 4, y: 0 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'drop', 'repeat'],
    goal: ({ world, size }) => world.binned === 3 && size <= 5,
    reference: `repeat 3 {
  grab(sniff)
  drop(sniff)
  move(sniff, right, 2)
}`,
    par: 4,
    maxLines: 5,
    skills: ['code.loops', 'maths.times-tables', 'maths.position'],
    hints: [
      'Do one bin by hand first. Grab it, drop it in, then step along. Now look at where he ends up.',
      'He lands on the next bin, with rubbish on it — so the same three commands work all over again.',
      'Wrap grab, drop and move(sniff, right, 2) in a repeat 3. Three goes of two squares is six.',
      'Doing all three by hand works, but it is eight lines and you have five. The repeat is what shrinks it.',
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
    goalText: 'Bin all three — in 6 lines or fewer.',
    makeWorld: () =>
      buildWorld({
        grid: ['-B-B-B--'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          weka: { character: 'weka', x: 7, y: 0, facing: 'left' },
        },
        rubbish: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 4, y: 0 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move', 'grab', 'drop', 'repeat'],
    goal: ({ world, size }) => world.binned === 3 && size <= 6,
    reward: { xp: 55, sticker: 'weka-mugshot' },
    reference: `repeat 3 {
  grab(sniff)
  move(sniff, right)
  drop(sniff)
  move(sniff, right)
}`,
    par: 5,
    maxLines: 6,
    skills: ['code.loops', 'maths.skip-counting', 'maths.position'],
    hints: [
      'Do it once by hand first. Grab, step, drop, step. Now look at where he ends up.',
      'After one go he is standing on the next piece of rubbish. That means the same four commands work again.',
      'Put grab, move, drop, move inside a repeat 3.',
      'Writing it out four times works too, but it will not fit in the lines you have. Wrap it.',
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
    goalText: 'Bin every piece — in 6 lines or fewer.',
    makeWorld: () =>
      buildWorld({
        grid: ['BBBBB--'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          weka: { character: 'weka', x: 6, y: 0, facing: 'left' },
        },
        rubbish: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 3, y: 0 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move', 'grab', 'drop', 'repeat', 'if-rubbish'],
    goal: ({ world, size }) => world.binned === 3 && size <= 6,
    reference: `repeat 5 {
  if rubbishHere(sniff) {
    grab(sniff)
    drop(sniff)
  }
  move(sniff, right)
}`,
    par: 5,
    maxLines: 6,
    skills: ['code.conditionals', 'maths.logic', 'code.loops'],
    hints: [
      'The if block asks a yes-or-no question and only runs the inside when the answer is yes.',
      'He is standing on a bin the whole time — so grab and drop can happen on the same square.',
      'Put grab and drop INSIDE the if, and the move outside it so he always keeps walking.',
      'Doing each square by hand works, but not in six lines. One repeat, with an if inside it.',
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
    goalText: 'Bin everything and give Sniff a line — in 7 lines or fewer.',
    makeWorld: () =>
      buildWorld({
        grid: ['B-B-B-B-B---'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          nan: { character: 'nan', x: 11, y: 0, facing: 'left' },
        },
        rubbish: [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 8, y: 0 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'move', 'grab', 'drop', 'repeat', 'if-rubbish', 'say', 'bark'],
    goal: ({ world, saids, size }) =>
      world.binned === 3 && saids.some((s) => s.trim().length > 0) && size <= 7,
    reference: `repeat 5 {
  if rubbishHere(sniff) {
    grab(sniff)
    drop(sniff)
  }
  move(sniff, right, 2)
}
say(sniff, "case closed")`,
    par: 6,
    maxLines: 7,
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
      'Everything except the say goes inside one repeat. That is how it fits.',
    ],
    reward: { xp: 100, sticker: 'bin-day-medal' },
  },
];

/**
 * CHAPTER 3 — BOLT REBUILDS
 *
 * Henry asked for a robot chapter and a world bigger than the street. The grid
 * is not just bigger: it is the only shape that can teach coordinates, and the
 * only one where a loop inside a loop means anything.
 *
 * The arc is coordinates, then nested loops, then the headline — a command he
 * writes himself, which turns into a brick in his own bar. He used the word
 * "function" unprompted after his first session; this is that idea, made into
 * something he can tap.
 *
 * Transforming is a mechanic rather than a lesson. It is what gives the grid
 * something to be about: a wall you must become a drill to pass, a hole you
 * must become a jet to cross.
 */

import { buildWorld } from '@/runtime/world';
import type { Level } from '../types';

const carryingPart = (world: { sprites: Record<string, { carrying: string | null }>; items: { id: string; kind: string }[] }) => {
  const held = world.sprites.bolt?.carrying;
  return world.items.some((i) => i.id === held && i.kind === 'part');
};

export const CHAPTER3: Level[] = [
  {
    id: 'c3l1',
    chapter: 3,
    index: 1,
    title: 'Bolt Gets an Upgrade',
    briefing:
      "Bolt has decided to rebuild himself, on the grounds that being 40% toaster is 'holding him back'. " +
      "The workshop floor is a grid now, which means up and down work as well as left and right. " +
      "Every square has a column number along the top and a row number down the side. His first cog is " +
      "at column 3, row 2. Go and get it.",
    goalText: 'Fetch the cog from column 3, row 2.',
    makeWorld: () =>
      buildWorld({
        grid: ['-----', '-----', '-----'],
        sprites: { bolt: { character: 'bolt', x: 0, y: 0, mode: 'robot' } },
        items: [{ x: 3, y: 2, kind: 'part' }],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'move', 'grab'],
    commandable: ['bolt'],
    goal: ({ world }) => carryingPart(world),
    reference: `move(bolt, down, 2)
move(bolt, right, 3)
grab(bolt)`,
    par: 3,
    skills: ['maths.position', 'code.sequence', 'literacy.comprehension'],
    hints: [
      'The numbers along the edges tell you where everything is. Bolt starts at column 0, row 0.',
      'Row 2 is two rows DOWN from where he is. Column 3 is three squares to the right.',
      'Try move(bolt, down, 2) first, then move him right.',
    ],
    reward: { xp: 60, sticker: 'first-cog' },
    bridgeCard: 'coordinates',
  },

  {
    id: 'c3l2',
    chapter: 3,
    index: 2,
    title: 'Through the Wall',
    briefing:
      "Somebody has bricked up the middle of the workshop. Bolt says it was 'probably Kea' and Kea says " +
      "nothing at all, which is suspicious. There is no way round it — but Bolt is a robot, and robots " +
      "change shape. Turn him into the drill and go straight through.",
    goalText: 'Get to the cog. There is no way round.',
    makeWorld: () =>
      buildWorld({
        grid: ['--W--', '--W--', '--W--'],
        sprites: { bolt: { character: 'bolt', x: 0, y: 1, mode: 'robot' } },
        items: [{ x: 4, y: 1, kind: 'part' }],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'transform'],
    commandable: ['bolt'],
    goal: ({ world }) => carryingPart(world),
    reference: `transform(bolt, drill)
move(bolt, right, 4)
grab(bolt)`,
    par: 3,
    skills: ['code.sequence', 'maths.position', 'code.debugging'],
    hints: [
      'Try walking straight at it first. Bolt will tell you exactly what the problem is.',
      'The wall goes all the way from the top to the bottom, so going round is not an option.',
      'transform(bolt, drill) first, then walk right as if the wall was not there.',
    ],
    reward: { xp: 70, sticker: 'drill-mode' },
  },

  {
    id: 'c3l3',
    chapter: 3,
    index: 3,
    title: 'Mind the Gap',
    briefing:
      "The floor has fallen in. There is a hole running the whole way across the workshop, and the last " +
      "cog is stranded on the far side at column 5, row 3. A drill is no use against a hole — you cannot " +
      "dig through nothing. You need the other shape.",
    goalText: 'Reach the cog at column 5, row 3.',
    makeWorld: () =>
      buildWorld({
        grid: ['------', '------', '______', '------'],
        sprites: { bolt: { character: 'bolt', x: 0, y: 0, mode: 'robot' } },
        items: [{ x: 5, y: 3, kind: 'part' }],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'transform'],
    commandable: ['bolt'],
    goal: ({ world }) => carryingPart(world),
    reference: `transform(bolt, jet)
move(bolt, down, 3)
move(bolt, right, 5)
grab(bolt)`,
    par: 4,
    skills: ['maths.position', 'code.sequence', 'maths.logic'],
    hints: [
      'Which shape crosses a hole? Not the drill — you cannot drill through a gap.',
      'The cog is at column 5, row 3. Count down first, then across.',
      'transform(bolt, jet), then move down 3 and right 5.',
    ],
    reward: { xp: 80, sticker: 'jet-mode' },
  },

  {
    id: 'c3l4',
    chapter: 3,
    index: 4,
    title: 'Sweep the Workshop',
    briefing:
      "Rebuilding yourself is messy work and Bolt has made a dreadful mess: oil on every square of the " +
      "work area, two rows of it. There is a drain on each square, so you can grab and drop on the spot. " +
      "Doing a whole row is one loop. Doing every row is a loop with a loop inside it, which is the " +
      "cleverest thing you have done yet.",
    goalText: 'Clean both rows — in 8 lines or fewer.',
    makeWorld: () =>
      buildWorld({
        grid: ['BBB-', 'BBB-', '----'],
        sprites: { bolt: { character: 'bolt', x: 0, y: 0, mode: 'robot' } },
        rubbish: [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
          { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move', 'move-n', 'grab', 'drop', 'repeat'],
    commandable: ['bolt'],
    goal: ({ world, size }) => world.binned === 6 && size <= 8,
    maxLines: 8,
    reference: `repeat 2 {
  repeat 3 {
    grab(bolt)
    drop(bolt)
    move(bolt, right)
  }
  move(bolt, left, 3)
  move(bolt, down)
}`,
    par: 7,
    skills: ['code.loops', 'maths.times-tables', 'maths.position'],
    hints: [
      'Clean ONE row first and get that working. Ignore the second row completely for now.',
      'After a row, Bolt is at the end of it. To start the next one he has to come back and drop down.',
      'Now wrap the whole thing — the row loop AND the walk back — inside another repeat 2.',
      'Doing all six squares by hand works, but it is twenty lines and you have eight.',
    ],
    reward: { xp: 100, sticker: 'nested-loop' },
    bridgeCard: 'nested',
  },

  {
    id: 'c3l5',
    chapter: 3,
    index: 5,
    title: 'Teach Bolt a Move',
    briefing:
      "Same mess, same two rows. But this time, instead of telling Bolt the whole thing, you are going " +
      "to teach him a move and give it a name. Once you have, your new command turns up in the brick " +
      "bar at the bottom — a button you invented, that nobody else has. Then you just tap it twice.",
    goalText: 'Teach Bolt a command, then use it.',
    makeWorld: () =>
      buildWorld({
        grid: ['BBB-', 'BBB-', '----'],
        sprites: { bolt: { character: 'bolt', x: 0, y: 0, mode: 'robot' } },
        rubbish: [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
          { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move', 'move-n', 'grab', 'drop', 'repeat', 'define'],
    commandable: ['bolt'],
    goal: ({ world }) => world.binned === 6,
    requires: [
      {
        kind: 'define',
        message: 'This one is about making your OWN command. Tap "teach a move", give it a name, and put the row-cleaning inside it.',
      },
    ],
    reference: `define sweep {
  repeat 3 {
    grab(bolt)
    drop(bolt)
    move(bolt, right)
  }
  move(bolt, left, 3)
  move(bolt, down)
}
sweep()
sweep()`,
    par: 9,
    skills: ['code.loops', 'code.sequence', 'maths.position'],
    hints: [
      'Tap "teach a move" and give your command a name. Anything you like — sweep, tidy, whatever.',
      'Put everything that cleans ONE row inside it, including walking back and dropping down a row.',
      'Now look at the brick bar. Your command is in it. Tap it once for each row.',
    ],
    reward: { xp: 120, sticker: 'own-command' },
    bridgeCard: 'myblocks',
  },

  {
    id: 'c3l6',
    chapter: 3,
    index: 6,
    title: 'The Rebuild',
    briefing:
      "Last job. Two rows of oil to clear, and then the final cog — which Kea has walled up in the corner " +
      "at column 5, row 0, and is pretending to know nothing about. Everything you have: your own " +
      "command, a loop inside a loop, and a shape change to get through the bricks.",
    goalText: 'Clean it all, then drill through for the last cog.',
    makeWorld: () =>
      buildWorld({
        grid: ['BBB-W-', 'BBB-W-', '------', '------'],
        sprites: {
          bolt: { character: 'bolt', x: 0, y: 0, mode: 'robot' },
          kea: { character: 'kea', x: 5, y: 3, facing: 'left' },
        },
        rubbish: [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
          { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
        ],
        items: [{ x: 5, y: 0, kind: 'part' }],
      }),
    makeStarter: () => [],
    bricks: ['move', 'move-n', 'grab', 'drop', 'repeat', 'define', 'transform'],
    commandable: ['bolt'],
    goal: ({ world }) => world.binned === 6 && carryingPart(world),
    requires: [
      { kind: 'define', message: 'You know how to teach Bolt a move now. Use it — doing both rows by hand is a lot of tapping.' },
    ],
    reference: `define sweep {
  repeat 3 {
    grab(bolt)
    drop(bolt)
    move(bolt, right)
  }
  move(bolt, left, 3)
  move(bolt, down)
}
sweep()
sweep()
transform(bolt, drill)
move(bolt, up, 2)
move(bolt, right, 5)
grab(bolt)`,
    par: 13,
    skills: ['code.loops', 'code.sequence', 'code.conditionals', 'maths.position', 'maths.times-tables'],
    hints: [
      'Do the cleaning first, exactly the way you did last time. The cog can wait.',
      'After two sweeps Bolt is down at row 2. The cog is up at row 0, behind bricks.',
      'Transform to the drill, go back up 2, then straight right through the wall.',
    ],
    reward: { xp: 180, sticker: 'rebuilt' },
  },
];

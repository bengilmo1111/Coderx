/**
 * THE WORKSHOP — free play.
 *
 * Everything he has learned, on one grid, with no goal and nothing to fail. It
 * is the only part of coderX that cannot run out, which matters for a boy who
 * finished Chapter 1 in a single sitting.
 *
 * It is a Level like any other so it reuses the whole editor, runtime and
 * tutor. It simply never completes: `sandbox` turns off scoring, unlocking and
 * the win screen, and its goal is never met because there is nothing to win.
 */

import { buildWorld } from '@/runtime/world';
import type { Level } from './types';

export const SANDBOX: Level = {
  id: 'workshop',
  chapter: 0,
  index: 0,
  sandbox: true,
  title: 'The Workshop',
  briefing:
    "No job, no rules, nothing to get wrong. Bolt, Sniff and Kea are all here and all take orders. " +
    "There are bins, oil, cogs, a wall to drill and a hole to fly over. Make something daft. " +
    "Whatever you write stays here for next time.",
  goalText: 'Free play — mess about with everything.',
  makeWorld: () =>
    buildWorld({
      grid: ['B-B-W-', '--_---', 'B-B---', '------'],
      sprites: {
        bolt: { character: 'bolt', x: 0, y: 3, mode: 'robot' },
        sniff: { character: 'sniff', x: 1, y: 3 },
        kea: { character: 'kea', x: 2, y: 3 },
        meatball: { character: 'meatball', x: 5, y: 3 },
      },
      rubbish: [
        { x: 1, y: 0 },
        { x: 3, y: 2 },
      ],
      items: [
        { x: 5, y: 0, kind: 'part' },
        { x: 4, y: 2, kind: 'sword' },
      ],
    }),
  makeStarter: () => [],
  bricks: [
    'move', 'move-n', 'grab', 'drop', 'say', 'bark', 'attack', 'transform',
    'repeat', 'if-rubbish', 'if-holding', 'if-wall', 'until-dragon',
    'count-start', 'count-add', 'count-set', 'repeat-count', 'define',
  ],
  commandable: ['bolt', 'sniff', 'kea'],
  variable: 'count',
  goal: () => false,
  reference: 'bark(sniff)',
  par: 1,
  skills: ['code.sequence'],
  hints: [
    'There is nothing to solve here. Try something silly and see what happens.',
    'Bolt can drill through the wall and fly over the hole. Sniff and Kea cannot.',
    'If you teach Bolt a move, it turns up as a brick you can tap.',
  ],
  reward: { xp: 0, sticker: 'typing-trophy' },
};

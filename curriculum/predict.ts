/**
 * CALL IT — say what will happen before you press Run.
 *
 * This is the cheapest large thing in the whole build. Committing to a guess
 * before seeing the answer improves what you take from the answer, and it does
 * so even when the guess is wrong — provided the reveal follows immediately,
 * which here it does, because the reveal IS the run.
 *
 * Two rules, and the second one is the important one:
 *
 *   1. Ask only where there is a real answer. `runtime/run.ts` already computes
 *      the final world, so the truth costs nothing and can never disagree with
 *      what he watches happen.
 *   2. REWARD THE CALL, NEVER THE CORRECTNESS. A bonus for being right is a
 *      penalty for being wrong wearing a hat, and this is a boy who has already
 *      decided he is behind. Making a call is the habit worth paying for.
 *
 * The question is derived rather than authored. Ten of the nineteen hand-written
 * levels end in `world.binned === n`, and so does every caper `binrun` emits, so
 * asking how many bags go in covers most of the game with no content written. A
 * level can still declare its own, and where neither applies there is simply no
 * question and Run behaves exactly as it always has.
 */

import type { WorldState } from '@/runtime/world';
import type { GoalContext, Level } from './types';

export interface Prediction {
  /** Asked in his own terms. Never "predict the output". */
  question: string;
  /** Few enough to tap without reading hard. */
  options: string[];
  /** What actually happened, from the run that follows. */
  from: (ctx: Pick<GoalContext, 'world' | 'saids'>) => string;
}

/** More than this and it stops being a tap and starts being a quiz. */
const MAX_OPTIONS = 9;

function litter(world: WorldState): number {
  return world.items.filter((i) => i.kind === 'rubbish').length;
}

/** Anything with a health bar is something that can be worn down. */
function fightable(world: WorldState): string | null {
  const found = Object.entries(world.sprites).find(([, s]) => s.maxHealth);
  return found ? found[0] : null;
}

/** Is anybody carrying one of the spare parts Bolt is rebuilding himself from? */
function holdingPart(world: WorldState): boolean {
  const parts = new Set(world.items.filter((i) => i.kind === 'part').map((i) => i.id));
  return Object.values(world.sprites).some((s) => s.carrying && parts.has(s.carrying));
}

/**
 * The question for this level, or nothing at all.
 *
 * Nothing is a perfectly good answer: a level about carrying a part to Bolt has
 * no number worth guessing, and inventing one would make Call It feel like a
 * toll on the way to Run rather than part of the game.
 */
export function predictionFor(level: Level): Prediction | null {
  if (level.sandbox) return null; // free play has no right answer, by design
  if (level.predict) return level.predict;

  const world = level.makeWorld();

  const bags = litter(world);
  if (bags > 0 && bags < MAX_OPTIONS) {
    return {
      question: 'Call it: how many bags go in?',
      options: Array.from({ length: bags + 1 }, (_, n) => String(n)),
      from: ({ world: after }) => String(after.binned),
    };
  }

  // Chapter 2 has no rubbish in it at all, and the guess that matters there is
  // whether this run is the one that finishes the job.
  const foe = fightable(world);
  if (foe) {
    return {
      question: 'Call it: does the dragon give up this time?',
      options: ['Yes', 'No'],
      from: ({ world: after }) => ((after.sprites[foe]?.health ?? 1) === 0 ? 'Yes' : 'No'),
    };
  }

  // And early Chapter 3 is a fetch: the spare part is either in his hands at
  // the end of the run or it is not.
  if (world.items.some((i) => i.kind === 'part')) {
    return {
      question: 'Call it: does he end up holding the part?',
      options: ['Yes', 'No'],
      from: ({ world: after }) => (holdingPart(after) ? 'Yes' : 'No'),
    };
  }

  return null;
}

/**
 * What Bolt says at the reveal.
 *
 * Being wrong has to cost nothing and read like nothing, or he will stop
 * calling it — and a child who stops guessing has stopped predicting, which was
 * the whole point. So the near miss is the warmest line of the three.
 */
export function callItVerdict(called: string, actual: string): string {
  if (called === actual) return `You called it — ${actual}. Nice one.`;
  const a = Number(called);
  const b = Number(actual);
  if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) === 1) {
    return `So close: you said ${called}, it was ${actual}. Good eye.`;
  }
  return `You said ${called}, it was ${actual}. Now you know something you didn't.`;
}

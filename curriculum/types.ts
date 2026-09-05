import type { Program, Stmt } from '@/lang/types';
import type { WorldState } from '@/runtime/world';
import type { SkillId } from './skills';

export interface GoalContext {
  world: WorldState;
  /** Everything spoken during the run — lets a level require Henry to write. */
  saids: string[];
  /** How many statements he wrote, nested ones included. */
  size: number;
}

export interface Level {
  id: string;
  chapter: number;
  index: number;
  title: string;
  /** Real prose he has to read to solve it. This is the reading practice. */
  briefing: string;
  /** The one-line objective, always visible. */
  goalText: string;
  makeWorld: () => WorldState;
  /** Code already on the page when he arrives. Usually empty. */
  makeStarter: () => Program;
  /** Which bricks appear in the bar. Deliberately few — choice paralysis is real. */
  bricks: string[];
  /**
   * Who takes orders. Defaults to Sniff alone.
   *
   * With one, the name is pre-filled into every brick. With two, it becomes a
   * picker — and coordinating two characters is a genuine step up in thinking.
   * Anyone on the board who is NOT in this list is scenery with opinions: Nan
   * and Weka exist to be looked at, not commanded.
   */
  commandable?: string[];
  goal: (ctx: GoalContext) => boolean;
  /** Tested: every level must be solvable by this exact source. */
  reference: string;
  /** Statement count of the reference solution — beat or match it for bonus XP. */
  par: number;
  /**
   * A hard line budget, stated up front in the goal.
   *
   * Levels 5 and 6 were meant to teach loops and conditionals, and both could be
   * beaten with a straight run of commands — level 5 solves in 9 plain lines. A
   * budget makes the loop the only way through. It is part of the puzzle from
   * the start rather than a rejection afterwards, which is the difference
   * between a constraint and being told your right answer is wrong.
   */
  maxLines?: number;
  /**
   * Constructs this level insists on.
   *
   * A line budget forces a loop when the loop-free version is longer. It cannot
   * force a variable, because `repeat 3` is shorter than `set n = 3` plus
   * `repeat n`. So where the construct IS the lesson, the level says so
   * outright and the message explains why.
   */
  requires?: { kind: Stmt['kind']; message: string }[];
  /** What the counting bricks call their variable on this level. */
  variable?: string;
  skills: SkillId[];
  /** Bolt's handwritten ladder. Also the fallback when the AI is unavailable. */
  hints: string[];
  /** What he collects for finishing. */
  reward: { xp: number; sticker: string };
  bridgeCard?: string;
}

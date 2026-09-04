import type { Program } from '@/lang/types';
import type { WorldState } from '@/runtime/world';
import type { SkillId } from './skills';

export interface GoalContext {
  world: WorldState;
  /** Everything spoken during the run — lets a level require Henry to write. */
  saids: string[];
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
  goal: (ctx: GoalContext) => boolean;
  /** Tested: every level must be solvable by this exact source. */
  reference: string;
  /** Statement count of the reference solution — beat or match it for bonus XP. */
  par: number;
  skills: SkillId[];
  /** Bolt's handwritten ladder. Also the fallback when the AI is unavailable. */
  hints: string[];
  /** What he collects for finishing. */
  reward: { xp: number; sticker: string };
  bridgeCard?: string;
}

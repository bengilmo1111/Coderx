/**
 * How much help he arrives to.
 *
 * Plain arithmetic over what Build 1 already keeps. No model, no observations —
 * `docs/memory-loop.md` is explicit that the memory gets built and checked
 * against what his dad already knows before anything acts on it, and a scaffold
 * that quietly decided he needed more help would be exactly the stored verdict
 * that note warns about.
 *
 * Two rules, both borrowed from that note:
 *
 *   1. PROMOTE READILY, NEVER DEMOTE. Two good goes move him up; a bad
 *      fortnight moves him nowhere. Drifting slightly too independent is a much
 *      cheaper error than handing a boy a half-finished answer he did not need,
 *      which reads as "we did not think you could".
 *   2. He never sees it. There is no rung on screen, no "level 2 of 4". He sees
 *      a caper that happens to have a bit of a head start, or not.
 */

import type { SkillId } from '@/curriculum/skills';
import { RUNGS } from '@/curriculum/fade';
import type { ProgressState } from './types';

/** Successes on a skill before the training wheels start coming off. */
const COMPLETE_AT = 2;
const SOLO_AT = 4;
/** Lines typed by hand before the keyboard is worth opening for him. */
const KEYBOARD_AT = 10;

/**
 * The rung for this set of skills.
 *
 * A level exercises several skills at once, so the one he is least sure of
 * decides — the head start is for the hard part, not the easy one.
 */
export function scaffoldRung(state: ProgressState, skills: readonly SkillId[]): number {
  const mastery = state.mastery ?? {};
  const relevant = skills.filter((s) => s.startsWith('code.'));
  // A level with no coding skill at all is not what the fade is for.
  if (!relevant.length) return RUNGS.solo;

  const weakest = Math.min(...relevant.map((s) => mastery[s]?.successes ?? 0));

  if (weakest < COMPLETE_AT) return RUNGS.study;
  if (weakest < SOLO_AT) return RUNGS.shell;
  // Past the scaffold entirely. The last rung is not less help than `solo` —
  // it is the same blank page with the keyboard already open, because by now
  // reaching for it is the next thing worth making easy.
  return (state.typedLines ?? 0) >= KEYBOARD_AT ? RUNGS.keyboard : RUNGS.solo;
}

/**
 * Crew badges — earned by patterns across many capers, not by finishing one.
 *
 * Generated capers cannot each mint a sticker without the collection becoming
 * meaningless, so this is what they pay into instead. The rules are plain
 * arithmetic over state Build 1 already keeps; nothing here reads `observations`,
 * because docs/memory-loop.md is explicit that the model gets built and checked
 * against what Ben already knows about his own son BEFORE anything reads it back.
 *
 * Three rules hold above everything else:
 *   1. Positive evidence only. There is no badge for a thing he cannot do yet,
 *      and no badge can ever be taken away once collected.
 *   2. No badge names a skill. "Loop Wrangler", never "proficient at loops".
 *   3. Nothing here is shown to him as a measurement. It is a sticker.
 */

import type { ProgressState } from './types';

export interface Badge {
  id: string;
  /** True when the state shows he has done the thing. Never the reverse. */
  earned: (state: ProgressState) => boolean;
}

/**
 * Levels he has actually finished, as records rather than ids.
 *
 * Defensive about shape: this reads state that has been sitting in a browser
 * since an older build, and a badge check is never worth crashing HQ over.
 */
const completed = (state: ProgressState) => Object.values(state.levels ?? {}).filter((l) => l?.completed);

export const BADGES: Badge[] = [
  {
    id: 'loop-wrangler',
    earned: (s) => (s.mastery?.['code.loops']?.successes ?? 0) >= 5,
  },
  {
    id: 'own-two-hands',
    earned: (s) => (s.typedLines ?? 0) >= 25,
  },
  {
    // Persistence, not speed. The caper that beat him and then did not.
    id: 'comeback-kid',
    earned: (s) => completed(s).some((l) => (l.attempts ?? 0) >= 3),
  },
  {
    id: 'clean-sweep',
    earned: (s) => completed(s).filter((l) => l.hintsUsed === 0).length >= 3,
  },
  {
    id: 'street-regular',
    earned: (s) => completed(s).length >= 10,
  },
];

/** Every badge he has earned, whether or not he has been given it yet. */
export function badgesEarned(state: ProgressState): string[] {
  return BADGES.filter((b) => b.earned(state)).map((b) => b.id);
}

/** The ones to award now: earned, and not already on the shelf. */
export function newBadges(state: ProgressState): string[] {
  return badgesEarned(state).filter((id) => !(state.stickers ?? []).includes(id));
}

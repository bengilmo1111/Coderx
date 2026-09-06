/**
 * Every level, in order, across every chapter.
 *
 * Chapters live in their own files; this is the one place that knows the whole
 * running order, so unlocking and "what comes next" stay simple.
 */

import { parse } from '@/lang/parser';
import { CHAPTER1 } from './chapter1/levels';
import { CHAPTER2 } from './chapter2/levels';
import { CHAPTER3 } from './chapter3/levels';
import { SANDBOX } from './sandbox';
import { generatedLevel } from './template';
// Importing a template is what registers it. Nothing else references these.
import './templates/binrun';
import type { Level } from './types';

export const CHAPTERS: { number: number; title: string; levels: Level[] }[] = [
  { number: 1, title: 'Operation Bin Day', levels: CHAPTER1 },
  { number: 2, title: 'The Last Dragon', levels: CHAPTER2 },
  { number: 3, title: 'Bolt Rebuilds', levels: CHAPTER3 },
];

export const ALL_LEVELS: Level[] = CHAPTERS.flatMap((c) => c.levels);

export function getLevel(id: string): Level | undefined {
  // The Workshop is deliberately outside ALL_LEVELS: it must not affect
  // unlocking, progress counts or "what comes next".
  if (id === SANDBOX.id) return SANDBOX;
  const written = ALL_LEVELS.find((l) => l.id === id);
  if (written) return written;
  /**
   * Generated capers are outside ALL_LEVELS for the same reason, and two more.
   *
   * `isUnlocked` looks at the level immediately before this one in the array, so
   * splicing a generated caper into the middle would RE-LOCK the one after it
   * for a boy who had already finished it — which is precisely the experience
   * this app exists to avoid. Being absent, they gate nothing and are always
   * playable. And `ALL_LEVELS.length` is the denominator of "levels done" in the
   * parent view, which should keep meaning the story levels.
   */
  return generatedLevel(id);
}

export function nextLevelId(id: string): string | undefined {
  const i = ALL_LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? ALL_LEVELS[i + 1]?.id : undefined;
}

/** Parse a level's reference solution. Used by tests and by "show me" hints. */
export function referenceProgram(level: Level) {
  return parse(level.reference);
}

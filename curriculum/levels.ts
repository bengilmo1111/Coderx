/**
 * Every level, in order, across every chapter.
 *
 * Chapters live in their own files; this is the one place that knows the whole
 * running order, so unlocking and "what comes next" stay simple.
 */

import { parse } from '@/lang/parser';
import { CHAPTER1 } from './chapter1/levels';
import { CHAPTER2 } from './chapter2/levels';
import type { Level } from './types';

export const CHAPTERS: { number: number; title: string; levels: Level[] }[] = [
  { number: 1, title: 'Operation Bin Day', levels: CHAPTER1 },
  { number: 2, title: 'The Last Dragon', levels: CHAPTER2 },
];

export const ALL_LEVELS: Level[] = CHAPTERS.flatMap((c) => c.levels);

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

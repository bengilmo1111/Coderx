/**
 * Merging progress from two devices.
 *
 * Henry uses a shared family computer and his dad's phone, so the same profile
 * gets played in two places and neither knows about the other until it syncs.
 *
 * Last-write-wins would be catastrophic here: a Saturday on the computer would
 * silently erase Friday night's stickers from the phone. Losing a collection is
 * exactly the sort of thing that ends an 8-year-old's interest in an app.
 *
 * But progress in coderX is **monotonic** — XP only goes up, stickers are only
 * ever collected, a finished level never un-finishes. So the answer is never
 * "newest wins", it is "take the best of both", and the result cannot be worse
 * than either side. That property is what the tests here are really checking.
 */

import type { SkillId } from '@/curriculum/skills';
import type { LevelProgress, MasteryRecord, ProgressState, StreakState } from './types';

const laterOf = (a: string | undefined, b: string | undefined): boolean =>
  (a ?? '') >= (b ?? ''); // ISO strings compare correctly as text

function mergeLevel(a: LevelProgress, b: LevelProgress, preferA: boolean): LevelProgress {
  const bestSize =
    a.bestSize === null ? b.bestSize : b.bestSize === null ? a.bestSize : Math.min(a.bestSize, b.bestSize);
  return {
    completed: a.completed || b.completed,
    typedItHimself: a.typedItHimself || b.typedItHimself,
    attempts: Math.max(a.attempts, b.attempts),
    hintsUsed: Math.max(a.hintsUsed, b.hintsUsed),
    bestSize,
    // No "better" version of half-written code — just a newer one.
    lastCode: preferA ? a.lastCode || b.lastCode : b.lastCode || a.lastCode,
  };
}

function mergeMastery(a: MasteryRecord, b: MasteryRecord): MasteryRecord {
  return {
    // Max, not sum: syncing the same session twice must not double-count him
    // into looking more practised than he is.
    attempts: Math.max(a.attempts, b.attempts),
    successes: Math.max(a.successes, b.successes),
    lastSeen: a.lastSeen >= b.lastSeen ? a.lastSeen : b.lastSeen,
  };
}

function mergeStreak(a: StreakState, b: StreakState): StreakState {
  const best = Math.max(a.best, b.best);
  if (a.lastDay === b.lastDay) {
    return {
      lastDay: a.lastDay,
      count: Math.max(a.count, b.count),
      best,
      freezes: Math.max(a.freezes, b.freezes),
    };
  }
  // Different days: the later visit is the live one, but never lose the record.
  const live = (a.lastDay ?? '') > (b.lastDay ?? '') ? a : b;
  return { ...live, best };
}

/**
 * Combine two states. Commutative apart from `lastCode`, which follows
 * `updatedAt`, and idempotent: merging a state with itself changes nothing.
 */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const preferA = laterOf(a.updatedAt, b.updatedAt);
  const newer = preferA ? a : b;
  const older = preferA ? b : a;

  // Collections keep earn order — oldest device's first, then anything the
  // newer one added. Ordering by argument position instead would make the same
  // two states merge to different arrays depending which way round they went,
  // and the client would then think it had changed and push again forever.
  const union = (first: string[], second: string[]) => [...new Set([...first, ...second])];

  const levels: Record<string, LevelProgress> = {};
  for (const id of new Set([...Object.keys(a.levels), ...Object.keys(b.levels)])) {
    const left = a.levels[id];
    const right = b.levels[id];
    if (left && right) levels[id] = mergeLevel(left, right, preferA);
    else levels[id] = (left ?? right)!;
  }

  const mastery: ProgressState['mastery'] = {};
  for (const id of new Set([...Object.keys(a.mastery), ...Object.keys(b.mastery)]) as Set<SkillId>) {
    const left = a.mastery[id];
    const right = b.mastery[id];
    if (left && right) mastery[id] = mergeMastery(left, right);
    else mastery[id] = (left ?? right)!;
  }

  const sessions: Record<string, number> = { ...a.sessions };
  for (const [day, minutes] of Object.entries(b.sessions)) {
    sessions[day] = Math.max(sessions[day] ?? 0, minutes);
  }

  return {
    version: 1,
    // A name he set on one device should not be undone by a device that never
    // knew about it.
    agentName: newer.agentName || a.agentName || b.agentName,
    hqName: newer.hqName || a.hqName || b.hqName,
    avatar: newer.avatar || a.avatar || b.avatar,
    xp: Math.max(a.xp, b.xp),
    levels,
    stickers: union(older.stickers, newer.stickers),
    clubCards: union(older.clubCards, newer.clubCards),
    streak: mergeStreak(a.streak, b.streak),
    mastery,
    sessions,
    typedLines: Math.max(a.typedLines, b.typedLines),
    createdAt: a.createdAt <= b.createdAt ? a.createdAt : b.createdAt,
    updatedAt: preferA ? a.updatedAt : b.updatedAt,
  };
}

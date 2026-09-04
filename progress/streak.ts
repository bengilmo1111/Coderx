/**
 * Streaks, deliberately forgiving.
 *
 * Two rules, both non-negotiable:
 *
 * 1. Day boundaries are Pacific/Auckland, never UTC. Henry is in New Zealand;
 *    a UTC boundary would roll his streak over at about 1pm on a school day and
 *    silently break it, which is the exact opposite of what this is for.
 * 2. A missed day spends a freeze if he has one, and otherwise drops the count
 *    to 1 rather than 0 — he is never shown a zero, and never told off. A
 *    broken streak must not become one more thing he is failing at.
 */

import type { StreakState } from './types';

const NZ = 'Pacific/Auckland';

/** The NZ calendar day, as YYYY-MM-DD. Intl handles NZDT/NZST for us. */
export function nzDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: NZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86_400_000);
}

export const emptyStreak = (): StreakState => ({ lastDay: null, count: 0, best: 0, freezes: 2 });

export interface StreakOutcome {
  streak: StreakState;
  /** True only on the first visit of a new NZ day — used to fire the flame animation. */
  grewToday: boolean;
  /** A freeze quietly absorbed a missed day. We show a gentle note, never a warning. */
  freezeUsed: boolean;
}

export function touchStreak(prev: StreakState, today = nzDay()): StreakOutcome {
  if (prev.lastDay === today) return { streak: prev, grewToday: false, freezeUsed: false };

  if (prev.lastDay === null) {
    return {
      streak: { ...prev, lastDay: today, count: 1, best: Math.max(prev.best, 1) },
      grewToday: true,
      freezeUsed: false,
    };
  }

  const gap = daysBetween(prev.lastDay, today);

  if (gap === 1) {
    const count = prev.count + 1;
    return {
      streak: {
        ...prev,
        lastDay: today,
        count,
        best: Math.max(prev.best, count),
        // Earn a freeze every 5 days, capped at 3. He is never told this exists
        // until it saves him.
        freezes: count % 5 === 0 ? Math.min(3, prev.freezes + 1) : prev.freezes,
      },
      grewToday: true,
      freezeUsed: false,
    };
  }

  // Missed at least one day. Spend a freeze if we can.
  const missed = gap - 1;
  if (prev.freezes >= missed) {
    const count = prev.count + 1;
    return {
      streak: {
        ...prev,
        lastDay: today,
        count,
        best: Math.max(prev.best, count),
        freezes: prev.freezes - missed,
      },
      grewToday: true,
      freezeUsed: true,
    };
  }

  // Out of freezes. Restart at 1, not 0 — today already counts.
  return {
    streak: { ...prev, lastDay: today, count: 1, best: prev.best, freezes: 1 },
    grewToday: true,
    freezeUsed: false,
  };
}

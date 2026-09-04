/**
 * The one place progress is read and written.
 *
 * Everything goes through this interface so Build 2 can put Supabase behind it
 * (emoji password, cross-device sync) by adding an adapter rather than
 * rewriting the app. Local-first is the permanent design, not a stopgap: the
 * phone has to work on a bad connection, and progress must never be lost.
 */

import type { SkillId } from '@/curriculum/skills';
import { emptyStreak, nzDay, touchStreak, type StreakOutcome } from './streak';
import type { LevelProgress, ProgressState } from './types';

const KEY = 'coderx.progress.v1';

export function emptyProgress(): ProgressState {
  return {
    version: 1,
    agentName: '',
    hqName: '',
    xp: 0,
    levels: {},
    stickers: [],
    clubCards: [],
    streak: emptyStreak(),
    mastery: {},
    sessions: {},
    typedLines: 0,
    createdAt: new Date().toISOString(),
  };
}

export function emptyLevelProgress(): LevelProgress {
  return { completed: false, attempts: 0, hintsUsed: 0, bestSize: null, typedItHimself: false, lastCode: '' };
}

export interface ProgressStore {
  load(): ProgressState;
  save(state: ProgressState): void;
  clear(): void;
}

/** Used during SSR and if the browser has storage switched off. */
class MemoryStore implements ProgressStore {
  private state = emptyProgress();
  load() {
    return this.state;
  }
  save(s: ProgressState) {
    this.state = s;
  }
  clear() {
    this.state = emptyProgress();
  }
}

class LocalStore implements ProgressStore {
  load(): ProgressState {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return emptyProgress();
      const parsed = JSON.parse(raw) as ProgressState;
      // Forwards-compatible merge — a new field must never wipe his stickers.
      return { ...emptyProgress(), ...parsed, streak: { ...emptyStreak(), ...parsed.streak } };
    } catch {
      return emptyProgress();
    }
  }
  save(state: ProgressState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* Private browsing, quota, storage disabled — never break the game over it. */
    }
  }
  clear() {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

export const store: ProgressStore =
  typeof window === 'undefined' ? new MemoryStore() : new LocalStore();

// --- Pure updates, so they're testable without a browser ---

export function recordSkillAttempt(
  state: ProgressState,
  skills: SkillId[],
  succeeded: boolean,
  day = nzDay(),
): ProgressState {
  const mastery = { ...state.mastery };
  for (const id of skills) {
    const prev = mastery[id] ?? { attempts: 0, successes: 0, lastSeen: day };
    mastery[id] = {
      attempts: prev.attempts + 1,
      successes: prev.successes + (succeeded ? 1 : 0),
      lastSeen: day,
    };
  }
  return { ...state, mastery };
}

export function addMinutes(state: ProgressState, minutes: number, day = nzDay()): ProgressState {
  return { ...state, sessions: { ...state.sessions, [day]: (state.sessions[day] ?? 0) + minutes } };
}

export function visit(state: ProgressState): { state: ProgressState; outcome: StreakOutcome } {
  const outcome = touchStreak(state.streak);
  return { state: { ...state, streak: outcome.streak }, outcome };
}

export function collect(state: ProgressState, sticker: string): ProgressState {
  return state.stickers.includes(sticker)
    ? state
    : { ...state, stickers: [...state.stickers, sticker] };
}

export function collectCard(state: ProgressState, card: string): ProgressState {
  return state.clubCards.includes(card) ? state : { ...state, clubCards: [...state.clubCards, card] };
}

export function levelProgress(state: ProgressState, levelId: string): LevelProgress {
  return state.levels[levelId] ?? emptyLevelProgress();
}

export function setLevelProgress(
  state: ProgressState,
  levelId: string,
  patch: Partial<LevelProgress>,
): ProgressState {
  return {
    ...state,
    levels: { ...state.levels, [levelId]: { ...levelProgress(state, levelId), ...patch } },
  };
}

/** He can play any level up to the first he hasn't finished, plus that one. */
export function isUnlocked(state: ProgressState, levelIds: string[], levelId: string): boolean {
  const i = levelIds.indexOf(levelId);
  if (i <= 0) return true;
  return Boolean(state.levels[levelIds[i - 1]]?.completed);
}

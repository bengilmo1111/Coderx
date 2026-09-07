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

/**
 * Whose progress this browser is currently reading and writing.
 *
 * There are two children. The merge is deliberately monotonic — it takes the
 * better of two values and never deletes — which is exactly right for one child
 * on two devices and exactly wrong for two children on one computer: signing
 * Casper in against Henry's slot would hand him Henry's XP, stickers and
 * streak, and Henry would pull the combined blob straight back. So the slot is
 * keyed by profile, and the two of them simply never touch the same one.
 */
let activeProfileId: string | null = null;

/** The anonymous slot: before anyone signs in, and when sync is switched off. */
function keyFor(profileId: string | null): string {
  return profileId ? `${KEY}.${profileId}` : KEY;
}

/** Which profile has already taken over the anonymous slot's progress. */
const CLAIM_KEY = 'coderx.progress.claimedBy';

/**
 * Who was playing here last.
 *
 * Written locally so the very first paint after a reload reads the right slot.
 * Without it the page renders from the anonymous slot, waits for the server to
 * say who is signed in, and only then swaps in the real progress — which shows
 * a child who has four hundred XP a screen that says nought, for as long as the
 * round trip takes. The cookie remains the authority; this is only a guess good
 * enough to paint with, and the server correcting it is an ordinary update.
 */
const ACTIVE_KEY = 'coderx.progress.activeProfile';

/** The profile this device was last signed in as, if any. */
export function lastProfileId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/** Has this state ever actually been played? An untouched slot is adoptable. */
function isUntouched(state: ProgressState): boolean {
  return (
    !state.agentName &&
    state.xp === 0 &&
    Object.keys(state.levels).length === 0 &&
    state.stickers.length === 0
  );
}

export function emptyProgress(): ProgressState {
  return {
    version: 1,
    agentName: '',
    hqName: '',
    avatar: 'sniff',
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
  /** Point the store at one child's slot, and return what is in it. */
  use(profileId: string | null, options?: { adopt?: boolean }): ProgressState;
}

/** Used during SSR and if the browser has storage switched off. */
class MemoryStore implements ProgressStore {
  private slots = new Map<string, ProgressState>();
  load() {
    return this.slots.get(keyFor(activeProfileId)) ?? emptyProgress();
  }
  save(s: ProgressState) {
    this.slots.set(keyFor(activeProfileId), s);
  }
  clear() {
    this.slots.delete(keyFor(activeProfileId));
  }
  use(profileId: string | null) {
    activeProfileId = profileId;
    return this.load();
  }

}

class LocalStore implements ProgressStore {
  load(): ProgressState {
    return readSlot(keyFor(activeProfileId));
  }
  save(state: ProgressState) {
    try {
      // Stamped on every write, so merging two devices can tell which one last
      // touched a field that has no "better" value — his half-written code.
      window.localStorage.setItem(
        keyFor(activeProfileId),
        JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
      );
    } catch {
      /* Private browsing, quota, storage disabled — never break the game over it. */
    }
  }
  clear() {
    try {
      window.localStorage.removeItem(keyFor(activeProfileId));
    } catch {
      /* ignore */
    }
  }

  /**
   * Switch to a profile's own slot, adopting the anonymous one exactly once.
   *
   * Henry played three chapters on the family computer before there was any
   * such thing as a profile, and all of it sits in the anonymous slot. The
   * first child to sign in on a device inherits that — otherwise signing in
   * would look to him like losing everything. The second child must not, so
   * the adoption is recorded and never repeats. Casper starts at zero, which
   * is the only honest place for him to start.
   */
  use(profileId: string | null, options?: { adopt?: boolean }): ProgressState {
    activeProfileId = profileId;
    try {
      if (profileId) window.localStorage.setItem(ACTIVE_KEY, profileId);
      else window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* Storage disabled. Costs a flash of the anonymous slot, nothing more. */
    }
    if (!profileId) return this.load();

    const own = readSlot(keyFor(profileId));
    if (!isUntouched(own)) return own;

    /*
     * Adoption is opt-in, and only a profile being CREATED may ask for it.
     *
     * Signing in is not a claim. Henry signed into his own profile on his dad's
     * phone and was handed the test game left in that phone's anonymous slot,
     * because the slot carried no record of having been claimed — it predated
     * the claim marker existing at all. He got somebody else's name, somebody
     * else's XP, and the merge pushed it up into his row.
     *
     * Creating a profile is a claim: "save the game I am playing right now".
     * Signing in means the game is already on the server, and whatever is
     * sitting in this device's anonymous slot belongs to whoever used the
     * device before — which is exactly nothing to do with the person arriving.
     */
    if (options?.adopt !== true) return own;

    try {
      const claimedBy = window.localStorage.getItem(CLAIM_KEY);
      if (claimedBy && claimedBy !== profileId) return own;

      const anonymous = readSlot(KEY);
      if (isUntouched(anonymous)) return own;

      window.localStorage.setItem(CLAIM_KEY, profileId);
      this.save(anonymous);
      return anonymous;
    } catch {
      return own;
    }
  }
}

function readSlot(key: string): ProgressState {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as ProgressState;
    // Forwards-compatible merge — a new field must never wipe his stickers.
    return { ...emptyProgress(), ...parsed, streak: { ...emptyStreak(), ...parsed.streak } };
  } catch {
    return emptyProgress();
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

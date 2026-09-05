import type { SkillId } from '@/curriculum/skills';

export interface LevelProgress {
  completed: boolean;
  attempts: number;
  hintsUsed: number;
  /** Fewest statements he has solved it in. Drives the efficiency bonus. */
  bestSize: number | null;
  /** Has he ever typed a line here himself rather than tapping it? */
  typedItHimself: boolean;
  /** Last code he had on screen, so he can pick up where he left off. */
  lastCode: string;
}

export interface MasteryRecord {
  attempts: number;
  successes: number;
  /** NZ calendar day, YYYY-MM-DD. */
  lastSeen: string;
}

export interface StreakState {
  /** NZ calendar day of his last session. */
  lastDay: string | null;
  count: number;
  best: number;
  /** Silent forgiveness. Spent automatically; he is never told off. */
  freezes: number;
}

export interface ProgressState {
  version: 1;
  agentName: string;
  hqName: string;
  xp: number;
  levels: Record<string, LevelProgress>;
  stickers: string[];
  clubCards: string[];
  streak: StreakState;
  mastery: Partial<Record<SkillId, MasteryRecord>>;
  /** Minutes per NZ day, for the parent view. */
  sessions: Record<string, number>;
  typedLines: number;
  createdAt: string;
  /**
   * When this state was last written, anywhere.
   *
   * Almost everything merges by taking the better of two values, but a few
   * fields have no "better" — his half-finished code on a level is just newer
   * or older. This is the tie-break for those.
   */
  updatedAt?: string;
}

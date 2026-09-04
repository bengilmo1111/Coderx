/**
 * XP and ranks — the loop Henry actually said motivates him.
 *
 * Bonuses are all for things we WANT more of: typing a line himself, solving
 * tightly, and taking Bolt's dare to go past the lesson.
 */

export interface Rank {
  name: string;
  at: number;
  glyph: string;
}

export const RANKS: Rank[] = [
  { name: 'Rookie', at: 0, glyph: '🐾' },
  { name: 'Sidekick', at: 100, glyph: '🦴' },
  { name: 'Agent', at: 300, glyph: '🕶️' },
  { name: 'Chief', at: 700, glyph: '🎖️' },
  { name: 'Legend', at: 1400, glyph: '🏆' },
];

export function rankFor(xp: number): Rank {
  let r = RANKS[0];
  for (const rank of RANKS) if (xp >= rank.at) r = rank;
  return r;
}

export function nextRank(xp: number): Rank | null {
  return RANKS.find((r) => r.at > xp) ?? null;
}

/** 0..1 through the current rank. */
export function rankProgress(xp: number): number {
  const now = rankFor(xp);
  const next = nextRank(xp);
  if (!next) return 1;
  return (xp - now.at) / (next.at - now.at);
}

export const BONUS = {
  /** Per line he typed himself instead of tapping. The keyboard ramp. */
  typedLine: 15,
  /** Solved in the same number of statements as the reference, or fewer. */
  tidy: 25,
  /** Took the "make it sillier" dare. This is the acceleration engine. */
  dare: 20,
  /** Solved without asking Bolt. Small — asking for help must never feel costly. */
  unaided: 10,
} as const;

export interface Award {
  label: string;
  xp: number;
}

export function awardsFor(opts: {
  base: number;
  typedLines: number;
  size: number;
  par: number;
  hintsUsed: number;
  tookDare: boolean;
  firstTime: boolean;
}): Award[] {
  const awards: Award[] = [{ label: opts.firstTime ? 'Level complete' : 'Replayed it', xp: opts.firstTime ? opts.base : Math.round(opts.base * 0.2) }];
  if (opts.typedLines > 0) awards.push({ label: `Typed ${opts.typedLines} line${opts.typedLines === 1 ? '' : 's'} yourself`, xp: BONUS.typedLine * opts.typedLines });
  if (opts.size <= opts.par) awards.push({ label: 'Tidy code', xp: BONUS.tidy });
  if (opts.hintsUsed === 0) awards.push({ label: 'No help needed', xp: BONUS.unaided });
  if (opts.tookDare) awards.push({ label: 'Took the dare', xp: BONUS.dare });
  return awards;
}

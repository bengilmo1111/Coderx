/**
 * What to offer him today.
 *
 * A CHOICE, never a queue. Being handed a list of three capers and picking one
 * is the difference between practice he chose and homework he was set, and that
 * difference is most of whether he comes back. So this returns a handful, and
 * the one he does not pick is not owed to anyone.
 *
 * The offer spans a band either side of where he is, which does two things at
 * once: he can reach for a harder one on a good day or an easier one on a tired
 * Tuesday, and the choosing tells us something no test could.
 *
 * PLACEHOLDER PICKING. The real scheduler — spaced repetition per skill, an
 * asymmetric promote/demote, difficulty aimed at about four wins in five — is
 * the next build, and it replaces the body of this function and nothing else.
 * Until then the band is a crude read of how far he has got.
 */

import { nzDay } from '@/progress/streak';
import type { ProgressState } from '@/progress/types';
import { allTemplates, generatedId } from './template';

/** Stable within a day, different tomorrow. Not security, just variety. */
function seedFor(day: string, n: number): number {
  let h = 2166136261;
  for (const ch of `${day}#${n}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 10_000;
}

/** Roughly where he is. Deliberately generous: too easy is the cheap mistake. */
export function bandFor(state: ProgressState): number {
  const done = Object.values(state.levels ?? {}).filter((l) => l?.completed).length;
  if (done >= 8) return 3;
  if (done >= 3) return 2;
  return 1;
}

/**
 * Two or three caper ids to choose between, or none at all if no template can
 * serve this band — in which case HQ simply shows the chapters, as it always did.
 */
export function suggestCapers(state: ProgressState, day = nzDay()): string[] {
  const centre = bandFor(state);
  const templates = allTemplates();
  const out: string[] = [];

  // Gentler, level, harder. A tired Tuesday and a Saturday morning are not the
  // same day, and he knows which one he is having better than we do.
  for (const band of [centre - 1, centre, centre + 1]) {
    const usable = templates.filter((t) => band >= t.bands[0] && band <= t.bands[1]);
    if (!usable.length) continue;
    const template = usable[seedFor(day, band) % usable.length];
    out.push(generatedId(template.id, { band, seed: seedFor(day, band + out.length * 31) }));
  }

  return out;
}

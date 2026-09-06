/**
 * He says what he learned, before Bolt does.
 *
 * "What did I learn?" has always been Bolt explaining and Henry listening, which
 * is the weaker half of the trade: having a go at naming the idea yourself does
 * far more than being told it, even when you name it wrong. So the button now
 * asks him first, and Bolt answers the answer.
 *
 * Only `code.*` skills ever appear here. The maths and the reading are the quiet
 * half of coderX and they stay quiet — he does not know he is doing them, and a
 * multiple choice offering "Times tables (groups of)" would end that in one tap.
 */

import { SKILLS, type SkillId } from './skills';
import type { Level } from './types';

export interface Choice {
  text: string;
  right: boolean;
}

/** Deterministic, so the same level offers the same three every time. */
function shuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    h = Math.imul(h ^ (h >>> 13), 16777619);
    const j = Math.abs(h) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const CODE_SKILLS = (Object.keys(SKILLS) as SkillId[]).filter((id) => id.startsWith('code.'));

/**
 * Three things he might have just learned, one of them true.
 *
 * Nothing if the level exercises no coding idea, or if there are not enough
 * other ideas to make a real choice — two options where one is obviously the
 * level you just played is a quiz he cannot get wrong, which teaches nothing.
 */
export function learnedChoices(level: Level): Choice[] {
  const mine = level.skills.filter((s): s is SkillId => s.startsWith('code.'));
  if (!mine.length) return [];

  const right = shuffle(mine, level.id)[0];
  const others = shuffle(
    CODE_SKILLS.filter((s) => !level.skills.includes(s)),
    level.id,
  ).slice(0, 2);
  if (others.length < 2) return [];

  return shuffle(
    [{ text: SKILLS[right].label, right: true }, ...others.map((s) => ({ text: SKILLS[s].label, right: false }))],
    `${level.id}-order`,
  );
}

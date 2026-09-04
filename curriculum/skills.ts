/**
 * The skill taxonomy.
 *
 * This is the quiet half of coderX. Henry never sees any of it — no level is
 * ever labelled "maths" — but every level declares what it exercises, progress
 * tracks mastery per skill, and the /grownups view turns that into a sentence
 * a parent can actually use.
 *
 * It's also the extension point: adding a maths or reading challenge type
 * later means adding rows here, not building a second app.
 */

export type SkillArea = 'code' | 'maths' | 'literacy';

export interface Skill {
  label: string;
  area: SkillArea;
  /** Roughly where this sits in NZ schooling, for the parent view. */
  year?: string;
}

const SKILL_DEFS = {
  'code.sequence': { label: 'Putting steps in the right order', area: 'code' },
  'code.parameters': { label: 'Changing what a command does', area: 'code' },
  'code.loops': { label: 'Repeating things with a loop', area: 'code' },
  'code.conditionals': { label: 'Deciding with if', area: 'code' },
  'code.debugging': { label: 'Finding and fixing a mistake', area: 'code' },

  'maths.position': { label: 'Position and grid coordinates', area: 'maths', year: 'Year 4' },
  'maths.counting': { label: 'Counting on accurately', area: 'maths', year: 'Year 3' },
  'maths.place-value': { label: 'Numbers to 100', area: 'maths', year: 'Year 4' },
  'maths.times-tables': { label: 'Times tables (groups of)', area: 'maths', year: 'Year 4' },
  'maths.skip-counting': { label: 'Skip counting in 2s and 3s', area: 'maths', year: 'Year 3' },
  'maths.logic': { label: 'True/false reasoning', area: 'maths', year: 'Year 4' },

  'literacy.comprehension': { label: 'Reading for instructions', area: 'literacy', year: 'Year 4' },
  'literacy.vocab': { label: 'New words', area: 'literacy', year: 'Year 4' },
  'literacy.composition': { label: 'Writing dialogue', area: 'literacy', year: 'Year 4' },
} as const satisfies Record<string, Skill>;

export type SkillId = keyof typeof SKILL_DEFS;

/** Re-typed to the wide `Skill` shape so optional fields like `year` stay visible. */
export const SKILLS: Record<SkillId, Skill> = SKILL_DEFS;

export function skillsByArea(ids: SkillId[]): Record<SkillArea, SkillId[]> {
  const out: Record<SkillArea, SkillId[]> = { code: [], maths: [], literacy: [] };
  for (const id of ids) out[SKILLS[id].area].push(id);
  return out;
}

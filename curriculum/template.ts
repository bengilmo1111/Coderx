/**
 * Levels that do not exist until they are asked for.
 *
 * Eighteen hand-written levels is the whole curriculum, and Henry finished
 * Chapter 1 in a sitting. Spacing a skill out over weeks, or pitching a caper at
 * where he actually is, needs variants to choose between — so a template takes a
 * difficulty band and a seed and emits a real `Level`, checked by the same test
 * that guarantees a hand-written one is solvable.
 *
 * THE GENERATOR COMBINES; IT DOES NOT INVENT. Every sentence, joke and title
 * here was written by a person. No model is involved in making content, which is
 * why the prose sounds like the rest of the game and why nothing can drift.
 *
 * The id IS the level. Progress is keyed by level id and synced between the
 * phone and the family computer, so a generated caper has to rebuild itself
 * identically from its id alone, on the server and in the browser, forever.
 * Nothing is stored.
 */

import type { SkillId } from './skills';
import type { Level } from './types';

export interface TemplateParams {
  /** Difficulty band, 1-5. The scheduler picks it; the child never sees it. */
  band: number;
  /** 0-9999. Two capers in the same band differ only by this. */
  seed: number;
}

export interface LevelTemplate {
  id: string;
  /** Every skill this template can exercise. The scheduler's index into it. */
  teaches: SkillId[];
  /** The bands it is sane at. Outside them, the scheduler picks another. */
  bands: [min: number, max: number];
  emit(p: TemplateParams, id: string): Level;
}

/** Generated ids look like `g-binrun-3-0417`. Distinct from `c1l3` and `workshop`. */
const ID = /^g-([a-z]+)-([1-5])-(\d{4})$/;

export function generatedId(templateId: string, p: TemplateParams): string {
  const band = Math.max(1, Math.min(5, Math.round(p.band)));
  const seed = Math.abs(Math.round(p.seed)) % 10_000;
  return `g-${templateId}-${band}-${String(seed).padStart(4, '0')}`;
}

export function parseGeneratedId(id: string): { templateId: string; params: TemplateParams } | null {
  const m = ID.exec(id);
  if (!m) return null;
  return { templateId: m[1], params: { band: Number(m[2]), seed: Number(m[3]) } };
}

const TEMPLATES: Record<string, LevelTemplate> = {};

export function registerTemplate(t: LevelTemplate): void {
  TEMPLATES[t.id] = t;
}

export function allTemplates(): LevelTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Rebuild a generated level from its id, or nothing if the id is not one.
 *
 * Pure and total: an unknown template or a band the template cannot do returns
 * undefined, which `getLevel` turns into a 404 rather than a broken caper.
 */
export function generatedLevel(id: string): Level | undefined {
  const parsed = parseGeneratedId(id);
  if (!parsed) return undefined;
  const template = TEMPLATES[parsed.templateId];
  if (!template) return undefined;
  const [min, max] = template.bands;
  if (parsed.params.band < min || parsed.params.band > max) return undefined;
  return template.emit(parsed.params, id);
}

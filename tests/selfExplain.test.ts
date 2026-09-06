import { describe, expect, it } from 'vitest';

import { ALL_LEVELS, getLevel } from '@/curriculum/levels';
import { learnedChoices } from '@/curriculum/selfExplain';
import { generatedId } from '@/curriculum/template';
import { SKILLS, type SkillId } from '@/curriculum/skills';

/**
 * The one thing this must never do is tell him he is doing maths.
 *
 * The quiet half of coderX is that every level is also arithmetic or reading,
 * and he does not know. A multiple choice offering "Times tables (groups of)"
 * would end that in a single tap, on the one screen where he reads carefully.
 */

const GENERATED = [1, 2, 3].map((band) => getLevel(generatedId('binrun', { band, seed: 7 }))!);
const EVERY_LEVEL = [...ALL_LEVELS, ...GENERATED];

const HIDDEN = (Object.keys(SKILLS) as SkillId[]).filter((s) => !s.startsWith('code.'));

describe('he is asked before Bolt answers', () => {
  it('offers a real choice on every level', () => {
    for (const level of EVERY_LEVEL) {
      const choices = learnedChoices(level);
      expect(choices.length, `${level.id} offers no choice`).toBe(3);
      expect(choices.filter((c) => c.right).length, `${level.id} has ${choices.filter((c) => c.right).length} right answers`).toBe(1);
      expect(new Set(choices.map((c) => c.text)).size, `${level.id} repeats an option`).toBe(3);
    }
  });

  it('never names the maths or the reading', () => {
    const forbidden = HIDDEN.map((s) => SKILLS[s].label);
    for (const level of EVERY_LEVEL) {
      for (const choice of learnedChoices(level)) {
        expect(forbidden, `${level.id} offered "${choice.text}"`).not.toContain(choice.text);
        expect(choice.text.toLowerCase()).not.toMatch(/maths|times table|counting|reading|vocab|spelling/);
      }
    }
  });

  it('marks an idea the level actually exercises as the right one', () => {
    for (const level of EVERY_LEVEL) {
      const right = learnedChoices(level).find((c) => c.right)!;
      const mine = level.skills
        .filter((s) => s.startsWith('code.'))
        .map((s) => SKILLS[s].label);
      expect(mine, `${level.id}: "${right.text}" is not one of its own`).toContain(right.text);
    }
  });

  it('never offers a wrong answer the level actually taught', () => {
    // A distractor he genuinely used would make being "wrong" a lie.
    for (const level of EVERY_LEVEL) {
      const mine = new Set(level.skills.map((s) => SKILLS[s]?.label));
      for (const choice of learnedChoices(level).filter((c) => !c.right)) {
        expect(mine.has(choice.text), `${level.id}: "${choice.text}" is marked wrong but is in the level`).toBe(false);
      }
    }
  });

  it('offers the same three every time, so it cannot be reshuffled into an answer', () => {
    for (const level of EVERY_LEVEL.slice(0, 5)) {
      expect(learnedChoices(level)).toEqual(learnedChoices(level));
    }
  });

  it('says nothing rather than something silly when there is no coding idea', () => {
    const level = { ...ALL_LEVELS[0], skills: ['maths.counting'] as SkillId[] };
    expect(learnedChoices(level)).toEqual([]);
  });
});

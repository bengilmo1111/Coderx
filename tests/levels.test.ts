import { describe, expect, it } from 'vitest';
import { ALL_LEVELS, referenceProgram } from '@/curriculum/chapter1/levels';
import { runProgram } from '@/runtime/run';
import { printSource } from '@/lang/printer';
import { SKILLS } from '@/curriculum/skills';
import { BRIDGE_CARDS } from '@/curriculum/bridgeCards';

/**
 * The single most important test in the repo: it is what stops an unsolvable
 * level reaching an 8-year-old who already thinks he is bad at this.
 */
describe('every level is solvable by its own reference solution', () => {
  for (const level of ALL_LEVELS) {
    it(`${level.id} — ${level.title}`, () => {
      const program = referenceProgram(level);
      const result = runProgram(program, level.makeWorld());

      expect(result.error, result.error?.boltSays ?? '').toBeUndefined();
      expect(level.goal({ world: result.finalWorld, saids: result.saids })).toBe(true);
    });
  }
});

describe('level metadata is coherent', () => {
  for (const level of ALL_LEVELS) {
    it(`${level.id} declares real skills, bricks and a matching par`, () => {
      expect(level.skills.length).toBeGreaterThan(0);
      for (const s of level.skills) expect(SKILLS[s]).toBeDefined();
      if (level.bridgeCard) expect(BRIDGE_CARDS[level.bridgeCard]).toBeDefined();
      expect(level.hints.length).toBeGreaterThanOrEqual(3);

      // par should equal the statement count of the reference solution.
      const count = (stmts: ReturnType<typeof referenceProgram>): number =>
        stmts.reduce((n, s) => n + 1 + ('body' in s ? count(s.body) : 0), 0);
      expect(count(referenceProgram(level))).toBe(level.par);
    });
  }
});

describe('the printer round-trips', () => {
  for (const level of ALL_LEVELS) {
    it(`${level.id} prints back to source that parses identically`, () => {
      const printed = printSource(referenceProgram(level));
      const reparsed = printSource(referenceProgram({ ...level, reference: printed }));
      expect(reparsed).toBe(printed);
    });
  }
});

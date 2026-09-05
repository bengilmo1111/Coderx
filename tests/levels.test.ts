import { describe, expect, it } from 'vitest';
import { ALL_LEVELS, referenceProgram } from '@/curriculum/chapter1/levels';
import { runProgram } from '@/runtime/run';
import { printSource } from '@/lang/printer';
import { parse } from '@/lang/parser';
import { countStmts } from '@/editor/program';
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
      expect(level.goal({ world: result.finalWorld, saids: result.saids, size: level.par })).toBe(true);
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

/**
 * The point of this build.
 *
 * Henry finished levels 5 and 6 without needing a loop or an if, because both
 * could be solved with a straight run of commands — level 5 goes in 9 plain
 * lines. The levels that exist to teach loops and conditionals were not
 * requiring them. Each entry below is a correct, loop-free solution: it must
 * bin everything AND be refused by the line budget.
 */
describe('the loop levels cannot be brute-forced', () => {
  const bruteForce: Record<string, string> = {
    c1l3: [
      'grab(sniff)', 'drop(sniff)', 'move(sniff, right, 2)',
      'grab(sniff)', 'drop(sniff)', 'move(sniff, right, 2)',
      'grab(sniff)', 'drop(sniff)',
    ].join('\n'),
    c1l4: [
      'grab(sniff)', 'move(sniff, right)', 'drop(sniff)', 'move(sniff, right)',
      'grab(sniff)', 'move(sniff, right)', 'drop(sniff)', 'move(sniff, right)',
      'grab(sniff)', 'move(sniff, right)', 'drop(sniff)',
    ].join('\n'),
    c1l5: [
      'grab(sniff)', 'drop(sniff)', 'move(sniff, right)', 'move(sniff, right)',
      'grab(sniff)', 'drop(sniff)', 'move(sniff, right)',
      'grab(sniff)', 'drop(sniff)',
    ].join('\n'),
    c1l6: [
      'grab(sniff)', 'drop(sniff)', 'move(sniff, right, 4)',
      'grab(sniff)', 'drop(sniff)', 'move(sniff, right, 4)',
      'grab(sniff)', 'drop(sniff)', 'say(sniff, "done")',
    ].join('\n'),
  };

  for (const [id, source] of Object.entries(bruteForce)) {
    it(`${id} refuses a correct but loop-free solution`, () => {
      const level = ALL_LEVELS.find((l) => l.id === id)!;
      const result = runProgram(parse(source), level.makeWorld());
      const size = countStmts(parse(source));

      expect(result.error, result.error?.boltSays ?? '').toBeUndefined();
      // It genuinely does the job...
      expect(level.goal({ world: result.finalWorld, saids: result.saids, size: 0 })).toBe(true);
      // ...but it is over the budget, so the level is not complete.
      expect(size).toBeGreaterThan(level.maxLines!);
      expect(level.goal({ world: result.finalWorld, saids: result.saids, size })).toBe(false);
    });
  }

  it('every reference solution fits inside its own budget', () => {
    for (const level of ALL_LEVELS) {
      if (!level.maxLines) continue;
      expect(countStmts(referenceProgram(level))).toBeLessThanOrEqual(level.maxLines);
    }
  });
});

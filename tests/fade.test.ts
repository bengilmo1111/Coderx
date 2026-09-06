import { describe, expect, it } from 'vitest';

import { ALL_LEVELS, getLevel, referenceProgram } from '@/curriculum/levels';
import { SANDBOX } from '@/curriculum/sandbox';
import { fadeStarter, RUNGS } from '@/curriculum/fade';
import { generatedId } from '@/curriculum/template';
import { scaffoldRung } from '@/progress/scaffold';
import { emptyProgress } from '@/progress/store';
import { countStmts } from '@/editor/program';
import { printSource } from '@/lang/printer';
import { parse } from '@/lang/parser';
import { runProgram } from '@/runtime/run';
import type { Level } from '@/curriculum/types';
import type { Program } from '@/lang/types';
import type { ProgressState } from '@/progress/types';

/**
 * The rule the whole mechanic rests on: a head start is never the answer.
 *
 * Arriving to a finished solution and pressing Run is worse than arriving to a
 * blank page — it teaches that the game plays itself, on the one screen where
 * the whole point is that he made it happen.
 */

const RUNG_LIST = [RUNGS.study, RUNGS.shell, RUNGS.solo, RUNGS.keyboard];

const GENERATED = [1, 2, 3].flatMap((band) =>
  [0, 617, 4242].map((seed) => getLevel(generatedId('binrun', { band, seed }))!),
);

const EVERY_LEVEL: Level[] = [...ALL_LEVELS, ...GENERATED];

/** The same cap the fader verifies under: a starter must settle quickly. */
const STARTER_STEPS = 2_000;

function play(level: Level, program: Program) {
  return runProgram(program, level.makeWorld(), {
    commandable: level.commandable ?? ['sniff'],
    maxSteps: STARTER_STEPS,
  });
}

function solves(level: Level, program: Program): boolean {
  const result = play(level, program);
  if (result.error) return false;
  return level.goal({ world: result.finalWorld, saids: result.saids, size: countStmts(program) });
}

describe('a starter never solves the level', () => {
  for (const rung of RUNG_LIST) {
    it(`rung ${rung} leaves something to do, on every level`, () => {
      for (const level of EVERY_LEVEL) {
        const starter = fadeStarter(level, rung);
        expect(solves(level, starter), `${level.id} at rung ${rung} arrives already finished`).toBe(false);
      }
    });
  }

  it('is always strictly less than the whole answer', () => {
    for (const level of EVERY_LEVEL) {
      const full = countStmts(referenceProgram(level));
      for (const rung of RUNG_LIST) {
        expect(countStmts(fadeStarter(level, rung)), `${level.id} rung ${rung}`).toBeLessThan(full);
      }
    }
  });

  it('gives less help the higher he climbs', () => {
    for (const level of EVERY_LEVEL) {
      const sizes = RUNG_LIST.map((r) => countStmts(fadeStarter(level, r)));
      for (let i = 1; i < sizes.length; i += 1) {
        expect(sizes[i], `${level.id}: rung ${RUNG_LIST[i]} helps more than ${RUNG_LIST[i - 1]}`)
          .toBeLessThanOrEqual(sizes[i - 1]);
      }
      // And the top of the ladder is the blank page every level used to give.
      expect(sizes[sizes.length - 1]).toBe(0);
    }
  });
});

describe('a starter is real, runnable code', () => {
  it('prints and parses back to itself, with no gaps to fill', () => {
    for (const level of EVERY_LEVEL) {
      for (const rung of [RUNGS.study, RUNGS.shell]) {
        const printed = printSource(fadeStarter(level, rung));
        if (!printed.trim()) continue;
        // A hole prints as ▢, which the tokeniser then refuses — so a starter
        // carrying one would be a level he cannot even run.
        expect(printed, `${level.id} rung ${rung}`).not.toContain('▢');
        expect(printSource(parse(printed)), `${level.id} rung ${rung} round-trip`).toBe(printed);
      }
    }
  });

  it('does not crash the interpreter', () => {
    for (const level of EVERY_LEVEL) {
      for (const rung of RUNG_LIST) {
        expect(() => play(level, fadeStarter(level, rung))).not.toThrow();
      }
    }
  });

  it('never hands him a program that runs away before he touches it', () => {
    // Chapter 2 is built on `repeatUntil dragonBeaten()`. An empty one never
    // beats the dragon, so it spins to the step budget and looks broken on
    // arrival — which is how this rule got written.
    for (const level of EVERY_LEVEL) {
      for (const rung of RUNG_LIST) {
        const starter = fadeStarter(level, rung);
        if (!starter.length) continue;
        expect(play(level, starter).steps, `${level.id} rung ${rung} runs away`).toBeLessThan(STARTER_STEPS);
      }
    }
  });
});

describe('the Workshop is left alone', () => {
  it('never puts a half-written program in free play', () => {
    // The one place with nothing to get wrong. A starter there is a suggestion,
    // and a suggestion is a thing to fail at.
    for (const rung of RUNG_LIST) expect(fadeStarter(SANDBOX, rung)).toEqual([]);
  });
});

describe('picking the rung', () => {
  const withMastery = (successes: number, over: Partial<ProgressState> = {}): ProgressState => ({
    ...emptyProgress(),
    mastery: { 'code.loops': { attempts: successes, successes, lastSeen: '2026-09-06' } },
    ...over,
  });

  it('starts a brand new player with a head start, not a blank page', () => {
    expect(scaffoldRung(emptyProgress(), ['code.loops'])).toBe(RUNGS.study);
  });

  it('climbs as the skill lands', () => {
    expect(scaffoldRung(withMastery(1), ['code.loops'])).toBe(RUNGS.study);
    expect(scaffoldRung(withMastery(2), ['code.loops'])).toBe(RUNGS.shell);
    expect(scaffoldRung(withMastery(4), ['code.loops'])).toBe(RUNGS.solo);
  });

  it('opens the keyboard once he is already reaching for it', () => {
    expect(scaffoldRung(withMastery(4, { typedLines: 9 }), ['code.loops'])).toBe(RUNGS.solo);
    expect(scaffoldRung(withMastery(4, { typedLines: 10 }), ['code.loops'])).toBe(RUNGS.keyboard);
  });

  it('pitches at the skill he is least sure of', () => {
    const state: ProgressState = {
      ...emptyProgress(),
      mastery: {
        'code.sequence': { attempts: 20, successes: 20, lastSeen: '2026-09-06' },
        'code.conditionals': { attempts: 1, successes: 0, lastSeen: '2026-09-06' },
      },
    };
    // Fluent at one, new to the other: the head start is for the hard part.
    expect(scaffoldRung(state, ['code.sequence', 'code.conditionals'])).toBe(RUNGS.study);
  });

  it('never demotes him for a bad fortnight', () => {
    // Attempts pile up, successes do not. He must not be handed MORE help than
    // he had yesterday — that reads as "we decided you could not do it".
    const good = withMastery(5);
    const rough: ProgressState = {
      ...good,
      mastery: { 'code.loops': { attempts: 40, successes: 5, lastSeen: '2026-09-06' } },
      levels: { c1l3: { completed: false, attempts: 12, hintsUsed: 9, bestSize: null, typedItHimself: false, lastCode: '' } },
    };
    expect(scaffoldRung(rough, ['code.loops'])).toBe(scaffoldRung(good, ['code.loops']));
  });

  it('leaves a level with no coding skill on the blank page', () => {
    expect(scaffoldRung(emptyProgress(), ['maths.counting'])).toBe(RUNGS.solo);
  });
});

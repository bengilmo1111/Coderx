import { describe, expect, it } from 'vitest';

import { ALL_LEVELS, getLevel, referenceProgram } from '@/curriculum/levels';
import { SANDBOX } from '@/curriculum/sandbox';
import { callItVerdict, predictionFor } from '@/curriculum/predict';
import { generatedId } from '@/curriculum/template';
import { runProgram } from '@/runtime/run';
import type { Level } from '@/curriculum/types';

/**
 * Call It has to be honest or it is worse than nothing.
 *
 * The answer he is marked against comes from the same run he then watches, so
 * the two can never disagree — but the option he needed has to have been on
 * screen in the first place, or being right was impossible and the mechanic is
 * a trap.
 */

const GENERATED = [1, 2, 3].map((band) => getLevel(generatedId('binrun', { band, seed: 99 }))!);
const EVERY_LEVEL: Level[] = [...ALL_LEVELS, ...GENERATED];

function truthFor(level: Level) {
  const result = runProgram(referenceProgram(level), level.makeWorld(), {
    commandable: level.commandable ?? ['sniff'],
  });
  return predictionFor(level)!.from({ world: result.finalWorld, saids: result.saids });
}

describe('the question is derived, not authored', () => {
  it('reaches every level with something worth guessing', () => {
    const asked = ALL_LEVELS.filter((l) => predictionFor(l));
    // Every hand-written level either counts rubbish or fights something, so
    // deriving the question covers the lot without a word of content written.
    expect(asked.length).toBe(ALL_LEVELS.length);
  });

  it('covers generated capers too', () => {
    for (const level of GENERATED) expect(predictionFor(level), level.id).not.toBeNull();
  });

  it('says nothing in the Workshop', () => {
    // Free play has no right answer. Asking for one would invent a way to be
    // wrong on the one screen built so there isn't one.
    expect(predictionFor(SANDBOX)).toBeNull();
  });

  it('lets a level ask its own question instead', () => {
    const custom = {
      ...ALL_LEVELS[0],
      predict: { question: 'Where does he stop?', options: ['a', 'b'], from: () => 'a' },
    } as Level;
    expect(predictionFor(custom)?.question).toBe('Where does he stop?');
  });
});

describe('the right answer is always on screen', () => {
  it('offers the option the correct solution produces', () => {
    for (const level of EVERY_LEVEL) {
      const prediction = predictionFor(level);
      if (!prediction) continue;
      expect(prediction.options, `${level.id} cannot be answered correctly`).toContain(truthFor(level));
    }
  });

  it('offers few enough to tap without reading hard', () => {
    for (const level of EVERY_LEVEL) {
      const prediction = predictionFor(level);
      if (!prediction) continue;
      expect(prediction.options.length, level.id).toBeGreaterThanOrEqual(2);
      expect(prediction.options.length, level.id).toBeLessThanOrEqual(9);
      expect(new Set(prediction.options).size, `${level.id} repeats an option`).toBe(prediction.options.length);
    }
  });

  it('marks a wrong run wrong, and a right run right', () => {
    const level = ALL_LEVELS.find((l) => l.id === 'c1l1')!;
    const prediction = predictionFor(level)!;
    // Doing nothing bins nothing.
    const idle = runProgram([], level.makeWorld(), { commandable: level.commandable ?? ['sniff'] });
    expect(prediction.from({ world: idle.finalWorld, saids: idle.saids })).toBe('0');
    expect(truthFor(level)).toBe('1');
  });
});

describe('being wrong costs nothing', () => {
  it('is warm about a miss, and warmest about a near miss', () => {
    // A boy who stops guessing has stopped predicting, which was the point. So
    // the near miss gets the kindest line of the three.
    expect(callItVerdict('3', '3')).toMatch(/called it/i);
    expect(callItVerdict('2', '3')).toMatch(/so close/i);
    expect(callItVerdict('0', '3')).toMatch(/now you know/i);
  });

  it('never scolds, never compares, never says wrong', () => {
    for (const [called, actual] of [['0', '3'], ['3', '0'], ['2', '3'], ['Yes', 'No'], ['No', 'Yes']]) {
      const said = callItVerdict(called, actual).toLowerCase();
      // "No" is a legitimate answer here, so only a leading scold counts.
      expect(said).not.toMatch(/^(no|nope)\b/);
      expect(said).not.toMatch(/wrong|incorrect|fail|should have|try harder|bad|not quite right/);
    }
  });

  it('handles a yes/no call without pretending it is a number', () => {
    expect(callItVerdict('Yes', 'No')).toMatch(/now you know/i);
    expect(callItVerdict('Yes', 'Yes')).toMatch(/called it/i);
  });
});

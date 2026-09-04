import { describe, expect, it } from 'vitest';
import { describeWorld, describeOutcome, simulate } from '@/lib/tutorContext';
import { getLevel } from '@/curriculum/chapter1/levels';

/**
 * Bolt told Henry that a correct solution had "only covered three squares" and
 * suggested moving down on a board with one row. He had the level title and
 * nothing else, so he was guessing. These cover the grounding that fixes it.
 */
describe('the tutor knows what actually happened', () => {
  const level = getLevel('c1l3')!;

  it('recognises the correct solution as correct', () => {
    const sim = simulate(level, level.reference);
    expect(sim.ran).toBe(true);
    expect(sim.solved).toBe(true);
    expect(describeOutcome(sim)).toMatch(/ALREADY SOLVES/);
  });

  it('reports a near miss without claiming it works', () => {
    // Two lots of two is four squares, not six.
    const sim = simulate(level, 'grab(sniff)\nrepeat 2 {\n  move(sniff, right, 2)\n}\ndrop(sniff)');
    expect(sim.solved).toBe(false);
    expect(sim.binned).toBe(0);
    expect(sim.endedAt).toBe(4);
    expect(describeOutcome(sim)).toMatch(/does not solve/);
  });

  it('passes on the error when the code walks into the fence', () => {
    const sim = simulate(getLevel('c1l1')!, 'move(sniff, left)');
    expect(sim.solved).toBe(false);
    expect(sim.error).toMatch(/fence/);
  });

  it('handles code it cannot even read, rather than throwing', () => {
    const sim = simulate(level, 'repeat 3\n  move(sniff, right)');
    expect(sim.ran).toBe(false);
    expect(describeOutcome(sim)).toMatch(/cannot run yet/);
  });

  it('handles an empty program', () => {
    expect(describeOutcome(simulate(level, ''))).toMatch(/not written anything/);
  });

  it('describes the board factually, including that it is one row', () => {
    const text = describeWorld(level.makeWorld());
    expect(text).toContain('8 squares wide');
    expect(text).toMatch(/only left and right matter/);
    expect(text).toMatch(/Bins are at column\(s\): 6/);
    expect(text).toMatch(/"sniff"/);
  });

  it('describes every level without blowing up', () => {
    for (const id of ['c1l1', 'c1l2', 'c1l3', 'c1l4', 'c1l5', 'c1l6']) {
      const l = getLevel(id)!;
      expect(describeWorld(l.makeWorld()).length).toBeGreaterThan(40);
      expect(simulate(l, l.reference).solved).toBe(true);
    }
  });
});

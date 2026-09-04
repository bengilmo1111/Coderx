import { describe, expect, it } from 'vitest';
import { parse } from '@/lang/parser';
import { printSource } from '@/lang/printer';
import { CoderXError } from '@/lang/errors';
import { runProgram } from '@/runtime/run';
import { buildWorld } from '@/runtime/world';
import { hole, type Program } from '@/lang/types';

const street = () =>
  buildWorld({
    grid: ['.....', '---B.', '.....'],
    sprites: { sniff: { character: 'sniff', x: 0, y: 1 } },
    rubbish: [{ x: 1, y: 1 }],
  });

describe('parser', () => {
  it('parses nested repeat and if', () => {
    const p = parse(`repeat 2 {
  if rubbishHere(sniff) {
    grab(sniff)
  }
  move(sniff, right, 3)
}`);
    expect(printSource(p)).toContain('if rubbishHere(sniff) {');
    expect(printSource(p)).toContain('move(sniff, right, 3)');
  });

  it('complains about a missing squiggly gate in words a child can act on', () => {
    try {
      parse('repeat 3\n  move(sniff, right)\n');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(CoderXError);
      const err = e as CoderXError;
      expect(err.boltSays).toMatch(/squiggly gate/);
      expect(err.boltSays).not.toMatch(/SyntaxError|token|undefined/i);
      expect(err.tryThis).toBeTruthy();
    }
  });

  it('complains about an unclosed bracket', () => {
    expect(() => parse('move(sniff, right')).toThrow(/never gets closed/);
  });
});

describe('interpreter', () => {
  it('stops a forever-loop instead of freezing the computer', () => {
    // repeat 100 { repeat 100 { bark } } = 10,000 barks, budget of 50.
    const p = parse('repeat 100 {\n  repeat 100 {\n    bark(sniff)\n  }\n}');
    const r = runProgram(p, street(), { maxSteps: 50 });
    expect(r.error?.boltSays).toMatch(/stuck in a loop forever/);
    // Frames up to the bang are kept, so the animation still plays.
    expect(r.frames.length).toBeGreaterThan(0);
  });

  it('refuses to run an empty hole, and says which one', () => {
    const program: Program = [
      { kind: 'call', id: 'c1', name: 'move', args: [{ kind: 'ident', name: 'sniff' }, hole('direction', 'which way?')] },
    ];
    const r = runProgram(program, street());
    expect(r.error?.boltSays).toMatch(/which way\?/);
  });

  it('walks into the fence as a story, not a crash', () => {
    const r = runProgram(parse('move(sniff, left)'), street());
    expect(r.error?.boltSays).toMatch(/bonked straight into the fence/);
  });

  it('runs a real solution and bins the rubbish', () => {
    const r = runProgram(
      parse('move(sniff, right)\ngrab(sniff)\nmove(sniff, right, 2)\ndrop(sniff)'),
      street(),
    );
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.binned).toBe(1);
  });

  it('records what was said, so a level can require writing', () => {
    const r = runProgram(parse('say(sniff, "kia ora")'), street());
    expect(r.saids).toEqual(['kia ora']);
  });

  it('emits one frame per executed statement', () => {
    const r = runProgram(parse('bark(sniff)\nbark(sniff)\nbark(sniff)'), street());
    expect(r.frames).toHaveLength(3);
  });
});

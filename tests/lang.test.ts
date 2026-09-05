import { describe, expect, it } from 'vitest';
import { parse } from '@/lang/parser';
import { printSource } from '@/lang/printer';
import { CoderXError } from '@/lang/errors';
import { runProgram } from '@/runtime/run';
import { buildWorld } from '@/runtime/world';
import { hole, type Program } from '@/lang/types';

const street = () =>
  buildWorld({
    grid: ['---B.'],
    sprites: { sniff: { character: 'sniff', x: 0, y: 0 } },
    rubbish: [{ x: 1, y: 0 }],
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

/**
 * Nan and Weka stand on the board so they stop being only words in a briefing,
 * but they are scenery with opinions, not units to order about.
 */
describe('characters who take no orders', () => {
  const street = () =>
    buildWorld({
      grid: ['---B-'],
      sprites: {
        sniff: { character: 'sniff', x: 0, y: 0 },
        nan: { character: 'nan', x: 4, y: 0 },
      },
      rubbish: [{ x: 1, y: 0 }],
    });

  it('refuses an order aimed at a bystander, and says who to ask instead', () => {
    const r = runProgram(parse('move(nan, left)'), street(), { commandable: ['sniff'] });
    expect(r.error?.boltSays).toMatch(/Nan McSnap does not take orders/);
    expect(r.error?.tryThis).toMatch(/sniff/);
  });

  it('still lets the hero move', () => {
    const r = runProgram(parse('move(sniff, right)'), street(), { commandable: ['sniff'] });
    expect(r.error).toBeUndefined();
  });

  it('lets both heroes move when both are commandable', () => {
    const r = runProgram(parse('move(sniff, right)\nmove(nan, left)'), street(), {
      commandable: ['sniff', 'nan'],
    });
    expect(r.error).toBeUndefined();
  });
});

/**
 * Chapter 2 language: variables and a real while loop. Both come straight out
 * of Henry's own story idea — counting the weapons you have collected, and
 * keeping at the dragon until it gives up.
 */
describe('variables and repeatUntil', () => {
  const street = () =>
    buildWorld({
      grid: ['-----'],
      sprites: { sniff: { character: 'sniff', x: 0, y: 0 } },
    });

  it('sets a variable and counts up with it', () => {
    const p = parse('set swords = 0\nset swords = swords + 1\nset swords = swords + 1');
    expect(printSource(p)).toBe('set swords = 0\nset swords = swords + 1\nset swords = swords + 1');
    const r = runProgram(p, street());
    expect(r.error).toBeUndefined();
    expect(r.frames.at(-1)!.vars.swords).toBe(2);
  });

  it('repeats a variable number of times', () => {
    const r = runProgram(parse('set n = 3\nrepeat n {\n  bark(sniff)\n}'), street());
    expect(r.error).toBeUndefined();
    // one set, one repeat header, three barks
    expect(r.frames.filter((f) => f.effects.some((e) => e.kind === 'pow'))).toHaveLength(3);
  });

  it('keeps a name that is not a variable working as itself', () => {
    // `sniff` and `right` must still mean sniff and right, not undefined.
    const r = runProgram(parse('set n = 1\nmove(sniff, right, n)'), street());
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.sniff.x).toBe(1);
  });

  it('compares numbers', () => {
    const r = runProgram(parse('set n = 3\nif n > 2 {\n  bark(sniff)\n}'), street());
    expect(r.frames.some((f) => f.effects.some((e) => e.kind === 'pow'))).toBe(true);
    const quiet = runProgram(parse('set n = 1\nif n > 2 {\n  bark(sniff)\n}'), street());
    expect(quiet.frames.some((f) => f.effects.some((e) => e.kind === 'pow'))).toBe(false);
  });

  it('runs repeatUntil until the condition comes true', () => {
    const r = runProgram(
      parse('set n = 0\nrepeatUntil n == 3 {\n  set n = n + 1\n  bark(sniff)\n}'),
      street(),
    );
    expect(r.error).toBeUndefined();
    expect(r.frames.at(-1)!.vars.n).toBe(3);
    expect(r.frames.filter((f) => f.effects.some((e) => e.kind === 'pow'))).toHaveLength(3);
  });

  it('does not run the body at all when the condition is already true', () => {
    const r = runProgram(parse('set n = 5\nrepeatUntil n > 2 {\n  bark(sniff)\n}'), street());
    expect(r.frames.some((f) => f.effects.some((e) => e.kind === 'pow'))).toBe(false);
  });

  it('stops a repeatUntil that never comes true, instead of hanging', () => {
    const r = runProgram(parse('set n = 0\nrepeatUntil n == 3 {\n  bark(sniff)\n}'), street(), {
      maxSteps: 200,
    });
    expect(r.error?.boltSays).toMatch(/stuck in a loop forever/);
  });

  it('complains about a missing = in words he can act on', () => {
    expect(() => parse('set swords 0')).toThrow(/needs an = after the name/);
  });
});

/**
 * Chapter 3's headline: a command he made himself. He used the word "function"
 * unprompted after run 1, and once defined the name turns into a brick he can
 * tap — which is what a function actually is.
 */
describe('commands he defines himself', () => {
  const yard = () =>
    buildWorld({
      grid: ['-----', '-----', '-----'],
      sprites: { bolt: { character: 'bolt', x: 0, y: 0, mode: 'robot' } },
    });

  it('runs the body when the name is called', () => {
    const r = runProgram(parse('define hop {\n  move(bolt, right)\n}\nhop()\nhop()'), yard());
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt.x).toBe(2);
  });

  it('prints back as real code', () => {
    const src = 'define hop {\n  move(bolt, right)\n}\nhop()';
    expect(printSource(parse(src))).toBe(src);
  });

  it('works even when defined after it is used', () => {
    const r = runProgram(parse('hop()\ndefine hop {\n  move(bolt, down)\n}'), yard());
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt.y).toBe(1);
  });

  it('lets one of his commands use another', () => {
    const r = runProgram(
      parse('define step {\n  move(bolt, right)\n}\ndefine twice {\n  step()\n  step()\n}\ntwice()'),
      yard(),
    );
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt.x).toBe(2);
  });

  it('works inside a loop', () => {
    const r = runProgram(parse('define hop {\n  move(bolt, right)\n}\nrepeat 3 {\n  hop()\n}'), yard());
    expect(r.finalWorld.sprites.bolt.x).toBe(3);
  });

  it('stops a command that calls itself, with words he can act on', () => {
    const r = runProgram(parse('define loopy {\n  loopy()\n}\nloopy()'), yard());
    expect(r.error?.boltSays).toMatch(/keeps calling itself/);
    expect(r.error?.tryThis).toMatch(/cannot use itself forever/);
  });

  it('still reaches the built-in commands', () => {
    const r = runProgram(parse('define go {\n  move(bolt, right, 2)\n}\ngo()\nmove(bolt, down)'), yard());
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt).toMatchObject({ x: 2, y: 1 });
  });
});

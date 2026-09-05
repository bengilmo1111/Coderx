import { describe, expect, it } from 'vitest';
import { BRICKS } from '@/editor/bricks';
import { insertStmt, removeStmt, moveStmt, wrapStmt, setArg, countStmts, firstHole } from '@/editor/program';
import { printSource } from '@/lang/printer';
import { parse } from '@/lang/parser';
import type { Program } from '@/lang/types';

/**
 * These cover the insertion rules, which are the whole tap-to-code interaction.
 * If tapping "repeat" then tapping "move" doesn't put move INSIDE the repeat,
 * an 8-year-old is stuck with no idea why.
 */
describe('tapping bricks builds the tree he expects', () => {
  it('appends when nothing is selected', () => {
    let p: Program = [];
    p = insertStmt(p, null, BRICKS.grab.make());
    p = insertStmt(p, null, BRICKS.drop.make());
    expect(printSource(p)).toBe('grab(sniff)\ndrop(sniff)');
  });

  it('puts a brick INSIDE when the repeat header is selected', () => {
    let p: Program = [];
    const repeat = BRICKS.repeat.make();
    p = insertStmt(p, null, repeat);
    p = insertStmt(p, { stmtId: repeat.id, closer: false }, BRICKS.grab.make());
    expect(printSource(p)).toBe('repeat ▢ {\n  grab(sniff)\n}');
  });

  it('puts a brick AFTER the block when the closing brace is selected', () => {
    let p: Program = [];
    const repeat = BRICKS.repeat.make();
    p = insertStmt(p, null, repeat);
    p = insertStmt(p, { stmtId: repeat.id, closer: false }, BRICKS.grab.make());
    p = insertStmt(p, { stmtId: repeat.id, closer: true }, BRICKS.drop.make());
    expect(printSource(p)).toBe('repeat ▢ {\n  grab(sniff)\n}\ndrop(sniff)');
  });

  it('inserts after a plain line, not at the end', () => {
    let p: Program = [];
    const a = BRICKS.grab.make();
    p = insertStmt(p, null, a);
    p = insertStmt(p, null, BRICKS.drop.make());
    p = insertStmt(p, { stmtId: a.id, closer: false }, BRICKS.bark.make());
    expect(printSource(p)).toBe('grab(sniff)\nbark(sniff)\ndrop(sniff)');
  });

  it('nests two levels deep', () => {
    let p: Program = [];
    const outer = BRICKS.repeat.make();
    const inner = BRICKS['if-rubbish'].make();
    p = insertStmt(p, null, outer);
    p = insertStmt(p, { stmtId: outer.id, closer: false }, inner);
    p = insertStmt(p, { stmtId: inner.id, closer: false }, BRICKS.grab.make());
    expect(printSource(p)).toBe(
      'repeat ▢ {\n  if rubbishHere(sniff) {\n    grab(sniff)\n  }\n}',
    );
  });
});

describe('editing', () => {
  it('fills a hole with a real value', () => {
    let p: Program = [];
    const r = BRICKS.repeat.make();
    p = insertStmt(p, null, r);
    expect(firstHole(p)).toEqual({ stmtId: r.id, index: 'count' });
    p = setArg(p, r.id, 'count', { kind: 'num', value: 3 });
    expect(printSource(p)).toBe('repeat 3 {\n}');
    expect(firstHole(p)).toBeNull();
  });

  it('finds a hole nested inside a block', () => {
    let p: Program = [];
    const r = BRICKS.repeat.make();
    p = insertStmt(p, null, r);
    p = setArg(p, r.id, 'count', { kind: 'num', value: 2 });
    const m = BRICKS.move.make();
    p = insertStmt(p, { stmtId: r.id, closer: false }, m);
    expect(firstHole(p)).toEqual({ stmtId: m.id, index: 1 });
  });

  it('deletes a nested statement without touching its neighbours', () => {
    const p = parse('repeat 2 {\n  grab(sniff)\n  bark(sniff)\n}');
    const bark = (p[0] as never as { body: { id: string }[] }).body[1];
    expect(printSource(removeStmt(p, bark.id))).toBe('repeat 2 {\n  grab(sniff)\n}');
  });

  it('nudges a line up and down within its own block', () => {
    const p = parse('grab(sniff)\nbark(sniff)');
    expect(printSource(moveStmt(p, p[1].id, -1))).toBe('bark(sniff)\ngrab(sniff)');
    expect(printSource(moveStmt(p, p[0].id, -1))).toBe('grab(sniff)\nbark(sniff)'); // no-op at the top
  });

  it('counts statements for the tidy-code bonus', () => {
    expect(countStmts(parse('repeat 3 {\n  move(sniff, right)\n}\ndrop(sniff)'))).toBe(3);
  });
});

/**
 * Henry, after playing: "you should be able to move bricks into the function,
 * rather than have to know to write repeat first and then add move."
 *
 * The old moveStmt could only swap within one block, so moving a line into a
 * repeat was not hidden — it was impossible. These cover every way in and out.
 */
describe('moving a line in and out of a block', () => {
  const ids = (p: Program) => p.map((s) => s.id);

  it('moves DOWN into the block below, as its first line', () => {
    const p = parse('grab(sniff)\nrepeat 3 {\n  bark(sniff)\n}');
    expect(printSource(moveStmt(p, ids(p)[0], 1))).toBe(
      'repeat 3 {\n  grab(sniff)\n  bark(sniff)\n}',
    );
  });

  it('moves UP into the block above, as its last line', () => {
    const p = parse('repeat 3 {\n  bark(sniff)\n}\ngrab(sniff)');
    expect(printSource(moveStmt(p, ids(p)[1], -1))).toBe(
      'repeat 3 {\n  bark(sniff)\n  grab(sniff)\n}',
    );
  });

  it('moves OUT of the bottom of a block', () => {
    const p = parse('repeat 3 {\n  bark(sniff)\n  grab(sniff)\n}');
    const inner = (p[0] as never as { body: { id: string }[] }).body[1];
    expect(printSource(moveStmt(p, inner.id, 1))).toBe(
      'repeat 3 {\n  bark(sniff)\n}\ngrab(sniff)',
    );
  });

  it('moves OUT of the top of a block', () => {
    const p = parse('repeat 3 {\n  grab(sniff)\n  bark(sniff)\n}');
    const inner = (p[0] as never as { body: { id: string }[] }).body[0];
    expect(printSource(moveStmt(p, inner.id, -1))).toBe(
      'grab(sniff)\nrepeat 3 {\n  bark(sniff)\n}',
    );
  });

  it('still swaps two plain lines inside a block', () => {
    const p = parse('repeat 3 {\n  grab(sniff)\n  bark(sniff)\n}');
    const inner = (p[0] as never as { body: { id: string }[] }).body[0];
    expect(printSource(moveStmt(p, inner.id, 1))).toBe(
      'repeat 3 {\n  bark(sniff)\n  grab(sniff)\n}',
    );
  });

  it('walks a line all the way in and all the way back out again', () => {
    const start = 'grab(sniff)\nrepeat 2 {\n  if rubbishHere(sniff) {\n    bark(sniff)\n  }\n}';
    let p = parse(start);
    const target = ids(p)[0];
    p = moveStmt(p, target, 1); // into the repeat
    p = moveStmt(p, target, 1); // into the if
    expect(printSource(p)).toBe(
      'repeat 2 {\n  if rubbishHere(sniff) {\n    grab(sniff)\n    bark(sniff)\n  }\n}',
    );
    p = moveStmt(p, target, -1); // back out of the if
    p = moveStmt(p, target, -1); // back out of the repeat
    expect(printSource(p)).toBe(start);
  });

  it('does nothing at the very top and very bottom of the program', () => {
    const p = parse('grab(sniff)\nbark(sniff)');
    expect(moveStmt(p, ids(p)[0], -1)).toBe(p);
    expect(moveStmt(p, ids(p)[1], 1)).toBe(p);
  });

  it('leaves the program alone when the id is unknown', () => {
    const p = parse('grab(sniff)');
    expect(moveStmt(p, 'nope', 1)).toBe(p);
  });
});

describe('wrapping a line in a block', () => {
  it('puts the selected line inside the new repeat', () => {
    const p = parse('grab(sniff)\nbark(sniff)');
    const wrapped = wrapStmt(p, p[0].id, BRICKS.repeat.make());
    expect(printSource(wrapped)).toBe('repeat ▢ {\n  grab(sniff)\n}\nbark(sniff)');
  });

  it('wraps a line that is already nested', () => {
    const p = parse('repeat 2 {\n  grab(sniff)\n}');
    const inner = (p[0] as never as { body: { id: string }[] }).body[0];
    const wrapped = wrapStmt(p, inner.id, BRICKS['if-rubbish'].make());
    expect(printSource(wrapped)).toBe(
      'repeat 2 {\n  if rubbishHere(sniff) {\n    grab(sniff)\n  }\n}',
    );
  });

  it('refuses to wrap in something that is not a block', () => {
    const p = parse('grab(sniff)');
    expect(wrapStmt(p, p[0].id, BRICKS.bark.make())).toBe(p);
  });
});

import { describe, expect, it } from 'vitest';
import { parse } from '@/lang/parser';
import { runProgram } from '@/runtime/run';
import { buildWorld } from '@/runtime/world';

/**
 * Chapter 3 moves off the single street onto a grid, and gives Bolt shapes to
 * change into. Each mode is one rule, and each rule is what makes a square
 * passable or not — which is the whole reason the grid is a puzzle rather than
 * simply bigger.
 */
const yard = (grid: string[], mode: 'robot' | 'drill' | 'jet' | 'magnet' = 'robot', items: { x: number; y: number }[] = []) =>
  buildWorld({
    grid,
    sprites: { bolt: { character: 'bolt', x: 0, y: 0, mode } },
    items: items.map((i) => ({ ...i, kind: 'sword' as const })),
  });

describe('moving on a grid', () => {
  it('goes up and down as well as left and right', () => {
    const r = runProgram(parse('move(bolt, down, 2)\nmove(bolt, right, 3)\nmove(bolt, up)'), yard(['-----', '-----', '-----']));
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt).toMatchObject({ x: 3, y: 1 });
  });

  it('stops at the edge of the grid in every direction', () => {
    expect(runProgram(parse('move(bolt, up)'), yard(['---', '---'])).error?.boltSays).toMatch(/fence/);
    expect(runProgram(parse('move(bolt, down, 5)'), yard(['---', '---'])).error?.boltSays).toMatch(/fence/);
  });
});

describe('drill mode', () => {
  const walled = (mode: 'robot' | 'drill') => yard(['-W-', '---'], mode);

  it('a robot cannot walk through a wall, and is told what would', () => {
    const r = runProgram(parse('move(bolt, right)'), walled('robot'));
    expect(r.error?.boltSays).toMatch(/solid wall/);
    expect(r.error?.tryThis).toMatch(/drill/);
  });

  it('a drill goes through, and the wall stays gone', () => {
    const r = runProgram(parse('move(bolt, right, 2)'), walled('drill'));
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt.x).toBe(2);
    expect(r.finalWorld.tiles[0][1]).toBe('path');
  });

  it('transforming mid-run changes what he can do', () => {
    const r = runProgram(parse('transform(bolt, drill)\nmove(bolt, right, 2)'), walled('robot'));
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt.mode).toBe('drill');
  });

  it('knows a wall is coming before walking into it', () => {
    const r = runProgram(parse('if wallAhead(bolt, right) {\n  transform(bolt, drill)\n}\nmove(bolt, right, 2)'), walled('robot'));
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt.x).toBe(2);
  });
});

describe('jet mode', () => {
  const gapped = (mode: 'robot' | 'jet') => yard(['-_-', '---'], mode);

  it('a hole in the floor stops a robot', () => {
    const r = runProgram(parse('move(bolt, right)'), gapped('robot'));
    expect(r.error?.boltSays).toMatch(/hole in the floor/);
    expect(r.error?.tryThis).toMatch(/jet/);
  });

  it('a jet flies over it', () => {
    const r = runProgram(parse('move(bolt, right, 2)'), gapped('jet'));
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt.x).toBe(2);
  });

  it('a drill is not a jet', () => {
    const r = runProgram(parse('transform(bolt, drill)\nmove(bolt, right)'), gapped('robot'));
    expect(r.error?.boltSays).toMatch(/hole in the floor/);
  });
});

describe('magnet mode', () => {
  it('reaches one square away', () => {
    const r = runProgram(parse('transform(bolt, magnet)\ngrab(bolt)'), yard(['---', '---'], 'robot', [{ x: 1, y: 1 }]));
    expect(r.error).toBeUndefined();
    expect(r.finalWorld.sprites.bolt.carrying).not.toBeNull();
  });

  it('but no further, and says so', () => {
    const r = runProgram(parse('transform(bolt, magnet)\ngrab(bolt)'), yard(['----', '----'], 'robot', [{ x: 3, y: 1 }]));
    expect(r.error?.tryThis).toMatch(/only reaches one square/);
  });

  it('a plain robot has to be standing on it', () => {
    const r = runProgram(parse('grab(bolt)'), yard(['---', '---'], 'robot', [{ x: 1, y: 0 }]));
    expect(r.error?.boltSays).toMatch(/nothing to grab/);
  });
});

describe('transforming', () => {
  it('refuses a shape that does not exist', () => {
    const r = runProgram(parse('transform(bolt, banana)'), yard(['---']));
    expect(r.error?.boltSays).toMatch(/not a shape/);
  });

  it('refuses for somebody who is not a robot', () => {
    const world = buildWorld({ grid: ['---'], sprites: { sniff: { character: 'sniff', x: 0, y: 0 } } });
    const r = runProgram(parse('transform(sniff, drill)'), world);
    expect(r.error?.boltSays).toMatch(/cannot transform/);
  });
});

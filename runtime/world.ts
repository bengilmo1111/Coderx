/**
 * The world Henry's code acts on: a small tile grid with characters on it.
 *
 * Every value here is plain JSON data so a whole world can be snapshotted with
 * structuredClone after each statement. That gives us step, pause, scrub and
 * replay for free, and makes goal-checking a pure function of the last frame.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';
export type TileKind = 'grass' | 'path' | 'bin' | 'fence';

export type CharacterKey = 'sniff' | 'kea' | 'weka' | 'bolt' | 'nan' | 'meatball';

/** Cast is half endemic NZ on purpose — this should feel like Henry's country. */
export const CHARACTERS: Record<CharacterKey, { label: string; glyph: string; blurb: string }> = {
  sniff: { label: 'Sniff', glyph: '🐕', blurb: 'Police dog. Very earnest. Eats the evidence.' },
  kea: { label: 'Kea', glyph: '🦜', blurb: 'Takes machines apart for fun. Regrets nothing.' },
  weka: { label: 'Weka', glyph: '🐦', blurb: 'Steals things. Denies everything.' },
  bolt: { label: 'Bolt', glyph: '🤖', blurb: 'Robot. Mostly a toaster. Your mate.' },
  nan: { label: 'Nan McSnap', glyph: '👵', blurb: 'Tiny master criminal. Age unknown.' },
  meatball: { label: 'The Meatball', glyph: '🍝', blurb: 'Sentient. Allegiance unclear.' },
};

export interface SpriteState {
  character: CharacterKey;
  x: number;
  y: number;
  facing: Direction;
  /** Id of the rubbish being carried, or null. One item at a time. */
  carrying: string | null;
}

export interface RubbishState {
  id: string;
  x: number;
  y: number;
}

export interface WorldState {
  w: number;
  h: number;
  tiles: TileKind[][];
  sprites: Record<string, SpriteState>;
  rubbish: RubbishState[];
  /** How many pieces have made it into a bin. Most goals check this. */
  binned: number;
}

/** Transient, one frame only: speech bubbles, POW bursts, sparkles. */
export interface Effect {
  kind: 'say' | 'pow' | 'sparkle' | 'wait';
  who?: string;
  text?: string;
}

export interface Frame {
  /** Which statement produced this frame — drives line highlighting. */
  stmtId: string;
  world: WorldState;
  effects: Effect[];
}

export const DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export function isDirection(v: unknown): v is Direction {
  return v === 'up' || v === 'down' || v === 'left' || v === 'right';
}

export function cloneWorld(w: WorldState): WorldState {
  return structuredClone(w);
}

export function tileAt(w: WorldState, x: number, y: number): TileKind | null {
  if (x < 0 || y < 0 || x >= w.w || y >= w.h) return null;
  return w.tiles[y][x];
}

export function rubbishAt(w: WorldState, x: number, y: number): RubbishState | undefined {
  return w.rubbish.find((r) => r.x === x && r.y === y);
}

/** Compact grid builder so levels stay readable as data. */
export function buildWorld(spec: {
  /** One string per row. '.' grass, '-' path, 'B' bin, '#' fence. */
  grid: string[];
  sprites: Record<string, { character: CharacterKey; x: number; y: number; facing?: Direction }>;
  rubbish?: { x: number; y: number }[];
}): WorldState {
  const legend: Record<string, TileKind> = { '.': 'grass', '-': 'path', B: 'bin', '#': 'fence' };
  const tiles = spec.grid.map((row) =>
    [...row].map((ch) => {
      const t = legend[ch];
      if (!t) throw new Error(`buildWorld: unknown grid character "${ch}"`);
      return t;
    }),
  );
  const h = tiles.length;
  const w = tiles[0]?.length ?? 0;
  if (tiles.some((r) => r.length !== w)) throw new Error('buildWorld: rows are not all the same length');

  const sprites: Record<string, SpriteState> = {};
  for (const [name, s] of Object.entries(spec.sprites)) {
    sprites[name] = { character: s.character, x: s.x, y: s.y, facing: s.facing ?? 'right', carrying: null };
  }

  return {
    w,
    h,
    tiles,
    sprites,
    rubbish: (spec.rubbish ?? []).map((r, i) => ({ id: `r${i}`, x: r.x, y: r.y })),
    binned: 0,
  };
}

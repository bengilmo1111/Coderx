/**
 * A seeded random number generator.
 *
 * Generated levels are rebuilt from their id on every device, so "random" here
 * has to mean "the same every time, forever". `Math.random()` appears nowhere in
 * this repo and must not start now: a caper that came out differently on the
 * phone than on the computer would lose his half-finished code and his progress
 * with it.
 *
 * mulberry32 — ten lines, no dependency, plenty good enough for choosing which
 * villain stands at the end of a street.
 */

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One of these, chosen by the generator rather than by chance. */
export function pick<T>(next: () => number, xs: readonly T[]): T {
  return xs[Math.floor(next() * xs.length) % xs.length];
}

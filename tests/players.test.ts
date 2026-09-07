import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressState } from '@/progress/types';

/**
 * Two brothers, one family computer.
 *
 * The merge is monotonic on purpose — it takes the better of two values and
 * never deletes — which is exactly right for one child on two devices and
 * exactly wrong for two children on one. These tests exist because the failure
 * is silent and generous-looking: Casper would simply find himself in
 * possession of Henry's four hundred XP, and Henry would find his streak had
 * been playing without him.
 */

class FakeStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  get keys() {
    return [...this.map.keys()];
  }
}

let storage: FakeStorage;
type StoreModule = typeof import('@/progress/store');

/** A fresh browser and a freshly imported module, so slot state never leaks. */
async function freshBrowser(): Promise<StoreModule> {
  storage = new FakeStorage();
  (globalThis as { window?: unknown }).window = { localStorage: storage };
  // The module picks its backing store at import time from whether `window`
  // exists, and holds the active slot in module scope, so each case needs a
  // genuinely fresh copy rather than a reset.
  vi.resetModules();
  return import('@/progress/store');
}

/** What Henry had before profiles existed: three chapters and a streak. */
function henrysGame(mod: StoreModule): ProgressState {
  return {
    ...mod.emptyProgress(),
    agentName: 'Turbo',
    hqName: 'The Shed',
    avatar: 'sniff',
    xp: 420,
    stickers: ['kea-feather', 'sniff-badge'],
    clubCards: ['loops', 'sequence'],
    levels: { 'c1l1': { ...mod.emptyLevelProgress(), completed: true } },
    streak: { lastDay: '2026-09-04', count: 5, best: 5, freezes: 2 },
  };
}

beforeEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

// This file is the only one that pretends to be a browser. Leaving the pretence
// standing would hand the next file in this worker a LocalStore backed by a
// storage object it has never heard of.
afterAll(() => {
  delete (globalThis as { window?: unknown }).window;
  vi.resetModules();
});

describe('one device, two children', () => {
  it('gives each profile its own slot', async () => {
    const mod = await freshBrowser();
    const { store, emptyProgress } = mod;

    store.use('henry', { adopt: true });
    store.save({ ...emptyProgress(), agentName: 'Turbo', xp: 420 });

    store.use('casper', { adopt: false });
    store.save({ ...emptyProgress(), agentName: 'Rocket', xp: 10 });

    expect(store.use('henry').xp).toBe(420);
    expect(store.use('casper').xp).toBe(10);
  });

  it("does not let the second child inherit the first child's game", async () => {
    const mod = await freshBrowser();
    const { store } = mod;

    // Henry played here for weeks before there was a database.
    store.use(null);
    store.save(henrysGame(mod));

    // He creates his profile from it, which IS a claim on this device's game.
    const henry = store.use('henry', { adopt: true });
    expect(henry.xp).toBe(420);
    expect(henry.stickers).toEqual(['kea-feather', 'sniff-badge']);

    // Casper signs in on the same computer. He starts where he actually is.
    const casper = store.use('casper');
    expect(casper.xp).toBe(0);
    expect(casper.stickers).toEqual([]);
    expect(casper.streak.count).toBe(0);
    expect(casper.agentName).toBe('');
  });

  it('hands the pre-profile game to whoever claims it, and only once', async () => {
    const mod = await freshBrowser();
    const { store } = mod;
    store.use(null);
    store.save(henrysGame(mod));

    expect(store.use('casper', { adopt: true }).xp).toBe(420); // first to claim wins it
    expect(store.use('henry', { adopt: true }).xp).toBe(0); // not handed out twice
  });

  /**
   * The one that bit for real.
   *
   * Henry signed into his own profile on his dad's phone and was handed the
   * test game that phone was already carrying — somebody else's name, somebody
   * else's XP — because that game predated the claim marker and so looked
   * unclaimed. Signing in is not a claim on whatever the device was playing.
   */
  it('never adopts on a plain sign-in, however unclaimed the device looks', async () => {
    const mod = await freshBrowser();
    const { store } = mod;

    // A game left on this device by somebody else, with no claim recorded —
    // exactly what a browser that used the app before profiles existed holds.
    store.use(null);
    store.save(henrysGame(mod));

    const arriving = store.use('casper');
    expect(arriving.xp).toBe(0);
    expect(arriving.agentName).toBe('');

    // Explicitly declining is the same answer.
    expect(store.use('meatball', { adopt: false }).xp).toBe(0);

    // And the game is still there for whoever genuinely claims it.
    expect(store.use('henry', { adopt: true }).xp).toBe(420);
  });

  it('keeps a profile at its own progress once it has some', async () => {
    const mod = await freshBrowser();
    const { store, emptyProgress } = mod;

    store.use('casper', { adopt: false });
    store.save({ ...emptyProgress(), agentName: 'Rocket', xp: 30 });

    // Henry's old anonymous game turns up later. Casper is already playing.
    store.use(null);
    store.save(henrysGame(mod));

    expect(store.use('casper').xp).toBe(30);
  });

  it('returns to the anonymous slot when nobody is signed in', async () => {
    const mod = await freshBrowser();
    const { store, emptyProgress } = mod;

    store.use(null);
    store.save({ ...emptyProgress(), agentName: 'Guest', xp: 7 });
    store.use('henry');
    store.save({ ...emptyProgress(), agentName: 'Turbo', xp: 420 });

    expect(store.use(null).agentName).toBe('Guest');
  });

  it('writes each child to a differently named key', async () => {
    const mod = await freshBrowser();
    const { store, emptyProgress } = mod;
    store.use('henry');
    store.save(emptyProgress());
    store.use('casper', { adopt: false });
    store.save(emptyProgress());

    const slots = storage.keys.filter((k) => k.startsWith('coderx.progress.v1'));
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots).toContain('coderx.progress.v1.henry');
    expect(slots).toContain('coderx.progress.v1.casper');
  });

  it('clears only the child whose slot is active', async () => {
    const mod = await freshBrowser();
    const { store, emptyProgress } = mod;
    store.use('henry');
    store.save({ ...emptyProgress(), xp: 420 });
    store.use('casper', { adopt: false });
    store.save({ ...emptyProgress(), xp: 10 });
    store.clear();

    expect(store.use('casper').xp).toBe(0);
    expect(store.use('henry').xp).toBe(420);
  });
});

describe('the character each child chose', () => {
  it('survives a round trip through storage', async () => {
    const mod = await freshBrowser();
    const { store, emptyProgress } = mod;
    store.use('casper', { adopt: false });
    store.save({ ...emptyProgress(), agentName: 'Rocket', avatar: 'dragon' });
    expect(store.use('casper').avatar).toBe('dragon');
  });

  it('defaults to a real cast member rather than empty', async () => {
    const mod = await freshBrowser();
    expect(mod.emptyProgress().avatar).toBe('sniff');
  });
});

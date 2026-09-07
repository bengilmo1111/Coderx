import { describe, expect, it } from 'vitest';

import { BADGES, badgesEarned, newBadges } from '@/progress/badges';
import { STICKERS } from '@/progress/stickers';
import { SKILLS } from '@/curriculum/skills';
import { collect, emptyLevelProgress, emptyProgress } from '@/progress/store';
import { mergeProgress } from '@/progress/merge';
import type { LevelProgress, ProgressState } from '@/progress/types';

/**
 * Crew badges are the payout for capers that cannot each carry a sticker of
 * their own. Two properties matter more than any individual rule: a badge is
 * never awarded for a thing he has not done, and a badge is never taken back.
 */

function withLevels(over: Partial<LevelProgress>[], rest: Partial<ProgressState> = {}): ProgressState {
  const levels: Record<string, LevelProgress> = {};
  over.forEach((o, i) => {
    levels[`l${i}`] = { ...emptyLevelProgress(), ...o };
  });
  return { ...emptyProgress(), levels, ...rest };
}

describe('the badges themselves', () => {
  it('all exist in the collection, and are marked as crew', () => {
    for (const badge of BADGES) {
      const sticker = STICKERS[badge.id];
      expect(sticker, `no sticker for badge ${badge.id}`).toBeDefined();
      expect(sticker.kind, badge.id).toBe('crew');
      expect(sticker.blurb.length, badge.id).toBeGreaterThan(0);
    }
  });

  it('never names a skill at him', () => {
    // He does not know he is doing maths, and a badge is the one thing here he
    // actually reads. "Loop Wrangler", never "code.loops".
    const skillWords = Object.keys(SKILLS).flatMap((id) => id.split('.'));
    for (const badge of BADGES) {
      const text = `${STICKERS[badge.id].name} ${STICKERS[badge.id].blurb}`.toLowerCase();
      for (const word of skillWords) {
        expect(text.includes(`${word}.`), `${badge.id} mentions ${word}`).toBe(false);
      }
      expect(text).not.toMatch(/\bskill|\blevel \d|\bproficien|\bmastery|\bweak|\bbehind/);
    }
  });

  it('is a small set, because every one adds a locked square to his shelf', () => {
    expect(BADGES.length).toBeLessThanOrEqual(8);
  });
});

describe('nothing is earned for free', () => {
  it('a brand new player has none of them', () => {
    expect(badgesEarned(emptyProgress())).toEqual([]);
    expect(newBadges(emptyProgress())).toEqual([]);
  });

  it('is not earned by trying, only by having done it', () => {
    // Attempts without completions must never award anything: the whole app
    // exists for a boy who has decided he is behind.
    const trying = withLevels([{ attempts: 40 }, { attempts: 12, hintsUsed: 0 }], { typedLines: 24 });
    expect(badgesEarned(trying)).toEqual([]);
  });
});

describe('each rule fires on the thing it is named after', () => {
  it('Loop Wrangler: five capers with a loop in them', () => {
    const base = { ...emptyProgress(), mastery: { 'code.loops': { attempts: 9, successes: 4, lastSeen: '2026-09-06' } } };
    expect(badgesEarned(base)).not.toContain('loop-wrangler');
    const fifth = { ...base, mastery: { 'code.loops': { attempts: 9, successes: 5, lastSeen: '2026-09-06' } } };
    expect(badgesEarned(fifth)).toContain('loop-wrangler');
  });

  it('Own Two Hands: twenty-five lines typed', () => {
    expect(badgesEarned({ ...emptyProgress(), typedLines: 24 })).not.toContain('own-two-hands');
    expect(badgesEarned({ ...emptyProgress(), typedLines: 25 })).toContain('own-two-hands');
  });

  it('Comeback Kid: a caper that beat him, finished anyway', () => {
    expect(badgesEarned(withLevels([{ completed: true, attempts: 2 }]))).not.toContain('comeback-kid');
    expect(badgesEarned(withLevels([{ completed: true, attempts: 3 }]))).toContain('comeback-kid');
    // Giving up after many tries is not a comeback.
    expect(badgesEarned(withLevels([{ completed: false, attempts: 9 }]))).not.toContain('comeback-kid');
  });

  it('Clean Sweep: three finished without asking', () => {
    const two = withLevels([
      { completed: true, hintsUsed: 0 },
      { completed: true, hintsUsed: 0 },
      { completed: true, hintsUsed: 2 },
    ]);
    expect(badgesEarned(two)).not.toContain('clean-sweep');
    const three = withLevels([
      { completed: true, hintsUsed: 0 },
      { completed: true, hintsUsed: 0 },
      { completed: true, hintsUsed: 0 },
    ]);
    expect(badgesEarned(three)).toContain('clean-sweep');
  });

  it('Kea Street Regular: ten capers done', () => {
    const nine = withLevels(Array.from({ length: 9 }, () => ({ completed: true })));
    expect(badgesEarned(nine)).not.toContain('street-regular');
    const ten = withLevels(Array.from({ length: 10 }, () => ({ completed: true })));
    expect(badgesEarned(ten)).toContain('street-regular');
  });
});

describe('a badge, once given, is his', () => {
  it('is not offered twice', () => {
    const earned = { ...emptyProgress(), typedLines: 30 };
    expect(newBadges(earned)).toContain('own-two-hands');
    expect(newBadges(collect(earned, 'own-two-hands'))).not.toContain('own-two-hands');
  });

  it('survives a merge from a device that never saw it earned', () => {
    // Two brothers, two devices, one monotonic collection.
    const phone = collect({ ...emptyProgress(), typedLines: 30 }, 'own-two-hands');
    const computer = emptyProgress();
    expect(mergeProgress(phone, computer).stickers).toContain('own-two-hands');
    expect(mergeProgress(computer, phone).stickers).toContain('own-two-hands');
  });
});

import { describe, expect, it } from 'vitest';
import { mergeProgress } from '@/progress/merge';
import { emptyProgress, emptyLevelProgress, collect, collectCard, setLevelProgress, recordSkillAttempt } from '@/progress/store';
import type { ProgressState } from '@/progress/types';

/**
 * The most important tests in the repo after level solvability.
 *
 * Henry plays on a shared family computer and on his dad's phone. If merging
 * ever loses a sticker, the collection he came back for is gone — and the
 * collection is the thing he said motivates him. Every test here is a way that
 * could happen.
 */

/**
 * Pin both timestamps.
 *
 * `createdAt` is stamped from the wall clock by emptyProgress(), and these
 * fixtures are rebuilt fresh on every call — so the commutativity check below,
 * which builds four of them, would compare states that differ only by which
 * millisecond they were constructed in. That failed roughly one run in twenty,
 * and only ever on a loaded machine, which is the worst way for a test about
 * not losing a child's stickers to behave.
 */
const at = (state: ProgressState, iso: string): ProgressState => ({
  ...state,
  updatedAt: iso,
  createdAt: '2026-09-01T00:00:00.000Z',
});

/** A Friday night on the phone. */
function phone(): ProgressState {
  let p = emptyProgress();
  p = { ...p, agentName: 'Turbo', hqName: 'The Shed', xp: 120, typedLines: 3 };
  p = collect(p, 'sniff-badge');
  p = collectCard(p, 'sequence');
  p = setLevelProgress(p, 'c1l1', { ...emptyLevelProgress(), completed: true, attempts: 2, bestSize: 5, lastCode: 'grab(sniff)' });
  p = recordSkillAttempt(p, ['code.sequence'], true, '2026-09-04');
  p = { ...p, sessions: { '2026-09-04': 12 }, streak: { lastDay: '2026-09-04', count: 3, best: 3, freezes: 2 } };
  return at(p, '2026-09-04T09:00:00Z');
}

/** A Saturday morning on the family computer, which never saw Friday. */
function computer(): ProgressState {
  let p = emptyProgress();
  p = { ...p, agentName: 'Turbo', hqName: 'The Shed', xp: 260, typedLines: 1 };
  p = collect(p, 'kea-feather');
  p = collectCard(p, 'loops');
  p = setLevelProgress(p, 'c1l3', { ...emptyLevelProgress(), completed: true, attempts: 5, hintsUsed: 2, bestSize: 4, lastCode: 'repeat 3 {\n}' });
  p = recordSkillAttempt(p, ['code.loops'], true, '2026-09-05');
  p = { ...p, sessions: { '2026-09-05': 20 }, streak: { lastDay: '2026-09-05', count: 4, best: 4, freezes: 2 } };
  return at(p, '2026-09-05T21:00:00Z');
}

describe('merging two devices', () => {
  it('keeps every sticker and club card from both', () => {
    const merged = mergeProgress(phone(), computer());
    expect(merged.stickers).toEqual(expect.arrayContaining(['sniff-badge', 'kea-feather']));
    expect(merged.clubCards).toEqual(expect.arrayContaining(['sequence', 'loops']));
  });

  it('keeps every finished level from both', () => {
    const merged = mergeProgress(phone(), computer());
    expect(merged.levels.c1l1.completed).toBe(true);
    expect(merged.levels.c1l3.completed).toBe(true);
  });

  it('takes the higher XP rather than the newer one', () => {
    expect(mergeProgress(phone(), computer()).xp).toBe(260);
    expect(mergeProgress(computer(), phone()).xp).toBe(260);
  });

  it('gives the same answer whichever way round it is merged', () => {
    // Fully commutative, arrays included — otherwise the client sees a change
    // that is not one and pushes again in a loop.
    expect(mergeProgress(phone(), computer())).toEqual(mergeProgress(computer(), phone()));
  });

  it('changes nothing when a state is merged with itself', () => {
    const one = phone();
    expect(mergeProgress(one, one)).toEqual(one);
  });

  it('never lets an empty device wipe a full one, in either direction', () => {
    const full = computer();
    const fresh = at(emptyProgress(), '2026-09-06T10:00:00Z'); // newer, but empty
    for (const merged of [mergeProgress(full, fresh), mergeProgress(fresh, full)]) {
      expect(merged.xp).toBe(260);
      expect(merged.stickers).toContain('kea-feather');
      expect(merged.levels.c1l3.completed).toBe(true);
      expect(merged.agentName).toBe('Turbo');
    }
  });

  it('cannot make anything worse than the better side', () => {
    const merged = mergeProgress(phone(), computer());
    expect(merged.xp).toBeGreaterThanOrEqual(Math.max(phone().xp, computer().xp));
    expect(merged.stickers.length).toBeGreaterThanOrEqual(phone().stickers.length);
    expect(merged.typedLines).toBe(3);
  });
});

describe('the fiddly fields', () => {
  it('keeps the SHORTEST solution, not the newest', () => {
    const a = setLevelProgress(at(emptyProgress(), '2026-09-01T00:00:00Z'), 'c1l1', { bestSize: 4 });
    const b = setLevelProgress(at(emptyProgress(), '2026-09-09T00:00:00Z'), 'c1l1', { bestSize: 9 });
    expect(mergeProgress(a, b).levels.c1l1.bestSize).toBe(4);
  });

  it('handles a level only one side has ever seen', () => {
    const a = setLevelProgress(emptyProgress(), 'c1l1', { bestSize: 5 });
    expect(mergeProgress(a, emptyProgress()).levels.c1l1.bestSize).toBe(5);
  });

  it('treats a null best size as "no score yet"', () => {
    const a = setLevelProgress(emptyProgress(), 'c1l1', { bestSize: null });
    const b = setLevelProgress(emptyProgress(), 'c1l1', { bestSize: 7 });
    expect(mergeProgress(a, b).levels.c1l1.bestSize).toBe(7);
  });

  it('takes the newer half-written code for a level', () => {
    const older = setLevelProgress(at(emptyProgress(), '2026-09-01T00:00:00Z'), 'c1l1', { lastCode: 'old' });
    const newer = setLevelProgress(at(emptyProgress(), '2026-09-09T00:00:00Z'), 'c1l1', { lastCode: 'new' });
    expect(mergeProgress(older, newer).levels.c1l1.lastCode).toBe('new');
    expect(mergeProgress(newer, older).levels.c1l1.lastCode).toBe('new');
  });

  it('does not double-count mastery when the same session syncs twice', () => {
    let p = emptyProgress();
    p = recordSkillAttempt(p, ['code.loops'], true, '2026-09-04');
    p = recordSkillAttempt(p, ['code.loops'], true, '2026-09-04');
    // Both devices carry the same two attempts. Summing would report four.
    expect(mergeProgress(p, p).mastery['code.loops']?.attempts).toBe(2);
  });

  it('keeps the live streak but never loses his best', () => {
    const a: ProgressState = { ...emptyProgress(), streak: { lastDay: '2026-09-01', count: 9, best: 9, freezes: 1 } };
    const b: ProgressState = { ...emptyProgress(), streak: { lastDay: '2026-09-05', count: 2, best: 2, freezes: 2 } };
    const merged = mergeProgress(a, b);
    expect(merged.streak.lastDay).toBe('2026-09-05');
    expect(merged.streak.count).toBe(2);
    expect(merged.streak.best).toBe(9);
  });

  it('takes the longer session on a day both devices recorded', () => {
    const a: ProgressState = { ...emptyProgress(), sessions: { '2026-09-04': 12, '2026-09-05': 4 } };
    const b: ProgressState = { ...emptyProgress(), sessions: { '2026-09-04': 5, '2026-09-06': 9 } };
    expect(mergeProgress(a, b).sessions).toEqual({ '2026-09-04': 12, '2026-09-05': 4, '2026-09-06': 9 });
  });

  it('does not let a device that never knew his name erase it', () => {
    const named = at({ ...emptyProgress(), agentName: 'Turbo', hqName: 'The Shed' }, '2026-09-01T00:00:00Z');
    const nameless = at(emptyProgress(), '2026-09-09T00:00:00Z');
    expect(mergeProgress(nameless, named).agentName).toBe('Turbo');
  });

  it('keeps the earliest createdAt, so his history starts when it started', () => {
    const a = { ...emptyProgress(), createdAt: '2026-09-01T00:00:00Z' };
    const b = { ...emptyProgress(), createdAt: '2026-08-01T00:00:00Z' };
    expect(mergeProgress(a, b).createdAt).toBe('2026-08-01T00:00:00Z');
  });
});

describe('the character a child picked', () => {
  it('follows the newer write, like his name does', () => {
    const older = { ...emptyProgress(), avatar: 'sniff', updatedAt: '2026-09-01T00:00:00.000Z' };
    const newer = { ...emptyProgress(), avatar: 'dragon', updatedAt: '2026-09-05T00:00:00.000Z' };
    expect(mergeProgress(older, newer).avatar).toBe('dragon');
    expect(mergeProgress(newer, older).avatar).toBe('dragon');
  });

  it('never merges to nothing when one side has not chosen', () => {
    const chosen = { ...emptyProgress(), avatar: 'bolt', updatedAt: '2026-09-01T00:00:00.000Z' };
    const blank = { ...emptyProgress(), avatar: '', updatedAt: '2026-09-05T00:00:00.000Z' };
    expect(mergeProgress(chosen, blank).avatar).toBe('bolt');
  });
});

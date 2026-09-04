import { describe, expect, it } from 'vitest';
import { nzDay, touchStreak, emptyStreak } from '@/progress/streak';
import { rankFor, nextRank, awardsFor } from '@/progress/xp';
import { emptyProgress, recordSkillAttempt, isUnlocked, collect } from '@/progress/store';
import { ALL_LEVELS } from '@/curriculum/chapter1/levels';

describe('NZ day boundaries', () => {
  it('rolls over at Auckland midnight, not UTC midnight', () => {
    // Both of these are the same school day in New Zealand (10am and 2pm),
    // but they fall on DIFFERENT UTC days. Using UTC would silently snap his
    // streak in the middle of an afternoon.
    expect(nzDay(new Date('2026-09-04T22:00:00Z'))).toBe('2026-09-05');
    expect(nzDay(new Date('2026-09-05T02:00:00Z'))).toBe('2026-09-05');
  });

  it('handles the NZDT changeover in September', () => {
    // NZ moves to daylight saving on the last Sunday of September.
    expect(nzDay(new Date('2026-09-26T12:00:00Z'))).toBe('2026-09-27'); // still NZST (+12)
    expect(nzDay(new Date('2026-09-27T11:30:00Z'))).toBe('2026-09-28'); // now NZDT (+13)
  });
});

describe('streaks are forgiving on purpose', () => {
  it('grows on consecutive days', () => {
    let s = emptyStreak();
    s = touchStreak(s, '2026-09-01').streak;
    s = touchStreak(s, '2026-09-02').streak;
    s = touchStreak(s, '2026-09-03').streak;
    expect(s.count).toBe(3);
    expect(s.best).toBe(3);
  });

  it('does not double-count two sessions on the same day', () => {
    let s = touchStreak(emptyStreak(), '2026-09-01').streak;
    const again = touchStreak(s, '2026-09-01');
    expect(again.streak.count).toBe(1);
    expect(again.grewToday).toBe(false);
  });

  it('spends a freeze to absorb a missed day, silently', () => {
    let s = touchStreak(emptyStreak(), '2026-09-01').streak;
    s = touchStreak(s, '2026-09-02').streak;
    const out = touchStreak(s, '2026-09-04'); // skipped the 3rd
    expect(out.freezeUsed).toBe(true);
    expect(out.streak.count).toBe(3);
    expect(out.streak.freezes).toBe(1);
  });

  it('never shows him a zero, even after a long gap with no freezes left', () => {
    let s = { ...emptyStreak(), freezes: 0 };
    s = touchStreak(s, '2026-09-01').streak;
    const out = touchStreak(s, '2026-10-01');
    expect(out.streak.count).toBe(1);
    expect(out.streak.count).toBeGreaterThan(0);
  });

  it('keeps his best even when the current run restarts', () => {
    let s = { ...emptyStreak(), freezes: 0 };
    for (const d of ['2026-09-01', '2026-09-02', '2026-09-03']) s = touchStreak(s, d).streak;
    const out = touchStreak(s, '2026-09-20');
    expect(out.streak.best).toBe(3);
    expect(out.streak.count).toBe(1);
  });
});

describe('xp and ranks', () => {
  it('promotes through the ranks', () => {
    expect(rankFor(0).name).toBe('Rookie');
    expect(rankFor(150).name).toBe('Sidekick');
    expect(rankFor(9999).name).toBe('Legend');
    expect(nextRank(9999)).toBeNull();
  });

  it('rewards typing, tidiness and asking for no help', () => {
    const awards = awardsFor({ base: 50, typedLines: 2, size: 4, par: 5, hintsUsed: 0, tookDare: true, firstTime: true });
    const labels = awards.map((a) => a.label);
    expect(labels).toContain('Typed 2 lines yourself');
    expect(labels).toContain('Tidy code');
    expect(labels).toContain('No help needed');
    expect(labels).toContain('Took the dare');
    expect(awards.reduce((n, a) => n + a.xp, 0)).toBeGreaterThan(50);
  });

  it('still gives something for a replay, so revisiting is never a waste', () => {
    const awards = awardsFor({ base: 50, typedLines: 0, size: 9, par: 5, hintsUsed: 3, tookDare: false, firstTime: false });
    expect(awards[0].xp).toBeGreaterThan(0);
    expect(awards[0].xp).toBeLessThan(50);
  });
});

describe('progress state', () => {
  it('tracks mastery per skill for the parent view', () => {
    let p = emptyProgress();
    p = recordSkillAttempt(p, ['code.loops', 'maths.times-tables'], true, '2026-09-04');
    p = recordSkillAttempt(p, ['code.loops'], false, '2026-09-04');
    expect(p.mastery['code.loops']).toEqual({ attempts: 2, successes: 1, lastSeen: '2026-09-04' });
    expect(p.mastery['maths.times-tables']?.successes).toBe(1);
  });

  it('unlocks the next level only once the previous one is done', () => {
    const ids = ALL_LEVELS.map((l) => l.id);
    let p = emptyProgress();
    expect(isUnlocked(p, ids, ids[0])).toBe(true);
    expect(isUnlocked(p, ids, ids[1])).toBe(false);
    p = { ...p, levels: { [ids[0]]: { ...p.levels[ids[0]], completed: true } as never } };
    expect(isUnlocked(p, ids, ids[1])).toBe(true);
  });

  it('does not duplicate stickers', () => {
    let p = emptyProgress();
    p = collect(p, 'kea-feather');
    p = collect(p, 'kea-feather');
    expect(p.stickers).toEqual(['kea-feather']);
  });
});

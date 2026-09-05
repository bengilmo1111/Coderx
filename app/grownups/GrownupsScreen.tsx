'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ALL_LEVELS } from '@/curriculum/levels';
import { SKILLS, type SkillArea, type SkillId } from '@/curriculum/skills';
import { levelProgress } from '@/progress/store';
import { rankFor } from '@/progress/xp';
import { nzDay } from '@/progress/streak';
import { useProgress } from '@/lib/useProgress';
import { signOut } from '@/lib/sync';

/**
 * The parent view — the other half of the design.
 *
 * Henry never sees the word "maths". This page is where that work becomes
 * visible to the person who needs to see it, and it deliberately ends with one
 * concrete thing to say to him, because "he did 40 minutes" is not actionable
 * and "ask him how he got level 3 down to four lines" is.
 */

const AREA_LABEL: Record<SkillArea, string> = {
  code: 'Coding',
  maths: 'Maths (hidden in the puzzles)',
  literacy: 'Reading & writing (hidden in the comic)',
};

interface TutorStatus {
  ai: boolean;
  model: string;
  dailyCap: number;
  usedToday: number;
  commit: string;
}

export function GrownupsScreen() {
  const { state, ready, sync } = useProgress();
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [tutor, setTutor] = useState<TutorStatus | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    fetch('/api/tutor')
      .then((r) => r.json() as Promise<TutorStatus>)
      .then(setTutor)
      .catch(() => setTutor(null));
  }, [unlocked]);

  const check = async () => {
    const res = await fetch('/api/grownups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = (await res.json()) as { ok: boolean };
    setUnlocked(data.ok);
    setError(!data.ok);
  };

  const byArea = useMemo(() => {
    const out: Record<SkillArea, { id: SkillId; attempts: number; successes: number }[]> = {
      code: [],
      maths: [],
      literacy: [],
    };
    for (const [id, rec] of Object.entries(state.mastery)) {
      if (!rec) continue;
      out[SKILLS[id as SkillId].area].push({ id: id as SkillId, attempts: rec.attempts, successes: rec.successes });
    }
    return out;
  }, [state.mastery]);

  const stuck = useMemo(
    () =>
      ALL_LEVELS.map((l) => ({ level: l, prog: levelProgress(state, l.id) }))
        .filter((x) => x.prog.attempts >= 3 && !x.prog.completed)
        .concat(
          ALL_LEVELS.map((l) => ({ level: l, prog: levelProgress(state, l.id) })).filter(
            (x) => x.prog.completed && x.prog.hintsUsed >= 3,
          ),
        ),
    [state],
  );

  if (!ready) return <div className="p-6 font-black opacity-40">Loading…</div>;

  if (!unlocked) {
    return (
      <main className="dots flex min-h-[100dvh] items-center justify-center p-4">
        <div className="panel w-full max-w-sm p-5">
          <h1 className="title mb-1 text-2xl">Grown-ups only</h1>
          <p className="mb-4 text-sm font-bold opacity-60">Enter the PIN.</p>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && check()}
            type="password"
            inputMode="numeric"
            className="panel mb-3 w-full px-3 py-2 text-lg"
          />
          {error && <p className="mb-3 text-sm font-bold text-red-600">Not that one.</p>}
          <div className="flex gap-2">
            <Link href="/" className="chunk flex items-center bg-white px-4">
              ←
            </Link>
            <button type="button" onClick={check} className="chunk flex-1 bg-emerald-400 py-3">
              Unlock
            </button>
          </div>
        </div>
      </main>
    );
  }

  const totalMinutes = Object.values(state.sessions).reduce((n, m) => n + m, 0);
  const today = state.sessions[nzDay()] ?? 0;
  const done = ALL_LEVELS.filter((l) => levelProgress(state, l.id).completed).length;

  return (
    <main className="dots min-h-[100dvh] pb-12">
      <header className="border-b-[3px] border-ink bg-white/70 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/" className="chunk flex items-center bg-white px-3">
            ←
          </Link>
          <h1 className="title flex-1 text-2xl">How Henry&apos;s going</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Rank" value={`${rankFor(state.xp).glyph} ${rankFor(state.xp).name}`} />
          <Stat label="Capers done" value={`${done} / ${ALL_LEVELS.length}`} />
          <Stat label="Streak" value={`🔥 ${state.streak.count} (best ${state.streak.best})`} />
          <Stat label="Time today" value={`${today} min`} sub={`${totalMinutes} min all up`} />
        </div>

        <section className="panel p-4">
          <h2 className="title mb-1 text-lg">What he&apos;s actually practising</h2>
          <p className="mb-3 text-xs font-bold opacity-55">
            He is never shown any of this. As far as Henry is concerned he is cleaning up a street with a dog.
          </p>
          {(['code', 'maths', 'literacy'] as SkillArea[]).map((area) => (
            <div key={area} className="mb-4 last:mb-0">
              <h3 className="mb-2 text-sm font-black uppercase tracking-wide opacity-60">{AREA_LABEL[area]}</h3>
              {byArea[area].length === 0 ? (
                <p className="text-sm font-bold opacity-40">Nothing yet.</p>
              ) : (
                <ul className="space-y-1">
                  {byArea[area].map(({ id, attempts, successes }) => {
                    const pct = attempts ? Math.round((successes / attempts) * 100) : 0;
                    return (
                      <li key={id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 font-bold">
                          {SKILLS[id].label}
                          {SKILLS[id].year && <span className="ml-1 text-xs opacity-45">{SKILLS[id].year}</span>}
                        </span>
                        <span className="h-2.5 w-24 overflow-hidden rounded-full border-2 border-ink">
                          <span className="block h-full bg-emerald-400" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="w-16 text-right text-xs font-bold opacity-55">
                          {successes}/{attempts}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </section>

        <section className="panel p-4">
          <h2 className="title mb-2 text-lg">Where he got stuck</h2>
          {stuck.length === 0 ? (
            <p className="text-sm font-bold opacity-50">Nothing has stumped him yet.</p>
          ) : (
            <ul className="space-y-2">
              {stuck.map(({ level, prog }) => (
                <li key={level.id} className="text-sm font-bold">
                  <span className="font-black">{level.title}</span> — {prog.attempts} goes
                  {prog.hintsUsed > 0 && `, ${prog.hintsUsed} hints`}
                  {!prog.completed && ' (not finished)'}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-4">
          <h2 className="title mb-2 text-lg">Sync</h2>
          {!sync.enabled ? (
            <p className="text-sm font-bold">
              ⚠️ Not syncing. Progress lives only in this browser, so the computer and the phone are
              separate games. Add the Supabase environment variables to switch it on.
            </p>
          ) : !sync.reachable ? (
            <p className="text-sm font-bold">
              ⚠️ A database is configured, but it did not answer. That is usually a free Supabase project
              that has gone to sleep, or the wrong key. Henry will not notice — the game runs entirely on
              his device — but nothing is syncing until it wakes.
            </p>
          ) : !sync.signedIn ? (
            <p className="text-sm font-bold">⚠️ A database is configured, but nobody is signed in on this device.</p>
          ) : (
            <ul className="space-y-1 text-sm font-bold">
              <li>✅ Signed in as {sync.profile?.name}</li>
              <li className="opacity-60">
                {sync.lastSyncedAt
                  ? `Last synced ${new Date(sync.lastSyncedAt).toLocaleString('en-NZ')}`
                  : 'Not synced yet this session.'}
              </li>
              <li className="text-xs font-bold opacity-55">
                Free Supabase projects sleep after about a week idle. If this stops updating, the database has
                paused — Henry will not notice, because the game runs entirely on his device either way.
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    window.location.href = '/';
                  }}
                  className="chunk bg-white px-3 text-sm"
                >
                  Sign out on this device
                </button>
              </li>
            </ul>
          )}
        </section>

        <section className="panel p-4">
          <h2 className="title mb-2 text-lg">Setup</h2>
          {tutor === null ? (
            <p className="text-sm font-bold opacity-50">Checking…</p>
          ) : (
            <ul className="space-y-1 text-sm font-bold">
              <li>
                {tutor.ai ? '✅' : '⚠️'} AI tutor:{' '}
                {tutor.ai ? (
                  <>
                    on, using <span className="font-[family-name:var(--font-code)]">{tutor.model}</span>
                  </>
                ) : (
                  'off — Bolt is using the handwritten hints'
                )}
              </li>
              {tutor.ai && (
                <li className="opacity-60">
                  {tutor.usedToday} of {tutor.dailyCap} hints used today on this server
                </li>
              )}
              {tutor.ai && (
                <li className="text-xs font-bold opacity-55">
                  A wrong model name looks identical to this from here — ask Bolt for a hint and check it
                  doesn&apos;t match the written one word for word.
                </li>
              )}
              <li className="opacity-50">
                Running <span className="font-[family-name:var(--font-code)]">{tutor.commit}</span>
              </li>
            </ul>
          )}
        </section>

        <section className="panel bg-pop/30 p-4">
          <h2 className="title mb-2 text-lg">One thing to say to him</h2>
          <p className="text-[15px] font-bold leading-snug">{suggestion(state.typedLines, done, stuck.length)}</p>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-3">
      <p className="text-[11px] font-black uppercase tracking-wide opacity-50">{label}</p>
      <p className="text-lg font-black leading-tight">{value}</p>
      {sub && <p className="text-[11px] font-bold opacity-50">{sub}</p>}
    </div>
  );
}

/** Deliberately specific. A parent can use these; "well done" they cannot. */
function suggestion(typedLines: number, done: number, stuckCount: number): string {
  if (done === 0) return 'Ask him to show you what Sniff does when you tell him to move the wrong way. The mistakes are the funny bit.';
  if (stuckCount > 0) return 'He got stuck on one and kept going. Say that back to him — that he stayed with it — rather than that he finished it.';
  if (typedLines === 0) return 'He is tapping bricks rather than typing. Ask him to type just one line himself for the bonus, and time him. Do not mention typing practice.';
  if (typedLines > 5) return 'He has started typing real code himself. Ask him what the squiggly brackets do — he can explain it, and being the one who explains is the whole game.';
  return 'Ask him how few lines he could solve one in. Making it shorter is a puzzle he will do for fun.';
}

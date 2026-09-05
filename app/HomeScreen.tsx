'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ALL_LEVELS, CHAPTERS } from '@/curriculum/levels';
import { BRIDGE_CARDS } from '@/curriculum/bridgeCards';
import { STICKERS } from '@/progress/stickers';
import { isUnlocked, levelProgress } from '@/progress/store';
import { nextRank, rankFor, rankProgress } from '@/progress/xp';
import { useProgress } from '@/lib/useProgress';
import { sfx } from '@/lib/sound';

const AGENT_NAMES = ['Turbo', 'Chomp', 'Bolt Jr', 'Fang', 'Rocket', 'Spud', 'Nitro', 'Biscuit'];
const HQ_NAMES = ['The Shed', 'Bin HQ', 'The Bunker', 'Sock Drawer', 'The Kennel', 'Base Alpha'];

export function HomeScreen() {
  const { state, update, ready, streakOutcome } = useProgress();
  const [tab, setTab] = useState<'capers' | 'stickers' | 'cards'>('capers');
  const [renaming, setRenaming] = useState(false);

  if (!ready) return <div className="p-6 text-center font-black opacity-40">Loading HQ…</div>;

  if (!state.agentName) return <FirstRun onDone={(agentName, hqName) => update((p) => ({ ...p, agentName, hqName }))} />;

  const ids = ALL_LEVELS.map((l) => l.id);
  const rank = rankFor(state.xp);
  const next = nextRank(state.xp);
  const pct = Math.round(rankProgress(state.xp) * 100);

  return (
    <main className="dots min-h-[100dvh] pb-10">
      <header className="border-b-[3px] border-ink bg-white/70 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="min-w-0 flex-1 text-left"
            title="Change your name"
          >
            <h1 className="title text-2xl leading-none">
              {state.hqName || 'HQ'} <span className="text-sm opacity-35">✏️</span>
            </h1>
            <p className="truncate text-xs font-bold opacity-60">
              Agent {state.agentName} · {rank.glyph} {rank.name}
            </p>
          </button>
          <div className="chunk flex items-center gap-1 bg-orange-300 px-3 text-sm" title="Days in a row">
            🔥 {state.streak.count}
          </div>
          <Link href="/grownups" className="chunk flex items-center bg-white px-3 text-sm">
            👤
          </Link>
        </div>

        <div className="mx-auto mt-2 max-w-3xl">
          <div className="panel h-5 overflow-hidden p-0">
            <div className="h-full bg-pop transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] font-bold opacity-60">
            {state.xp} XP{next ? ` · ${next.at - state.xp} to ${next.name} ${next.glyph}` : ' · top rank!'}
          </p>
        </div>
      </header>

      {streakOutcome?.freezeUsed && (
        <div className="mx-auto mt-3 max-w-3xl px-4">
          <div className="panel bg-sky-100 px-3 py-2 text-sm font-bold">
            🧊 Your streak was frozen while you were away. It&apos;s still going.
          </div>
        </div>
      )}

      {renaming && (
        <Rename
          agent={state.agentName}
          hq={state.hqName}
          onSave={(agentName, hqName) => {
            update((p) => ({ ...p, agentName, hqName }));
            setRenaming(false);
          }}
          onClose={() => setRenaming(false)}
        />
      )}

      <div className="mx-auto max-w-3xl px-4">
        <nav className="my-4 flex gap-2">
          {(
            [
              ['capers', '🕵️ Capers'],
              ['stickers', `⭐️ Stickers ${state.stickers.length}`],
              ['cards', `🃏 Club cards ${state.clubCards.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                sfx.tap();
                setTab(key);
              }}
              className={`chunk px-3 text-sm ${tab === key ? 'bg-pop' : 'bg-white'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'capers' && (
          <Link href="/sandbox" className="panel mb-5 flex items-center gap-3 bg-pop/40 p-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-white text-lg">
              🛠️
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-black">The Workshop</span>
              <span className="block truncate text-xs font-bold opacity-60">
                No job, no rules. Mess about with everything.
              </span>
            </span>
          </Link>
        )}

        {tab === 'capers' &&
          CHAPTERS.map((chapter) => (
            <section key={chapter.number} className="mb-6">
              <h2 className="title mb-2 text-lg opacity-70">
                Chapter {chapter.number} · {chapter.title}
              </h2>
              <ol className="space-y-3">
                {chapter.levels.map((level) => {
                  const prog = levelProgress(state, level.id);
                  const unlocked = isUnlocked(state, ids, level.id);
                  return (
                    <li key={level.id}>
                      <Link
                        href={unlocked ? `/play/${level.id}` : '#'}
                        aria-disabled={!unlocked}
                        className={`panel flex items-center gap-3 p-3 ${unlocked ? '' : 'pointer-events-none opacity-45'}`}
                      >
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-pop text-lg font-black">
                          {prog.completed ? '✓' : unlocked ? level.index : '🔒'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-black">{level.title}</span>
                          <span className="block truncate text-xs font-bold opacity-60">{level.goalText}</span>
                        </span>
                        {prog.completed && prog.bestSize !== null && (
                          <span className="shrink-0 text-xs font-bold opacity-50">{prog.bestSize} lines</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}

        {tab === 'stickers' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.values(STICKERS).map((s) => {
              const owned = state.stickers.includes(s.id);
              return (
                <div key={s.id} className={`panel p-3 text-center ${owned ? '' : 'opacity-35'}`}>
                  <div className="text-4xl">{owned ? s.glyph : '❓'}</div>
                  <p className="mt-1 text-sm font-black">{owned ? s.name : '???'}</p>
                  {owned && <p className="text-[11px] font-bold opacity-60">{s.blurb}</p>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'cards' && (
          <div className="space-y-3">
            {state.clubCards.length === 0 && (
              <p className="panel p-4 text-sm font-bold opacity-60">
                No club cards yet. You get one each time you learn something that also shows up in Scratch.
              </p>
            )}
            {state.clubCards.map((id) => {
              const card = BRIDGE_CARDS[id];
              if (!card) return null;
              return (
                <div key={id} className="panel bg-sky-100 p-4">
                  <p className="title text-sm">{card.title}</p>
                  <pre className="my-2 overflow-x-auto rounded-lg bg-white/70 p-2 font-[family-name:var(--font-code)] text-xs">
                    {card.youWrote}
                  </pre>
                  <p className="text-sm font-bold leading-snug">{card.body}</p>
                  <p className="mt-2 text-xs font-bold opacity-60">
                    In Scratch: <span className="font-black">{card.scratchBlock}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

/** Names are not forever. He asked to be able to change his. */
function Rename({
  agent,
  hq,
  onSave,
  onClose,
}: {
  agent: string;
  hq: string;
  onSave: (agent: string, hq: string) => void;
  onClose: () => void;
}) {
  const [nextAgent, setNextAgent] = useState(agent);
  const [nextHq, setNextHq] = useState(hq);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="panel pop-in w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="title mb-4 text-2xl">Change your name</h2>

        <label className="mb-1 block text-xs font-black uppercase opacity-55">Agent name</label>
        <input
          value={nextAgent}
          onChange={(e) => setNextAgent(e.target.value.slice(0, 16))}
          className="panel mb-3 w-full px-3 py-2 text-lg font-bold"
        />

        <label className="mb-1 block text-xs font-black uppercase opacity-55">HQ name</label>
        <input
          value={nextHq}
          onChange={(e) => setNextHq(e.target.value.slice(0, 20))}
          className="panel mb-4 w-full px-3 py-2 text-lg font-bold"
        />

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="chunk bg-white px-4">
            Cancel
          </button>
          <button
            type="button"
            disabled={!nextAgent.trim() || !nextHq.trim()}
            onClick={() => {
              sfx.win();
              onSave(nextAgent.trim(), nextHq.trim());
            }}
            className="chunk flex-1 bg-emerald-400 py-3 text-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * First run. He names his own agent and his own HQ before he writes a line.
 * Costs almost nothing to build, and ownership matters more at 8 than polish.
 */
function FirstRun({ onDone }: { onDone: (agent: string, hq: string) => void }) {
  const [agent, setAgent] = useState('');
  const [hq, setHq] = useState('');

  return (
    <main className="dots flex min-h-[100dvh] items-center justify-center p-4">
      <div className="panel w-full max-w-md p-5">
        <p className="text-4xl">🤖</p>
        <h1 className="title mb-2 text-3xl">Right. You&apos;re in.</h1>
        <p className="mb-5 text-[15px] font-medium leading-relaxed">
          I&apos;m Bolt. I&apos;m a robot, and about 40% toaster. Kea Street needs help and Sniff can&apos;t
          read, so you&apos;re going to tell him what to do — with real code. First: who are you?
        </p>

        <label className="mb-1 block text-xs font-black uppercase opacity-55">Your agent name</label>
        <input
          value={agent}
          onChange={(e) => setAgent(e.target.value.slice(0, 16))}
          placeholder="Agent…"
          className="panel mb-2 w-full px-3 py-2 text-lg font-bold"
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {AGENT_NAMES.map((n) => (
            <button key={n} type="button" onClick={() => setAgent(n)} className="chunk bg-white px-3 text-sm">
              {n}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs font-black uppercase opacity-55">Name your HQ</label>
        <input
          value={hq}
          onChange={(e) => setHq(e.target.value.slice(0, 20))}
          placeholder="The…"
          className="panel mb-2 w-full px-3 py-2 text-lg font-bold"
        />
        <div className="mb-5 flex flex-wrap gap-2">
          {HQ_NAMES.map((n) => (
            <button key={n} type="button" onClick={() => setHq(n)} className="chunk bg-white px-3 text-sm">
              {n}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!agent.trim() || !hq.trim()}
          onClick={() => {
            sfx.win();
            onDone(agent.trim(), hq.trim());
          }}
          className="chunk w-full bg-emerald-400 py-3 text-lg"
        >
          Let&apos;s go →
        </button>
      </div>
    </main>
  );
}

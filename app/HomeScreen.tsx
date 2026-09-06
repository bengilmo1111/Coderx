'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ALL_LEVELS, CHAPTERS } from '@/curriculum/levels';
import { getLevel } from '@/curriculum/levels';
import { suggestCapers } from '@/curriculum/suggest';
import { BRIDGE_CARDS } from '@/curriculum/bridgeCards';
import { STICKERS } from '@/progress/stickers';
import { isUnlocked, levelProgress } from '@/progress/store';
import { nextRank, rankFor, rankProgress } from '@/progress/xp';
import { useProgress } from '@/lib/useProgress';
import { EmojiPin } from '@/components/EmojiPin';
import { Avatar } from '@/components/Avatar';
import { CharacterPicker } from '@/components/CharacterPicker';
import { Landscape } from '@/components/Landscape';
import { Sticker } from '@/components/Sticker';
import { store, emptyProgress } from '@/progress/store';
import { createProfile, signIn, signOut } from '@/lib/sync';
import { sfx } from '@/lib/sound';

const AGENT_NAMES = ['Turbo', 'Chomp', 'Bolt Jr', 'Fang', 'Rocket', 'Spud', 'Nitro', 'Biscuit'];
const HQ_NAMES = ['The Shed', 'Bin HQ', 'The Bunker', 'Sock Drawer', 'The Kennel', 'Base Alpha'];

/** One strong colour per chapter, on the corner of every card in it. */
const CHAPTER_ACCENT = [
  'var(--color-purple)',
  'var(--color-hill)',
  'var(--color-danger)',
  'var(--color-blue)',
];

export function HomeScreen() {
  const { state, update, ready, streakOutcome, sync, syncChecked, refreshSync } = useProgress();
  const [tab, setTab] = useState<'capers' | 'stickers' | 'cards'>('capers');
  const [renaming, setRenaming] = useState(false);
  const [players, setPlayers] = useState(false);
  const [adding, setAdding] = useState(false);
  const [signingIn, setSigningIn] = useState<{ id: string; name: string; avatar: string } | null>(null);
  // A choice of two or three capers, pitched either side of where he is.
  // Above the early returns below, because this screen is also the sign-in
  // wizard and a hook that only sometimes runs is not a hook.
  const capers = useMemo(() => suggestCapers(state), [state]);

  if (!ready) return <div className="p-6 text-center font-black opacity-40">Loading HQ…</div>;

  // Nobody has played on this device. Whether that means "sign in, you already
  // have a game" or "let's make you one" is a question only the server can
  // answer, so wait for it rather than guessing — guessing wrong creates a
  // second profile for a child who already had one.
  if (!state.agentName && !syncChecked) {
    return <div className="p-6 text-center font-black opacity-40">Loading HQ…</div>;
  }

  // Swapping players: his name, his four pictures, his game.
  if (signingIn) {
    return (
      <SignIn
        profiles={[signingIn]}
        onSignedIn={async () => {
          setSigningIn(null);
          await refreshSync();
        }}
        onBack={() => setSigningIn(null)}
      />
    );
  }

  // A second child, on a device the first child already uses. Deliberately the
  // same three questions as the very first run — name, HQ, character — because
  // Casper should get the whole ceremony his brother got, not a cut-down
  // "additional user" form.
  if (adding) {
    return (
      <FirstRun
        needsCode
        heading="A new player"
        blurb="Right then. Someone new. Same deal — you pick who you are, you get your own stickers, and your brother cannot touch them."
        onCancel={() => setAdding(false)}
        onDone={async (agentName, hqName, avatar, pin) => {
          if (!pin) return;
          const res = await createProfile({ name: agentName, hqName, avatar, pin });
          if (!res.ok || !res.profile) return;
          // Point storage at the new player's own slot before anything is
          // written, and say plainly that this one does not inherit the
          // device's existing game — it belongs to his brother.
          store.use(res.profile.id, { adopt: false });
          store.save({ ...emptyProgress(), agentName, hqName, avatar });
          setAdding(false);
          await refreshSync();
        }}
      />
    );
  }

  // A database exists, this device does not know who is playing, and there is
  // no game in progress here to interrupt. Four taps and he is in. If there IS
  // local progress we do not wall it off — that would be a stranger asking a
  // child to prove who he is in front of his own XP — and the player sheet in
  // the header handles it instead.
  if (sync.enabled && !sync.signedIn && (sync.profiles?.length ?? 0) > 0 && !state.agentName) {
    return <SignIn profiles={sync.profiles ?? []} onSignedIn={refreshSync} onNewPlayer={() => setAdding(true)} />;
  }

  if (!state.agentName) {
    return (
      <FirstRun
        needsCode={sync.enabled}
        onDone={async (agentName, hqName, avatar, pin) => {
          update((p) => ({ ...p, agentName, hqName, avatar }));
          if (sync.enabled && pin) {
            await createProfile({ name: agentName, hqName, avatar, pin });
            await refreshSync();
          }
        }}
      />
    );
  }


  const ids = ALL_LEVELS.map((l) => l.id);
  const rank = rankFor(state.xp);
  const next = nextRank(state.xp);
  const pct = Math.round(rankProgress(state.xp) * 100);

  return (
    <main className="world pb-12">
      <Landscape />

      {/* The shed sign: his HQ, his agent name, and how far up the ranks he is. */}
      <header className="mx-auto w-[min(56rem,100%-1.5rem)] pt-8 text-center sm:pt-12">
        <div className="sign mx-auto inline-block max-w-full px-6 py-5 sm:px-12 sm:py-7">
          <span className="float text-4xl sm:text-5xl" aria-hidden="true">
            💻
          </span>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="block w-full text-center"
            title="Change your name"
          >
            <h1 className="title text-4xl leading-none sm:text-6xl">
              {state.hqName || 'HQ'} <span className="align-middle text-base opacity-30">✏️</span>
            </h1>
          </button>
          <p className="mt-2 text-sm font-black text-muted">
            Agent {state.agentName} · {rank.glyph} {rank.name}
          </p>
        </div>

        <div className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-center gap-2">
          {sync.enabled && (
            <button
              type="button"
              onClick={() => {
                sfx.tap();
                setPlayers(true);
              }}
              aria-label="Who's playing"
              className="chunk flex items-center gap-2 bg-paper py-1 pl-1 pr-4 text-sm"
            >
              <Avatar who={state.avatar} size={36} />
              {state.agentName}
            </button>
          )}
          <div className="chunk flex items-center gap-1 bg-orange px-4 text-sm" title="Days in a row">
            🔥 {state.streak.count}
          </div>
          <Link href="/grownups" className="chunk flex items-center bg-paper px-4 text-sm">
            👤
          </Link>
        </div>

        <div className="mx-auto mt-4 max-w-md">
          <div className="h-5 overflow-hidden rounded-full border-[3px] border-ink bg-paper">
            <div className="h-full bg-pop transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs font-black text-ink/70">
            {state.xp} XP{next ? ` · ${next.at - state.xp} to ${next.name} ${next.glyph}` : ' · top rank!'}
          </p>
        </div>
      </header>

      {streakOutcome?.freezeUsed && (
        <div className="mx-auto mt-4 w-[min(56rem,100%-1.5rem)]">
          <div className="panel px-3 py-2 text-sm font-bold" style={{ background: 'color-mix(in srgb, var(--color-sky) 18%, white)' }}>
            🧊 Your streak was frozen while you were away. It&apos;s still going.
          </div>
        </div>
      )}

      {renaming && (
        <Rename
          agent={state.agentName}
          hq={state.hqName}
          avatar={state.avatar}
          onSave={(agentName, hqName, avatar) => {
            update((p) => ({ ...p, agentName, hqName, avatar }));
            setRenaming(false);
          }}
          onClose={() => setRenaming(false)}
        />
      )}

      {players && (
        <Players
          me={sync.signedIn ? (sync.profile ?? null) : null}
          localName={state.agentName}
          localAvatar={state.avatar}
          profiles={sync.profiles ?? []}
          onClose={() => setPlayers(false)}
          onAdd={() => {
            setPlayers(false);
            setAdding(true);
          }}
          onSwitch={async (who) => {
            // Sign out, then ask for HIS four pictures. Without that second
            // half, swapping dropped whoever tapped it into the signed-out
            // local game — which looks like it worked, plays like it worked,
            // and quietly syncs nothing. The code is also the only thing
            // standing between one brother and the other's stickers.
            await signOut();
            setPlayers(false);
            setSigningIn(who);
            await refreshSync();
          }}
          onClaim={async (pin) => {
            // He was already playing here before there was any such thing as a
            // profile. Creating one keeps every bit of that: his slot starts
            // empty, so it adopts what is on this device.
            const res = await createProfile({
              name: state.agentName,
              hqName: state.hqName,
              avatar: state.avatar,
              pin,
            });
            if (res.ok) {
              setPlayers(false);
              await refreshSync();
            }
            return res.ok;
          }}
        />
      )}


      <div className="mx-auto w-[min(56rem,100%-1.5rem)]">
        <nav className="my-5 flex flex-wrap justify-center gap-2">
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
              className={`chunk px-4 text-sm ${tab === key ? 'bg-pop' : 'bg-paper'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'capers' && capers.length > 0 && (
          <section className="mb-5">
            <h2 className="title mb-2 text-lg opacity-70">Today&rsquo;s capers</h2>
            <ol className="space-y-3">
              {capers.map((id) => {
                const caper = getLevel(id);
                if (!caper) return null;
                const prog = levelProgress(state, id);
                return (
                  <li key={id}>
                    <Link href={`/play/${id}`} className="panel flex items-center gap-3 bg-white p-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-pop/60 text-lg">
                        {prog.completed ? '\u2713' : '\u2b50\ufe0f'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-black">{caper.title}</span>
                        <span className="block truncate text-xs font-bold opacity-60">{caper.goalText}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {tab === 'capers' && (
          <Link
            href="/sandbox"
            className="caper lift mb-5 flex items-center gap-3 p-4"
            style={{ ['--accent' as string]: 'var(--color-sun)', ['--tilt' as string]: '0.8deg' }}
          >
            <span className="badge text-xl">🛠️</span>
            <span className="min-w-0 flex-1">
              <span className="block font-black">The Workshop</span>
              <span className="block truncate text-xs font-bold text-muted">
                No job, no rules. Mess about with everything.
              </span>
            </span>
          </Link>
        )}

        {tab === 'capers' &&
          CHAPTERS.map((chapter) => (
            <section key={chapter.number} className="mb-8">
              <h2 className="pill-heading mx-auto mb-4 px-5 py-2 text-lg">
                Chapter {chapter.number} · {chapter.title}
              </h2>
              <ol className="grid gap-4 sm:grid-cols-2">
                {chapter.levels.map((level, i) => {
                  const prog = levelProgress(state, level.id);
                  const unlocked = isUnlocked(state, ids, level.id);
                  return (
                    <li key={level.id} className="min-w-0">
                      <Link
                        href={unlocked ? `/play/${level.id}` : '#'}
                        aria-disabled={!unlocked}
                        style={{
                          ['--accent' as string]: CHAPTER_ACCENT[chapter.number % CHAPTER_ACCENT.length],
                          ['--tilt' as string]: `${(i % 2 ? 1 : -1) * 0.7}deg`,
                        }}
                        className={`caper flex h-full items-center gap-3 p-4 ${
                          unlocked ? 'lift' : 'locked faded pointer-events-none'
                        }`}
                      >
                        <span className="badge text-lg">
                          {prog.completed ? '✓' : unlocked ? level.index : '🔒'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-black">{level.title}</span>
                          <span className="block truncate text-xs font-bold text-muted">{level.goalText}</span>
                          {prog.completed && prog.bestSize !== null && (
                            <span className="mt-1 inline-block rounded-full border-2 border-ink bg-cream px-2 text-[10px] font-black">
                              {prog.bestSize} lines
                            </span>
                          )}
                        </span>
                        {/* Room for the accent blob in the corner. */}
                        <span className="w-6 shrink-0" aria-hidden="true" />
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
                <div key={s.id} className={`panel p-3 text-center ${owned ? '' : 'faded'}`}>
                  <div className="flex h-12 items-center justify-center text-4xl">
                    {owned ? <Sticker id={s.id} size={48} /> : '❓'}
                  </div>
                  <p className="mt-1 text-sm font-black">{owned ? s.name : '???'}</p>
                  {owned && <p className="text-[11px] font-bold text-muted">{s.blurb}</p>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'cards' && (
          <div className="space-y-3">
            {state.clubCards.length === 0 && (
              <p className="panel p-4 text-sm font-bold text-muted">
                No club cards yet. You get one each time you learn something that also shows up in Scratch.
              </p>
            )}
            {state.clubCards.map((id) => {
              const card = BRIDGE_CARDS[id];
              if (!card) return null;
              return (
                <div key={id} className="panel p-4" style={{ background: 'color-mix(in srgb, var(--color-sky) 18%, white)' }}>
                  <p className="title text-sm">{card.title}</p>
                  <pre className="my-2 overflow-x-auto rounded-lg bg-paper/70 p-2 font-[family-name:var(--font-code)] text-xs">
                    {card.youWrote}
                  </pre>
                  <p className="text-sm font-bold leading-snug">{card.body}</p>
                  <p className="mt-2 text-xs font-bold text-muted">
                    In Scratch: <span className="font-black">{card.scratchBlock}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <footer className="panel mt-10 px-5 py-5 text-center">
          <strong className="title block text-xl">Made with vibes</strong>
          <span className="text-sm font-black text-muted">
            By the Gilmores in Lower Hutt, Aotearoa New Zealand · gilmore.games
          </span>
        </footer>
      </div>
    </main>
  );
}

/**
 * Signing in on a second device.
 *
 * With one profile there is no picker: he goes straight to the four emoji,
 * because a choice with one option is just a tap he did not need to make. With
 * two brothers there is, and it leads with their faces — Casper can find
 * himself by his character before he can reliably read either name.
 */
function SignIn({
  profiles,
  onSignedIn,
  onNewPlayer,
  onBack,
}: {
  profiles: { id: string; name: string; avatar: string }[];
  onSignedIn: () => Promise<void>;
  onNewPlayer?: () => void;
  /** Somewhere to go when there is only one name and it is the wrong one. */
  onBack?: () => void;
}) {
  const [chosen, setChosen] = useState(profiles.length === 1 ? profiles[0] : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="world flex items-center justify-center p-4">
      <Landscape />
      {!chosen ? (
        <div className="panel w-full max-w-sm p-5">
          <h2 className="title mb-4 text-2xl">Who&apos;s playing?</h2>
          <div className="grid grid-cols-2 gap-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setChosen(p)}
                className="chunk chunk-card flex flex-col items-center gap-1 bg-paper px-3 py-3"
              >
                <Avatar who={p.avatar} size={52} />
                <span className="font-black">{p.name}</span>
              </button>
            ))}
          </div>
          {onNewPlayer && (
            <button type="button" onClick={onNewPlayer} className="chunk mt-3 w-full bg-paper py-3">
              ➕ Someone else
            </button>
          )}
        </div>
      ) : (
        <EmojiPin
          title={`Hello again, ${chosen.name}`}
          subtitle="Tap your four pictures."
          busy={busy}
          error={error}
          onCancel={profiles.length > 1 ? () => setChosen(null) : (onBack ?? onNewPlayer)}
          onDone={async (pin) => {
            setBusy(true);
            setError(null);
            const result = await signIn(chosen.id, pin);
            setBusy(false);
            if (result.ok) await onSignedIn();
            else setError(result.reason === 'too-many' ? 'Too many tries. Have a break.' : 'Not those four. Try again.');
          }}
        />
      )}
    </main>
  );
}

/**
 * Who is playing, and how to become somebody else.
 *
 * One computer, two brothers. Switching has to be as ordinary as picking a
 * controller, and it has to be obvious from the home screen whose game is on
 * display — an 8-year-old who finds his brother's XP where his own should be
 * will conclude he has lost everything.
 */
function Players({
  me,
  localName,
  localAvatar,
  profiles,
  onClose,
  onAdd,
  onSwitch,
  onClaim,
}: {
  me: { id: string; name: string; avatar: string } | null;
  localName: string;
  localAvatar: string;
  profiles: { id: string; name: string; avatar: string }[];
  onClose: () => void;
  onAdd: () => void;
  onSwitch: (who: { id: string; name: string; avatar: string }) => Promise<void>;
  onClaim: (pin: string[]) => Promise<boolean>;
}) {
  const [claiming, setClaiming] = useState(false);
  const others = profiles.filter((p) => p.id !== me?.id);

  if (claiming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <EmojiPin
          title="Pick a secret"
          subtitle={`Four pictures, ${localName}. This is how you get your game on the phone too.`}
          confirm
          onCancel={() => setClaiming(false)}
          onDone={async (pin) => {
            await onClaim(pin);
          }}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="panel pop-in w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="title mb-4 text-2xl">Who&apos;s playing?</h2>

        <div className="panel mb-4 flex items-center gap-3 bg-pop/40 p-3">
          <Avatar who={me?.avatar ?? localAvatar} size={44} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-black">{me?.name ?? localName}</span>
            <span className="block text-xs font-bold opacity-60">
              {me ? 'Playing now · saved to the cloud' : 'Playing now · only on this device'}
            </span>
          </span>
        </div>

        {!me && (
          <button type="button" onClick={() => setClaiming(true)} className="chunk mb-2 w-full bg-hill py-3">
            Save my game to the cloud
          </button>
        )}

        {others.length > 0 && (
          <>
            <p className="mb-1 text-xs font-black uppercase opacity-55">Swap to</p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {others.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSwitch(p)}
                  className="chunk chunk-card flex flex-col items-center gap-1 bg-paper px-3 py-3"
                >
                  <Avatar who={p.avatar} size={44} />
                  <span className="truncate font-black">{p.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="chunk bg-paper px-4">
            Back
          </button>
          <button type="button" onClick={onAdd} className="chunk flex-1 bg-paper py-3">
            ➕ Add a player
          </button>
        </div>
      </div>
    </div>
  );
}

/** Names are not forever. He asked to be able to change his — and his face. */
function Rename({
  agent,
  hq,
  avatar,
  onSave,
  onClose,
}: {
  agent: string;
  hq: string;
  avatar: string;
  onSave: (agent: string, hq: string, avatar: string) => void;
  onClose: () => void;
}) {
  const [nextAgent, setNextAgent] = useState(agent);
  const [nextHq, setNextHq] = useState(hq);
  const [nextAvatar, setNextAvatar] = useState(avatar);

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
          className="panel mb-3 w-full px-3 py-2 text-lg font-bold"
        />

        <label className="mb-1 block text-xs font-black uppercase opacity-55">Who you are</label>
        <div className="mb-4">
          <CharacterPicker value={nextAvatar} onChange={setNextAvatar} />
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="chunk bg-paper px-4">
            Cancel
          </button>
          <button
            type="button"
            disabled={!nextAgent.trim() || !nextHq.trim()}
            onClick={() => {
              sfx.win();
              onSave(nextAgent.trim(), nextHq.trim(), nextAvatar);
            }}
            className="chunk flex-1 bg-hill py-3 text-lg"
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
function FirstRun({
  needsCode,
  heading,
  blurb,
  onCancel,
  onDone,
}: {
  needsCode: boolean;
  heading?: string;
  blurb?: string;
  onCancel?: () => void;
  onDone: (agent: string, hq: string, avatar: string, pin?: string[]) => void;
}) {
  const [agent, setAgent] = useState('');
  const [hq, setHq] = useState('');
  const [avatar, setAvatar] = useState<string>('sniff');
  const [pickingCode, setPickingCode] = useState(false);

  if (pickingCode) {
    return (
      <main className="world flex items-center justify-center p-4">
      <Landscape />
        <EmojiPin
          title="Pick a secret"
          subtitle="Four pictures, in an order you will remember. This is how you get back in on another device."
          confirm
          onCancel={() => setPickingCode(false)}
          onDone={(pin) => onDone(agent.trim(), hq.trim(), avatar, pin)}
        />
      </main>
    );
  }

  return (
    <main className="world flex items-center justify-center p-4">
      <Landscape />
      <div className="panel w-full max-w-md p-5">
        <p className="text-4xl">🤖</p>
        <h1 className="title mb-2 text-3xl">{heading ?? "Right. You're in."}</h1>
        <p className="mb-5 text-[15px] font-medium leading-relaxed">
          {blurb ??
            "I'm Bolt. I'm a robot, and about 40% toaster. Kea Street needs help and Sniff can't read, so you're going to tell him what to do — with real code. First: who are you?"}
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
            <button key={n} type="button" onClick={() => setAgent(n)} className="chunk bg-paper px-3 text-sm">
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
            <button key={n} type="button" onClick={() => setHq(n)} className="chunk bg-paper px-3 text-sm">
              {n}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs font-black uppercase opacity-55">Who do you want to be?</label>
        <div className="mb-5">
          <CharacterPicker value={avatar} onChange={setAvatar} />
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="chunk bg-paper px-4">
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!agent.trim() || !hq.trim()}
            onClick={() => {
              sfx.win();
              if (needsCode) setPickingCode(true);
              else onDone(agent.trim(), hq.trim(), avatar);
            }}
            className="chunk flex-1 bg-hill py-3 text-lg"
          >
            {needsCode ? 'Next →' : "Let's go →"}
          </button>
        </div>
      </div>
    </main>
  );
}

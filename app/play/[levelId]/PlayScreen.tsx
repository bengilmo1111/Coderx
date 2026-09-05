'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { CodeList } from '@/editor/CodeList';
import { BrickBar } from '@/editor/BrickBar';
import { HolePicker } from '@/editor/HolePicker';
import { BRICKS, bricksFor, type Brick } from '@/editor/bricks';
import { countStmts, findStmt, firstHole, getArg, insertStmt, moveStmt, removeStmt, setArg, wrapStmt, type ArgIndex, type Selection } from '@/editor/program';

import { parse } from '@/lang/parser';
import { printSource } from '@/lang/printer';
import { CoderXError } from '@/lang/errors';
import type { Expr, Program, SlotKind } from '@/lang/types';

import { runProgram, type RunResult } from '@/runtime/run';
import { Stage } from '@/components/Stage';
import { RunBar } from '@/components/RunBar';
import { BoltPanel, type Intent } from '@/components/BoltPanel';
import { RewardPanel } from '@/components/RewardPanel';

import { usePlayback } from '@/lib/usePlayback';
import { useProgress } from '@/lib/useProgress';
import { sfx, loadMutePreference, setMuted } from '@/lib/sound';

import { getLevel, nextLevelId } from '@/curriculum/chapter1/levels';
import { awardsFor, rankFor, type Award } from '@/progress/xp';
import { addMinutes, collect, collectCard, levelProgress, recordSkillAttempt, setLevelProgress } from '@/progress/store';

const DIRECTIONS = ['up', 'down', 'left', 'right'];

/**
 * Which picker belongs to this slot.
 *
 * Reads the argument out of the tree it is given rather than closing over
 * component state — an earlier version consulted the picker that was already
 * open, so tapping "move" offered a number wheel instead of the direction pad.
 */
function slotFor(program: Program, stmtId: string, index: ArgIndex): SlotKind {
  const arg = getArg(program, stmtId, index);
  if (arg?.kind === 'hole') return arg.slot;
  if (index === 'count') return 'number';
  if (index === 'cond') return 'condition';
  if (arg?.kind === 'str') return 'text';
  if (arg?.kind === 'num') return 'number';
  if (arg?.kind === 'ident') return DIRECTIONS.includes(arg.name) ? 'direction' : 'character';
  return 'number';
}

export function PlayScreen({ levelId }: { levelId: string }) {
  const level = getLevel(levelId)!;
  const { state, update, ready } = useProgress();

  const [program, setProgramRaw] = useState<Program>(() => level.makeStarter());
  const [history, setHistory] = useState<Program[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [picker, setPicker] = useState<{ stmtId: string; index: ArgIndex; slot: SlotKind } | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [showBrief, setShowBrief] = useState(true);
  const [showBolt, setShowBolt] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typedDraft, setTypedDraft] = useState('');
  const [typedLines, setTypedLines] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [tookDare, setTookDare] = useState(false);
  const [awards, setAwards] = useState<Award[] | null>(null);
  const [muted, setMutedState] = useState(false);
  const [banner, setBanner] = useState<CoderXError | null>(null);

  const settled = useRef(false);
  const world = useMemo(() => level.makeWorld(), [level]);
  const cast = useMemo(() => level.commandable ?? ['sniff'], [level]);

  useEffect(() => setMutedState(loadMutePreference()), []);

  // Time on task, for the parent view. Counted while he is actually on a level.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => update((p) => addMinutes(p, 1)), 60_000);
    return () => clearInterval(id);
  }, [ready, update]);

  const playback = usePlayback(runResult?.frames ?? []);

  const setProgram = useCallback((next: Program) => {
    setHistory((h) => [...h.slice(-40), program]);
    setProgramRaw(next);
    setRunResult(null);
    setBanner(null);
    settled.current = false;
  }, [program]);

  // Keep his work if he wanders off and comes back.
  useEffect(() => {
    if (!ready) return;
    update((p) => setLevelProgress(p, level.id, { lastCode: printSource(program) }));
  }, [program, ready, level.id, update]);

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      setProgramRaw(h[h.length - 1]);
      setRunResult(null);
      setBanner(null);
      return h.slice(0, -1);
    });
  };

  const tapBrick = (brick: Brick) => {
    const stmt = brick.make();

    // Tapping repeat or if with a line selected WRAPS that line, because that
    // is the order the idea actually arrives in: you do a thing, you notice you
    // need it three times, then you reach for a loop. Building the empty loop
    // first and knowing to aim inside it is programmer's word order.
    const target = selection && !selection.closer ? findStmt(program, selection.stmtId) : null;
    const wrapping = (stmt.kind === 'repeat' || stmt.kind === 'if') && target?.kind === 'call';

    setProgram(wrapping ? wrapStmt(program, selection!.stmtId, stmt) : insertStmt(program, selection, stmt));
    // Land the cursor on the new line so the next tap continues from here.
    setSelection({ stmtId: stmt.id, closer: false });
    // Open the right picker straight away — one tap to place, one to fill.
    const hole = firstHole([stmt]);
    if (hole) setPicker({ stmtId: hole.stmtId, index: hole.index, slot: slotFor([stmt], hole.stmtId, hole.index) });
  };

  const openPicker = (stmtId: string, index: ArgIndex) => {
    const slot = slotFor(program, stmtId, index);
    if (slot === 'condition') return; // conditions arrive whole, from the brick
    setPicker({ stmtId, index, slot });
  };

  const fillHole = (value: Expr) => {
    if (!picker) return;
    setProgram(setArg(program, picker.stmtId, picker.index, value));
    setPicker(null);
  };

  const addTypedLine = () => {
    const text = typedDraft.trim();
    if (!text) return;
    try {
      const parsed = parse(text);
      if (!parsed.length) return;
      let next = program;
      let sel = selection;
      for (const stmt of parsed) {
        next = insertStmt(next, sel, stmt);
        sel = { stmtId: stmt.id, closer: false };
      }
      setProgram(next);
      setSelection(sel);
      setTypedLines((n) => n + parsed.length);
      setTypedDraft('');
      setTyping(false);
      sfx.place();
    } catch (e) {
      if (e instanceof CoderXError) {
        setBanner(e);
        sfx.oops();
      }
    }
  };

  const run = () => {
    const hole = firstHole(program);
    if (hole) {
      sfx.oops();
      setBanner(new CoderXError("There's still an empty box in your code. I can't run a gap!", { tryThis: 'Tap the yellow box and fill it in.' }));
      setPicker({ stmtId: hole.stmtId, index: hole.index, slot: slotFor(program, hole.stmtId, hole.index) });
      return;
    }
    settled.current = false;
    setBanner(null);
    setAwards(null);
    const result = runProgram(program, level.makeWorld(), { commandable: cast });
    setRunResult(result);
    sfx.step();
  };

  // Auto-play a fresh run.
  useEffect(() => {
    if (runResult) playback.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runResult]);

  // Decide the outcome once the animation has actually finished, so he sees
  // what happened before he is told about it.
  useEffect(() => {
    if (!runResult || !playback.done || settled.current || !ready) return;
    settled.current = true;

    const size = countStmts(program);
    const won = !runResult.error && level.goal({ world: runResult.finalWorld, saids: runResult.saids, size });
    const before = levelProgress(state, level.id);

    if (runResult.error) {
      sfx.oops();
      setBanner(runResult.error);
    }

    // Worked out here rather than inside the updater: React invokes updaters
    // more than once, so they have to stay pure.
    const earned = won
      ? awardsFor({
          base: level.reward.xp,
          typedLines,
          size,
          par: level.par,
          hintsUsed,
          tookDare,
          firstTime: !before.completed,
        })
      : null;

    update((p) => {
      const prev = levelProgress(p, level.id);
      let next = setLevelProgress(p, level.id, {
        attempts: prev.attempts + 1,
        completed: prev.completed || won,
        hintsUsed: prev.hintsUsed + hintsUsed,
        typedItHimself: prev.typedItHimself || typedLines > 0,
        bestSize: won ? Math.min(prev.bestSize ?? Infinity, size) : prev.bestSize,
      });
      next = recordSkillAttempt(next, level.skills, won);
      next = { ...next, typedLines: next.typedLines + typedLines };
      if (!earned) return next;

      next = { ...next, xp: next.xp + earned.reduce((n, a) => n + a.xp, 0) };
      next = collect(next, level.reward.sticker);
      if (typedLines > 0) next = collect(next, 'typing-trophy');
      if (level.bridgeCard) next = collectCard(next, level.bridgeCard);
      return next;
    });

    if (earned) {
      setAwards(earned);
      sfx.win();
    }
    // `state` is read for the pre-run snapshot only; re-running on every save
    // would re-settle the same run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.done, runResult, ready, level, program, hintsUsed, typedLines, tookDare, update]);

  const replay = () => {
    setAwards(null);
    settled.current = false;
    setRunResult(null);
    setHintsUsed(0);
    setTypedLines(0);
    setTookDare(false);
    setProgramRaw(level.makeStarter());
    setHistory([]);
    setSelection(null);
  };

  const onAsked = (intent: Intent) => {
    if (intent === 'stuck' || intent === 'broke') setHintsUsed((n) => n + 1);
    if (intent === 'sillier') setTookDare(true);
  };

  const runningStmtId = playback.playing && runResult ? (runResult.frames[playback.index]?.stmtId ?? null) : null;
  const source = printSource(program);
  const rank = rankFor(state.xp);


  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b-[3px] border-ink px-3 py-2">
        <Link href="/" className="chunk flex items-center bg-white px-3">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black uppercase tracking-wide opacity-50">
            Chapter {level.chapter} · Page {level.index}
          </p>
          <h1 className="truncate text-base font-black leading-tight">{level.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
          }}
          className="chunk bg-white px-3"
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <div className="chunk flex items-center gap-1 bg-pop px-3 text-sm">
          <span>{rank.glyph}</span>
          <span>{state.xp}</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Stage */}
        <section className="flex min-h-0 shrink-0 flex-col gap-2 p-2 lg:flex-1">
          <div className="relative h-[18dvh] min-h-24 lg:h-auto lg:max-h-[34dvh] lg:flex-1">
            <Stage world={world} frames={runResult?.frames ?? []} index={playback.index} t={playback.t} />

          </div>

          {/* While something has gone wrong, Bolt says so HERE, in place of the
              goal. Two earlier versions were both wrong: a block of its own
              squeezed the code down to one clipped line on a phone, and an
              overlay covered the row of the world where the mistake actually
              happened — which is the half of the lesson you can see. */}
          {banner ? (
            <div className="panel shake flex items-start gap-2 border-danger bg-rose-50 px-2 py-1">
              <span className="text-sm leading-5">🤖</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-black leading-snug">{banner.boltSays}</p>
                {banner.tryThis && (
                  <p className="line-clamp-1 text-[11px] font-bold leading-snug opacity-70">{banner.tryThis}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setBanner(null)}
                aria-label="Close"
                className="-mt-0.5 px-1 text-sm font-black opacity-45"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm">🎯</span>
              <p className="min-w-0 flex-1 truncate text-[13px] font-bold">{level.goalText}</p>
              <button
                type="button"
                onClick={() => setShowBrief(true)}
                className="chunk min-h-9 bg-white px-2 text-xs"
                title="Read the case file again"
              >
                📄
              </button>
            </div>
          )}

          <RunBar playback={playback} hasCode={program.length > 0} onRun={run} onStop={playback.pause} />
        </section>

        {/* Code */}
        <section className="flex min-h-[32dvh] flex-1 flex-col border-t-[3px] border-ink lg:min-h-0 lg:border-l-[3px] lg:border-t-0">
          <div className="flex items-center gap-1.5 border-b-2 border-black/10 px-2 py-0.5">
            {/* The budget has to be visible while he writes, not sprung on him
                when he runs it. */}
            {level.maxLines ? (
              <span
                className={`shrink-0 rounded-md border-2 border-ink px-1.5 py-0.5 text-[11px] font-black ${
                  countStmts(program) > level.maxLines ? 'bg-danger text-white' : 'bg-pop'
                }`}
              >
                {countStmts(program)}/{level.maxLines} lines
              </span>
            ) : (
              <span className="hidden text-[11px] font-black uppercase tracking-wide opacity-50 sm:block">
                Your code
              </span>
            )}
            <span className="flex-1" />
            <button type="button" onClick={() => setShowBolt(true)} className="chunk min-h-9 bg-white px-2 text-xs">
              🤖 Bolt
            </button>
            <button type="button" onClick={() => setTyping((v) => !v)} className="chunk min-h-9 bg-white px-2 text-xs" title="Type a line yourself for bonus XP">
              ⌨️ +{15}
            </button>
            <button type="button" onClick={undo} disabled={!history.length} className="chunk min-h-9 bg-white px-2 text-xs">
              ↶
            </button>
            {selection && (
              <>
                <button type="button" onClick={() => setProgram(moveStmt(program, selection.stmtId, -1))} className="chunk min-h-9 bg-white px-2 text-xs">
                  ↑
                </button>
                <button type="button" onClick={() => setProgram(moveStmt(program, selection.stmtId, 1))} className="chunk min-h-9 bg-white px-2 text-xs">
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProgram(removeStmt(program, selection.stmtId));
                    setSelection(null);
                  }}
                  className="chunk min-h-9 bg-rose-300 px-2 text-xs"
                >
                  ✕
                </button>
              </>
            )}
          </div>

          {typing && (
            <div className="border-b-2 border-black/10 bg-pop/30 p-2">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={typedDraft}
                  onChange={(e) => setTypedDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTypedLine()}
                  placeholder="start typing, or tap a line below"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="panel min-w-0 flex-1 px-2 py-2 font-[family-name:var(--font-code)] text-sm"
                />
                <button type="button" onClick={addTypedLine} className="chunk bg-emerald-400 px-3 text-sm">
                  Add
                </button>
              </div>

              {/* The syntax, visible. He tried typing and found it hard, which is
                  fair — nothing told him what a line is meant to look like.
                  Tapping one drops the real thing in the box to edit. */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bricksFor(level.bricks, cast)
                  .filter((b) => b.example.toLowerCase().startsWith(typedDraft.trim().toLowerCase()))
                  .map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        sfx.tap();
                        setTypedDraft(b.example);
                      }}
                      className="chunk min-h-8 bg-white px-2 font-[family-name:var(--font-code)] text-[12px]"
                    >
                      {b.example}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div data-testid="code-scroll" className="min-h-0 flex-1 overflow-y-auto">
            <CodeList
              program={program}
              selection={selection}
              onSelect={setSelection}
              onTapArg={openPicker}
              runningStmtId={runningStmtId}
              errorStmtId={runResult?.error?.stmtId ?? null}
            />
          </div>

          <BrickBar brickIds={level.bricks} cast={cast} onTap={tapBrick} onShowHelp={(b) => setBanner(new CoderXError(BRICKS[b.id].help))} />
        </section>
      </div>

      {picker && (
        <HolePicker
          slot={picker.slot}
          current={getArg(program, picker.stmtId, picker.index)}
          characters={cast}
          onPick={fillHole}
          onClose={() => setPicker(null)}
        />
      )}

      {showBrief && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBrief(false)}>
          <div className="panel pop-in max-h-[80vh] w-full max-w-md overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-black uppercase tracking-wide opacity-50">Case file</p>
            <h2 className="title mb-3 text-2xl">{level.title}</h2>
            <p className="mb-4 text-[15px] font-medium leading-relaxed">{level.briefing}</p>
            <div className="panel mb-4 flex items-center gap-2 bg-pop/40 px-3 py-2">
              <span>🎯</span>
              <p className="text-sm font-black">{level.goalText}</p>
            </div>
            <button type="button" onClick={() => setShowBrief(false)} className="chunk w-full bg-emerald-400 py-3 text-lg">
              On it
            </button>
          </div>
        </div>
      )}

      {showBolt && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setShowBolt(false)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <BoltPanel
              levelId={level.id}
              code={source}
              error={runResult?.error?.boltSays}
              hintsUsed={hintsUsed}
              onAsked={onAsked}
            />
            <button type="button" onClick={() => setShowBolt(false)} className="chunk mt-2 w-full bg-white py-2">
              Close
            </button>
          </div>
        </div>
      )}

      {awards && (
        <RewardPanel
          awards={awards}
          sticker={level.reward.sticker}
          bridgeCard={level.bridgeCard}
          nextHref={nextLevelId(level.id) ? `/play/${nextLevelId(level.id)}` : undefined}
          onReplay={replay}
        />
      )}
    </main>
  );
}

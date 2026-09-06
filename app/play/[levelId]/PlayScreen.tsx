'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { CodeList } from '@/editor/CodeList';
import { BrickBar } from '@/editor/BrickBar';
import { HolePicker, WORD_BANK } from '@/editor/HolePicker';
import { BRICKS, bricksFor, type Brick } from '@/editor/bricks';
import { countStmts, definedNames, findStmt, firstHole, getArg, insertStmt, missingRequirement, moveStmt, removeStmt, setArg, wrapStmt, type ArgIndex, type Selection } from '@/editor/program';

import { parse } from '@/lang/parser';
import { printSource } from '@/lang/printer';
import { CoderXError } from '@/lang/errors';
import type { Expr, Program, SlotKind, Stmt } from '@/lang/types';

import { runProgram, type RunResult } from '@/runtime/run';
import { Stage } from '@/components/Stage';
import { RunBar } from '@/components/RunBar';
import { BoltPanel, type Intent } from '@/components/BoltPanel';
import { CallIt } from '@/components/CallIt';
import { RewardPanel } from '@/components/RewardPanel';

import { usePlayback } from '@/lib/usePlayback';
import { useProgress } from '@/lib/useProgress';
import { sfx, loadMutePreference, setMuted } from '@/lib/sound';
import { bankWordsIn, flush, observe } from '@/lib/observe';

import { getLevel, nextLevelId } from '@/curriculum/levels';
import { callItVerdict, predictionFor } from '@/curriculum/predict';
import { fadeStarter, RUNGS, starterCursor } from '@/curriculum/fade';
import { parseGeneratedId } from '@/curriculum/template';
import { scaffoldRung } from '@/progress/scaffold';
import { awardsFor, rankFor, type Award } from '@/progress/xp';
import { addMinutes, collect, collectCard, levelProgress, recordSkillAttempt, setLevelProgress } from '@/progress/store';
import { newBadges } from '@/progress/badges';

const DIRECTIONS = ['up', 'down', 'left', 'right'];
const MODE_NAMES = ['robot', 'drill', 'jet', 'magnet'];

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
  if (arg?.kind === 'ident') {
    if (DIRECTIONS.includes(arg.name)) return 'direction';
    if (MODE_NAMES.includes(arg.name)) return 'mode';
    return 'character';
  }
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
  const [naming, setNaming] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const [typedDraft, setTypedDraft] = useState('');
  const [typedLines, setTypedLines] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [tookDare, setTookDare] = useState(false);
  const [awards, setAwards] = useState<Award[] | null>(null);
  const [earnedBadge, setEarnedBadge] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [called, setCalled] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [banner, setBanner] = useState<CoderXError | null>(null);

  const settled = useRef(false);
  /** When he arrived. Time-to-first-hint is the sharpest signal a level is over-pitched. */
  const arrivedAt = useRef(Date.now());
  /** Latest snapshot, so the abandon record on unmount does not re-run the effect. */
  const latest = useRef({ ran: false, won: false, size: 0, hintsUsed: 0 });
  const abandonRecorded = useRef(false);
  /**
   * Has he been asked to call it on this visit?
   *
   * Once per caper, not once per edit. Predicting is worth doing when he has
   * just built something and has a real hypothesis about it; asking again
   * after every tweak turns Run into a toll gate and the habit into a tax.
   */
  const asked = useRef(false);
  /** Has the page been filled in from his saved work or a head start yet? */
  const seeded = useRef(false);
  const world = useMemo(() => level.makeWorld(), [level]);
  const cast = useMemo(() => level.commandable ?? ['sniff'], [level]);
  /** What to ask him to guess, derived from the board. Null means don't ask. */
  const prediction = useMemo(() => predictionFor(level), [level]);
  /** His code as text. Doubles as the identity of "this version" for Call It. */
  const source = printSource(program);
  /** Commands he has defined in this program — each becomes a brick of its own. */
  const defined = useMemo(() => definedNames(program), [program]);

  useEffect(() => setMutedState(loadMutePreference()), []);

  // A snapshot for the record on the way out. Held in a ref so watching it does
  // not re-register the listener on every tap.
  useEffect(() => {
    latest.current = { ...latest.current, size: countStmts(program), hintsUsed };
  }, [program, hintsUsed]);

  /**
   * Where he gives up.
   *
   * The level he closes without finishing says more than the one he finishes
   * slowly. A child closes the lid; he does not navigate away politely, so this
   * fires on the way out AND when the tab is hidden, and flushes immediately.
   */
  useEffect(() => {
    if (level.sandbox) return; // free play has nothing to abandon
    const record = () => {
      const { ran, won, size, hintsUsed: hints } = latest.current;
      if (abandonRecorded.current || won || size === 0) return;
      abandonRecorded.current = true;
      observe({
        kind: 'abandon',
        levelId: level.id,
        skillIds: level.skills,
        payload: {
          size,
          hintsUsed: hints,
          ranIt: ran,
          secondsOnLevel: Math.round((Date.now() - arrivedAt.current) / 1000),
        },
      });
      void flush();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') record();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      record();
    };
  }, [level]);

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
    setVerdict(null);
    settled.current = false;
  }, [program]);

  /**
   * What is on the page when he arrives.
   *
   * Deferred to an effect rather than done in `useState`, because progress is
   * local-first: the server has no localStorage, so the first render is always
   * the empty state and his real game arrives a tick later. Seeding from it any
   * earlier would give every child the beginner's head start.
   *
   * HIS OWN SAVED CODE WINS. `lastCode` has been written on every edit, merged
   * across devices and synced since Build 2, and never once read back — the
   * comment here used to promise it kept his work if he wandered off, and it
   * did not. It does now.
   *
   * Failing that, a head start sized to how sure of this he already is: new to
   * loops and he arrives to one nearly finished and completes it; once it has
   * landed, the blank page every level used to hand everyone regardless.
   */
  useEffect(() => {
    if (!ready || seeded.current) return;
    seeded.current = true;

    const previous = levelProgress(state, level.id).lastCode;
    if (previous.trim()) {
      try {
        const restored = parse(previous);
        setProgramRaw(restored);
        setSelection(starterCursor(restored));
        return;
      } catch {
        // Saved code that no longer parses is not worth losing the level over.
      }
    }
    if (level.makeStarter().length) return; // a level that ships its own wins

    /**
     * Who gets a head start.
     *
     * NOT everyone, and finding that out is why this is worth writing down.
     * Faded worked examples help someone who has met the idea before; a boy on
     * his very first caper has not, and handing him four of its five lines
     * would mean the level where he first tells a dog what to do is a level
     * where he does almost nothing. Chapter 1 is already a designed ramp with
     * its own hint ladder — it does not need a second one.
     *
     * So the fade is for the two places nothing else is scaffolding him:
     * generated capers, which have no authored progression at all, and a
     * hand-written level that has genuinely beaten him. A completion problem is
     * a good answer to being stuck and a poor answer to being new.
     */
    const saved = levelProgress(state, level.id);
    const beaten = !saved.completed && saved.attempts >= 3;
    if (!parseGeneratedId(level.id) && !beaten) return;

    const rung = scaffoldRung(state, level.skills);
    const starter = fadeStarter(level, rung);
    observe({
      kind: 'scaffold_rung',
      levelId: level.id,
      skillIds: level.skills,
      payload: { rung, given: countStmts(starter) },
    });
    if (rung >= RUNGS.keyboard) setTyping(true);
    if (starter.length) {
      setProgramRaw(starter);
      setSelection(starterCursor(starter));
    }
  }, [ready, state, level]);

  // Keep his work if he wanders off and comes back — read back above.
  useEffect(() => {
    if (!ready || !seeded.current) return;
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
    // Which brick he reaches for, before anything is decided about whether it
    // helped. Ignoring a brick that would have helped says as much as using one.
    observe({ kind: 'brick_used', levelId: level.id, skillIds: level.skills, payload: { brick: brick.id } });

    // Naming happens as the command is created, so there is never a nameless
    // definition sitting on screen waiting to be filled in.
    if (brick.id === 'define') {
      setNaming(true);
      return;
    }
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

  const nameNewCommand = (value: Expr) => {
    setNaming(false);
    if (value.kind !== 'str' || !value.value) return;
    // The length, never the name. Naming a command is the one place he writes
    // a word of his own into the program.
    observe({ kind: 'defined_command', levelId: level.id, payload: { length: value.value.length } });
    const stmt: Stmt = { kind: 'define', id: `d${Date.now()}`, name: value.value, body: [] };
    setProgram(insertStmt(program, selection, stmt));
    setSelection({ stmtId: stmt.id, closer: false });
  };

  const fillHole = (value: Expr) => {
    if (!picker) return;
    // Words he TAPPED from the bank are data we chose, so they are safe to keep
    // as an interest signal. Words he typed himself are his, and are not recorded.
    if (value.kind === 'str') {
      for (const word of bankWordsIn(value.value, WORD_BANK)) {
        observe({ kind: 'word_chosen', levelId: level.id, payload: { word } });
      }
    }
    if (picker.slot === 'mode' && value.kind === 'ident') {
      observe({ kind: 'mode_used', levelId: level.id, payload: { mode: value.name } });
    }
    const next = setArg(program, picker.stmtId, picker.index, value);
    setProgram(next);

    // Chain straight on to the next gap in the SAME line. "move far" has two —
    // a direction and a number — and stopping after the first left the second
    // sitting there for him to notice on his own.
    const stmt = findStmt(next, picker.stmtId);
    const hole = stmt ? firstHole([stmt]) : null;
    setPicker(
      hole ? { stmtId: hole.stmtId, index: hole.index, slot: slotFor(next, hole.stmtId, hole.index) } : null,
    );
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
      // How much he typed, never what. Readiness for the keyboard is the signal.
      observe({ kind: 'typed_line', levelId: level.id, payload: { lines: parsed.length, chars: text.length } });
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

  const go = () => {
    settled.current = false;
    setBanner(null);
    setAwards(null);
    const result = runProgram(program, level.makeWorld(), { commandable: cast });
    setRunResult(result);
    sfx.step();
  };

  const run = () => {
    const hole = firstHole(program);
    if (hole) {
      sfx.oops();
      setBanner(new CoderXError("There's still an empty box in your code. I can't run a gap!", { tryThis: 'Tap the yellow box and fill it in.' }));
      setPicker({ stmtId: hole.stmtId, index: hole.index, slot: slotFor(program, hole.stmtId, hole.index) });
      return;
    }
    // Ask for a call once per version of his code, never on a re-run: watching
    // it again is not a new guess, and being asked twice would make Run feel
    // like a toll gate.
    if (prediction && !asked.current) {
      setAsking(true);
      return;
    }
    go();
  };

  /** He made a call. Record it, then run — the reveal is the run itself. */
  const callIt = (choice: string) => {
    asked.current = true;
    setCalled(choice);
    observe({
      kind: 'prediction',
      levelId: level.id,
      skillIds: level.skills,
      payload: { called: choice, options: prediction?.options.length ?? 0 },
    });
    setAsking(false);
    go();
  };

  const skipCall = () => {
    // Skipping still counts as being asked, so declining once is respected
    // for the rest of the caper rather than re-offered on the next run.
    asked.current = true;
    setCalled(null);
    setAsking(false);
    go();
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
    // Free play has nothing to win, so nothing to score either.
    if (level.sandbox) {
      settled.current = true;
      if (runResult.error) {
        sfx.oops();
        setBanner(runResult.error);
      }
      return;
    }
    settled.current = true;

    const size = countStmts(program);
    // A level can also insist on a construct, where a line budget cannot force
    // one — `repeat 3` is shorter than naming a number and repeating that.
    const missing = missingRequirement(program, level.requires);
    const won =
      !runResult.error &&
      !missing &&
      level.goal({ world: runResult.finalWorld, saids: runResult.saids, size });

    if (!runResult.error && missing) {
      setBanner(new CoderXError('That works! But this one is about a particular trick.', { tryThis: missing }));
    }
    const before = levelProgress(state, level.id);

    if (runResult.error) {
      sfx.oops();
      setBanner(runResult.error);
    }

    /**
     * The reveal, which is just the run having happened.
     *
     * Scored on whether he CALLED it, never on whether he was right. A bonus
     * for being right is a penalty for being wrong wearing a hat, and a boy who
     * stops guessing has stopped predicting — which was the entire point.
     */
    let calledIt = false;
    if (called && prediction) {
      const actual = prediction.from({ world: runResult.finalWorld, saids: runResult.saids });
      calledIt = true;
      setVerdict(callItVerdict(called, actual));
      observe({
        kind: 'prediction',
        levelId: level.id,
        skillIds: level.skills,
        payload: { called, actual, correct: called === actual, resolved: true },
      });
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
          calledIt,
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
      // A generated caper names no sticker — the collection stays hand-written,
      // and pays out instead through the crew badges below.
      if (level.reward.sticker) next = collect(next, level.reward.sticker);
      if (typedLines > 0) next = collect(next, 'typing-trophy');
      if (level.bridgeCard) next = collectCard(next, level.bridgeCard);
      return next;
    });

    // The record of what happened. An observation, never a conclusion:
    // docs/memory-loop.md is explicit that judgements get derived at read time.
    observe({
      kind: 'level_attempt',
      levelId: level.id,
      skillIds: level.skills,
      payload: {
        won,
        firstTime: won && !before.completed,
        attempt: before.attempts + 1,
        size,
        par: level.par,
        hintsUsed,
        typedLines,
        tookDare,
        errored: Boolean(runResult.error),
        missedConstruct: Boolean(missing),
        secondsOnLevel: Math.round((Date.now() - arrivedAt.current) / 1000),
      },
    });
    latest.current = { ...latest.current, ran: true, won: latest.current.won || won, size, hintsUsed };

    if (earned) {
      setAwards(earned);
      sfx.win();
    }
    // `state` is read for the pre-run snapshot only; re-running on every save
    // would re-settle the same run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback.done, runResult, ready, level, program, hintsUsed, typedLines, tookDare, update]);

  /**
   * Crew badges.
   *
   * Earned by a pattern across many capers rather than by finishing this one,
   * so they are checked against the whole state — and out here rather than
   * inside an updater, which React is free to run more than once.
   */
  useEffect(() => {
    if (!ready) return;
    const fresh = newBadges(state);
    if (!fresh.length) return;
    setEarnedBadge((b) => b ?? fresh[0]);
    update((p) => {
      let next = p;
      for (const id of fresh) next = collect(next, id);
      return next;
    });
  }, [state, ready, update]);

  const replay = () => {
    // Only a genuine replay counts. Retrying something he has not beaten yet is
    // persistence, not preference, and the attempt record already carries it.
    if (levelProgress(state, level.id).completed) {
      observe({ kind: 'replay', levelId: level.id, skillIds: level.skills });
    }
    arrivedAt.current = Date.now();
    abandonRecorded.current = false;
    asked.current = false;
    setCalled(null);
    setVerdict(null);
    setAwards(null);
    setEarnedBadge(null);
    settled.current = false;
    setRunResult(null);
    setHintsUsed(0);
    setTypedLines(0);
    setTookDare(false);
    const authored = level.makeStarter();
    const fresh = authored.length ? authored : fadeStarter(level, scaffoldRung(state, level.skills));
    setProgramRaw(fresh);
    setHistory([]);
    setSelection(starterCursor(fresh));
  };

  const onAsked = (intent: Intent) => {
    // Time-to-first-hint is the signal: falling fast means the level is
    // over-pitched. Never asking may mean too easy — or that asking feels costly.
    observe({
      kind: intent === 'sillier' ? 'dare' : 'hint',
      levelId: level.id,
      skillIds: level.skills,
      payload: {
        intent,
        nth: hintsUsed + 1,
        secondsIn: Math.round((Date.now() - arrivedAt.current) / 1000),
      },
    });
    if (intent === 'stuck' || intent === 'broke') setHintsUsed((n) => n + 1);
    if (intent === 'sillier') setTookDare(true);
  };

  const runningStmtId = playback.playing && runResult ? (runResult.frames[playback.index]?.stmtId ?? null) : null;
  const rank = rankFor(state.xp);


  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b-[3px] border-ink px-3 py-2">
        <Link href="/" className="chunk flex items-center bg-paper px-3">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black uppercase tracking-wide opacity-50">
            {level.sandbox
              ? 'Free play'
              : /* Generated capers sit outside the chapters, so they have no
                   number — and "Chapter 0 · Page 0" reads like a bug to an
                   eight-year-old, because it is one. */
                parseGeneratedId(level.id)
                ? "Today's caper"
                : `Chapter ${level.chapter} · Page ${level.index}`}
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
          className="chunk bg-paper px-3"
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
          {/* A grid needs more height than a one-row street, but not so much
              that it takes back the code space we fought for. It gets a modest
              share inline, and tapping it opens a proper look. */}
          <button
            type="button"
            data-testid="stage-box"
            onClick={() => setEnlarged(true)}
            title="Tap for a bigger look"
            className={`relative block w-full ${
              world.h > 1 ? 'h-[24dvh] min-h-36' : 'h-[18dvh] min-h-24'
            } lg:h-auto lg:max-h-[42dvh] lg:flex-1`}
          >
            <Stage world={world} frames={runResult?.frames ?? []} index={playback.index} t={playback.t} />
            {world.h > 1 && (
              <span className="pointer-events-none absolute bottom-1 right-1 rounded-md border-2 border-ink bg-paper/85 px-1.5 text-[10px] font-black opacity-70">
                tap to zoom
              </span>
            )}
          </button>

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
          ) : verdict ? (
            /* The reveal shares the goal line's space rather than taking any of
               its own — the code list is already tight at 390x660, and the one
               thing this screen may never do is squeeze his code. */
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm">🤖</span>
              <p className="min-w-0 flex-1 truncate text-[13px] font-bold">{verdict}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm">🎯</span>
              <p className="min-w-0 flex-1 truncate text-[13px] font-bold">{level.goalText}</p>
              <button
                type="button"
                onClick={() => setShowBrief(true)}
                className="chunk min-h-9 bg-paper px-2 text-xs"
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
            <button type="button" onClick={() => setShowBolt(true)} className="chunk min-h-9 bg-paper px-2 text-xs">
              🤖 Bolt
            </button>
            <button type="button" onClick={() => setTyping((v) => !v)} className="chunk min-h-9 bg-paper px-2 text-xs" title="Type a line yourself for bonus XP">
              ⌨️ +{15}
            </button>
            <button type="button" onClick={undo} disabled={!history.length} className="chunk min-h-9 bg-paper px-2 text-xs">
              ↶
            </button>
            {selection && (
              <>
                <button type="button" onClick={() => setProgram(moveStmt(program, selection.stmtId, -1))} className="chunk min-h-9 bg-paper px-2 text-xs">
                  ↑
                </button>
                <button type="button" onClick={() => setProgram(moveStmt(program, selection.stmtId, 1))} className="chunk min-h-9 bg-paper px-2 text-xs">
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
                <button type="button" onClick={addTypedLine} className="chunk bg-hill px-3 text-sm">
                  Add
                </button>
              </div>

              {/* The syntax, visible. He tried typing and found it hard, which is
                  fair — nothing told him what a line is meant to look like.
                  Tapping one drops the real thing in the box to edit. */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bricksFor(level.bricks, cast, level.variable, defined)
                  .filter((b) => b.example.toLowerCase().startsWith(typedDraft.trim().toLowerCase()))
                  .map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        sfx.tap();
                        setTypedDraft(b.example);
                      }}
                      className="chunk min-h-8 bg-paper px-2 font-[family-name:var(--font-code)] text-[12px]"
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

          <BrickBar brickIds={level.bricks} cast={cast} variable={level.variable} defined={defined} onTap={tapBrick} onShowHelp={(b) => setBanner(new CoderXError(BRICKS[b.id].help))} />
        </section>
      </div>

      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/70 p-3"
          onClick={() => setEnlarged(false)}
        >
          <div className="min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
            <Stage world={world} frames={runResult?.frames ?? []} index={playback.index} t={playback.t} />
          </div>
          <button type="button" onClick={() => setEnlarged(false)} className="chunk mt-3 bg-paper py-3 text-lg">
            Back to the code
          </button>
        </div>
      )}

      {naming && (
        <HolePicker
          slot="name"
          current={null}
          characters={cast}
          onPick={nameNewCommand}
          onClose={() => setNaming(false)}
        />
      )}

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
            <button type="button" onClick={() => setShowBrief(false)} className="chunk w-full bg-hill py-3 text-lg">
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
            <button type="button" onClick={() => setShowBolt(false)} className="chunk mt-2 w-full bg-paper py-2">
              Close
            </button>
          </div>
        </div>
      )}

      {asking && prediction && (
        <CallIt
          question={prediction.question}
          options={prediction.options}
          onCall={callIt}
          onSkip={skipCall}
        />
      )}

      {awards && (
        <RewardPanel
          awards={awards}
          sticker={level.reward.sticker ?? earnedBadge ?? undefined}
          verdict={verdict}
          bridgeCard={level.bridgeCard}
          nextHref={nextLevelId(level.id) ? `/play/${nextLevelId(level.id)}` : undefined}
          onReplay={replay}
        />
      )}
    </main>
  );
}

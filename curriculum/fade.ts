/**
 * The scaffold that comes off.
 *
 * For someone new to an idea, studying a worked example and then COMPLETING a
 * half-finished one beats being handed a blank page — and then, once it has
 * clicked, the half-finished version starts getting in the way. The scaffold
 * has to fade, and coderX has never faded anything: `makeStarter` returns an
 * empty program on all nineteen levels, and `typedLines` is read in four places,
 * every one of them scoring or advising his dad. Tap-first had no designed exit.
 *
 * So the rung decides how much of the answer is already on the page when he
 * arrives. It is derived from the level's own reference solution, which means it
 * works for hand-written and generated levels alike with nothing authored.
 *
 * THE STARTER MUST NEVER SOLVE THE LEVEL. Arriving to a finished answer and
 * pressing Run is worse than arriving to nothing: it teaches that the game plays
 * itself. So this does not assume — it runs the candidate and keeps taking
 * statements away until the level is genuinely unfinished. Proved, like the
 * reference solutions, rather than hoped for.
 */

import { parse } from '@/lang/parser';
import type { Program, Stmt } from '@/lang/types';
import { runProgram } from '@/runtime/run';
import type { Level } from './types';

/** How much help is on the page. Low is more help; he climbs. */
export const RUNGS = {
  /** Nearly finished. One step left to complete. */
  study: 0,
  /** The shape of it, empty inside. */
  shell: 1,
  /** A blank page — what every level did before. */
  solo: 2,
  /** Blank, and the keyboard is already open. */
  keyboard: 3,
} as const;

export type Rung = (typeof RUNGS)[keyof typeof RUNGS];

const isBlock = (s: Stmt): s is Extract<Stmt, { body: Stmt[] }> =>
  s.kind === 'repeat' || s.kind === 'if' || s.kind === 'until' || s.kind === 'define';

/**
 * Take one statement off the end, reaching inside the last block first.
 *
 * Removing from the inside out is what makes the fade feel like a fade: the
 * loop stays, and the thing he has to work out is the step that goes in it.
 */
function dropLast(program: Program): Program {
  if (!program.length) return program;
  const last = program[program.length - 1];
  if (isBlock(last) && last.body.length) {
    return [...program.slice(0, -1), { ...last, body: dropLast(last.body) }];
  }
  return program.slice(0, -1);
}

/** Keep the blocks, throw away what goes in them. */
function shellOnly(program: Program): Program {
  return program.filter(isBlock).map((s) => ({ ...s, body: [] }));
}

/**
 * Where the cursor goes when he arrives to a half-written program.
 *
 * Inside the loop, on the last line of it — because that is where the work
 * carries on. Left to default to nothing, his very first tap lands AFTER the
 * closing brace and the level errors on a move that looked perfectly sensible,
 * which is a worse start than an empty page.
 */
export function starterCursor(program: Program): { stmtId: string; closer: boolean } | null {
  if (!program.length) return null;
  const last = program[program.length - 1];
  if (isBlock(last) && last.body.length) return starterCursor(last.body);
  return { stmtId: last.id, closer: false };
}

/**
 * A starter is allowed to be wrong. It is not allowed to be broken.
 *
 * Two ways it can be unusable, and the second one is the one that bit:
 *
 *   - It already solves the level, so pressing Run wins and he learns that the
 *     game plays itself.
 *   - It RUNS AWAY. `repeatUntil dragonBeaten() { }` with nothing inside never
 *     beats the dragon, so it spins until the step budget and hands him a
 *     program that looks broken before he has touched it. Chapter 2 is built on
 *     that loop, so this is not a corner case.
 *
 * An ordinary error is fine — walking into a fence is half the lesson. Only a
 * finished answer and a runaway are disqualifying.
 */
const STARTER_STEPS = 2_000;

function unusable(level: Level, program: Program): boolean {
  const result = runProgram(program, level.makeWorld(), {
    commandable: level.commandable ?? ['sniff'],
    maxSteps: STARTER_STEPS,
  });
  if (result.steps >= STARTER_STEPS) return true;
  if (result.error) return false;
  const size = program.reduce(function count(n: number, s: Stmt): number {
    return n + 1 + (isBlock(s) ? s.body.reduce(count, 0) : 0);
  }, 0);
  return level.goal({ world: result.finalWorld, saids: result.saids, size });
}

/**
 * What is on the page when he arrives at this level, at this rung.
 *
 * Sandbox levels get nothing ever: the Workshop is the one place with nothing
 * to get wrong, and a half-written program sitting in it would be a suggestion.
 */
export function fadeStarter(level: Level, rung: number): Program {
  if (level.sandbox || rung >= RUNGS.solo) return [];

  let program: Program;
  try {
    program = parse(level.reference);
  } catch {
    // A level whose reference will not parse is already broken and the test
    // suite says so loudly. Do not compound it by guessing.
    return [];
  }

  if (rung <= RUNGS.study) {
    program = dropLast(program);
  } else {
    const shells = shellOnly(program);
    // A straight run of commands has no shape to keep, so give him the first
    // half of it instead and let him work out where it is going.
    program = shells.length ? shells : program.slice(0, Math.floor(program.length / 2));
  }

  // Proved, not assumed: keep taking things away until what is left is a real
  // unfinished program rather than a finished one or a runaway.
  let guard = 64;
  while (program.length && unusable(level, program) && guard > 0) {
    program = dropLast(program);
    guard -= 1;
  }
  return program;
}

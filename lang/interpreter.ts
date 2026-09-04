/**
 * Step interpreter.
 *
 * A generator, not a plain evaluator, and that choice is doing real teaching
 * work: the UI can advance one statement at a time, highlight the line that is
 * running right now, and let Henry slow the whole thing down to watch. Seeing
 * the pointer move IS the mental model of a loop.
 *
 * It also means a runaway loop hits a step budget instead of freezing the
 * family computer.
 */

import { CoderXError, errors } from './errors';
import type { Expr, Host, Program, Step, Stmt, Value } from './types';

export const DEFAULT_MAX_STEPS = 200_000;

export interface RunOptions {
  maxSteps?: number;
}

function evalExpr(e: Expr, host: Host, stmtId: string): Value {
  switch (e.kind) {
    case 'num':
      return e.value;
    case 'str':
      return e.value;
    case 'ident':
      return e.name;
    case 'hole':
      throw errors.emptyHole(e.label, stmtId);
    case 'call': {
      // Only predicates appear in expression position in v1 (e.g. rubbishHere(sniff)).
      const args = e.args.map((a) => evalExpr(a, host, stmtId));
      return host.testCondition(e.name, args) ? 1 : 0;
    }
  }
}

function asCount(e: Expr, host: Host, stmtId: string): number {
  const v = evalExpr(e, host, stmtId);
  if (typeof v !== 'number') throw errors.notANumber(String(v), stmtId);
  if (v < 0) throw errors.negativeRepeat(v, stmtId);
  return Math.floor(v);
}

function truthy(e: Expr, host: Host, stmtId: string): boolean {
  if (e.kind === 'call') {
    const args = e.args.map((a) => evalExpr(a, host, stmtId));
    return host.testCondition(e.name, args);
  }
  const v = evalExpr(e, host, stmtId);
  return typeof v === 'number' ? v !== 0 : v.length > 0;
}

/**
 * Yields once per executed statement. Callers drive the pace; nothing here
 * knows about time, which keeps the whole thing testable without a clock.
 */
export function* execute(
  program: Program,
  host: Host,
  options: RunOptions = {},
): Generator<Step, number, void> {
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
  let count = 0;

  function* runBlock(stmts: Stmt[]): Generator<Step, void, void> {
    for (const s of stmts) {
      count += 1;
      if (count > maxSteps) throw errors.tooManySteps(maxSteps);

      switch (s.kind) {
        case 'call': {
          const args = s.args.map((a) => evalExpr(a, host, s.id));
          host.runCommand(s.name, args);
          yield { stmtId: s.id, count };
          break;
        }
        case 'repeat': {
          const n = asCount(s.count, host, s.id);
          yield { stmtId: s.id, count };
          for (let i = 0; i < n; i += 1) {
            yield* runBlock(s.body);
          }
          break;
        }
        case 'if': {
          const go = truthy(s.cond, host, s.id);
          yield { stmtId: s.id, count };
          if (go) yield* runBlock(s.body);
          break;
        }
      }
    }
  }

  yield* runBlock(program);
  return count;
}

/** Run to completion with no pacing — used by tests and by goal-checking. */
export function runToEnd(program: Program, host: Host, options: RunOptions = {}): number {
  const gen = execute(program, host, options);
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

export { CoderXError };

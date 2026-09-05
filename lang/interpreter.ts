/**
 * Step interpreter.
 *
 * A generator, not a plain evaluator, and that choice is doing real teaching
 * work: the UI can advance one statement at a time, highlight the line that is
 * running right now, and let Henry slow the whole thing down to watch. Seeing
 * the pointer move IS the mental model of a loop.
 *
 * It also means a runaway loop hits a step budget instead of freezing the
 * family computer — which matters much more now `repeatUntil` exists, because a
 * condition that never comes true is the classic way to write one.
 */

import { CoderXError, errors } from './errors';
import type { Expr, Host, Program, Step, Stmt, Value } from './types';

export const DEFAULT_MAX_STEPS = 200_000;

export interface RunOptions {
  maxSteps?: number;
}

/** Variables live here. One flat scope: he has quite enough to think about. */
type Env = Map<string, number>;

function evalExpr(e: Expr, host: Host, env: Env, stmtId: string): Value {
  switch (e.kind) {
    case 'num':
      return e.value;
    case 'str':
      return e.value;
    case 'ident':
      // A name is a variable if one has been set, and otherwise just itself —
      // which is how `sniff` and `right` keep working unchanged.
      return env.has(e.name) ? (env.get(e.name) as number) : e.name;
    case 'hole':
      throw errors.emptyHole(e.label, stmtId);
    case 'call': {
      const args = e.args.map((a) => evalExpr(a, host, env, stmtId));
      return host.testCondition(e.name, args) ? 1 : 0;
    }
    case 'math': {
      const left = asNumber(evalExpr(e.left, host, env, stmtId), stmtId);
      const right = asNumber(evalExpr(e.right, host, env, stmtId), stmtId);
      return e.op === '+' ? left + right : left - right;
    }
    case 'compare': {
      const left = asNumber(evalExpr(e.left, host, env, stmtId), stmtId);
      const right = asNumber(evalExpr(e.right, host, env, stmtId), stmtId);
      if (e.op === '>') return left > right ? 1 : 0;
      if (e.op === '<') return left < right ? 1 : 0;
      return left === right ? 1 : 0;
    }
  }
}

function asNumber(v: Value, stmtId: string): number {
  if (typeof v !== 'number') throw errors.notANumber(String(v), stmtId);
  return v;
}

function asCount(e: Expr, host: Host, env: Env, stmtId: string): number {
  const v = asNumber(evalExpr(e, host, env, stmtId), stmtId);
  if (v < 0) throw errors.negativeRepeat(v, stmtId);
  return Math.floor(v);
}

function truthy(e: Expr, host: Host, env: Env, stmtId: string): boolean {
  if (e.kind === 'call') {
    const args = e.args.map((a) => evalExpr(a, host, env, stmtId));
    return host.testCondition(e.name, args);
  }
  const v = evalExpr(e, host, env, stmtId);
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
  const env: Env = new Map();
  let count = 0;

  function* runBlock(stmts: Stmt[]): Generator<Step, void, void> {
    for (const s of stmts) {
      count += 1;
      if (count > maxSteps) throw errors.tooManySteps(maxSteps);

      switch (s.kind) {
        case 'call': {
          const args = s.args.map((a) => evalExpr(a, host, env, s.id));
          host.runCommand(s.name, args);
          yield { stmtId: s.id, count, vars: env };
          break;
        }
        case 'set': {
          env.set(s.name, asNumber(evalExpr(s.value, host, env, s.id), s.id));
          yield { stmtId: s.id, count, vars: env };
          break;
        }
        case 'repeat': {
          const n = asCount(s.count, host, env, s.id);
          yield { stmtId: s.id, count, vars: env };
          for (let i = 0; i < n; i += 1) yield* runBlock(s.body);
          break;
        }
        case 'if': {
          const go = truthy(s.cond, host, env, s.id);
          yield { stmtId: s.id, count, vars: env };
          if (go) yield* runBlock(s.body);
          break;
        }
        case 'until': {
          // Keep going until the condition comes true. The step budget is what
          // stops one that never does, and its error is the lesson.
          for (;;) {
            count += 1;
            if (count > maxSteps) throw errors.tooManySteps(maxSteps);
            const done = truthy(s.cond, host, env, s.id);
            yield { stmtId: s.id, count, vars: env };
            if (done) break;
            yield* runBlock(s.body);
          }
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

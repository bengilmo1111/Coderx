/**
 * Pure, immutable edits to the program tree.
 *
 * Kept out of React entirely so undo is just an array of past trees, and so
 * the fiddly insertion rules can be tested without rendering anything.
 *
 * Insertion follows what a child expects when they tap a line:
 *   - a plain line       -> the new brick goes after it
 *   - a "repeat 3 {" line -> the new brick goes INSIDE, as the first thing
 *   - the closing "}"     -> the new brick goes after the whole block
 *   - nothing selected    -> the new brick goes on the end
 */

import type { Expr, Program, Stmt } from '@/lang/types';

export interface Selection {
  stmtId: string;
  /** True when the closing } line is the one selected. */
  closer: boolean;
}

const isBlock = (s: Stmt): s is Extract<Stmt, { body: Stmt[] }> =>
  s.kind === 'repeat' || s.kind === 'if';

const withBody = (s: Stmt, body: Stmt[]): Stmt => (isBlock(s) ? { ...s, body } : s);

export function findStmt(program: Program, id: string): Stmt | null {
  for (const s of program) {
    if (s.id === id) return s;
    if (isBlock(s)) {
      const found = findStmt(s.body, id);
      if (found) return found;
    }
  }
  return null;
}

export function countStmts(program: Program): number {
  return program.reduce((n, s) => n + 1 + (isBlock(s) ? countStmts(s.body) : 0), 0);
}

export function insertStmt(program: Program, selection: Selection | null, stmt: Stmt): Program {
  if (!selection) return [...program, stmt];

  const walk = (stmts: Stmt[]): { list: Stmt[]; done: boolean } => {
    const out: Stmt[] = [];
    let done = false;

    for (const s of stmts) {
      if (s.id === selection.stmtId) {
        // Selected a block header: go inside, at the top.
        if (isBlock(s) && !selection.closer) {
          out.push(withBody(s, [stmt, ...s.body]));
          done = true;
          continue;
        }
        // A plain line, or the closing brace: go after the whole thing.
        out.push(s);
        out.push(stmt);
        done = true;
        continue;
      }

      if (isBlock(s)) {
        const inner = walk(s.body);
        out.push(withBody(s, inner.list));
        if (inner.done) done = true;
        continue;
      }

      out.push(s);
    }
    return { list: out, done };
  };

  const result = walk(program);
  // Selection pointed at something that no longer exists — append rather than lose the tap.
  return result.done ? result.list : [...program, stmt];
}

export function removeStmt(program: Program, id: string): Program {
  return program
    .filter((s) => s.id !== id)
    .map((s) => (isBlock(s) ? withBody(s, removeStmt(s.body, id)) : s));
}

/** Nudge a statement up or down within its own block. Simpler and far more
 *  reliable on a phone than drag-and-drop, and it survives fat fingers. */
export function moveStmt(program: Program, id: string, delta: -1 | 1): Program {
  const i = program.findIndex((s) => s.id === id);
  if (i !== -1) {
    const j = i + delta;
    if (j < 0 || j >= program.length) return program;
    const next = [...program];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }
  return program.map((s) => (isBlock(s) ? withBody(s, moveStmt(s.body, id, delta)) : s));
}

export type ArgIndex = number | 'count' | 'cond';

export function setArg(program: Program, stmtId: string, index: ArgIndex, value: Expr): Program {
  return program.map((s) => {
    if (s.id === stmtId) {
      if (s.kind === 'call' && typeof index === 'number') {
        const args = [...s.args];
        args[index] = value;
        return { ...s, args };
      }
      if (s.kind === 'repeat' && index === 'count') return { ...s, count: value };
      if (s.kind === 'if' && index === 'cond') return { ...s, cond: value };
      return s;
    }
    return isBlock(s) ? withBody(s, setArg(s.body, stmtId, index, value)) : s;
  });
}

export function getArg(program: Program, stmtId: string, index: ArgIndex): Expr | null {
  const s = findStmt(program, stmtId);
  if (!s) return null;
  if (s.kind === 'call' && typeof index === 'number') return s.args[index] ?? null;
  if (s.kind === 'repeat' && index === 'count') return s.count;
  if (s.kind === 'if' && index === 'cond') return s.cond;
  return null;
}

/** Any holes left? Used to stop a run before it starts and point at the gap. */
export function firstHole(program: Program): { stmtId: string; index: ArgIndex } | null {
  for (const s of program) {
    if (s.kind === 'call') {
      const i = s.args.findIndex((a) => a.kind === 'hole');
      if (i !== -1) return { stmtId: s.id, index: i };
    } else {
      const slot = s.kind === 'repeat' ? s.count : s.cond;
      if (slot.kind === 'hole') return { stmtId: s.id, index: s.kind === 'repeat' ? 'count' : 'cond' };
      const inner = firstHole(s.body);
      if (inner) return inner;
    }
  }
  return null;
}

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

/** Indices from the root down to a statement. */
type Path = number[];

function findPath(program: Program, id: string, prefix: Path = []): Path | null {
  for (let i = 0; i < program.length; i += 1) {
    const s = program[i];
    if (s.id === id) return [...prefix, i];
    if (isBlock(s)) {
      const deeper = findPath(s.body, id, [...prefix, i]);
      if (deeper) return deeper;
    }
  }
  return null;
}

/** The statement list reached by walking `path` into nested block bodies. */
function listAt(program: Program, path: Path): Stmt[] {
  let list: Stmt[] = program;
  for (const i of path) {
    const s = list[i];
    if (!isBlock(s)) throw new Error('listAt: path does not lead into a block');
    list = s.body;
  }
  return list;
}

/**
 * Move a statement up or down — including INTO and OUT OF blocks.
 *
 * Henry's words after playing: "you should be able to move bricks into the
 * function, rather than have to know to write repeat first and then add move."
 * The old version could only swap two statements inside the same block, so what
 * he was reaching for was not merely hidden, it was impossible.
 *
 * Two buttons rather than drag-and-drop: dragging a nested block on a phone with
 * eight-year-old fingers is a much worse deal than pressing an arrow twice.
 *
 * Going down: into the block below as its FIRST child, else swap with the next
 * statement, else step out to just after the enclosing block. Going up mirrors
 * it — into the block above as its LAST child, else swap, else out to just
 * before the enclosing block.
 */
export function moveStmt(program: Program, id: string, delta: -1 | 1): Program {
  const next = structuredClone(program) as Program;
  const path = findPath(next, id);
  if (!path) return program;

  const index = path[path.length - 1];
  const parent = listAt(next, path.slice(0, -1));
  const [node] = parent.splice(index, 1);
  const insideABlock = path.length >= 2;

  if (delta === 1) {
    const below = parent[index]; // whatever followed it, now shifted into place
    if (below && isBlock(below)) {
      below.body.unshift(node);
      return next;
    }
    if (index < parent.length) {
      parent.splice(index + 1, 0, node);
      return next;
    }
    if (insideABlock) {
      const grandparent = listAt(next, path.slice(0, -2));
      grandparent.splice(path[path.length - 2] + 1, 0, node);
      return next;
    }
    return program; // last line of the program: nowhere to go
  }

  const above = parent[index - 1];
  if (above && isBlock(above)) {
    above.body.push(node);
    return next;
  }
  if (index > 0) {
    parent.splice(index - 1, 0, node);
    return next;
  }
  if (insideABlock) {
    const grandparent = listAt(next, path.slice(0, -2));
    grandparent.splice(path[path.length - 2], 0, node);
    return next;
  }
  return program; // first line of the program: nowhere to go
}

/**
 * Put an existing statement inside a new block.
 *
 * This is the other half of the same complaint. Tapping "repeat" with a line
 * selected should wrap that line, because that is the order the idea arrives
 * in: you do a thing, you notice you need it three times, THEN you reach for a
 * loop. Building the empty loop first and knowing to aim inside it is
 * programmer's word order, not a child's.
 */
export function wrapStmt(program: Program, stmtId: string, block: Stmt): Program {
  if (!isBlock(block)) return program;
  return program.map((s) => {
    if (s.id === stmtId) return { ...block, body: [s] };
    return isBlock(s) ? withBody(s, wrapStmt(s.body, stmtId, block)) : s;
  });
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

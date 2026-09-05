/**
 * AST -> the code Henry sees on screen.
 *
 * Returns structured lines rather than a blob of text so the editor can make
 * every line and every hole individually tappable, and so the interpreter can
 * highlight the line it is currently running.
 */

import { isHole, type Expr, type Program, type Stmt } from './types';

export interface CodeLine {
  /** The statement this line belongs to (highlighting + selection). */
  stmtId: string;
  indent: number;
  /** 1-based, matches what we say in error messages. */
  line: number;
  /** Closing "}" lines aren't tappable targets for insertion. */
  isCloser: boolean;
  /**
   * An empty block's inside. Rendered as an inviting dashed row rather than the
   * nothing that used to be there — the gap between { and } was invisible, so
   * there was no way to see that a block HAS an inside, let alone aim at it.
   */
  isSlot: boolean;
  segments: Segment[];
}

export type Segment =
  | { kind: 'keyword'; text: string }
  | { kind: 'command'; text: string }
  | { kind: 'punct'; text: string }
  | { kind: 'value'; text: string; argPath: ArgPath }
  /** `text` is the ▢ that belongs in the source; `label` is the prompt shown in the box. */
  | { kind: 'hole'; text: string; label: string; argPath: ArgPath };

/** Where a value lives, so tapping it can open the right picker. */
export interface ArgPath {
  stmtId: string;
  /** 'count', 'cond' and 'value' address block and set slots; numbers address call args. */
  index: number | 'count' | 'cond' | 'value';
}

export function printExpr(e: Expr): string {
  switch (e.kind) {
    case 'num':
      return String(e.value);
    case 'str':
      return `"${e.value}"`;
    case 'ident':
      return e.name;
    case 'call':
      return `${e.name}(${e.args.map(printExpr).join(', ')})`;
    case 'math':
      return `${printExpr(e.left)} ${e.op} ${printExpr(e.right)}`;
    case 'compare':
      return `${printExpr(e.left)} ${e.op} ${printExpr(e.right)}`;
    case 'hole':
      return '▢';
  }
}

function exprSegment(e: Expr, argPath: ArgPath): Segment {
  return isHole(e)
    ? { kind: 'hole', text: '▢', label: e.label, argPath }
    : { kind: 'value', text: printExpr(e), argPath };
}

export function printProgram(program: Program): CodeLine[] {
  const lines: CodeLine[] = [];
  let n = 0;

  const walk = (stmts: Stmt[], indent: number) => {
    for (const s of stmts) {
      n += 1;
      if (s.kind === 'call') {
        const segments: Segment[] = [{ kind: 'command', text: s.name }, { kind: 'punct', text: '(' }];
        s.args.forEach((a, i) => {
          if (i > 0) segments.push({ kind: 'punct', text: ', ' });
          segments.push(exprSegment(a, { stmtId: s.id, index: i }));
        });
        segments.push({ kind: 'punct', text: ')' });
        lines.push({ stmtId: s.id, indent, line: n, isCloser: false, isSlot: false, segments });
        continue;
      }

      if (s.kind === 'set') {
        lines.push({
          stmtId: s.id,
          indent,
          line: n,
          isCloser: false,
          isSlot: false,
          segments: [
            { kind: 'keyword', text: 'set' },
            { kind: 'punct', text: ' ' },
            { kind: 'command', text: s.name },
            { kind: 'punct', text: ' = ' },
            exprSegment(s.value, { stmtId: s.id, index: 'value' }),
          ],
        });
        continue;
      }

      if (s.kind === 'define') {
        lines.push({
          stmtId: s.id,
          indent,
          line: n,
          isCloser: false,
          isSlot: false,
          segments: [
            { kind: 'keyword', text: 'define' },
            { kind: 'punct', text: ' ' },
            { kind: 'command', text: s.name },
            { kind: 'punct', text: ' {' },
          ],
        });
        if (s.body.length === 0) {
          lines.push({
            stmtId: s.id,
            indent: indent + 1,
            line: n,
            isCloser: false,
            isSlot: true,
            segments: [{ kind: 'punct', text: 'tap a brick to put it in here' }],
          });
        }
        walk(s.body, indent + 1);
        n += 1;
        lines.push({
          stmtId: s.id,
          indent,
          line: n,
          isCloser: true,
          isSlot: false,
          segments: [{ kind: 'punct', text: '}' }],
        });
        continue;
      }

      const keyword = s.kind === 'repeat' ? 'repeat' : s.kind === 'until' ? 'repeatUntil' : 'if';
      const slot = s.kind === 'repeat' ? s.count : s.cond;
      const path: ArgPath = { stmtId: s.id, index: s.kind === 'repeat' ? 'count' : 'cond' };
      lines.push({
        stmtId: s.id,
        indent,
        line: n,
        isCloser: false,
        isSlot: false,
        segments: [
          { kind: 'keyword', text: keyword },
          { kind: 'punct', text: ' ' },
          exprSegment(slot, path),
          { kind: 'punct', text: ' {' },
        ],
      });
      if (s.body.length === 0) {
        lines.push({
          stmtId: s.id,
          indent: indent + 1,
          line: n,
          isCloser: false,
          isSlot: true,
          segments: [{ kind: 'punct', text: 'tap a brick to put it in here' }],
        });
      }
      walk(s.body, indent + 1);
      n += 1;
      lines.push({
        stmtId: s.id,
        indent,
        line: n,
        isCloser: true,
        isSlot: false,
        segments: [{ kind: 'punct', text: '}' }],
      });
    }
  };

  walk(program, 0);
  return lines;
}

/** Plain text, for Type-It-Yourself round-tripping and for the tutor prompt. */
export function printSource(program: Program): string {
  return printProgram(program)
    .filter((l) => !l.isSlot) // the slot is a prompt to the reader, not code
    .map((l) => '  '.repeat(l.indent) + l.segments.map((s) => s.text).join(''))
    .join('\n');
}

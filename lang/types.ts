/**
 * coderX language — types.
 *
 * The editor's source of truth is the AST, not text. We render text FROM the
 * tree (see printer.ts) and parse text back INTO the tree only when Henry uses
 * Type-It-Yourself. That means tapping bricks can never produce a syntax error,
 * because there is no text to get wrong.
 */

export type SlotKind = 'number' | 'character' | 'direction' | 'text' | 'condition';

/** A gap in the code Henry hasn't filled in yet. Renders as a tappable box. */
export interface Hole {
  kind: 'hole';
  slot: SlotKind;
  /** Shown inside the box, e.g. "how many?" */
  label: string;
}

/** Arithmetic he can see: a variable and a number, nothing cleverer. */
export type MathOp = '+' | '-';
export type CompareOp = '>' | '<' | '==';

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'ident'; name: string }
  | { kind: 'call'; name: string; args: Expr[] }
  | { kind: 'math'; op: MathOp; left: Expr; right: Expr }
  | { kind: 'compare'; op: CompareOp; left: Expr; right: Expr }
  | Hole;

export type Stmt =
  | { kind: 'call'; id: string; name: string; args: Expr[] }
  | { kind: 'repeat'; id: string; count: Expr; body: Stmt[] }
  | { kind: 'if'; id: string; cond: Expr; body: Stmt[] }
  /** `repeatUntil dragonBeaten() { ... }` — a real while loop. */
  | { kind: 'until'; id: string; cond: Expr; body: Stmt[] }
  /** `set swords = 0`, `set swords = swords + 1`. */
  | { kind: 'set'; id: string; name: string; value: Expr };

export type Program = Stmt[];

export type Value = number | string;

/** What the interpreter yields after each statement, so the UI can follow along. */
export interface Step {
  stmtId: string;
  /** Statements executed so far — used for the step budget and for scoring. */
  count: number;
  /**
   * Variables as they stand right now.
   *
   * They travel with the step so the stage can draw them. A number that only
   * exists inside the code is invisible; watching `swords` tick up on screen as
   * it happens is the thing that makes a variable click.
   */
  vars: ReadonlyMap<string, number>;
}

/**
 * The world the code acts on. Kept behind an interface so the language layer
 * never imports the runtime (and stays trivially testable).
 */
export interface Host {
  runCommand(name: string, args: Value[]): void;
  testCondition(name: string, args: Value[]): boolean;
}

let idCounter = 0;
/** Stable-enough ids for editor keys and step highlighting. */
export function newId(prefix = 's'): string {
  idCounter += 1;
  return `${prefix}${idCounter}`;
}

export function hole(slot: SlotKind, label: string): Hole {
  return { kind: 'hole', slot, label };
}

export function isHole(e: Expr): e is Hole {
  return e.kind === 'hole';
}

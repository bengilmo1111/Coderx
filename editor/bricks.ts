/**
 * The brick palette.
 *
 * Each brick builds a real AST node with holes in it. Henry taps a brick, taps
 * the holes to fill them, and what appears on screen is genuine code text —
 * but he cannot produce a syntax error, because he never types punctuation.
 *
 * `sniff` is pre-filled rather than left as a hole: there is one character in
 * Chapter 1, and every tap he doesn't have to make is attention he keeps for
 * the actual idea.
 */

import { hole, newId, type Expr, type Stmt } from '@/lang/types';

export type BrickCategory = 'go' | 'do' | 'control' | 'talk' | 'count' | 'define';

export interface Brick {
  id: string;
  label: string;
  category: BrickCategory;
  help: string;
  make: () => Stmt;
  /**
   * A complete, working line, shown in Type-It-Yourself.
   *
   * He tried typing unprompted and found it hard, which is fair: nothing on
   * screen told him what a line is supposed to look like. Showing the real
   * shape — brackets, commas and all — is the cheapest possible way to teach
   * syntax, and tapping one drops it in the box for him to edit.
   */
  example: string;
}

/**
 * Who the command is aimed at.
 *
 * With one hero the name is pre-filled — every tap he does not have to make is
 * attention kept for the actual idea. With two on the board it becomes a hole,
 * and the name in every command finally starts meaning something.
 */
function who(cast: string[]): Expr {
  return cast.length === 1 ? { kind: 'ident', name: cast[0] } : hole('character', 'who?');
}

function buildBricks(cast: string[], variable = 'count'): Record<string, Brick> {
  const hero = cast[0];
  const v = variable;
  const sniff = () => who(cast);
  return {
    move: {
      id: 'move',
      label: 'move',
      category: 'go',
      help: 'Walk Sniff one square.',
      make: () => ({ kind: 'call', id: newId('c'), name: 'move', args: [sniff(), hole('direction', 'which way?')] }),
      example: `move(${hero}, right)`,
    },
    'move-n': {
      id: 'move-n',
      label: 'move far',
      category: 'go',
      help: 'Walk Sniff several squares at once.',
      make: () => ({
        kind: 'call',
        id: newId('c'),
        name: 'move',
        args: [sniff(), hole('direction', 'which way?'), hole('number', 'how many?')],
      }),
      example: `move(${hero}, right, 3)`,
    },
    grab: {
      id: 'grab',
      label: 'grab',
      category: 'do',
      help: 'Pick up what is under his feet.',
      make: () => ({ kind: 'call', id: newId('c'), name: 'grab', args: [sniff()] }),
      example: `grab(${hero})`,
    },
    drop: {
      id: 'drop',
      label: 'drop',
      category: 'do',
      help: 'Put down what he is carrying. On a bin, that scores.',
      make: () => ({ kind: 'call', id: newId('c'), name: 'drop', args: [sniff()] }),
      example: `drop(${hero})`,
    },
    say: {
      id: 'say',
      label: 'say',
      category: 'talk',
      help: 'Give Sniff a speech bubble.',
      make: () => ({ kind: 'call', id: newId('c'), name: 'say', args: [sniff(), hole('text', 'what does he say?')] }),
      example: `say(${hero}, "woof")`,
    },
    bark: {
      id: 'bark',
      label: 'bark',
      category: 'talk',
      help: 'BARK. Loudly. For no reason.',
      make: () => ({ kind: 'call', id: newId('c'), name: 'bark', args: [sniff()] }),
      example: `bark(${hero})`,
    },
    repeat: {
      id: 'repeat',
      label: 'repeat',
      category: 'control',
      help: 'Do the things inside, again and again.',
      make: () => ({ kind: 'repeat', id: newId('r'), count: hole('number', 'how many times?'), body: [] }),
      example: `repeat 3 { grab(${hero}) }`,
    },
    'if-rubbish': {
      id: 'if-rubbish',
      label: 'if rubbish here',
      category: 'control',
      help: 'Only do the inside bit when there is rubbish under his feet.',
      make: () => ({
        kind: 'if',
        id: newId('i'),
        cond: { kind: 'call', name: 'rubbishHere', args: [sniff()] },
        body: [],
      }),
      example: `if rubbishHere(${hero}) { grab(${hero}) }`,
    },
    attack: {
      id: 'attack',
      label: 'attack',
      category: 'do',
      help: 'Swing your sword at the dragon. You have to be next to it.',
      make: () => ({ kind: 'call', id: newId('c'), name: 'attack', args: [sniff()] }),
      example: `attack(${hero})`,
    },
    'count-start': {
      id: 'count-start',
      label: `start ${v}`,
      category: 'count',
      help: 'Begin counting from nothing.',
      make: () => ({ kind: 'set', id: newId('v'), name: v, value: { kind: 'num', value: 0 } }),
      example: `set ${v} = 0`,
    },
    'count-add': {
      id: 'count-add',
      label: 'add one',
      category: 'count',
      help: 'Add one to the count.',
      make: () => ({
        kind: 'set',
        id: newId('v'),
        name: v,
        value: { kind: 'math', op: '+', left: { kind: 'ident', name: v }, right: { kind: 'num', value: 1 } },
      }),
      example: `set ${v} = ${v} + 1`,
    },
    'count-set': {
      id: 'count-set',
      label: `set ${v}`,
      category: 'count',
      help: 'Give the count a number of your choosing.',
      make: () => ({ kind: 'set', id: newId('v'), name: v, value: hole('number', 'how many?') }),
      example: `set ${v} = 3`,
    },
    'repeat-count': {
      id: 'repeat-count',
      label: `repeat ${v} times`,
      category: 'control',
      help: 'Do the inside once for each one you counted.',
      make: () => ({ kind: 'repeat', id: newId('r'), count: { kind: 'ident', name: v }, body: [] }),
      example: `repeat ${v} { attack(${hero}) }`,
    },
    'until-dragon': {
      id: 'until-dragon',
      label: 'until dragon gives up',
      category: 'control',
      help: 'Keep doing the inside over and over, until the dragon has had enough.',
      make: () => ({
        kind: 'until',
        id: newId('u'),
        cond: { kind: 'call', name: 'dragonBeaten', args: [] },
        body: [],
      }),
      example: `repeatUntil dragonBeaten() { attack(${hero}) }`,
    },
    'if-sword': {
      id: 'if-sword',
      label: 'if sword here',
      category: 'control',
      help: 'Only do the inside bit when there is a sword under their feet.',
      make: () => ({
        kind: 'if',
        id: newId('i'),
        cond: { kind: 'call', name: 'swordHere', args: [sniff()] },
        body: [],
      }),
      example: `if swordHere(${hero}) { grab(${hero}) }`,
    },
    transform: {
      id: 'transform',
      label: 'transform',
      category: 'do',
      help: 'Change shape. Each shape can do something the others cannot.',
      make: () => ({
        kind: 'call',
        id: newId('c'),
        name: 'transform',
        args: [sniff(), hole('mode', 'which shape?')],
      }),
      example: `transform(${hero}, drill)`,
    },
    'if-wall': {
      id: 'if-wall',
      label: 'if wall ahead',
      category: 'control',
      help: 'Only do the inside bit when a wall is in the way.',
      make: () => ({
        kind: 'if',
        id: newId('i'),
        cond: { kind: 'call', name: 'wallAhead', args: [sniff(), hole('direction', 'which way?')] },
        body: [],
      }),
      example: `if wallAhead(${hero}, right) { transform(${hero}, drill) }`,
    },
    define: {
      id: 'define',
      label: 'teach a move',
      category: 'define',
      help: 'Make up your own command. Once you have, it turns into a brick you can tap.',
      // The name is chosen as it is created, so there is never a nameless
      // definition sitting on screen.
      make: () => ({ kind: 'define', id: newId('d'), name: 'sweep', body: [] }),
      example: 'define sweep { move(bolt, right) }',
    },
    'if-holding': {
      id: 'if-holding',
      label: 'if holding',
      category: 'control',
      help: 'Only do the inside bit when he is carrying something.',
      make: () => ({
        kind: 'if',
        id: newId('i'),
        cond: { kind: 'call', name: 'holding', args: [sniff()] },
        body: [],
      }),
      example: `if holding(${hero}) { drop(${hero}) }`,
      },
  };
}

/** The default single-hero set, used by tests and for brick help text. */
export const BRICKS: Record<string, Brick> = buildBricks(['sniff']);

export const CATEGORY_STYLE: Record<BrickCategory, { name: string; className: string }> = {
  go: { name: 'Go', className: 'bg-sky-500 border-sky-800' },
  do: { name: 'Do', className: 'bg-emerald-500 border-emerald-800' },
  control: { name: 'Control', className: 'bg-amber-500 border-amber-800' },
  talk: { name: 'Talk', className: 'bg-fuchsia-500 border-fuchsia-800' },
  count: { name: 'Count', className: 'bg-violet-500 border-violet-800' },
  define: { name: 'Yours', className: 'bg-rose-500 border-rose-800' },
};

/**
 * A brick for a command he defined himself.
 *
 * This is the whole point of Chapter 3: `define sweep { ... }` and `sweep`
 * appears in his bar, in its own colour, tappable like anything else. A
 * function stops being an idea and becomes a button he made.
 */
export function userBrick(name: string): Brick {
  return {
    id: `user:${name}`,
    label: name,
    category: 'define',
    help: `Your own command. It does whatever you put inside define ${name}.`,
    make: () => ({ kind: 'call', id: newId('c'), name, args: [] }),
    example: `${name}()`,
  };
}

export function bricksFor(
  ids: string[],
  cast: string[] = ['sniff'],
  variable = 'count',
  defined: string[] = [],
): Brick[] {
  const set =
    cast.length === 1 && cast[0] === 'sniff' && variable === 'count' ? BRICKS : buildBricks(cast, variable);
  return [...ids.map((id) => set[id]).filter(Boolean), ...defined.map(userBrick)];
}

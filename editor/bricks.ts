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

import { hole, newId, type Stmt } from '@/lang/types';

export type BrickCategory = 'go' | 'do' | 'control' | 'talk';

export interface Brick {
  id: string;
  label: string;
  category: BrickCategory;
  help: string;
  make: () => Stmt;
}

const sniff = () => ({ kind: 'ident', name: 'sniff' }) as const;

export const BRICKS: Record<string, Brick> = {
  move: {
    id: 'move',
    label: 'move',
    category: 'go',
    help: 'Walk Sniff one square.',
    make: () => ({ kind: 'call', id: newId('c'), name: 'move', args: [sniff(), hole('direction', 'which way?')] }),
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
  },
  grab: {
    id: 'grab',
    label: 'grab',
    category: 'do',
    help: 'Pick up what is under his feet.',
    make: () => ({ kind: 'call', id: newId('c'), name: 'grab', args: [sniff()] }),
  },
  drop: {
    id: 'drop',
    label: 'drop',
    category: 'do',
    help: 'Put down what he is carrying. On a bin, that scores.',
    make: () => ({ kind: 'call', id: newId('c'), name: 'drop', args: [sniff()] }),
  },
  say: {
    id: 'say',
    label: 'say',
    category: 'talk',
    help: 'Give Sniff a speech bubble.',
    make: () => ({ kind: 'call', id: newId('c'), name: 'say', args: [sniff(), hole('text', 'what does he say?')] }),
  },
  bark: {
    id: 'bark',
    label: 'bark',
    category: 'talk',
    help: 'BARK. Loudly. For no reason.',
    make: () => ({ kind: 'call', id: newId('c'), name: 'bark', args: [sniff()] }),
  },
  repeat: {
    id: 'repeat',
    label: 'repeat',
    category: 'control',
    help: 'Do the things inside, again and again.',
    make: () => ({ kind: 'repeat', id: newId('r'), count: hole('number', 'how many times?'), body: [] }),
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
  },
};

export const CATEGORY_STYLE: Record<BrickCategory, { name: string; className: string }> = {
  go: { name: 'Go', className: 'bg-sky-500 border-sky-800' },
  do: { name: 'Do', className: 'bg-emerald-500 border-emerald-800' },
  control: { name: 'Control', className: 'bg-amber-500 border-amber-800' },
  talk: { name: 'Talk', className: 'bg-fuchsia-500 border-fuchsia-800' },
};

export function bricksFor(ids: string[]): Brick[] {
  return ids.map((id) => BRICKS[id]).filter(Boolean);
}

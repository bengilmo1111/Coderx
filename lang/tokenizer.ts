/**
 * Tokeniser. Only used by Type-It-Yourself and by tests — brick-tapping builds
 * the tree directly. Kept deliberately tiny.
 */

import { CoderXError, errors } from './errors';

export type TokenType = 'name' | 'number' | 'string' | 'punct' | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

const PUNCT = new Set(['(', ')', '{', '}', ',']);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const push = (type: TokenType, value: string, startCol: number) =>
    tokens.push({ type, value, line, col: startCol });

  while (i < source.length) {
    const c = source[i];

    if (c === '\n') {
      i += 1;
      line += 1;
      col = 1;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i += 1;
      col += 1;
      continue;
    }
    // Comments: Henry never writes these, but the starter code sometimes does.
    if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (PUNCT.has(c)) {
      push('punct', c, col);
      i += 1;
      col += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      const startCol = col;
      i += 1;
      col += 1;
      let text = '';
      while (i < source.length && source[i] !== quote && source[i] !== '\n') {
        text += source[i];
        i += 1;
        col += 1;
      }
      if (source[i] !== quote) {
        throw new CoderXError(`Line ${line}: this speech bubble never closes with a ${quote}.`, {
          tryThis: `Put a ${quote} at the end of the words.`,
        });
      }
      i += 1;
      col += 1;
      push('string', text, startCol);
      continue;
    }
    if (c >= '0' && c <= '9') {
      const startCol = col;
      let text = '';
      while (i < source.length && source[i] >= '0' && source[i] <= '9') {
        text += source[i];
        i += 1;
        col += 1;
      }
      push('number', text, startCol);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const startCol = col;
      let text = '';
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) {
        text += source[i];
        i += 1;
        col += 1;
      }
      push('name', text, startCol);
      continue;
    }

    throw errors.cannotRead(c, line);
  }

  tokens.push({ type: 'eof', value: '', line, col });
  return tokens;
}

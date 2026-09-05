/**
 * Parser. Text -> AST, for Type-It-Yourself and for tests that assert a level's
 * reference solution really does solve it.
 *
 * Grammar:
 *   program   := stmt*
 *   stmt      := repeat | repeatUntil | if | set | define | call
 *   define    := 'define' name '{' stmt* '}'
 *   repeat    := 'repeat' expr '{' stmt* '}'
 *   until     := 'repeatUntil' expr '{' stmt* '}'
 *   if        := 'if' expr '{' stmt* '}'
 *   set       := 'set' name '=' expr
 *   call      := name '(' args? ')'
 *   args      := expr (',' expr)*
 *   expr      := math (('>' | '<' | '==') math)?
 *   math      := primary (('+' | '-') primary)*
 *   primary   := number | string | call | name
 */

import { errors, CoderXError } from './errors';
import { tokenize, type Token } from './tokenizer';
import { newId, type Expr, type Program, type Stmt } from './types';

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const t = this.tokens[this.pos];
    if (t.type !== 'eof') this.pos += 1;
    return t;
  }

  private at(value: string): boolean {
    const t = this.peek();
    return t.type === 'punct' || t.type === 'name' ? t.value === value : false;
  }

  private expect(value: string, onMissing: (line: number) => CoderXError): Token {
    if (!this.at(value)) throw onMissing(this.peek().line);
    return this.next();
  }

  parseProgram(stop?: string): Program {
    const stmts: Stmt[] = [];
    while (this.peek().type !== 'eof' && !(stop && this.at(stop))) {
      stmts.push(this.parseStmt());
    }
    return stmts;
  }

  private parseBlock(): Stmt[] {
    this.expect('{', errors.missingSquiggly);
    const body = this.parseProgram('}');
    this.expect('}', errors.missingSquiggly);
    return body;
  }

  private parseStmt(): Stmt {
    const t = this.peek();

    if (t.type === 'name' && t.value === 'repeat') {
      this.next();
      const count = this.parseExpr();
      return { kind: 'repeat', id: newId('r'), count, body: this.parseBlock() };
    }

    if (t.type === 'name' && t.value === 'repeatUntil') {
      this.next();
      const cond = this.parseExpr();
      return { kind: 'until', id: newId('u'), cond, body: this.parseBlock() };
    }

    if (t.type === 'name' && t.value === 'if') {
      this.next();
      const cond = this.parseExpr();
      return { kind: 'if', id: newId('i'), cond, body: this.parseBlock() };
    }

    if (t.type === 'name' && t.value === 'define') {
      this.next();
      const name = this.next();
      if (name.type !== 'name') throw errors.cannotRead(name.value || 'nothing', name.line);
      return { kind: 'define', id: newId('d'), name: name.value, body: this.parseBlock() };
    }

    if (t.type === 'name' && t.value === 'set') {
      this.next();
      const name = this.next();
      if (name.type !== 'name') throw errors.cannotRead(name.value || 'nothing', name.line);
      this.expect('=', (line) =>
        new CoderXError(`Line ${line}: set needs an = after the name, like set swords = 0.`, {
          tryThis: 'Put an = between the name and the number.',
        }),
      );
      return { kind: 'set', id: newId('v'), name: name.value, value: this.parseExpr() };
    }

    if (t.type === 'name') {
      const name = this.next().value;
      const args = this.parseArgs();
      return { kind: 'call', id: newId('c'), name, args };
    }

    throw errors.cannotRead(t.value || 'the end of the line', t.line);
  }

  private parseArgs(): Expr[] {
    this.expect('(', errors.missingBracket);
    const args: Expr[] = [];
    if (!this.at(')')) {
      args.push(this.parseExpr());
      while (this.at(',')) {
        this.next();
        args.push(this.parseExpr());
      }
    }
    this.expect(')', errors.missingBracket);
    return args;
  }

  /** expr := math (('>' | '<' | '==') math)? */
  private parseExpr(): Expr {
    const left = this.parseMath();
    for (const op of ['>', '<', '=='] as const) {
      if (this.at(op)) {
        this.next();
        return { kind: 'compare', op, left, right: this.parseMath() };
      }
    }
    return left;
  }

  /** math := primary (('+' | '-') primary)*, left-associative. */
  private parseMath(): Expr {
    let left = this.parsePrimary();
    for (;;) {
      const op = this.at('+') ? '+' : this.at('-') ? '-' : null;
      if (!op) return left;
      this.next();
      left = { kind: 'math', op, left, right: this.parsePrimary() };
    }
  }

  private parsePrimary(): Expr {
    const t = this.next();
    if (t.type === 'number') return { kind: 'num', value: Number(t.value) };
    if (t.type === 'string') return { kind: 'str', value: t.value };
    if (t.type === 'name') {
      if (this.at('(')) return { kind: 'call', name: t.value, args: this.parseArgs() };
      return { kind: 'ident', name: t.value };
    }
    throw errors.cannotRead(t.value || 'nothing', t.line);
  }
}

export function parse(source: string): Program {
  return new Parser(tokenize(source)).parseProgram();
}

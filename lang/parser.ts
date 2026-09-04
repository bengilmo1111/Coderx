/**
 * Parser. Text -> AST, for Type-It-Yourself and for tests that assert a level's
 * reference solution really does solve it.
 *
 * Grammar (v1 — Chapters 1-2):
 *   program   := stmt*
 *   stmt      := repeat | if | call
 *   repeat    := 'repeat' expr '{' stmt* '}'
 *   if        := 'if' expr '{' stmt* '}'
 *   call      := name '(' args? ')'
 *   args      := expr (',' expr)*
 *   expr      := number | string | call | name
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

    if (t.type === 'name' && t.value === 'if') {
      this.next();
      const cond = this.parseExpr();
      return { kind: 'if', id: newId('i'), cond, body: this.parseBlock() };
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

  private parseExpr(): Expr {
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

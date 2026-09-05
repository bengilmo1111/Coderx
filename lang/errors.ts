/**
 * Errors Henry actually reads.
 *
 * Rule for this file: never surface a word he'd have to ask an adult about.
 * No "SyntaxError", no "unexpected token", no "undefined". Bolt the robot is
 * speaking, he is on Henry's side, and every message says what to DO next.
 * NZ spelling throughout.
 */

export class CoderXError extends Error {
  /** Which statement to highlight in the editor, when we know. */
  readonly stmtId?: string;
  /** Bolt's line, read aloud-able by an 8-year-old. */
  readonly boltSays: string;
  /** The one concrete thing to try. */
  readonly tryThis?: string;

  constructor(boltSays: string, opts: { stmtId?: string; tryThis?: string } = {}) {
    super(boltSays);
    this.name = 'CoderXError';
    this.boltSays = boltSays;
    this.stmtId = opts.stmtId;
    this.tryThis = opts.tryThis;
  }
}

export const errors = {
  emptyHole: (label: string, stmtId?: string) =>
    new CoderXError(`There's an empty box that says "${label}". I can't run a gap!`, {
      stmtId,
      tryThis: 'Tap the box and choose something to go in it.',
    }),

  unknownCommand: (name: string, stmtId?: string) =>
    new CoderXError(`I don't know how to do "${name}". It's not in my toaster brain.`, {
      stmtId,
      tryThis: 'Use a brick from the bar at the bottom instead.',
    }),

  wrongArgCount: (name: string, want: number, got: number, stmtId?: string) =>
    new CoderXError(
      `"${name}" needs ${want} thing${want === 1 ? '' : 's'} inside the brackets, but I counted ${got}.`,
      { stmtId, tryThis: 'Check the round brackets ( ) for a missing or extra bit.' },
    ),

  notANumber: (what: string, stmtId?: string) =>
    new CoderXError(`I need a number there, but I got "${what}".`, {
      stmtId,
      tryThis: 'Tap the box and use the number wheel.',
    }),

  negativeRepeat: (n: number, stmtId?: string) =>
    new CoderXError(`You asked me to repeat something ${n} times. I can't do less than none!`, {
      stmtId,
      tryThis: 'Try a number bigger than 0.',
    }),

  tooDeep: (name: string, stmtId?: string) =>
    new CoderXError(`"${name}" keeps calling itself, and I have run out of hands.`, {
      stmtId,
      tryThis: 'A command cannot use itself forever. Take the call to it out of its own middle.',
    }),

  tooManySteps: (max: number) =>
    new CoderXError(
      `Whoa. I did ${max.toLocaleString('en-NZ')} things and I'm still going. I think we're stuck in a loop forever!`,
      { tryThis: 'Look at your repeat block — is there a way for it to finish?' },
    ),

  noSuchCharacter: (name: string, stmtId?: string) =>
    new CoderXError(`There's nobody called "${name}" in this caper.`, {
      stmtId,
      tryThis: 'Tap the name and pick a character who is actually here.',
    }),

  // --- Type-It-Yourself only. Tapping bricks can never reach these. ---

  missingSquiggly: (line: number) =>
    new CoderXError(`Line ${line}: you told me to repeat, but you forgot the {squiggly gate}.`, {
      tryThis: 'Every repeat needs a { to open and a } to close.',
    }),

  missingBracket: (line: number) =>
    new CoderXError(`Line ${line}: I found a ( that never gets closed with a ).`, {
      tryThis: 'Count your brackets — one ( for every ).',
    }),

  cannotRead: (text: string, line: number) =>
    new CoderXError(`Line ${line}: I tried to read "${text}" and my toaster brain popped.`, {
      tryThis: 'Switch this line back to bricks and I will fix it for you.',
    }),
};

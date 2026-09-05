/**
 * Scratch Bridge cards — "Club Cards".
 *
 * These exist for one reason: coding club is where Henry feels behind, and a
 * private win is worth far more if it cashes out in the room where he's
 * struggling. Each card names the Scratch block he now understands from the
 * inside, which is more than most of the room can say.
 *
 * Tone rule: never smug, never "better than your friends". The comparison is
 * always with his own past self.
 */

export interface BridgeCard {
  id: string;
  title: string;
  /** What he just wrote in coderX. */
  youWrote: string;
  /** The Scratch block it is. */
  scratchBlock: string;
  body: string;
}

export const BRIDGE_CARDS: Record<string, BridgeCard> = {
  sequence: {
    id: 'sequence',
    title: 'CLUB CARD: Stacking blocks',
    youWrote: 'move(sniff, right)\ngrab(sniff)',
    scratchBlock: 'Blocks snapped under each other',
    body:
      'Code runs top to bottom, one line at a time — exactly like a stack of Scratch blocks. ' +
      'You just did it by typing. Same idea, different clothes.',
  },
  parameters: {
    id: 'parameters',
    title: 'CLUB CARD: The white ovals',
    youWrote: 'move(sniff, right, 3)',
    scratchBlock: 'move (10) steps',
    body:
      'Those white ovals you type numbers into in Scratch? Those are the bits inside the ( ) brackets. ' +
      'Change the number, change what happens.',
  },
  loops: {
    id: 'loops',
    title: 'CLUB CARD: The orange repeat',
    youWrote: 'repeat 3 {\n  move(sniff, right, 2)\n}',
    scratchBlock: 'repeat (10)',
    body:
      'The orange repeat block wraps around other blocks. Your { squiggly gates } do the same job. ' +
      'And here is the sneaky bit: repeat 3 with 2 steps each time is 3 lots of 2. Six steps.',
  },
  variables: {
    id: 'variables',
    title: 'CLUB CARD: Make a Variable',
    youWrote: 'set swings = 3\nrepeat swings {\n  attack(sniff)\n}',
    scratchBlock: 'set [my variable] to (3)',
    body:
      'In Scratch there is an orange button that says "Make a Variable", and it gives you a little ' +
      'name you can put a number in. That is exactly what set does. Once it has a name, you can use ' +
      'it anywhere a number goes.',
  },
  until: {
    id: 'until',
    title: 'CLUB CARD: repeat until',
    youWrote: 'repeatUntil dragonBeaten() {\n  attack(sniff)\n}',
    scratchBlock: 'repeat until <>',
    body:
      'The other orange loop. A normal repeat needs you to know the number first. This one does not — ' +
      'it just keeps going until the answer to the question is yes. You used it when nobody knew how ' +
      'many swings it would take, which is the whole point of it.',
  },
  conditionals: {
    id: 'conditionals',
    title: 'CLUB CARD: The gold if-then',
    youWrote: 'if rubbishHere(sniff) {\n  grab(sniff)\n}',
    scratchBlock: 'if <> then',
    body:
      'The gold if-then block asks a yes-or-no question and only runs the inside when the answer is yes. ' +
      'Yours does too. You now know what the pointy <> hole is actually for.',
  },
};

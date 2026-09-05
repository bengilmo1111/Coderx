/**
 * CHAPTER 2 — THE LAST DRAGON
 *
 * Henry asked for this one himself: "fighting a dragon by collecting weapons."
 * It teaches variables and repeatUntil, and both fall out of his own story
 * rather than being bolted onto it — counting the swords you found, and keeping
 * at the dragon until it gives up.
 *
 * It is also where a second character starts taking orders. A fence down the
 * middle means Sniff cannot reach Kea's side or Kea Sniff's, so coordinating
 * two of them is the only way through rather than a decoration.
 */

import { buildWorld } from '@/runtime/world';
import type { Level } from '../types';

export const CHAPTER2: Level[] = [
  {
    id: 'c2l1',
    chapter: 2,
    index: 1,
    title: 'The Dragon in the Shed',
    briefing:
      "There is a dragon in the shed at the end of Kea Street. Nobody knows how long it has been in " +
      "there. Bolt says the paperwork for this is 'somewhere', and then fell over. Somebody has left a " +
      "sword lying about, which is careless of them and lucky for you. Go and have a word with it.",
    goalText: 'Grab the sword and give the dragon a fright.',
    makeWorld: () =>
      buildWorld({
        grid: ['-------'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          dragon: { character: 'dragon', x: 5, y: 0, facing: 'left', health: 1 },
        },
        items: [{ x: 2, y: 0, kind: 'sword' }],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'attack'],
    goal: ({ world }) => (world.sprites.dragon.health ?? 1) === 0,
    reference: `move(sniff, right, 2)
grab(sniff)
move(sniff, right, 2)
attack(sniff)`,
    par: 4,
    skills: ['code.sequence', 'maths.counting', 'literacy.comprehension'],
    hints: [
      'You cannot fight a dragon with your paws. What is lying on the ground two squares along?',
      'Grab the sword first. Then you need to be right NEXT to the dragon before you swing.',
      'Try move(sniff, right, 2), then grab, then move up close and attack.',
    ],
    reward: { xp: 60, sticker: 'first-sword' },
  },

  {
    id: 'c2l2',
    chapter: 2,
    index: 2,
    title: 'Two Heroes, One Fence',
    briefing:
      "The dragon has wedged itself in a gap in the fence, which means Sniff can only reach one side of " +
      "it and cannot get round. Luckily Kea is on the other side, being nosy. Kea takes orders now, " +
      "which Kea is not especially pleased about. You will need both of them.",
    goalText: 'Both sides at once — Sniff and Kea together.',
    makeWorld: () =>
      buildWorld({
        grid: ['----#----'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          kea: { character: 'kea', x: 8, y: 0, facing: 'left' },
          dragon: { character: 'dragon', x: 4, y: 0, health: 2 },
        },
        items: [
          { x: 2, y: 0, kind: 'sword' },
          { x: 6, y: 0, kind: 'sword' },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'attack'],
    commandable: ['sniff', 'kea'],
    goal: ({ world }) => (world.sprites.dragon.health ?? 1) === 0,
    reference: `move(sniff, right, 2)
grab(sniff)
move(sniff, right, 1)
attack(sniff)
move(kea, left, 2)
grab(kea)
move(kea, left, 1)
attack(kea)`,
    par: 8,
    skills: ['code.sequence', 'code.parameters', 'maths.position'],
    hints: [
      'Every command now asks WHO. Sniff cannot get past the fence, so who is going to deal with the other side?',
      'Do the whole of one side first — sword, then walk, then swing. Then the same for the other, going the other way.',
      'Kea starts on the right, so Kea moves LEFT. Try move(kea, left, 2) then grab(kea).',
    ],
    reward: { xp: 70, sticker: 'kea-recruited' },
  },

  {
    id: 'c2l3',
    chapter: 2,
    index: 3,
    title: 'Say When',
    briefing:
      "This dragon is tougher and will take three good swings. You could write attack three times — or " +
      "you could write down the number three, once, and let the computer remember it for you. " +
      "A number with a name is called a variable, and Bolt says they are 'the best thing about being a robot'.",
    goalText: 'Use a number you named to decide how many swings.',
    makeWorld: () =>
      buildWorld({
        grid: ['-----'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          dragon: { character: 'dragon', x: 3, y: 0, facing: 'left', health: 3 },
        },
        items: [{ x: 0, y: 0, kind: 'sword' }],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'attack', 'count-set', 'repeat-count'],
    variable: 'swings',
    goal: ({ world }) => (world.sprites.dragon.health ?? 1) === 0,
    requires: [
      { kind: 'set', message: 'This one wants a named number. Use "set swings" and then repeat that many times.' },
    ],
    reference: `grab(sniff)
move(sniff, right, 2)
set swings = 3
repeat swings {
  attack(sniff)
}`,
    par: 5,
    skills: ['code.parameters', 'maths.counting', 'maths.place-value'],
    hints: [
      'The sword is right under his nose. Grab it, then get next to the dragon.',
      'Give the number a name first: set swings = 3. Watch it appear at the top of the picture.',
      'Then repeat swings times, with attack(sniff) inside.',
    ],
    reward: { xp: 80, sticker: 'named-number' },
    bridgeCard: 'variables',
  },

  {
    id: 'c2l4',
    chapter: 2,
    index: 4,
    title: 'One Swing Per Sword',
    briefing:
      "Kea has been at the armoury again and dropped swords all the way down the street. Here is the " +
      "clever bit: nobody has told you how many. Walk the whole street, count them as you pass, and " +
      "then swing once for every sword you counted. The computer does the remembering.",
    goalText: 'Count the swords as you pass, then swing that many times.',
    makeWorld: () =>
      buildWorld({
        grid: ['---------'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          dragon: { character: 'dragon', x: 7, y: 0, facing: 'left', health: 2 },
        },
        items: [
          { x: 0, y: 0, kind: 'sword' },
          { x: 2, y: 0, kind: 'sword' },
          { x: 4, y: 0, kind: 'sword' },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move', 'grab', 'attack', 'repeat', 'if-sword', 'count-start', 'count-add', 'repeat-count'],
    variable: 'swords',
    goal: ({ world }) => (world.sprites.dragon.health ?? 1) === 0,
    requires: [
      { kind: 'set', message: 'You need a count for this one — start it at 0 and add one for each sword.' },
      { kind: 'if', message: 'Only add one when there is actually a sword there. That needs an if.' },
    ],
    reference: `grab(sniff)
set swords = 0
repeat 6 {
  if swordHere(sniff) {
    set swords = swords + 1
  }
  move(sniff, right)
}
repeat swords {
  attack(sniff)
}`,
    par: 8,
    skills: ['code.loops', 'code.conditionals', 'maths.counting', 'maths.logic'],
    hints: [
      'Take the sword you are standing on first — you will need something to swing.',
      'Start the count at 0 before you set off. Then walk the street, checking each square as you go.',
      'Inside the repeat: if swordHere(sniff), add one. Then move. At the end, repeat swords times and attack.',
    ],
    reward: { xp: 95, sticker: 'sword-tally' },
  },

  {
    id: 'c2l5',
    chapter: 2,
    index: 5,
    title: 'Until It Gives Up',
    briefing:
      "Nobody knows how tough this one is. Not you, not Bolt, not the dragon. So counting will not help: " +
      "you need to keep going until it has had enough, however long that takes. " +
      "There is a command for exactly that, and it is the most useful one you have learned yet.",
    goalText: 'Keep swinging until the dragon gives up.',
    makeWorld: () =>
      buildWorld({
        grid: ['-------'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          dragon: { character: 'dragon', x: 5, y: 0, facing: 'left', health: 4 },
        },
        items: [{ x: 0, y: 0, kind: 'sword' }],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'attack', 'until-dragon'],
    goal: ({ world }) => (world.sprites.dragon.health ?? 1) === 0,
    requires: [
      {
        kind: 'until',
        message: 'Guessing the number works until it does not. Use "until dragon gives up" and you never have to guess.',
      },
    ],
    reference: `grab(sniff)
move(sniff, right, 4)
repeatUntil dragonBeaten() {
  attack(sniff)
}`,
    par: 4,
    skills: ['code.loops', 'code.conditionals', 'maths.logic'],
    hints: [
      'Sword first, then get right next to it. You know this bit.',
      'You cannot count the swings this time, because nobody knows the number. So do not count them.',
      'Put attack(sniff) inside "until dragon gives up". It will stop by itself at exactly the right moment.',
    ],
    reward: { xp: 110, sticker: 'dragon-scale' },
    bridgeCard: 'until',
  },

  {
    id: 'c2l6',
    chapter: 2,
    index: 6,
    title: 'The Last Dragon',
    briefing:
      "This is the big one. It is stuck in the fence again, it is in a foul mood, and nobody has any " +
      "idea how many swings it will take. Sniff on the left, Kea on the right, and neither of them can " +
      "get to the other side. Everything you know, all at once. Nan McSnap has brought a thermos.",
    goalText: 'Both heroes, going until it gives up — in 8 lines or fewer.',
    makeWorld: () =>
      buildWorld({
        grid: ['-----#-----'],
        sprites: {
          sniff: { character: 'sniff', x: 0, y: 0 },
          kea: { character: 'kea', x: 10, y: 0, facing: 'left' },
          dragon: { character: 'dragon', x: 5, y: 0, health: 4 },
          nan: { character: 'nan', x: 8, y: 0, facing: 'left' },
        },
        items: [
          { x: 0, y: 0, kind: 'sword' },
          { x: 10, y: 0, kind: 'sword' },
        ],
      }),
    makeStarter: () => [],
    bricks: ['move-n', 'grab', 'attack', 'until-dragon', 'bark'],
    commandable: ['sniff', 'kea'],
    goal: ({ world, size }) => (world.sprites.dragon.health ?? 1) === 0 && size <= 8,
    maxLines: 8,
    requires: [{ kind: 'until', message: 'Nobody knows the number, so do not guess it. Go until it gives up.' }],
    reference: `grab(sniff)
move(sniff, right, 4)
grab(kea)
move(kea, left, 4)
repeatUntil dragonBeaten() {
  attack(sniff)
  attack(kea)
}`,
    par: 7,
    skills: ['code.loops', 'code.conditionals', 'code.sequence', 'maths.position', 'maths.logic'],
    hints: [
      'Get both of them armed and in position before anybody swings at anything.',
      'Kea starts on the right and moves LEFT. Sniff starts on the left and moves right.',
      'Then one "until dragon gives up", with both attacks inside it. They take turns automatically.',
    ],
    reward: { xp: 150, sticker: 'dragon-slayer' },
  },
];

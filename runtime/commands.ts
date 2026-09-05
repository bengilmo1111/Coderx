/**
 * The verbs Henry has. Each one is a Host command the interpreter can call.
 *
 * Design rule: every failure here is a *story* failure, not a programming
 * failure. Walking into a fence is Sniff bonking his nose, not an exception.
 */

import { CoderXError, errors } from '@/lang/errors';
import type { Host, Value } from '@/lang/types';
import {
  CHARACTERS,
  DELTAS,
  cloneWorld,
  isDirection,
  itemAt,
  itemById,
  tileAt,
  type Effect,
  type Frame,
  type WorldState,
} from './world';

export interface CommandSpec {
  name: string;
  /** Arity range — some commands take an optional count. */
  minArgs: number;
  maxArgs: number;
  /** Shown in the brick bar and in Bolt's explanations. */
  help: string;
}

export const COMMANDS: CommandSpec[] = [
  { name: 'move', minArgs: 2, maxArgs: 3, help: 'Walk somebody one way. Add a number to go further.' },
  { name: 'grab', minArgs: 1, maxArgs: 1, help: 'Pick up whatever is under their feet.' },
  { name: 'drop', minArgs: 1, maxArgs: 1, help: 'Put down what they are carrying.' },
  { name: 'say', minArgs: 2, maxArgs: 2, help: 'Give somebody a speech bubble.' },
  { name: 'bark', minArgs: 1, maxArgs: 1, help: 'BARK. Loudly. For no reason.' },
  { name: 'wait', minArgs: 1, maxArgs: 1, help: 'Do nothing. Dramatically.' },
  { name: 'attack', minArgs: 1, maxArgs: 1, help: 'Swing whatever you are holding at the dragon.' },
];

export const CONDITIONS: CommandSpec[] = [
  { name: 'rubbishHere', minArgs: 1, maxArgs: 1, help: 'Is there rubbish under their feet?' },
  { name: 'holding', minArgs: 1, maxArgs: 1, help: 'Are they carrying something?' },
  { name: 'atBin', minArgs: 1, maxArgs: 1, help: 'Are they standing on a bin?' },
  { name: 'hasSword', minArgs: 1, maxArgs: 1, help: 'Are they holding a sword?' },
  { name: 'swordHere', minArgs: 1, maxArgs: 1, help: 'Is there a sword under their feet?' },
  { name: 'dragonBeaten', minArgs: 0, maxArgs: 0, help: 'Has the dragon had enough?' },
];

/**
 * Runs commands against a world and records a frame after each statement.
 * The interpreter yields; this collects. Nothing here knows about time.
 */
export class WorldHost implements Host {
  readonly frames: Frame[] = [];
  private pending: Effect[] = [];

  /** `commandable` empty means everyone takes orders. */
  constructor(
    public world: WorldState,
    private readonly commandable: string[] = [],
  ) {}

  /** Called by the player after each yielded step. */
  snapshot(stmtId: string, vars: ReadonlyMap<string, number> = new Map()): void {
    this.frames.push({
      stmtId,
      world: cloneWorld(this.world),
      effects: this.pending,
      vars: Object.fromEntries(vars),
    });
    this.pending = [];
  }

  private sprite(name: Value, stmtId?: string) {
    const key = String(name);
    const s = this.world.sprites[key];
    if (!s) throw errors.noSuchCharacter(key, stmtId);
    if (this.commandable.length && !this.commandable.includes(key)) {
      throw new CoderXError(`${CHARACTERS[s.character].label} does not take orders from you.`, {
        stmtId,
        tryThis: `Try ${this.commandable.join(' or ')} instead.`,
      });
    }
    return s;
  }

  private label(name: Value): string {
    const s = this.world.sprites[String(name)];
    return s ? CHARACTERS[s.character].label : String(name);
  }

  runCommand(name: string, args: Value[]): void {
    const spec = COMMANDS.find((c) => c.name === name);
    if (!spec) throw errors.unknownCommand(name);
    if (args.length < spec.minArgs || args.length > spec.maxArgs) {
      throw errors.wrongArgCount(name, spec.minArgs, args.length);
    }

    switch (name) {
      case 'move':
        return this.move(args);
      case 'grab':
        return this.grab(args[0]);
      case 'drop':
        return this.drop(args[0]);
      case 'say':
        this.pending.push({ kind: 'say', who: String(args[0]), text: String(args[1]) });
        this.sprite(args[0]);
        return;
      case 'bark':
        this.sprite(args[0]);
        this.pending.push({ kind: 'pow', who: String(args[0]), text: 'BARK!' });
        return;
      case 'wait':
        this.pending.push({ kind: 'wait' });
        return;
      case 'attack':
        return this.attack(args[0]);
    }
  }

  private move(args: Value[]): void {
    const s = this.sprite(args[0]);
    const dir = args[1];
    if (!isDirection(dir)) {
      throw new CoderXError(`"${String(dir)}" isn't a way to go. I know up, down, left and right.`, {
        tryThis: 'Tap the direction box and pick one from the wheel.',
      });
    }
    const stepsRaw = args.length === 3 ? args[2] : 1;
    if (typeof stepsRaw !== 'number') throw errors.notANumber(String(stepsRaw));
    const steps = Math.floor(stepsRaw);
    if (steps < 0) {
      throw new CoderXError(`You asked for ${steps} steps. That's fewer than none!`, {
        tryThis: 'Use a number bigger than 0 — or change the direction instead.',
      });
    }

    s.facing = dir;
    const { dx, dy } = DELTAS[dir];
    for (let i = 0; i < steps; i += 1) {
      const nx = s.x + dx;
      const ny = s.y + dy;
      const tile = tileAt(this.world, nx, ny);
      if (tile === null || tile === 'fence') {
        throw new CoderXError(`${this.label(args[0])} bonked straight into the fence. Ouch.`, {
          tryThis: 'Count the squares again — how many are actually there?',
        });
      }
      s.x = nx;
      s.y = ny;
      // A carried item travels with its carrier.
      const carried = itemById(this.world, s.carrying);
      if (carried) {
        carried.x = nx;
        carried.y = ny;
      }
    }
  }

  private grab(who: Value): void {
    const s = this.sprite(who);
    if (s.carrying) {
      throw new CoderXError(`${this.label(who)} already has both paws full.`, {
        tryThis: 'Drop what they are carrying first, then grab.',
      });
    }
    const item = itemAt(this.world, s.x, s.y);
    if (!item) {
      throw new CoderXError(`There's nothing to grab here. ${this.label(who)} just grabbed some air.`, {
        tryThis: 'Move onto a square that actually has something on it.',
      });
    }
    s.carrying = item.id;
    this.pending.push({ kind: 'sparkle', who: String(who) });
  }

  private drop(who: Value): void {
    const s = this.sprite(who);
    if (!s.carrying) {
      throw new CoderXError(`${this.label(who)} isn't carrying anything to drop.`, {
        tryThis: 'Grab something first.',
      });
    }
    const id = s.carrying;
    const item = itemById(this.world, id);
    s.carrying = null;
    // Only rubbish counts as binned. Posting a sword into a wheelie bin is a
    // waste of a sword.
    if (item?.kind === 'rubbish' && tileAt(this.world, s.x, s.y) === 'bin') {
      this.world.items = this.world.items.filter((i) => i.id !== id);
      this.world.binned += 1;
      this.pending.push({ kind: 'pow', who: String(who), text: 'SLAM DUNK!' });
    } else {
      this.pending.push({ kind: 'sparkle', who: String(who) });
    }
  }

  /** Something of this kind on their square that they are not already holding. */
  private loose(s: { x: number; y: number; carrying: string | null }, kind: 'rubbish' | 'sword') {
    return this.world.items.some((i) => i.x === s.x && i.y === s.y && i.kind === kind && i.id !== s.carrying);
  }

  private dragon() {
    const entry = Object.entries(this.world.sprites).find(([, s]) => s.character === 'dragon');
    return entry?.[1];
  }

  private attack(who: Value): void {
    const s = this.sprite(who);
    const weapon = itemById(this.world, s.carrying);
    if (weapon?.kind !== 'sword') {
      throw new CoderXError(`${this.label(who)} has nothing to fight with, and dragons notice.`, {
        tryThis: 'Grab a sword first, then attack.',
      });
    }
    const dragon = this.dragon();
    if (!dragon) {
      throw new CoderXError('There is no dragon here to attack. Lucky, really.', {
        tryThis: 'Save your swinging for a level with a dragon in it.',
      });
    }
    if (Math.abs(dragon.x - s.x) > 1) {
      throw new CoderXError(`The dragon is too far away. ${this.label(who)} just hit the air.`, {
        tryThis: 'Move next to the dragon before you attack.',
      });
    }
    if ((dragon.health ?? 0) <= 0) {
      throw new CoderXError('The dragon has already given up. Leave it alone.', {
        tryThis: 'Use repeatUntil dragonBeaten() so you stop at the right time.',
      });
    }
    dragon.health = Math.max(0, (dragon.health ?? 0) - 1);
    this.pending.push({
      kind: 'pow',
      who: String(who),
      text: dragon.health === 0 ? 'ENOUGH!' : 'WHACK!',
    });
  }

  testCondition(name: string, args: Value[]): boolean {
    const spec = CONDITIONS.find((c) => c.name === name);
    if (!spec) throw errors.unknownCommand(name);

    // The only condition about the world rather than a character.
    if (name === 'dragonBeaten') return (this.dragon()?.health ?? 0) <= 0;

    const s = this.sprite(args[0]);
    switch (name) {
      case 'rubbishHere':
        return this.loose(s, 'rubbish');
      case 'swordHere':
        return this.loose(s, 'sword');
      case 'holding':
        return s.carrying !== null;
      case 'atBin':
        return tileAt(this.world, s.x, s.y) === 'bin';
      case 'hasSword':
        return itemById(this.world, s.carrying)?.kind === 'sword';
      default:
        return false;
    }
  }
}

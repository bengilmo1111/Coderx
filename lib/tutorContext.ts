/**
 * Grounding for the tutor.
 *
 * Bolt was giving confidently wrong hints — telling Henry a correct solution
 * had "only covered three squares", and suggesting directions that walk into a
 * fence. The model had the level title and nothing else, so it was guessing at
 * a world it could not see.
 *
 * coderX can simply tell it. We own the interpreter, so before asking for a
 * hint we run his actual code against the actual level and hand over what
 * happened. A tutor that knows whether the code works is a different tutor.
 */

import { parse } from '@/lang/parser';
import { countStmts, missingRequirement } from '@/editor/program';
import { CoderXError } from '@/lang/errors';
import { runProgram } from '@/runtime/run';
import { CHARACTERS, type WorldState } from '@/runtime/world';
import type { Level } from '@/curriculum/types';

/** Compact, factual description of the board. Columns are 0-based from the left. */
export function describeWorld(world: WorldState, commandable: string[] = ['sniff']): string {
  const cols = (predicate: (x: number, y: number) => boolean) => {
    const found: string[] = [];
    for (let y = 0; y < world.h; y += 1)
      for (let x = 0; x < world.w; x += 1) if (predicate(x, y)) found.push(String(x));
    return found.length ? found.join(', ') : 'none';
  };

  const bins = cols((x, y) => world.tiles[y][x] === 'bin');
  const rubbish = world.items.filter((i) => i.kind === 'rubbish').map((i) => String(i.x)).join(', ') || 'none';
  const swords = world.items.filter((i) => i.kind === 'sword').map((i) => String(i.x)).join(', ');
  const heroes = Object.entries(world.sprites).filter(([name]) => commandable.includes(name));
  const bystanders = Object.entries(world.sprites).filter(([name]) => !commandable.includes(name));

  const who =
    `You command ${heroes.map(([n, s]) => `"${n}" (${CHARACTERS[s.character].label}), at column ${s.x}`).join(' and ')}.` +
    (bystanders.length
      ? ` Also on the board, but taking no orders from anyone: ${bystanders
          .map(([n, s]) => `${CHARACTERS[s.character].label} at column ${s.x}`)
          .join(', ')}. Never tell him to command them.`
      : '');

  return [
    `The board is ${world.w} squares wide. Columns are numbered from 0 at the far left to ${world.w - 1} at the right.`,
    `${who} Everything happens along one row, so only left and right matter.`,
    `Bins are at column(s): ${bins}. Rubbish is at column(s): ${rubbish}.`,
    ...(swords ? [`Swords are at column(s): ${swords}.`] : []),
    'Walking past column ' + (world.w - 1) + ' or before column 0 hits the fence.',
  ].join(' ');
}

export interface Simulation {
  /** False when the code could not even be read (usually an unfilled hole). */
  ran: boolean;
  solved: boolean;
  /** Set when the level has a line budget he is over. */
  overBudget?: { used: number; allowed: number };
  /** Set when it works but skips the construct the level is about. */
  missingConstruct?: string;
  error?: string;
  binned: number;
  needed: number;
  endedAt?: number;
  statements: number;
}

/** Runs his code against the real level, exactly as pressing Run would. */
export function simulate(level: Level, code: string): Simulation {
  const world = level.makeWorld();
  const needed = world.items.filter((i) => i.kind === 'rubbish').length;
  if (!code.trim()) return { ran: false, solved: false, binned: 0, needed, statements: 0 };

  try {
    const program = parse(code);
    const result = runProgram(program, level.makeWorld(), { commandable: level.commandable ?? ['sniff'] });
    const size = countStmts(program);
    const solved =
      !result.error && level.goal({ world: result.finalWorld, saids: result.saids, size });
    const sniff = result.finalWorld.sprites.sniff;
    const goalMet = !result.error && level.goal({ world: result.finalWorld, saids: result.saids, size: 0 });
    return {
      ran: true,
      solved,
      error: result.error?.boltSays,
      binned: result.finalWorld.binned,
      needed,
      endedAt: sniff?.x,
      statements: size,
      // Distinguish "it doesn't work" from "it works but it's too long", so
      // Bolt can say the right one.
      overBudget:
        level.maxLines && goalMet && size > level.maxLines
          ? { used: size, allowed: level.maxLines }
          : undefined,
      missingConstruct: goalMet ? (missingRequirement(program, level.requires) ?? undefined) : undefined,
    };
  } catch (e) {
    return {
      ran: false,
      solved: false,
      error: e instanceof CoderXError ? e.boltSays : undefined,
      binned: 0,
      needed,
      statements: 0,
    };
  }
}

export function describeOutcome(sim: Simulation): string {
  if (!sim.ran) {
    return sim.error
      ? `His code cannot run yet: ${sim.error}`
      : 'He has not written anything that can run yet.';
  }
  const parts = [
    sim.solved
      ? 'HIS CODE ALREADY SOLVES THIS LEVEL. Do not suggest changes to make it work — it works.'
      : sim.overBudget
        ? `IT WORKS, but this level allows ${sim.overBudget.allowed} lines and he used ${sim.overBudget.used}. ` +
          'Praise that it works, then nudge him toward a repeat to make it shorter. Never say it is wrong.'
        : sim.missingConstruct
          ? `IT WORKS, but this level is about a particular idea he has not used: "${sim.missingConstruct}" ` +
            'Praise that it works first, then point him at that idea. Never say it is wrong.'
          : 'His code does not solve the level yet.',
    `Rubbish binned: ${sim.binned} of ${sim.needed}.`,
  ];
  if (sim.endedAt !== undefined) parts.push(`Sniff finished at column ${sim.endedAt}.`);
  if (sim.error) parts.push(`It stopped with: ${sim.error}`);
  return parts.join(' ');
}

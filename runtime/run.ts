/**
 * Ties the interpreter to the world and produces a list of frames.
 *
 * Errors do NOT discard the frames collected so far — Henry needs to watch
 * Sniff walk cheerfully into the fence, because seeing the mistake happen is
 * most of the lesson. The error is returned alongside the frames.
 */

import { CoderXError } from '@/lang/errors';
import { execute, DEFAULT_MAX_STEPS } from '@/lang/interpreter';
import type { Program } from '@/lang/types';
import { WorldHost } from './commands';
import type { Frame, WorldState } from './world';

export interface RunResult {
  frames: Frame[];
  error?: CoderXError;
  steps: number;
  finalWorld: WorldState;
  /** Everything anybody said, in order. Levels can require Henry to write. */
  saids: string[];
}

export function runProgram(
  program: Program,
  world: WorldState,
  options: { maxSteps?: number; commandable?: string[] } = {},
): RunResult {
  const host = new WorldHost(world, options.commandable ?? []);
  const gen = execute(program, host, { maxSteps: options.maxSteps ?? DEFAULT_MAX_STEPS });

  let steps = 0;
  let error: CoderXError | undefined;

  try {
    for (;;) {
      const r = gen.next();
      if (r.done) {
        steps = r.value;
        break;
      }
      steps = r.value.count;
      host.snapshot(r.value.stmtId, r.value.vars);
    }
  } catch (e) {
    if (e instanceof CoderXError) {
      error = e;
      // Keep whatever happened before the bang, so the animation still plays.
      host.snapshot(e.stmtId ?? '');
    } else {
      throw e;
    }
  }

  const saids = host.frames.flatMap((f) =>
    f.effects.filter((x) => x.kind === 'say' && x.text).map((x) => x.text as string),
  );

  return { frames: host.frames, error, steps, finalWorld: host.world, saids };
}

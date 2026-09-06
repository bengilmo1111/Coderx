import { describe, expect, it } from 'vitest';

import { getLevel, ALL_LEVELS } from '@/curriculum/levels';
import { allTemplates, generatedId, generatedLevel, parseGeneratedId } from '@/curriculum/template';
import { BINRUN, BINRUN_SHAPES, binrunBruteForce, binrunUnrolledLength } from '@/curriculum/templates/binrun';
import { SKILLS } from '@/curriculum/skills';
import { BRIDGE_CARDS } from '@/curriculum/bridgeCards';
import { STICKERS } from '@/progress/stickers';
import { BRICKS } from '@/editor/bricks';
import { countStmts } from '@/editor/program';
import { parse } from '@/lang/parser';
import { printSource } from '@/lang/printer';
import { runProgram } from '@/runtime/run';
import { CHARACTERS, type CharacterKey } from '@/runtime/world';
import type { Level } from '@/curriculum/types';
import type { Stmt } from '@/lang/types';

/**
 * The guarantee that lets coderX ship content nobody has read.
 *
 * tests/levels.test.ts proves each of the eighteen hand-written levels is
 * solvable by its own reference. A template can emit thousands, so the same
 * proof is done here over sampled seeds instead — and with several checks the
 * hand-written suite does not make, because a person writing a level by hand
 * notices these and a generator never will.
 */

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 197);

/** Every level this template can currently produce, at every band it claims. */
function sample(templateId: string): { id: string; level: Level }[] {
  const template = allTemplates().find((t) => t.id === templateId)!;
  const [min, max] = template.bands;
  const out: { id: string; level: Level }[] = [];
  for (let band = min; band <= max; band += 1) {
    for (const seed of SEEDS) {
      const id = generatedId(templateId, { band, seed });
      out.push({ id, level: generatedLevel(id)! });
    }
  }
  return out;
}

const BINRUNS = sample('binrun');

/** Run it the way the game runs it, not the way the old test does. */
function play(level: Level, source: string) {
  return runProgram(parse(source), level.makeWorld(), {
    commandable: level.commandable ?? ['sniff'],
  });
}

describe('the id is the level', () => {
  it('round-trips through the codec', () => {
    const id = generatedId('binrun', { band: 3, seed: 417 });
    expect(id).toBe('g-binrun-3-0417');
    expect(parseGeneratedId(id)).toEqual({ templateId: 'binrun', params: { band: 3, seed: 417 } });
  });

  it('rebuilds the same level every time, because progress is keyed by it', () => {
    for (const { id } of BINRUNS) {
      const a = getLevel(id)!;
      const b = getLevel(id)!;
      expect(a.title).toBe(b.title);
      expect(a.briefing).toBe(b.briefing);
      expect(a.reference).toBe(b.reference);
      expect(a.goalText).toBe(b.goalText);
      expect(a.skills).toEqual(b.skills);
      expect(a.bricks).toEqual(b.bricks);
      // The board too — the phone and the family computer must agree.
      expect(JSON.stringify(a.makeWorld())).toBe(JSON.stringify(b.makeWorld()));
    }
  });

  it('refuses ids it cannot rebuild rather than inventing something', () => {
    expect(generatedLevel('c1l1')).toBeUndefined();
    expect(generatedLevel('workshop')).toBeUndefined();
    expect(generatedLevel('g-nosuch-1-0000')).toBeUndefined();
    // A band the template does not claim.
    expect(generatedLevel('g-binrun-5-0000')).toBeUndefined();
    expect(generatedLevel('g-binrun-1-000')).toBeUndefined();
  });

  it('never collides with a hand-written level, and is safe in a URL', () => {
    const written = new Set([...ALL_LEVELS.map((l) => l.id), 'workshop']);
    for (const { id } of BINRUNS) {
      expect(written.has(id)).toBe(false);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('stays outside ALL_LEVELS, so it cannot re-lock a level he has finished', () => {
    const ids = new Set(ALL_LEVELS.map((l) => l.id));
    for (const { id } of BINRUNS) expect(ids.has(id)).toBe(false);
  });
});

describe('every generated caper is solvable by its own reference', () => {
  it('runs clean and meets its goal', () => {
    for (const { id, level } of BINRUNS) {
      const result = play(level, level.reference);
      expect(result.error, `${id}: ${result.error?.boltSays ?? ''}`).toBeUndefined();
      expect(
        level.goal({ world: result.finalWorld, saids: result.saids, size: level.par }),
        `${id} is not solved by its own reference`,
      ).toBe(true);
    }
  });

  it('par is the reference statement count, and fits the budget', () => {
    for (const { id, level } of BINRUNS) {
      expect(countStmts(parse(level.reference)), `${id} par`).toBe(level.par);
      if (level.maxLines) expect(level.par, `${id} par vs budget`).toBeLessThanOrEqual(level.maxLines);
    }
  });

  it('prints back to source that parses identically', () => {
    for (const { id, level } of BINRUNS) {
      const printed = printSource(parse(level.reference));
      expect(printSource(parse(printed)), `${id} round-trip`).toBe(printed);
      // A hole would print as ▢, which the tokeniser then refuses.
      expect(printed).not.toContain('▢');
    }
  });
});

describe('the lesson is actually forced', () => {
  it('the budget is enforced by the goal, not just drawn on screen', () => {
    // maxLines is only a counter chip in PlayScreen. If the goal ignores size,
    // the level teaches nothing and nothing else would notice.
    for (const { id, level } of BINRUNS) {
      if (!level.maxLines) continue;
      const result = play(level, level.reference);
      expect(
        level.goal({ world: result.finalWorld, saids: result.saids, size: level.maxLines + 1 }),
        `${id} accepts a program over its own budget`,
      ).toBe(false);
    }
  });

  it('refuses a correct but loop-free solution', () => {
    for (let band = BINRUN.bands[0]; band <= BINRUN.bands[1]; band += 1) {
      for (const { n, k } of BINRUN_SHAPES[band]) {
        // Find a seed that actually produced this shape.
        const match = BINRUNS.find(({ id, level }) => {
          const p = parseGeneratedId(id)!.params;
          return p.band === band && level.goalText.includes(`Bin all ${n} `) && level.reference.includes(`repeat ${n}`)
            && (k === 1 ? level.bricks.includes('move') : level.reference.includes(`right, ${k}`));
        });
        if (!match) continue;

        const source = binrunBruteForce(n, k);
        const result = play(match.level, source);
        const size = countStmts(parse(source));

        expect(result.error, result.error?.boltSays ?? '').toBeUndefined();
        // It genuinely does the job...
        expect(match.level.goal({ world: result.finalWorld, saids: result.saids, size: 0 })).toBe(true);
        // ...and is refused anyway, because it is the long way round.
        expect(size).toBe(binrunUnrolledLength(n));
        expect(size).toBeGreaterThan(match.level.maxLines!);
        expect(match.level.goal({ world: result.finalWorld, saids: result.saids, size })).toBe(false);
      }
    }
  });

  it('is not solved by doing nothing, or by wandering about', () => {
    for (const { id, level } of BINRUNS) {
      for (const source of ['', 'move(sniff, right)\nmove(sniff, right)', 'grab(sniff)']) {
        const result = play(level, source);
        const size = countStmts(parse(source));
        expect(
          !result.error && level.goal({ world: result.finalWorld, saids: result.saids, size }),
          `${id} fell over to "${source.replace(/\n/g, '; ')}"`,
        ).toBe(false);
      }
    }
  });
});

describe('a generated caper can be played the way he plays', () => {
  /** What the declared bricks can actually build, as kind and call arity. */
  function producible(brickIds: string[]) {
    const kinds = new Set<Stmt['kind']>();
    const calls = new Set<string>();
    for (const id of brickIds) {
      const brick = BRICKS[id];
      if (!brick) continue;
      const stmt = brick.make();
      kinds.add(stmt.kind);
      if (stmt.kind === 'call') calls.add(`${stmt.name}/${stmt.args.length}`);
    }
    return { kinds, calls };
  }

  it('every line of the reference can be reached by tapping', () => {
    // Tapping is the primary input, and bricksFor silently drops an id it does
    // not know — so a caper can otherwise ship that is only solvable by typing.
    for (const { id, level } of BINRUNS) {
      const { kinds, calls } = producible(level.bricks);
      const walk = (stmts: Stmt[]) => {
        for (const stmt of stmts) {
          expect(kinds.has(stmt.kind), `${id} needs a ${stmt.kind} brick`).toBe(true);
          if (stmt.kind === 'call') {
            expect(calls.has(`${stmt.name}/${stmt.args.length}`), `${id} needs ${stmt.name}/${stmt.args.length}`).toBe(true);
          }
          if ('body' in stmt) walk(stmt.body);
        }
      };
      walk(parse(level.reference));
    }
  });

  it('declares real bricks, skills, cards and hints', () => {
    for (const { id, level } of BINRUNS) {
      expect(level.skills.length, id).toBeGreaterThan(0);
      for (const s of level.skills) expect(SKILLS[s], `${id}: unknown skill ${s}`).toBeDefined();
      for (const b of level.bricks) expect(BRICKS[b], `${id}: unknown brick ${b}`).toBeDefined();
      if (level.bridgeCard) expect(BRIDGE_CARDS[level.bridgeCard], id).toBeDefined();
      expect(level.hints.length, id).toBeGreaterThanOrEqual(3);
      expect(level.title.length, id).toBeGreaterThan(0);
      expect(level.briefing.length, id).toBeGreaterThan(40);
    }
  });

  it('names a reward that exists — or no sticker at all', () => {
    for (const { id, level } of BINRUNS) {
      expect(level.reward.xp, id).toBeGreaterThan(0);
      // Generated capers pay in XP and crew badges; the story stickers are for
      // the hand-written moments they are jokes about.
      expect(level.reward.sticker, `${id} minted a sticker`).toBeUndefined();
    }
  });
});

describe('a generated caper only ever composes art that exists', () => {
  it('builds a board, with a cast that can be drawn and commanded', () => {
    for (const { id, level } of BINRUNS) {
      // buildWorld throws on an unknown grid character or a ragged row, so
      // simply constructing the world is most of the assertion.
      const world = level.makeWorld();
      expect(world.w, id).toBeGreaterThan(0);
      expect(world.h, id).toBeGreaterThan(0);

      for (const [name, sprite] of Object.entries(world.sprites)) {
        // The who-picker renders ❓ for a key that is not one of the cast.
        expect(CHARACTERS[name as CharacterKey], `${id}: sprite key "${name}"`).toBeDefined();
        expect(CHARACTERS[sprite.character], `${id}: character ${sprite.character}`).toBeDefined();
      }
      for (const who of level.commandable ?? []) {
        expect(world.sprites[who], `${id}: cannot command absent "${who}"`).toBeDefined();
      }
    }
  });

  it('never puts down more litter than one drawing can stand in for', () => {
    // public/cast/README.md: a single picture serves every piece of rubbish, so
    // six pieces is the same pile drawn six times.
    for (const { id, level } of BINRUNS) {
      const litter = level.makeWorld().items.filter((i) => i.kind === 'rubbish');
      expect(litter.length, `${id} litter`).toBeLessThanOrEqual(4);
    }
  });

  it('keeps the street inside what a phone can draw', () => {
    // The widest hand-written board is twelve squares.
    for (const { id, level } of BINRUNS) {
      expect(level.makeWorld().w, `${id} width`).toBeLessThanOrEqual(12);
    }
  });
});

describe('the maths is really in there', () => {
  it('tags the times tables when the stride is one', () => {
    for (const { level } of BINRUNS) {
      const stride = /right, (\d+)/.exec(level.reference);
      const k = stride ? Number(stride[1]) : 1;
      if (k === 1) expect(level.skills).toContain('maths.counting');
      else expect(level.skills).toContain('maths.times-tables');
      if (k === 2 || k === 3) expect(level.skills).toContain('maths.skip-counting');
      // The briefing is the reading practice, and carries the spacing he needs.
      expect(level.skills).toContain('literacy.comprehension');
    }
  });

  it('varies, so two capers in a band are not the same caper', () => {
    const band2 = BINRUNS.filter(({ id }) => parseGeneratedId(id)!.params.band === 2);
    expect(new Set(band2.map((x) => x.level.briefing)).size).toBeGreaterThan(1);
    expect(new Set(band2.map((x) => x.level.title)).size).toBeGreaterThan(1);
  });
});

describe('rewards that are named must exist', () => {
  it('covers the hand-written levels too, which nothing checked before', () => {
    for (const level of ALL_LEVELS) {
      if (!level.reward.sticker) continue;
      expect(STICKERS[level.reward.sticker], `${level.id}: unknown sticker`).toBeDefined();
    }
  });
});

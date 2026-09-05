/**
 * Canvas renderer. Comic-book look: fat black outlines, flat bright colour,
 * halftone dots, and everything a bit wonky on purpose.
 *
 * Pure — it takes two frames and a progress value and draws the in-between.
 * All the timing lives in usePlayback, so this stays easy to reason about.
 */

import { artFor } from './art';
import { CHARACTERS, MODES, type Effect, type Frame, type WorldState } from './world';

const INK = '#12100e';

/**
 * Litter, and specifically NOT a wastebasket.
 *
 * Rubbish used to be drawn as 🗑️ — which is a bin — sitting on a board whose
 * goal is putting things in a bin. Two bins on screen, and no way for an
 * 8-year-old to tell which was which. Everything here is unmistakably dropped
 * litter, and it varies per piece so a messy street looks messy.
 */
const LITTER = ['🍌', '🥤', '🍕', '📰', '🧃'];

export function litterGlyph(id: string): string {
  const n = [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return LITTER[n % LITTER.length];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

export interface Layout {
  cell: number;
  ox: number;
  oy: number;
  /** Whether to label the columns and rows. */
  axes: boolean;
}

export function layoutFor(world: WorldState, width: number, height: number): Layout {
  // Grids get column and row numbers down the edges, so they need room for them.
  // A one-row street does not — there is nothing to find your way around.
  const axes = world.h > 1;
  const pad = 14;
  const gutter = axes ? 20 : 0;
  const cell = Math.floor(
    Math.min((width - pad * 2 - gutter) / world.w, (height - pad * 2 - gutter) / world.h),
  );
  return {
    cell,
    ox: Math.floor((width - cell * world.w + gutter) / 2),
    oy: Math.floor((height - cell * world.h + gutter) / 2),
    axes,
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function halftone(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  const step = 12;
  for (let y = 0; y < h; y += step) {
    for (let x = (y / step) % 2 ? step / 2 : 0; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTiles(ctx: CanvasRenderingContext2D, world: WorldState, L: Layout) {
  for (let y = 0; y < world.h; y += 1) {
    for (let x = 0; x < world.w; x += 1) {
      const px = L.ox + x * L.cell;
      const py = L.oy + y * L.cell;
      const tile = world.tiles[y][x];

      const fill =
        tile === 'grass'
          ? '#8fd67a'
          : tile === 'path'
            ? '#e8e2d4'
            : tile === 'bin'
              ? '#4b5f7a'
              : tile === 'wall'
                ? '#b08968'
                : tile === 'gap'
                  ? '#2b2b33'
                  : '#7a6a55';
      ctx.fillStyle = fill;
      ctx.fillRect(px, py, L.cell, L.cell);

      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, L.cell - 1, L.cell - 1);

      if (tile === 'bin') {
        // A bin you can actually recognise: body, lid, and a highlight.
        const w = L.cell * 0.62;
        const h = L.cell * 0.6;
        const bx = px + (L.cell - w) / 2;
        const by = py + L.cell - h - L.cell * 0.12;
        ctx.fillStyle = '#2f3d52';
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(2, L.cell * 0.05);
        roundRect(ctx, bx, by, w, h, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#63789a';
        roundRect(ctx, bx - w * 0.08, by - h * 0.18, w * 1.16, h * 0.22, 4);
        ctx.fill();
        ctx.stroke();
      }

      if (tile === 'wall') {
        // Brickwork, so "you cannot walk through that" needs no explaining.
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 1.5;
        const courses = 3;
        for (let c = 1; c < courses; c += 1) {
          const ly = py + (L.cell / courses) * c;
          ctx.beginPath();
          ctx.moveTo(px, ly);
          ctx.lineTo(px + L.cell, ly);
          ctx.stroke();
        }
        for (let c = 0; c < courses; c += 1) {
          const lx = px + (c % 2 ? L.cell / 2 : L.cell);
          ctx.beginPath();
          ctx.moveTo(lx, py + (L.cell / courses) * c);
          ctx.lineTo(lx, py + (L.cell / courses) * (c + 1));
          ctx.stroke();
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px + 1, py + 1, L.cell - 2, L.cell - 2);
      }

      if (tile === 'gap') {
        // A hole, drawn as a hole: dark, with a lip so it reads as depth.
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(px, py, L.cell, L.cell * 0.12);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px + 1, py + 1, L.cell - 2, L.cell - 2);
      }

      if (tile === 'fence') {
        ctx.fillStyle = '#5c4c39';
        ctx.fillRect(px + L.cell * 0.15, py + L.cell * 0.1, L.cell * 0.7, L.cell * 0.8);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + L.cell * 0.15, py + L.cell * 0.1, L.cell * 0.7, L.cell * 0.8);
      }
    }
  }

  // One heavy panel border around the whole world.
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, L.cell * 0.08);
  ctx.strokeRect(L.ox, L.oy, L.cell * world.w, L.cell * world.h);

  if (L.axes) drawAxes(ctx, world, L);
}

/**
 * Column and row numbers down the edges.
 *
 * This is how coordinates get taught: no new command, just numbers he can read
 * and count. "The cog is at column 4, row 2" is then something he can check
 * against the picture, which is exactly the Year 4-5 skill.
 */
function drawAxes(ctx: CanvasRenderingContext2D, world: WorldState, L: Layout) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.font = `800 ${Math.max(9, Math.min(13, L.cell * 0.26))}px ui-rounded, "Trebuchet MS", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let x = 0; x < world.w; x += 1) {
    ctx.fillText(String(x), L.ox + x * L.cell + L.cell / 2, L.oy - 10);
  }
  ctx.textAlign = 'right';
  for (let y = 0; y < world.h; y += 1) {
    ctx.fillText(String(y), L.ox - 7, L.oy + y * L.cell + L.cell / 2);
  }
  ctx.restore();
}

function glyph(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

function speechBubble(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, cell: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${Math.max(12, cell * 0.26)}px ui-rounded, "Trebuchet MS", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const padX = cell * 0.22;
  const w = Math.min(ctx.measureText(text).width + padX * 2, cell * 4.2);
  const h = cell * 0.62;
  const bx = cx - w / 2;
  const by = cy - cell * 0.95 - h;

  ctx.fillStyle = '#fffdf5';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, cell * 0.05);
  roundRect(ctx, bx, by, w, h, cell * 0.18);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - cell * 0.1, by + h - 1);
  ctx.lineTo(cx + cell * 0.02, by + h + cell * 0.26);
  ctx.lineTo(cx + cell * 0.14, by + h - 1);
  ctx.closePath();
  ctx.fillStyle = '#fffdf5';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.fillText(text, cx, by + h / 2, w - padX * 2);
  ctx.restore();
}

function powBurst(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  cell: number,
  t: number,
  ceiling = 0,
) {
  const scale = 0.6 + easeOut(Math.min(1, t * 2)) * 0.6;
  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, t - 0.6) / 0.4;
  // The stage is one row tall now, so a burst hung high above the sprite runs
  // off the top of the canvas.
  const lift = cell * 0.5;
  ctx.translate(cx, Math.max(ceiling + cell * 0.55, cy - lift));
  ctx.scale(scale, scale);
  ctx.rotate(-0.15);

  ctx.beginPath();
  const spikes = 11;
  for (let i = 0; i < spikes * 2; i += 1) {
    const r = i % 2 === 0 ? cell * 0.72 : cell * 0.44;
    const a = (Math.PI * i) / spikes;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.font = `900 ${cell * 0.26}px ui-rounded, "Trebuchet MS", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number, t: number) {
  ctx.save();
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  const r = cell * (0.35 + t * 0.5);
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI * 2 * i) / 6 + t;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  prev: Frame | null,
  next: Frame,
  t: number,
) {
  const world = next.world;
  const L = layoutFor(world, width, height);
  const ease = easeOut(Math.min(1, Math.max(0, t)));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fdf6e3';
  ctx.fillRect(0, 0, width, height);
  halftone(ctx, width, height);

  drawTiles(ctx, world, L);

  const centre = (x: number, y: number) => ({
    cx: L.ox + x * L.cell + L.cell / 2,
    cy: L.oy + y * L.cell + L.cell / 2,
  });

  // Items on the ground, and the one being carried.
  for (const r of world.items) {
    const before = prev?.world.items.find((p) => p.id === r.id);
    const x = before ? lerp(before.x, r.x, ease) : r.x;
    const y = before ? lerp(before.y, r.y, ease) : r.y;
    const { cx, cy } = centre(x, y);
    const carried = Object.values(world.sprites).some((s) => s.carrying === r.id);
    // Rubbish sits in the top of the square. Levels 3 onward put rubbish ON a
    // bin, and drawn centred it looked like it was already in the bin — which
    // is the opposite of the thing you are being asked to fix.
    const lift = carried ? -L.cell * 0.42 : -L.cell * 0.22;
    const size = L.cell * (carried ? 0.36 : 0.44);
    const itemArt = artFor(`item:${r.kind}`);
    if (itemArt) {
      ctx.drawImage(itemArt, cx - size / 2, cy + lift - size / 2, size, size);
    } else {
      const face = r.kind === 'sword' ? '🗡️' : r.kind === 'part' ? '⚙️' : litterGlyph(r.id);
      glyph(ctx, face, cx, cy + lift, size);
    }
  }

  // Characters.
  for (const [name, s] of Object.entries(world.sprites)) {
    const before = prev?.world.sprites[name];
    const x = before ? lerp(before.x, s.x, ease) : s.x;
    const y = before ? lerp(before.y, s.y, ease) : s.y;
    const { cx, cy } = centre(x, y);
    // A little bounce while walking sells the movement more than any sprite work.
    const moving = before && (before.x !== s.x || before.y !== s.y);
    const bob = moving ? Math.abs(Math.sin(ease * Math.PI * 2)) * L.cell * 0.1 : 0;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(cx, cy + L.cell * 0.3, L.cell * 0.26, L.cell * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Artwork if it has been dropped into /public/cast, emoji otherwise. A
    // transforming robot can have a picture per mode.
    const art = s.mode && s.mode !== 'robot' ? artFor(`${s.character}:${s.mode}`, s.character) : artFor(s.character);
    const size = L.cell * 0.62;
    if (art) {
      ctx.drawImage(art, cx - size / 2, cy - bob - size / 2, size, size);
    } else {
      glyph(ctx, CHARACTERS[s.character].glyph, cx, cy - bob, size);
    }

    if (s.maxHealth) healthBar(ctx, cx, cy - size * 0.72, L.cell, s.health ?? 0, s.maxHealth);
    // What shape he is currently in, on him, so it is never a mystery.
    if (s.mode && s.mode !== 'robot') {
      glyph(ctx, MODES[s.mode].glyph, cx + size * 0.36, cy - size * 0.36, L.cell * 0.3);
    }
  }

  // Effects belong to the frame they were produced in.
  for (const e of next.effects) drawEffect(ctx, e, world, L, centre, ease);

  drawVariables(ctx, next.vars);
}

/**
 * Variables, on screen, changing as they change.
 *
 * A number that only exists inside the code is invisible. Watching `swords`
 * tick up while the loop runs is the whole reason a variable makes sense.
 */
function drawVariables(ctx: CanvasRenderingContext2D, vars: Record<string, number> | undefined) {
  const entries = Object.entries(vars ?? {});
  if (entries.length === 0) return;

  // Pinned to the canvas corner, not to the world. Positioned above the world
  // strip it was clipped off the top of the picture, which rather defeated the
  // point of putting the number where he can watch it change.
  ctx.save();
  ctx.font = '900 15px ui-rounded, "Trebuchet MS", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  let y = 8;
  for (const [name, value] of entries) {
    const text = `${name}: ${value}`;
    const w = ctx.measureText(text).width + 18;
    const h = 26;
    ctx.fillStyle = '#fffdf5';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    roundRect(ctx, 8, y, w, h, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(text, 17, y + h / 2);
    y += h + 5;
  }
  ctx.restore();
}

/** How much fight the dragon has left, in hearts you can count. */
function healthBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  health: number,
  maxHealth: number,
) {
  const pip = cell * 0.13;
  const gap = pip * 0.55;
  const total = maxHealth * pip + (maxHealth - 1) * gap;
  let x = cx - total / 2;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let i = 0; i < maxHealth; i += 1) {
    ctx.beginPath();
    ctx.arc(x + pip / 2, cy, pip / 2, 0, Math.PI * 2);
    ctx.fillStyle = i < health ? '#e5484d' : 'rgba(255,255,255,0.75)';
    ctx.fill();
    ctx.stroke();
    x += pip + gap;
  }
  ctx.restore();
}

function drawEffect(
  ctx: CanvasRenderingContext2D,
  e: Effect,
  world: WorldState,
  L: Layout,
  centre: (x: number, y: number) => { cx: number; cy: number },
  t: number,
) {
  const s = e.who ? world.sprites[e.who] : undefined;
  if (!s) return;
  const { cx, cy } = centre(s.x, s.y);
  if (e.kind === 'say' && e.text) speechBubble(ctx, e.text, cx, cy, L.cell, Math.min(1, t * 3));
  if (e.kind === 'pow' && e.text) powBurst(ctx, e.text, cx, cy, L.cell, t, L.oy);
  if (e.kind === 'sparkle') sparkle(ctx, cx, cy, L.cell, t);
}

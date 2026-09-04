/**
 * Canvas renderer. Comic-book look: fat black outlines, flat bright colour,
 * halftone dots, and everything a bit wonky on purpose.
 *
 * Pure — it takes two frames and a progress value and draws the in-between.
 * All the timing lives in usePlayback, so this stays easy to reason about.
 */

import { CHARACTERS, type Effect, type Frame, type WorldState } from './world';

const INK = '#12100e';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

export interface Layout {
  cell: number;
  ox: number;
  oy: number;
}

export function layoutFor(world: WorldState, width: number, height: number): Layout {
  const pad = 14;
  const cell = Math.floor(Math.min((width - pad * 2) / world.w, (height - pad * 2) / world.h));
  return {
    cell,
    ox: Math.floor((width - cell * world.w) / 2),
    oy: Math.floor((height - cell * world.h) / 2),
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
        tile === 'grass' ? '#8fd67a' : tile === 'path' ? '#e8e2d4' : tile === 'bin' ? '#4b5f7a' : '#7a6a55';
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

function powBurst(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, cell: number, t: number) {
  const scale = 0.6 + easeOut(Math.min(1, t * 2)) * 0.6;
  ctx.save();
  ctx.globalAlpha = 1 - Math.max(0, t - 0.6) / 0.4;
  ctx.translate(cx, cy - cell * 0.7);
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

  // Rubbish that isn't being carried.
  for (const r of world.rubbish) {
    const before = prev?.world.rubbish.find((p) => p.id === r.id);
    const x = before ? lerp(before.x, r.x, ease) : r.x;
    const y = before ? lerp(before.y, r.y, ease) : r.y;
    const { cx, cy } = centre(x, y);
    const carried = Object.values(world.sprites).some((s) => s.carrying === r.id);
    glyph(ctx, '🗑️', cx, cy + (carried ? -L.cell * 0.42 : L.cell * 0.06), L.cell * (carried ? 0.34 : 0.46));
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
    glyph(ctx, CHARACTERS[s.character].glyph, cx, cy - bob, L.cell * 0.62);
  }

  // Effects belong to the frame they were produced in.
  for (const e of next.effects) drawEffect(ctx, e, world, L, centre, ease);
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
  if (e.kind === 'pow' && e.text) powBurst(ctx, e.text, cx, cy, L.cell, t);
  if (e.kind === 'sparkle') sparkle(ctx, cx, cy, L.cell, t);
}

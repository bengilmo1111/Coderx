/**
 * Recording what he does — and doing nothing with it yet.
 *
 * docs/memory-loop.md is explicit about the order: write observations, change
 * nothing about the game, and only after a couple of weeks build a model and
 * check it against what Ben already knows about his own son. The clock on that
 * only starts when recording does, which is why this ships now.
 *
 * Observations, never conclusions. Nothing here decides anything about him.
 */

import { NextResponse } from 'next/server';
import { sbInsertQuietly, syncEnabled } from '@/lib/supabase';
import { nzDay } from '@/progress/streak';
import { currentProfileId } from '@/lib/session';

export const runtime = 'nodejs';

const MAX_BATCH = 50;

interface Observation {
  kind: string;
  levelId?: string;
  skillIds?: string[];
  payload?: Record<string, unknown>;
}

export async function POST(request: Request) {
  if (!syncEnabled()) return NextResponse.json({ ok: false });
  const profileId = await currentProfileId();
  if (!profileId) return NextResponse.json({ ok: false });

  let events: Observation[];
  try {
    events = (await request.json()) as Observation[];
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (!Array.isArray(events) || events.length === 0) return NextResponse.json({ ok: true });

  const day = nzDay();
  const rows = events.slice(0, MAX_BATCH).map((e) => ({
    profile_id: profileId,
    nz_day: day,
    kind: String(e.kind).slice(0, 40),
    level_id: e.levelId ? String(e.levelId).slice(0, 40) : null,
    skill_ids: Array.isArray(e.skillIds) ? e.skillIds.slice(0, 12).map(String) : null,
    payload: e.payload && typeof e.payload === 'object' ? e.payload : {},
  }));

  await sbInsertQuietly('observations', rows);
  return NextResponse.json({ ok: true });
}

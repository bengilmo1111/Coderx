/**
 * Pulling and pushing progress.
 *
 * The push MERGES server-side rather than replacing. That is the whole design:
 * a device that has been offline all week must not be able to roll back what
 * happened on the other one, and a Saturday on the computer must not erase
 * Friday night's stickers from the phone.
 */

import { NextResponse } from 'next/server';
import { mergeProgress } from '@/progress/merge';
import { emptyProgress } from '@/progress/store';
import type { ProgressState } from '@/progress/types';
import { sbSelect, sbUpsert, syncEnabled } from '@/lib/supabase';
import { currentProfileId } from '@/lib/session';

export const runtime = 'nodejs';

interface ProgressRow {
  profile_id: string;
  state: ProgressState;
  updated_at: string;
}

async function stored(profileId: string): Promise<ProgressState | null> {
  const rows = await sbSelect<ProgressRow>(
    'progress',
    `select=state&profile_id=eq.${encodeURIComponent(profileId)}`,
  );
  return rows?.[0]?.state ?? null;
}

export async function GET() {
  if (!syncEnabled()) return NextResponse.json({ sync: false });
  const profileId = await currentProfileId();
  if (!profileId) return NextResponse.json({ sync: true, signedIn: false });

  return NextResponse.json({ sync: true, signedIn: true, state: await stored(profileId) });
}

export async function PUT(request: Request) {
  if (!syncEnabled()) return NextResponse.json({ sync: false });
  const profileId = await currentProfileId();
  if (!profileId) return NextResponse.json({ sync: true, signedIn: false });

  let incoming: ProgressState;
  try {
    incoming = (await request.json()) as ProgressState;
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (!incoming || typeof incoming !== 'object') return NextResponse.json({ ok: false });

  const existing = await stored(profileId);
  const merged = existing ? mergeProgress({ ...emptyProgress(), ...existing }, incoming) : incoming;

  const saved = await sbUpsert<ProgressRow>(
    'progress',
    { profile_id: profileId, state: merged, updated_at: new Date().toISOString() },
    'profile_id',
  );
  // A failed write is not an error the child should ever see; he keeps playing
  // from localStorage and it retries on the next load.
  return NextResponse.json({ ok: Boolean(saved), state: merged, syncedAt: new Date().toISOString() });
}

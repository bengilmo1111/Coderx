/**
 * Keeping the database awake.
 *
 * Supabase free-tier projects pause after about a week idle — which is exactly
 * why both of Ben's other projects are paused right now. Local-first means
 * Henry would never notice, but sync would quietly stop and the grown-ups view
 * would go stale without saying so.
 *
 * Scheduled daily rather than weekly: Vercel's Hobby plan restricts cron
 * frequency and count, daily sits comfortably inside it, and it leaves margin
 * that a weekly job running a day late does not.
 */

import { NextResponse } from 'next/server';
import { envText } from '@/lib/env';
import { sbSelect, syncEnabled } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const expected = envText(process.env.CRON_SECRET, '');
  if (expected && request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!syncEnabled()) return NextResponse.json({ ok: true, sync: false });

  const rows = await sbSelect<{ id: string }>('profiles', 'select=id&limit=1');
  return NextResponse.json({ ok: rows !== null, sync: true, at: new Date().toISOString() });
}

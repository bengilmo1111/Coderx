/**
 * Signing in, for somebody with no email address.
 *
 * He taps his face, then a four-emoji code, and the device remembers him from
 * then on. Everything here degrades to "sync is off" when Supabase is not
 * configured, which is how the app ships before the database exists and how it
 * behaves whenever the free-tier project is asleep.
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sbInsert, sbSelect, syncEnabled } from '@/lib/supabase';
import { isValidPin, pinToCode } from '@/lib/pin';
import {
  SESSION_MAX_AGE,
  cookieOptions,
  createSessionCookie,
  currentProfileId,
  hashPin,
  makeSalt,
  pinMatches,
  sessionCookieName,
} from '@/lib/session';

export const runtime = 'nodejs';

interface ProfileRow {
  id: string;
  name: string;
  hq_name: string;
  avatar: string;
  pin_hash: string;
  pin_salt: string;
}

/** Best-effort, per instance — the same honest caveat as the tutor's cap. */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 5 * 60_000;

function tooManyAttempts(profileId: string): boolean {
  const now = Date.now();
  const record = attempts.get(profileId);
  if (record && record.until > now && record.count >= MAX_ATTEMPTS) return true;
  if (!record || record.until <= now) attempts.set(profileId, { count: 0, until: now + LOCKOUT_MS });
  return false;
}

function noteFailure(profileId: string) {
  const record = attempts.get(profileId) ?? { count: 0, until: Date.now() + LOCKOUT_MS };
  attempts.set(profileId, { ...record, count: record.count + 1 });
}

/**
 * Who can sign in here, and who is signed in now. Never returns a hash.
 *
 * `reachable` matters as much as `sync`. sbSelect returns null when the request
 * fails — a paused free-tier project, wrong credentials, a timeout — and an
 * earlier version collapsed that into the same empty array a healthy but empty
 * database returns. "Configured and working" and "configured and completely
 * unreachable" then looked identical, which is the same silent-degradation trap
 * as the blank env var that once disabled the tutor.
 */
export async function GET() {
  if (!syncEnabled()) {
    return NextResponse.json({ sync: false, reachable: false, signedIn: false, profiles: [] });
  }
  const rows = await sbSelect<ProfileRow>('profiles', 'select=id,name,avatar&order=created_at');
  const reachable = rows !== null;
  const id = await currentProfileId();
  const me = rows?.find((r) => r.id === id) ?? null;
  return NextResponse.json({
    sync: true,
    reachable,
    signedIn: Boolean(me),
    profile: me ? { id: me.id, name: me.name, avatar: me.avatar } : null,
    profiles: (rows ?? []).map((r) => ({ id: r.id, name: r.name, avatar: r.avatar })),
  });
}

export async function POST(request: Request) {
  if (!syncEnabled()) return NextResponse.json({ ok: false, reason: 'sync-off' });

  let body: { action?: string; name?: string; hqName?: string; avatar?: string; pin?: unknown; profileId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-request' });
  }

  const jar = await cookies();

  if (body.action === 'signout') {
    jar.set(sessionCookieName, '', cookieOptions(0));
    return NextResponse.json({ ok: true });
  }

  if (!isValidPin(body.pin)) return NextResponse.json({ ok: false, reason: 'bad-pin' });
  const code = pinToCode(body.pin);

  if (body.action === 'create') {
    const salt = makeSalt();
    const created = await sbInsert<ProfileRow>('profiles', {
      name: (body.name ?? '').slice(0, 24) || 'Agent',
      hq_name: (body.hqName ?? '').slice(0, 32),
      avatar: (body.avatar ?? 'sniff').slice(0, 24),
      pin_hash: hashPin(code, salt),
      pin_salt: salt,
    });
    const profile = created?.[0];
    if (!profile) return NextResponse.json({ ok: false, reason: 'unavailable' });

    const cookie = createSessionCookie(profile.id);
    if (cookie) jar.set(sessionCookieName, cookie, cookieOptions(SESSION_MAX_AGE));
    return NextResponse.json({ ok: true, profile: { id: profile.id, name: profile.name, avatar: profile.avatar } });
  }

  // Signing in as an existing profile.
  const profileId = String(body.profileId ?? '');
  if (!profileId) return NextResponse.json({ ok: false, reason: 'bad-request' });
  if (tooManyAttempts(profileId)) return NextResponse.json({ ok: false, reason: 'too-many' });

  const rows = await sbSelect<ProfileRow>('profiles', `select=*&id=eq.${encodeURIComponent(profileId)}`);
  const profile = rows?.[0];
  if (!profile || !pinMatches(code, profile.pin_salt, profile.pin_hash)) {
    noteFailure(profileId);
    return NextResponse.json({ ok: false, reason: 'wrong-code' });
  }

  const cookie = createSessionCookie(profile.id);
  if (cookie) jar.set(sessionCookieName, cookie, cookieOptions(SESSION_MAX_AGE));
  return NextResponse.json({ ok: true, profile: { id: profile.id, name: profile.name, avatar: profile.avatar } });
}

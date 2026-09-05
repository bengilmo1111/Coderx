/**
 * Who is signed in, and proving it.
 *
 * A signed httpOnly cookie carrying the profile id. No Supabase Auth: for a
 * child with no email address, our own cookie over server routes we already
 * control is simpler and has less surface than anonymous auth plus custom JWTs.
 *
 * It is long-lived on purpose. Ben's answer to "how much should he have to do
 * to get in" was: enter the code once per device, then straight into the game.
 * On a 20-minute session every tap at the door is a tap not spent coding.
 */

import { cookies } from 'next/headers';
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { envText } from './env';

const COOKIE = 'coderx_session';
const YEAR_SECONDS = 365 * 24 * 60 * 60;

function secret(): string | null {
  return envText(process.env.SESSION_SECRET, '') || null;
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

/** `<profileId>.<expiryEpoch>.<signature>` */
export function createSessionCookie(profileId: string): string | null {
  const key = secret();
  if (!key) return null;
  const payload = `${b64(profileId)}.${Math.floor(Date.now() / 1000) + YEAR_SECONDS}`;
  return `${payload}.${sign(payload, key)}`;
}

export function readSessionCookie(value: string | undefined): string | null {
  const key = secret();
  if (!key || !value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [id, expiry, signature] = parts;

  const expected = sign(`${id}.${expiry}`, key);
  // Constant-time, and length-checked first because timingSafeEqual throws on
  // a mismatch rather than returning false.
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  if (Number(expiry) * 1000 < Date.now()) return null;

  return Buffer.from(id, 'base64url').toString();
}

export const sessionCookieName = COOKIE;

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export const SESSION_MAX_AGE = YEAR_SECONDS;

// --- The emoji code itself ---

const ITERATIONS = 120_000;

export function makeSalt(): string {
  return randomBytes(16).toString('hex');
}

export function hashPin(code: string, salt: string): string {
  return pbkdf2Sync(code, salt, ITERATIONS, 32, 'sha256').toString('hex');
}

export function pinMatches(code: string, salt: string, hash: string): boolean {
  const candidate = Buffer.from(hashPin(code, salt));
  const stored = Buffer.from(hash);
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

/** The signed-in profile, or null. The single place routes ask "who is this?". */
export async function currentProfileId(): Promise<string | null> {
  const jar = await cookies();
  return readSessionCookie(jar.get(COOKIE)?.value);
}

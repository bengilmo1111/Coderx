import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createSessionCookie, readSessionCookie, hashPin, makeSalt, pinMatches } from '@/lib/session';
import { isValidPin, pinToCode, PIN_EMOJI, PIN_LENGTH } from '@/lib/pin';

/**
 * The emoji code is a guard against a sibling, not against an attacker — it is
 * proportionate to what it protects, which is one child's sticker collection.
 * These check it does that job honestly and never leaks the code itself.
 */

const original = process.env.SESSION_SECRET;
beforeEach(() => {
  process.env.SESSION_SECRET = 'test-secret-that-is-long-enough';
});
afterEach(() => {
  if (original) process.env.SESSION_SECRET = original;
  else delete process.env.SESSION_SECRET;
});

describe('the emoji code', () => {
  it('accepts exactly four emoji from the set', () => {
    expect(isValidPin([PIN_EMOJI[0], PIN_EMOJI[1], PIN_EMOJI[2], PIN_EMOJI[3]])).toBe(true);
    expect(isValidPin([PIN_EMOJI[0], PIN_EMOJI[1], PIN_EMOJI[2]])).toBe(false);
    expect(isValidPin([PIN_EMOJI[0], PIN_EMOJI[0], PIN_EMOJI[0], '🥑'])).toBe(false);
    expect(isValidPin('🍕🚀🐶🍕')).toBe(false);
    expect(isValidPin(null)).toBe(false);
  });

  it('stores indexes rather than emoji bytes, so encoding can never bite', () => {
    expect(pinToCode([PIN_EMOJI[0], PIN_EMOJI[2], PIN_EMOJI[2], PIN_EMOJI[1]])).toBe('0-2-2-1');
  });

  it('lets the same four in and keeps the wrong four out', () => {
    const salt = makeSalt();
    const hash = hashPin('0-1-2-3', salt);
    expect(pinMatches('0-1-2-3', salt, hash)).toBe(true);
    expect(pinMatches('0-1-2-4', salt, hash)).toBe(false);
    expect(pinMatches('3-2-1-0', salt, hash)).toBe(false);
  });

  it('never stores the code itself', () => {
    const salt = makeSalt();
    const hash = hashPin('0-1-2-3', salt);
    expect(hash).not.toContain('0-1-2-3');
    expect(hash).toHaveLength(64);
  });

  it('salts per profile, so two children with the same code differ on disk', () => {
    expect(hashPin('0-1-2-3', makeSalt())).not.toBe(hashPin('0-1-2-3', makeSalt()));
  });

  it('offers enough combinations to stop a sibling guessing', () => {
    expect(PIN_EMOJI.length ** PIN_LENGTH).toBeGreaterThan(10_000);
  });
});

describe('the session cookie', () => {
  it('round-trips the profile id', () => {
    const cookie = createSessionCookie('abc-123')!;
    expect(readSessionCookie(cookie)).toBe('abc-123');
  });

  it('does not carry the id in the clear', () => {
    expect(createSessionCookie('abc-123')).not.toContain('abc-123');
  });

  it('rejects a tampered cookie', () => {
    const cookie = createSessionCookie('abc-123')!;
    const [id, expiry] = cookie.split('.');
    expect(readSessionCookie(`${id}.${expiry}.forged`)).toBeNull();
    expect(readSessionCookie(`${Buffer.from('someone-else').toString('base64url')}.${expiry}.x`)).toBeNull();
  });

  it('rejects an expired one', () => {
    const past = Math.floor(Date.now() / 1000) - 10;
    const id = Buffer.from('abc-123').toString('base64url');
    expect(readSessionCookie(`${id}.${past}.whatever`)).toBeNull();
  });

  it('rejects nonsense rather than throwing', () => {
    for (const bad of ['', 'a', 'a.b', 'a.b.c.d']) expect(readSessionCookie(bad)).toBeNull();
    expect(readSessionCookie(undefined)).toBeNull();
  });

  it('signs nothing at all when no secret is configured', () => {
    // A blank env var must mean "off", not "authenticate everybody".
    process.env.SESSION_SECRET = '   ';
    expect(createSessionCookie('abc-123')).toBeNull();
    expect(readSessionCookie('anything.at.all')).toBeNull();
    delete process.env.SESSION_SECRET;
    expect(createSessionCookie('abc-123')).toBeNull();
  });

  it('a cookie signed with a different secret is refused', () => {
    const cookie = createSessionCookie('abc-123')!;
    process.env.SESSION_SECRET = 'a-completely-different-secret';
    expect(readSessionCookie(cookie)).toBeNull();
  });
});

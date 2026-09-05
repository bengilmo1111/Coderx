'use client';

/**
 * Talking to the server about progress.
 *
 * Every function here is allowed to fail and say nothing. Sync is a background
 * nicety: Henry plays on a phone in bed on bad wifi, and a spinner between him
 * and the run button would be unacceptable. localStorage stays the source of
 * truth while he is playing; this catches up when it can.
 */

import type { ProgressState } from '@/progress/types';

export interface SyncStatus {
  /** Is a database configured at all? */
  enabled: boolean;
  /** Did it actually answer? Configured-but-asleep is a different thing. */
  reachable: boolean;
  signedIn: boolean;
  profile?: { id: string; name: string; avatar: string } | null;
  profiles?: { id: string; name: string; avatar: string }[];
  /** When a push last succeeded, so the grown-ups view can be honest. */
  lastSyncedAt?: string;
}

export async function fetchStatus(): Promise<SyncStatus> {
  try {
    const res = await fetch('/api/auth', { cache: 'no-store' });
    const data = await res.json();
    return {
      enabled: Boolean(data.sync),
      reachable: Boolean(data.reachable),
      signedIn: Boolean(data.signedIn),
      profile: data.profile ?? null,
      profiles: data.profiles ?? [],
    };
  } catch {
    return { enabled: false, reachable: false, signedIn: false };
  }
}

/** The server's copy, or null if there isn't one (or we cannot reach it). */
export async function pullProgress(): Promise<ProgressState | null> {
  try {
    const res = await fetch('/api/progress', { cache: 'no-store' });
    const data = await res.json();
    return data?.state ?? null;
  } catch {
    return null;
  }
}

/** Push, and get back the merged truth. Null means it did not land. */
export async function pushProgress(state: ProgressState): Promise<ProgressState | null> {
  try {
    const res = await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
      // Survives the page being closed mid-push, which on a phone is most of
      // the time — he shuts the lid rather than navigating away.
      keepalive: true,
    });
    const data = await res.json();
    return data?.ok ? (data.state as ProgressState) : null;
  } catch {
    return null;
  }
}

export async function createProfile(input: {
  name: string;
  hqName: string;
  avatar: string;
  pin: string[];
}): Promise<{ ok: boolean; reason?: string }> {
  return post({ action: 'create', ...input });
}

export async function signIn(profileId: string, pin: string[]): Promise<{ ok: boolean; reason?: string }> {
  return post({ action: 'signin', profileId, pin });
}

export async function signOut(): Promise<void> {
  await post({ action: 'signout' });
}

async function post(body: unknown): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

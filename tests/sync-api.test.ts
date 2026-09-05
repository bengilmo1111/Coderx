import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { emptyProgress, collect, setLevelProgress } from '@/progress/store';
import type { ProgressState } from '@/progress/types';

vi.mock('@/lib/session', () => ({ currentProfileId: async () => 'profile-1' }));

/**
 * The push merges on the server rather than replacing. Without that, a device
 * that has been offline all week could roll back everything that happened on
 * the other one — which for Henry means his stickers vanishing between Friday
 * night on the phone and Saturday on the computer.
 */
describe('pushing progress merges rather than replaces', () => {
  const original = { ...process.env };
  let storedState: ProgressState | null = null;
  let written: ProgressState | null = null;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    storedState = null;
    written = null;

    globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
      const target = String(url);
      if (init.method === 'POST' && target.includes('/progress')) {
        written = JSON.parse(String(init.body)).state;
        return new Response(JSON.stringify([{ profile_id: 'profile-1', state: written }]));
      }
      if (target.includes('/progress')) {
        return new Response(JSON.stringify(storedState ? [{ state: storedState }] : []));
      }
      return new Response('[]');
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = { ...original };
    vi.restoreAllMocks();
  });

  const put = async (state: ProgressState) => {
    const { PUT } = await import('@/app/api/progress/route');
    const res = await PUT(
      new Request('http://localhost/api/progress', { method: 'PUT', body: JSON.stringify(state) }),
    );
    return (await res.json()) as { ok: boolean; state: ProgressState };
  };

  it('keeps what the server already had when a stale device pushes', async () => {
    // The computer already told the server about level 3 and a feather.
    let onServer = emptyProgress();
    onServer = collect(onServer, 'kea-feather');
    onServer = setLevelProgress(onServer, 'c1l3', { completed: true });
    onServer = { ...onServer, xp: 300, updatedAt: '2026-09-05T20:00:00Z' };
    storedState = onServer;

    // The phone has been offline since Friday and knows none of it.
    let onPhone = emptyProgress();
    onPhone = collect(onPhone, 'sniff-badge');
    onPhone = setLevelProgress(onPhone, 'c1l1', { completed: true });
    onPhone = { ...onPhone, xp: 120, updatedAt: '2026-09-04T09:00:00Z' };

    const result = await put(onPhone);

    expect(result.ok).toBe(true);
    expect(result.state.xp).toBe(300);
    expect(result.state.stickers).toEqual(expect.arrayContaining(['kea-feather', 'sniff-badge']));
    expect(result.state.levels.c1l1.completed).toBe(true);
    expect(result.state.levels.c1l3.completed).toBe(true);
    // And the merged version is what actually got written, not the phone's.
    expect(written?.xp).toBe(300);
  });

  it('stores the incoming state as-is the very first time', async () => {
    storedState = null;
    const first = { ...emptyProgress(), xp: 40, updatedAt: '2026-09-06T00:00:00Z' };
    const result = await put(first);
    expect(result.state.xp).toBe(40);
  });

  it('says sync is off when no database is configured', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const result = await put(emptyProgress());
    expect(result).toMatchObject({ sync: false });
  });

  it('survives a malformed body rather than 500ing at him', async () => {
    const { PUT } = await import('@/app/api/progress/route');
    const res = await PUT(new Request('http://localhost/api/progress', { method: 'PUT', body: 'not json' }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(false);
  });

  it('reports failure without throwing when the database is unreachable', async () => {
    globalThis.fetch = (async () => {
      throw new Error('paused project');
    }) as unknown as typeof fetch;
    const result = await put({ ...emptyProgress(), xp: 10 });
    // The game keeps going on localStorage; nothing is shown to the child.
    expect(result.ok).toBe(false);
  });
});

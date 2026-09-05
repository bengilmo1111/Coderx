import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/session')>()),
  currentProfileId: async () => null,
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));

/**
 * Regression from setting sync up for real.
 *
 * The status route used `?? []`, so a database that could not be reached looked
 * exactly like a database with no profiles in it. Ben would have seen "sync is
 * on" while nothing worked — the same silent-degradation trap as the blank env
 * var that once disabled the AI tutor. A green status has to actually mean
 * something before any test result built on it is worth anything.
 */
describe('sync status tells empty from broken', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });
  afterEach(() => {
    process.env = { ...original };
    vi.restoreAllMocks();
  });

  const get = async () => {
    const { GET } = await import('@/app/api/auth/route');
    return (await (await GET()).json()) as {
      sync: boolean;
      reachable: boolean;
      profiles: unknown[];
    };
  };

  it('reports reachable when the database answers with no profiles', async () => {
    globalThis.fetch = (async () => new Response('[]')) as unknown as typeof fetch;
    expect(await get()).toMatchObject({ sync: true, reachable: true, profiles: [] });
  });

  it('reports NOT reachable when the database is asleep', async () => {
    globalThis.fetch = (async () => {
      throw new Error('paused project');
    }) as unknown as typeof fetch;
    expect(await get()).toMatchObject({ sync: true, reachable: false, profiles: [] });
  });

  it('reports NOT reachable when the credentials are refused', async () => {
    globalThis.fetch = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    expect(await get()).toMatchObject({ sync: true, reachable: false });
  });

  it('lists profiles without ever returning a hash', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify([{ id: 'p1', name: 'Turbo', avatar: 'sniff' }]))) as unknown as typeof fetch;
    const body = await get();
    expect(body.profiles).toEqual([{ id: 'p1', name: 'Turbo', avatar: 'sniff' }]);
    expect(JSON.stringify(body)).not.toMatch(/pin_hash|pin_salt/);
  });

  it('says neither configured nor reachable when there is no database at all', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(await get()).toMatchObject({ sync: false, reachable: false });
  });
});

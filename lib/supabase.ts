/**
 * A very small Supabase client, server-side only.
 *
 * PostgREST over fetch rather than @supabase/supabase-js: coderX needs four
 * tables and simple CRUD, and the project deliberately keeps its dependencies
 * few enough that it still builds in three years when Henry wants to show
 * somebody.
 *
 * The service-role key bypasses row-level security completely. It lives only in
 * a server environment variable, every query goes through a route that has
 * already checked the session cookie, and RLS is on with no policies so a
 * leaked anon key reads nothing at all.
 */

import { envText } from './env';

export interface SupabaseConfig {
  url: string;
  key: string;
}

/** Null when Supabase is not configured — the app runs perfectly without it. */
export function supabaseConfig(): SupabaseConfig | null {
  const url = envText(process.env.SUPABASE_URL, '').replace(/\/$/, '');
  const key = envText(process.env.SUPABASE_SERVICE_ROLE_KEY, '');
  return url && key ? { url, key } : null;
}

export const syncEnabled = (): boolean => supabaseConfig() !== null;

const TIMEOUT_MS = 6000;

async function request<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T | null> {
  const config = supabaseConfig();
  if (!config) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${config.url}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        ...(init.prefer ? { Prefer: init.prefer } : {}),
        ...init.headers,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : ([] as unknown as T);
  } catch {
    // A paused free-tier project, a dropped connection, a timeout. Sync is a
    // background nicety; the game never waits on it and never breaks for it.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function sbSelect<T>(table: string, query: string): Promise<T[] | null> {
  return request<T[]>(`${table}?${query}`);
}

export function sbInsert<T>(table: string, rows: unknown): Promise<T[] | null> {
  return request<T[]>(table, {
    method: 'POST',
    body: JSON.stringify(rows),
    prefer: 'return=representation',
  });
}

export function sbUpsert<T>(table: string, row: unknown, onConflict: string): Promise<T[] | null> {
  return request<T[]>(`${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    body: JSON.stringify(row),
    prefer: 'resolution=merge-duplicates,return=representation',
  });
}

/** Fire-and-forget insert: used for observations, where losing one is fine. */
export function sbInsertQuietly(table: string, rows: unknown): Promise<unknown> {
  return request(table, { method: 'POST', body: JSON.stringify(rows), prefer: 'return=minimal' });
}

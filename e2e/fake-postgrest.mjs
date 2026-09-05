/**
 * A pretend Supabase, for testing the parts of coderX that need one.
 *
 * The two-brother sign-in story could not be tested before this existed. The
 * real database holds one family's actual progress and its service-role key is
 * a Vercel environment variable that this process should never see, so the
 * choice was between testing against production or not testing at all. This is
 * the third option: enough PostgREST for `lib/supabase.ts` to talk to, in
 * memory, thrown away at the end of the run.
 *
 * Not a general PostgREST. It implements only the handful of queries coderX
 * actually issues, and it is deliberately strict — an unrecognised query is a
 * 400, so a change to a real query fails the test rather than silently
 * returning nothing.
 */

import { createServer } from 'node:http';

const tables = { profiles: [], progress: [], observations: [] };

/** `id=eq.abc` → a predicate. Only the operators coderX uses. */
function filterFrom(params) {
  const checks = [];
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op !== 'eq') throw new Error(`unsupported operator: ${op}`);
    checks.push((row) => String(row[key]) === value);
  }
  return (row) => checks.every((c) => c(row));
}

function pick(row, select) {
  if (!select || select === '*') return row;
  return Object.fromEntries(select.split(',').map((f) => [f.trim(), row[f.trim()]]));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const [, , , table] = url.pathname.split('/'); // /rest/v1/<table>
  const send = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  // Each test starts from an empty database, so "who's playing?" shows exactly
  // the profiles that test created and nothing left over from the last one.
  if (url.pathname === '/__reset') {
    for (const key of Object.keys(tables)) tables[key] = [];
    return send(200, { ok: true });
  }

  if (!(table in tables)) return send(404, { message: `no table ${table}` });

  let params;
  try {
    params = [...url.searchParams.entries()];
  } catch {
    return send(400, { message: 'bad query' });
  }

  if (req.method === 'GET') {
    let rows;
    try {
      rows = tables[table].filter(filterFrom(params));
    } catch (e) {
      return send(400, { message: String(e) });
    }
    const select = url.searchParams.get('select');
    const limit = url.searchParams.get('limit');
    if (url.searchParams.get('order') === 'created_at') {
      rows = [...rows].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    }
    if (limit) rows = rows.slice(0, Number(limit));
    return send(200, rows.map((r) => pick(r, select)));
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        return send(400, { message: 'bad json' });
      }
      const incoming = Array.isArray(payload) ? payload : [payload];
      const conflict = url.searchParams.get('on_conflict');
      const written = [];

      for (const row of incoming) {
        if (conflict) {
          const at = tables[table].findIndex((r) => r[conflict] === row[conflict]);
          if (at >= 0) {
            tables[table][at] = { ...tables[table][at], ...row };
            written.push(tables[table][at]);
            continue;
          }
        }
        // Postgres would do these; the app relies on both.
        const saved = {
          id: row.id ?? `p${tables[table].length + 1}-${Math.random().toString(36).slice(2, 8)}`,
          created_at: new Date(Date.now() + tables[table].length).toISOString(),
          ...row,
        };
        tables[table].push(saved);
        written.push(saved);
      }

      if ((req.headers.prefer ?? '').includes('return=minimal')) return send(201, []);
      return send(201, written);
    });
    return;
  }

  return send(405, { message: 'not allowed' });
});

const port = Number(process.argv[2] ?? 54321);
server.listen(port, () => console.log(`fake-postgrest on ${port}`));

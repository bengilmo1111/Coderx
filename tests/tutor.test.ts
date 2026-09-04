import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/tutor/route';
import { getLevel } from '@/curriculum/chapter1/levels';

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/tutor', { method: 'POST', body: JSON.stringify(body) }));

const originalKey = process.env.OPENROUTER_API_KEY;
beforeEach(() => {
  delete process.env.OPENROUTER_API_KEY;
});
afterEach(() => {
  if (originalKey) process.env.OPENROUTER_API_KEY = originalKey;
});

/**
 * Bolt must never go quiet on a stuck child. Every one of these is a way the
 * AI can be unavailable, and every one has to still produce a usable hint.
 */
describe('Bolt falls back to handwritten hints', () => {
  it('uses the level ladder when there is no API key', async () => {
    const res = await post({ intent: 'stuck', levelId: 'c1l1', code: '', hintsUsed: 0 });
    const data = (await res.json()) as { text: string; source: string };
    expect(data.source).toBe('written');
    expect(data.text).toBe(getLevel('c1l1')!.hints[0]);
  });

  it('escalates through the ladder as he asks again', async () => {
    const level = getLevel('c1l3')!;
    for (let i = 0; i < level.hints.length; i += 1) {
      const res = await post({ intent: 'stuck', levelId: 'c1l3', code: '', hintsUsed: i });
      expect(((await res.json()) as { text: string }).text).toBe(level.hints[i]);
    }
  });

  it('does not run off the end of the ladder if he keeps asking', async () => {
    const res = await post({ intent: 'stuck', levelId: 'c1l3', code: '', hintsUsed: 99 });
    const { text } = (await res.json()) as { text: string };
    expect(text).toBe(getLevel('c1l3')!.hints.at(-1));
  });

  it('explains the actual error he hit', async () => {
    const res = await post({ intent: 'broke', levelId: 'c1l1', code: 'move(sniff, left)', error: 'Sniff bonked into the fence.' });
    expect(((await res.json()) as { text: string }).text).toBe('Sniff bonked into the fence.');
  });

  it('still dares him to go further with no AI', async () => {
    const res = await post({ intent: 'sillier', levelId: 'c1l1', code: '' });
    expect(((await res.json()) as { text: string }).text).toMatch(/bark/i);
  });

  it('survives a malformed request rather than 500ing at him', async () => {
    const res = await POST(new Request('http://localhost/api/tutor', { method: 'POST', body: 'not json' }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { text: string }).text.length).toBeGreaterThan(0);
  });

  it('falls back rather than crashing on an unknown level', async () => {
    const res = await post({ intent: 'stuck', levelId: 'nope', code: '' });
    expect(((await res.json()) as { text: string }).text.length).toBeGreaterThan(0);
  });

  it('falls back when the API errors, with the key present', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('boom', { status: 500 })) as typeof fetch;
    try {
      const res = await post({ intent: 'stuck', levelId: 'c1l1', code: 'grab(sniff)', hintsUsed: 1 });
      const data = (await res.json()) as { text: string; source: string };
      expect(data.source).toBe('written');
      expect(data.text).toBe(getLevel('c1l1')!.hints[1]);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('uses the AI reply when the API works', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      Response.json({ choices: [{ message: { content: 'Nice grab. Now how far is the bin?' } }] })) as typeof fetch;
    try {
      const res = await post({ intent: 'stuck', levelId: 'c1l1', code: 'grab(sniff)', hintsUsed: 0 });
      const data = (await res.json()) as { text: string; source: string };
      expect(data.source).toBe('ai');
      expect(data.text).toBe('Nice grab. Now how far is the bin?');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

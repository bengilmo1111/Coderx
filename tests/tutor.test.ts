import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/tutor/route';
import { getLevel } from '@/curriculum/levels';

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

/**
 * The status endpoint the parent view uses. The route degrades silently by
 * design, so this is the only way to tell a working key from a wrong one.
 */
describe('tutor status', () => {
  it('reports the tutor off, and never leaks the key', async () => {
    const { GET } = await import('@/app/api/tutor/route');
    const data = (await (await GET()).json()) as Record<string, unknown>;
    expect(data.ai).toBe(false);
    expect(data.model).toBe('anthropic/claude-haiku-4.5');
    expect(JSON.stringify(data)).not.toContain('sk-');
  });

  it('reports the tutor on when a key is set', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-test-secret';
    const { GET } = await import('@/app/api/tutor/route');
    const body = await (await GET()).text();
    expect(JSON.parse(body).ai).toBe(true);
    expect(body).not.toContain('sk-test-secret');
  });
});

/**
 * Regression: this exact configuration was live on Vercel and silently
 * disabled the AI tutor while reporting itself switched on.
 */
describe('blank environment variables are treated as unset', () => {
  it('an empty TUTOR_MODEL falls back instead of sending model:""', async () => {
    const { tutorConfig, DEFAULT_MODEL } = await import('@/lib/tutorConfig');
    process.env.TUTOR_MODEL = '';
    expect(tutorConfig().model).toBe(DEFAULT_MODEL);
    process.env.TUTOR_MODEL = '   ';
    expect(tutorConfig().model).toBe(DEFAULT_MODEL);
    delete process.env.TUTOR_MODEL;
    expect(tutorConfig().model).toBe(DEFAULT_MODEL);
  });

  it('an empty daily cap does not become zero and block every request', async () => {
    const { tutorConfig, DEFAULT_DAILY_CAP } = await import('@/lib/tutorConfig');
    process.env.TUTOR_DAILY_CALL_CAP = '';
    expect(tutorConfig().dailyCap).toBe(DEFAULT_DAILY_CAP);
    // Nor do the other ways a dashboard can produce nonsense.
    for (const bad of ['0', '-5', 'lots', 'NaN']) {
      process.env.TUTOR_DAILY_CALL_CAP = bad;
      expect(tutorConfig().dailyCap).toBe(DEFAULT_DAILY_CAP);
    }
    process.env.TUTOR_DAILY_CALL_CAP = '50';
    expect(tutorConfig().dailyCap).toBe(50);
    delete process.env.TUTOR_DAILY_CALL_CAP;
  });

  it('a whitespace-only API key counts as no key at all', async () => {
    const { tutorConfig } = await import('@/lib/tutorConfig');
    process.env.OPENROUTER_API_KEY = '  ';
    expect(tutorConfig().key).toBe('');
    delete process.env.OPENROUTER_API_KEY;
  });

  it('still calls the API when the cap variable is blank', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.TUTOR_DAILY_CALL_CAP = '';
    process.env.TUTOR_MODEL = '';
    const realFetch = globalThis.fetch;
    let sentModel: unknown = null;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      sentModel = JSON.parse(String(init.body)).model;
      return Response.json({ choices: [{ message: { content: 'Good start. What is next?' } }] });
    }) as unknown as typeof fetch;
    try {
      // Distinct code: identical requests are cached, and would never reach fetch.
      const res = await post({ intent: 'stuck', levelId: 'c1l1', code: 'bark(sniff)', hintsUsed: 0 });
      const data = (await res.json()) as { source: string };
      expect(sentModel).toBe('anthropic/claude-haiku-4.5');
      expect(data.source).toBe('ai');
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.TUTOR_DAILY_CALL_CAP;
      delete process.env.TUTOR_MODEL;
    }
  });
});

/**
 * Bolt speaks in a speech bubble. Markdown that leaks through reads as the app
 * being broken — this was visible in the first live replies.
 */
describe('replies are cleaned for a comic panel', () => {
  it('strips backticks and asterisks', async () => {
    const { tidyForAChild } = await import('@/lib/tutorText');
    expect(tidyForAChild("Nice! You've got `repeat 2` working, make it *bigger*.")).toBe(
      "Nice! You've got repeat 2 working, make it bigger.",
    );
  });

  it('unwraps a code fence rather than deleting the line inside it', async () => {
    const { tidyForAChild } = await import('@/lib/tutorText');
    const out = tidyForAChild('Try this:\n```\nmove(sniff, right, 2)\n```');
    expect(out).toContain('move(sniff, right, 2)');
    expect(out).not.toContain('`');
  });

  it('collapses a two-paragraph answer into one', async () => {
    const { tidyForAChild } = await import('@/lib/tutorText');
    expect(tidyForAChild('You used repeat.\n\nNow, how many squares?')).toBe(
      'You used repeat. Now, how many squares?',
    );
  });

  it('trims a long reply at a sentence end, not mid-word', async () => {
    const { tidyForAChild, MAX_REPLY_CHARS } = await import('@/lib/tutorText');
    const long = `${'You did really well there and I am proud of you. '.repeat(8)}And another thing entirely`;
    const out = tidyForAChild(long);
    expect(out.length).toBeLessThanOrEqual(MAX_REPLY_CHARS);
    expect(out.endsWith('.')).toBe(true);
  });

  it('leaves an already-tidy reply alone', async () => {
    const { tidyForAChild } = await import('@/lib/tutorText');
    const good = 'Nice grab. How far away is the bin?';
    expect(tidyForAChild(good)).toBe(good);
  });

  it('cleans the reply on the way out of the route', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      Response.json({ choices: [{ message: { content: 'Good `grab`.\n\nNow *move* right.' } }] })) as typeof fetch;
    try {
      const res = await post({ intent: 'stuck', levelId: 'c1l2', code: 'grab(sniff)', hintsUsed: 0 });
      expect(((await res.json()) as { text: string }).text).toBe('Good grab. Now move right.');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

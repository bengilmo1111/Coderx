/**
 * The recorder.
 *
 * Two properties matter more than the batching: losing observations must be
 * silent, and nothing he typed himself may ever reach the queue. The second is
 * enforced at the call sites in PlayScreen; what is checked here is that this
 * module never interrupts him.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A browser, roughly. `observe` no-ops without one, which is right on the server. */
function fakeWindow() {
  const listeners: Record<string, (() => void)[]> = {};
  const add = (name: string, fn: () => void) => {
    (listeners[name] ??= []).push(fn);
  };
  vi.stubGlobal('window', { addEventListener: add });
  vi.stubGlobal('document', { addEventListener: add, visibilityState: 'visible' });
  return listeners;
}

async function freshModule() {
  vi.resetModules();
  return import('@/lib/observe');
}

describe('observe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fakeWindow();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does nothing at all on the server', async () => {
    vi.unstubAllGlobals();
    const post = vi.fn();
    vi.stubGlobal('fetch', post);
    const { observe, flush } = await freshModule();
    observe({ kind: 'level_attempt', levelId: 'c1l1' });
    await flush();
    expect(post).not.toHaveBeenCalled();
  });

  it('batches rather than posting per event', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', post);
    const { observe, flush } = await freshModule();

    observe({ kind: 'brick_used', levelId: 'c1l1', payload: { brick: 'move' } });
    observe({ kind: 'brick_used', levelId: 'c1l1', payload: { brick: 'repeat' } });
    expect(post).not.toHaveBeenCalled();

    await flush();
    expect(post).toHaveBeenCalledTimes(1);
    const [url, init] = post.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/observations');
    expect(JSON.parse(String(init.body))).toHaveLength(2);
    // keepalive, because a child closes the lid mid-request.
    expect(init.keepalive).toBe(true);
  });

  it('flushes itself once the queue is full', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', post);
    const { observe } = await freshModule();
    for (let i = 0; i < 20; i += 1) observe({ kind: 'hint', levelId: 'c1l1' });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('flushes on a timer if he goes quiet', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', post);
    const { observe } = await freshModule();
    observe({ kind: 'replay', levelId: 'c1l1' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('swallows a dead network — losing observations is fine, interrupting him is not', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { observe, flush } = await freshModule();
    observe({ kind: 'abandon', levelId: 'c1l1' });
    await expect(flush()).resolves.toBeUndefined();
  });

  it('does not post an empty batch', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', post);
    const { flush } = await freshModule();
    await flush();
    expect(post).not.toHaveBeenCalled();
  });

  it('drains the queue, so a second flush sends nothing again', async () => {
    const post = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', post);
    const { observe, flush } = await freshModule();
    observe({ kind: 'typed_line', levelId: 'c1l1', payload: { lines: 1, chars: 12 } });
    await flush();
    await flush();
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('bankWordsIn', () => {
  const BANK = ['dog', 'bin', 'yum', 'stop'] as const;

  it('keeps words he tapped from the bank', async () => {
    const { bankWordsIn } = await import('@/lib/observe');
    expect(bankWordsIn('good dog', BANK)).toEqual(['dog']);
    expect(bankWordsIn('dog bin yum', BANK)).toEqual(['dog', 'bin', 'yum']);
  });

  it('drops every word he typed himself', async () => {
    const { bankWordsIn } = await import('@/lib/observe');
    // The whole point: his own words never reach the queue.
    expect(bankWordsIn('mum is at the hospital', BANK)).toEqual([]);
    expect(bankWordsIn('my teacher is mean', BANK)).toEqual([]);
  });

  it('is not fooled by case or punctuation around a bank word', async () => {
    const { bankWordsIn } = await import('@/lib/observe');
    expect(bankWordsIn('STOP! dog.', BANK)).toEqual(['stop', 'dog']);
  });

  it('does not match a bank word buried inside one of his own', async () => {
    const { bankWordsIn } = await import('@/lib/observe');
    expect(bankWordsIn('dogma binbag', BANK)).toEqual([]);
  });
});

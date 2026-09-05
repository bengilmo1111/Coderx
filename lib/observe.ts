'use client';

/**
 * Recording what he does, so a model of him can be built later.
 *
 * Batched and fire-and-forget: nothing here is allowed to slow the game down or
 * fail visibly. Nothing reads it back yet either — docs/memory-loop.md is
 * explicit that the order is record first, change nothing, and only then build
 * a model and check it against what Ben already knows about his own son.
 *
 * What is NOT recorded: anything he typed freely — the words in a speech
 * bubble, the name he gave a command. Only that he wrote something and roughly
 * how much. His own words are his; interest signals come from the preset word
 * bank, which is data we chose rather than data he confided.
 */

export interface Observation {
  kind:
    | 'level_attempt'
    | 'hint'
    | 'dare'
    | 'replay'
    | 'abandon'
    | 'defined_command'
    | 'typed_line'
    | 'word_chosen'
    | 'mode_used';
  levelId?: string;
  skillIds?: string[];
  payload?: Record<string, unknown>;
}

const queue: Observation[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

export function observe(event: Observation): void {
  if (typeof window === 'undefined') return;
  queue.push(event);
  if (queue.length >= 20) {
    void flush();
    return;
  }
  timer ??= setTimeout(() => void flush(), 10_000);
  if (!listening) {
    listening = true;
    // A child closes the lid; he does not navigate away politely.
    window.addEventListener('pagehide', () => void flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
    });
  }
}

export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  try {
    await fetch('/api/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      keepalive: true,
    });
  } catch {
    // Losing a few observations is fine. Interrupting him is not.
  }
}

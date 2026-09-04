'use client';

/**
 * React access to the single progress store.
 *
 * Hydration matters here: the server has no localStorage, so we render the
 * empty state and swap in the real one after mount. `ready` exists so nothing
 * flashes "0 XP" at a child who has 400.
 */

import { useCallback, useEffect, useState } from 'react';
import { emptyProgress, store, visit } from '@/progress/store';
import type { ProgressState } from '@/progress/types';
import type { StreakOutcome } from '@/progress/streak';

export function useProgress() {
  const [state, setState] = useState<ProgressState>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [streakOutcome, setStreakOutcome] = useState<StreakOutcome | null>(null);

  useEffect(() => {
    const loaded = store.load();
    const { state: withVisit, outcome } = visit(loaded);
    store.save(withVisit);
    setState(withVisit);
    setStreakOutcome(outcome);
    setReady(true);
  }, []);

  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = fn(prev);
      store.save(next);
      return next;
    });
  }, []);

  return { state, update, ready, streakOutcome };
}

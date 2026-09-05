'use client';

/**
 * React access to the single progress store, now with sync behind it.
 *
 * Local-first, permanently. localStorage is the source of truth while he is
 * playing; the server is a place the truth also ends up. Pull on load, merge,
 * carry on; push a few seconds after he stops changing things. Every network
 * failure is silent and retried on the next load.
 *
 * Hydration matters here: the server has no localStorage, so we render the
 * empty state and swap in the real one after mount. `ready` exists so nothing
 * flashes "0 XP" at a child who has 400.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyProgress, store, visit } from '@/progress/store';
import { mergeProgress } from '@/progress/merge';
import type { ProgressState } from '@/progress/types';
import type { StreakOutcome } from '@/progress/streak';
import { fetchStatus, pullProgress, pushProgress, type SyncStatus } from './sync';

const PUSH_DEBOUNCE_MS = 3000;

export function useProgress() {
  const [state, setState] = useState<ProgressState>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [streakOutcome, setStreakOutcome] = useState<StreakOutcome | null>(null);
  const [sync, setSync] = useState<SyncStatus>({ enabled: false, reachable: false, signedIn: false });

  const latest = useRef(state);
  latest.current = state;
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loaded = store.load();
    const { state: withVisit, outcome } = visit(loaded);
    store.save(withVisit);
    setState(withVisit);
    setStreakOutcome(outcome);
    setReady(true);

    // Then catch up with the server, if there is one and he is signed in.
    void (async () => {
      const status = await fetchStatus();
      setSync(status);
      if (!status.enabled || !status.signedIn) return;

      const remote = await pullProgress();
      if (remote) {
        setState((prev) => {
          // Merge, never replace: this is also how his existing progress on
          // this device gets adopted the first time he ever signs in.
          const merged = mergeProgress({ ...emptyProgress(), ...remote }, prev);
          store.save(merged);
          return merged;
        });
      }
      // Push straight away so whatever was only on this device lands.
      const confirmed = await pushProgress(latest.current);
      if (confirmed) {
        setSync((s) => ({ ...s, lastSyncedAt: new Date().toISOString() }));
      }
    })();
  }, []);

  // Push a few seconds after he stops changing things, rather than on every tap.
  useEffect(() => {
    if (!ready || !sync.enabled || !sync.signedIn) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void pushProgress(latest.current).then((confirmed) => {
        if (confirmed) setSync((s) => ({ ...s, lastSyncedAt: new Date().toISOString() }));
      });
    }, PUSH_DEBOUNCE_MS);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [state, ready, sync.enabled, sync.signedIn]);

  // He shuts the lid rather than navigating away, so catch that too.
  useEffect(() => {
    if (!sync.enabled || !sync.signedIn) return;
    const flush = () => void pushProgress(latest.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [sync.enabled, sync.signedIn]);

  const update = useCallback((fn: (prev: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = fn(prev);
      store.save(next);
      return next;
    });
  }, []);

  /** After signing in or creating a profile, adopt what is already on this device. */
  const refreshSync = useCallback(async () => {
    const status = await fetchStatus();
    setSync(status);
    if (!status.signedIn) return;
    const remote = await pullProgress();
    const merged = remote ? mergeProgress({ ...emptyProgress(), ...remote }, latest.current) : latest.current;
    store.save(merged);
    setState(merged);
    const confirmed = await pushProgress(merged);
    if (confirmed) setSync((s) => ({ ...s, lastSyncedAt: new Date().toISOString() }));
  }, []);

  return { state, update, ready, streakOutcome, sync, refreshSync };
}

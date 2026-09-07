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
import { emptyProgress, lastProfileId, store, visit } from '@/progress/store';
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
  /**
   * Has the server been asked who exists yet?
   *
   * On a brand-new device this is the difference between offering Henry the
   * four-emoji sign-in and offering him the new-player wizard. Guessing wrong
   * for even one frame is how you end up with two Henrys in the database.
   */
  const [syncChecked, setSyncChecked] = useState(false);

  const latest = useRef(state);
  latest.current = state;
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Paint from whoever was playing here last, before asking the server. The
    // cookie is still what decides; this only avoids showing him a stranger's
    // empty game for the length of a round trip.
    const remembered = lastProfileId();
    const loaded = remembered ? store.use(remembered) : store.load();
    const { state: withVisit, outcome } = visit(loaded);
    store.save(withVisit);
    setState(withVisit);
    setStreakOutcome(outcome);
    setReady(true);

    // Then catch up with the server, if there is one and he is signed in.
    void (async () => {
      const status = await fetchStatus();
      setSync(status);
      setSyncChecked(true);
      if (!status.enabled || !status.signedIn || !status.profile) return;
      await adopt(status.profile.id);
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

  /**
   * Load one child's progress and reconcile it with the server's copy.
   *
   * The merge is only ever between this profile's own local slot and this
   * profile's own remote row. It deliberately does not use whatever happened to
   * be on screen a moment ago: on the shared computer that would be his
   * brother's game, and the merge takes the better of two values rather than
   * asking, so Casper would quietly inherit Henry's four hundred XP.
   */
  const adopt = useCallback(async (profileId: string, claimThisDevice = false) => {
    const mine = store.use(profileId, { adopt: claimThisDevice });
    const remote = await pullProgress();
    const merged = remote ? mergeProgress({ ...emptyProgress(), ...remote }, mine) : mine;
    store.save(merged);
    setState(merged);
    const confirmed = await pushProgress(merged);
    if (confirmed) setSync((s) => ({ ...s, lastSyncedAt: new Date().toISOString() }));
  }, []);

  /**
   * After signing in, creating a profile, or signing out.
   *
   * `claimThisDevice` is passed only by the two paths that CREATE a profile,
   * which are the only ones entitled to take over the game already sitting on
   * this device. Signing in never is.
   */
  const refreshSync = useCallback(async (claimThisDevice = false) => {
    const status = await fetchStatus();
    setSync(status);
    setSyncChecked(true);
    if (status.signedIn && status.profile) {
      await adopt(status.profile.id, claimThisDevice);
      return;
    }
    // Signed out: stop writing to whoever's slot we were in, and show the
    // anonymous one rather than leaving his brother's XP on screen.
    setState(store.use(null));
  }, [adopt]);

  return { state, update, ready, streakOutcome, sync, syncChecked, refreshSync };
}

'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { api, ApiError, isAbort } from '@/lib/api/client';
import type { VisitMethod } from '@/lib/api/types';
import { parseTarget } from '@/lib/address';
import { canGoBack, canGoForward, currentEntry, emptyNav, type Entry, navReducer, type PageEntry } from './reducer';
import { loadNav, saveNav } from './storage';

/** How a new destination was asked for. Back and forward have their own functions. */
export type GoMethod = Exclude<VisitMethod, 'back' | 'forward'>;

/**
 * The browser controller. Components call its intentions (go, back,
 * forward…); it owns the request lifecycle and feeds the pure reducer.
 *
 * Each person has an independent stack. `owner` says whose stack is loaded,
 * so a late response for one person can never land in another's.
 */
export function useBrowser(
  personId: string | null,
  onArrive: (personId: string, entry: PageEntry, method: VisitMethod) => void,
) {
  const [nav, dispatch] = useReducer(navReducer, emptyNav);
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const navRef = useRef(nav);
  navRef.current = nav;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  /** Cancels any in-flight navigation. Abort stops the fetch; the id guard ignores anything that still arrives. */
  const cancelPending = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    requestId.current++;
    setLoading(null);
  }, []);

  // ---- persistence: write at most every 300 ms, and always before switching person or leaving.
  const pendingSave = useRef<{ owner: string; nav: typeof nav } | null>(null);
  const flushSave = useCallback(() => {
    if (pendingSave.current) saveNav(pendingSave.current.owner, pendingSave.current.nav);
    pendingSave.current = null;
  }, []);

  useEffect(() => {
    if (!owner) return;
    pendingSave.current = { owner, nav };
    const t = setTimeout(flushSave, 300);
    return () => clearTimeout(t);
  }, [nav, owner, flushSave]);

  useEffect(() => {
    window.addEventListener('pagehide', flushSave);
    return () => window.removeEventListener('pagehide', flushSave);
  }, [flushSave]);

  // ---- switching person: save theirs, load the next one's.
  useEffect(() => {
    if (!personId || personId === ownerRef.current) return;
    cancelPending();
    flushSave();
    setError(null);
    setNotice(null);
    dispatch({ type: 'load', state: loadNav(personId) });
    setOwner(personId);
  }, [personId, cancelPending, flushSave]);

  // ---- intentions

  /**
   * Commits the entry first, then reports the arrival. A failed report never
   * undoes the page. Search results are part of back/forward but are not
   * visits to a site, so they are not recorded in history.
   */
  const arrive = useCallback((entry: Entry, method: VisitMethod) => {
    if (entry.kind !== 'search' && ownerRef.current) onArriveRef.current(ownerRef.current, entry, method);
  }, []);

  const push = useCallback(
    (entry: Entry, method: VisitMethod) => {
      dispatch({ type: 'push', entry });
      arrive(entry, method);
    },
    [arrive],
  );

  const go = useCallback(
    async (input: string, method: GoMethod = 'typed') => {
      const forPerson = ownerRef.current;
      if (!forPerson) return;
      const target = parseTarget(input);
      setNotice(null);

      if (target.kind === 'invalid') return setError(target.reason);
      setError(null);

      if (target.kind === 'fragment') {
        // Same page, different place: a new entry over the snapshot we already have.
        const here = currentEntry(navRef.current);
        if (here?.kind !== 'site') return;
        cancelPending();
        push({ ...here, id: crypto.randomUUID(), fragment: target.fragment, scrollY: null }, method);
        return;
      }

      cancelPending();
      const abort = (controller.current = new AbortController());
      const id = requestId.current;
      setLoading(target.kind === 'search' ? `results for “${target.query}”` : target.address);
      const stillCurrent = () => id === requestId.current && ownerRef.current === forPerson;

      try {
        if (target.kind === 'search') {
          // Every submitted search fetches fresh results, including newly published pages.
          const res = await api.search(target.query, abort.signal);
          if (!stillCurrent()) return;
          push({ id: crypto.randomUUID(), kind: 'search', query: res.query, results: res.results, truncated: res.truncated, scrollY: null }, method);
          return;
        }
        const site = await api.site(target.address, abort.signal);
        if (!stillCurrent()) return;
        push(
          { id: crypto.randomUUID(), kind: 'site', address: site.address, fragment: target.fragment, site, scrollY: null },
          method,
        );
      } catch (err) {
        if (isAbort(err) || !stillCurrent()) return;
        if (target.kind === 'address' && err instanceof ApiError && err.code === 'SITE_NOT_FOUND') {
          push({ id: crypto.randomUUID(), kind: 'missing', address: target.address, scrollY: null }, method);
        } else {
          // The server or network failed: keep the current page and say so.
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      } finally {
        if (stillCurrent()) {
          setLoading(null);
          controller.current = null;
        }
      }
    },
    [cancelPending, push],
  );

  const move = useCallback(
    (delta: -1 | 1) => {
      const state = navRef.current;
      if (delta === -1 ? !canGoBack(state) : !canGoForward(state)) return;
      cancelPending();
      setError(null);
      setNotice(null);
      dispatch({ type: 'move', delta });
      // Returning to a page is a fresh arrival at it.
      arrive(state.entries[state.index + delta], delta === -1 ? 'back' : 'forward');
    },
    [cancelPending, arrive],
  );
  const back = useCallback(() => move(-1), [move]);
  const forward = useCallback(() => move(1), [move]);

  const reportScroll = useCallback((entryId: string, y: number) => {
    dispatch({ type: 'scroll', entryId, y });
  }, []);

  const blocked = useCallback((target: string) => {
    setNotice(`That link leads outside this web (${target.slice(0, 80)}), so it was not followed.`);
  }, []);

  return {
    ready: !!owner && owner === personId,
    entry: currentEntry(nav),
    canBack: canGoBack(nav),
    canForward: canGoForward(nav),
    loading,
    error,
    notice,
    go,
    back,
    forward,
    blocked,
    reportScroll,
    dismissError: () => setError(null),
    dismissNotice: () => setNotice(null),
  };
}

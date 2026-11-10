'use client';

import { useCallback, useRef, useState } from 'react';
import { api, ApiError, isAbort } from '@/lib/api/client';
import type { SiteView } from '@/lib/api/types';
import { parseTarget } from '@/lib/address';

export type Page =
  | { id: string; kind: 'site'; address: string; fragment: string | null; site: SiteView }
  | { id: string; kind: 'missing'; address: string };

/**
 * Browser controller. For now it only knows the current page; the
 * back/forward stack arrives with the navigation reducer.
 */
export function useBrowser() {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const scrollY = useRef(0);

  const go = useCallback(
    async (input: string) => {
      const target = parseTarget(input);
      setNotice(null);
      if (target.kind === 'invalid') return setError(target.reason);
      if (target.kind === 'search') return setError('Search is not available yet.');
      if (target.kind === 'fragment') {
        // Same page, different place: a new view of the snapshot we already have.
        if (page?.kind === 'site') setPage({ ...page, id: crypto.randomUUID(), fragment: target.fragment });
        return;
      }

      controller.current?.abort();
      const abort = (controller.current = new AbortController());
      const id = ++requestId.current;
      setLoading(target.address);
      setError(null);

      try {
        const site = await api.site(target.address, abort.signal);
        if (id !== requestId.current) return;
        setPage({ id: crypto.randomUUID(), kind: 'site', address: site.address, fragment: target.fragment, site });
      } catch (err) {
        if (isAbort(err) || id !== requestId.current) return;
        if (err instanceof ApiError && err.code === 'SITE_NOT_FOUND') {
          setPage({ id: crypto.randomUUID(), kind: 'missing', address: target.address });
        } else {
          // Transport or server failure: keep the current page, offer a retry.
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      } finally {
        if (id === requestId.current) setLoading(null);
      }
    },
    [page],
  );

  const blocked = useCallback((target: string) => {
    setNotice(`That link leads outside this web (${target.slice(0, 80)}), so it was not followed.`);
  }, []);

  const reportScroll = useCallback((y: number) => {
    scrollY.current = y;
  }, []);

  return {
    page,
    loading,
    error,
    notice,
    go,
    blocked,
    reportScroll,
    dismissError: () => setError(null),
    dismissNotice: () => setNotice(null),
  };
}

'use client';

import { useCallback, useRef, useState } from 'react';
import { api, ApiError, isAbort } from '@/lib/api/client';
import type { SiteView } from '@/lib/api/types';
import { parseTarget } from '@/lib/address';

export type Page =
  | { kind: 'site'; address: string; fragment: string | null; site: SiteView }
  | { kind: 'missing'; address: string };

/**
 * Browser controller. For now it only knows the current page; the
 * back/forward stack arrives with the navigation reducer.
 */
export function useBrowser() {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const go = useCallback(async (input: string) => {
    const target = parseTarget(input);
    if (target.kind === 'invalid') return setError(target.reason);
    if (target.kind !== 'address') return setError('Search is not available yet.');

    controller.current?.abort();
    const abort = (controller.current = new AbortController());
    const id = ++requestId.current;
    setLoading(target.address);
    setError(null);

    try {
      const site = await api.site(target.address, abort.signal);
      if (id !== requestId.current) return;
      setPage({ kind: 'site', address: site.address, fragment: target.fragment, site });
    } catch (err) {
      if (isAbort(err) || id !== requestId.current) return;
      if (err instanceof ApiError && err.code === 'SITE_NOT_FOUND') {
        setPage({ kind: 'missing', address: target.address });
      } else {
        // Transport or server failure: keep the current page, offer a retry.
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      if (id === requestId.current) setLoading(null);
    }
  }, []);

  return { page, loading, error, go, dismissError: () => setError(null) };
}

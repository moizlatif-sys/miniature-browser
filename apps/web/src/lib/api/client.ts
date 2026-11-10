import type { Person, SearchResponse, SiteView, VisitMethod, VisitPage, VisitView } from './types';

export interface VisitInput {
  eventId: string;
  personId: string;
  address: string;
  method: VisitMethod;
  navigationEntryId: string;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/**
 * Every failed request becomes an ApiError. `kind` separates
 * "the server answered no" (http) from "we never reached it" (network),
 * so a dropped connection is never mistaken for a missing page.
 */
export class ApiError extends Error {
  constructor(
    readonly kind: 'http' | 'network',
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
    });
  } catch (err) {
    if (isAbort(err)) throw err;
    throw new ApiError('network', 0, 'NETWORK', 'Could not reach the server. Check that the API is running, then try again.');
  }

  if (res.ok) return (await res.json()) as T;

  const body = (await res.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
    fieldErrors?: Record<string, string>;
  };
  throw new ApiError('http', res.status, body.code ?? 'ERROR', body.message ?? `Request failed (${res.status}).`, body.fieldErrors);
}

export const api = {
  people: () => apiFetch<Person[]>('/people'),
  site: (address: string, signal?: AbortSignal) =>
    apiFetch<SiteView>(`/sites/${encodeURIComponent(address)}`, { signal }),
  search: (q: string, signal?: AbortSignal) =>
    apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(q)}&limit=20`, { signal }),
  recordVisit: (visit: VisitInput) => apiFetch<VisitView>('/visits', { method: 'POST', body: JSON.stringify(visit) }),
  visits: (personId: string, cursor: string | null, signal?: AbortSignal) =>
    apiFetch<VisitPage>(
      `/people/${encodeURIComponent(personId)}/visits?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      { signal },
    ),
};

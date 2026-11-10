import type { SearchResult, SiteView } from '@/lib/api/types';

/**
 * The browser's back/forward model: a list of entries and a cursor.
 *
 *   entries:  [ start.zz, tidepool.zz, lighthouse.zz, night-radio.zz ]
 *   index:                 ^ (after going back twice)
 *
 * - back/forward only move the cursor; nothing is refetched, so the page you
 *   return to is exactly the snapshot you left, at the scroll position you left.
 * - a new navigation from the middle drops everything after the cursor
 *   ("forward can be lost") and appends the new entry.
 *
 * This file is pure: no React, no network, no storage.
 */

export type Entry =
  | { id: string; kind: 'site'; address: string; fragment: string | null; site: SiteView; scrollY: number | null }
  | { id: string; kind: 'missing'; address: string; scrollY: number | null }
  /** A results page keeps the results it showed, so going back to it never reruns the query. */
  | { id: string; kind: 'search'; query: string; results: SearchResult[]; truncated: boolean; scrollY: number | null };

/** Entries that are arrivals at an address (and so become visits). */
export type PageEntry = Exclude<Entry, { kind: 'search' }>;

export interface NavState {
  entries: Entry[];
  /** Position of the current entry; -1 when nothing has been opened yet. */
  index: number;
}

export type NavAction =
  | { type: 'push'; entry: Entry }
  | { type: 'move'; delta: -1 | 1 }
  | { type: 'scroll'; entryId: string; y: number }
  | { type: 'load'; state: NavState };

/** Upper bound on remembered entries per person. Visit history in the database is unaffected. */
export const MAX_ENTRIES = 50;

export const emptyNav: NavState = { entries: [], index: -1 };

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'push': {
      const entries = [...state.entries.slice(0, state.index + 1), action.entry];
      const overflow = Math.max(0, entries.length - MAX_ENTRIES);
      return { entries: entries.slice(overflow), index: entries.length - 1 - overflow };
    }
    case 'move': {
      const index = state.index + action.delta;
      if (index < 0 || index >= state.entries.length) return state;
      return { ...state, index };
    }
    case 'scroll': {
      const i = state.entries.findIndex((e) => e.id === action.entryId);
      if (i === -1 || state.entries[i].scrollY === action.y) return state;
      const entries = state.entries.slice();
      entries[i] = { ...entries[i], scrollY: action.y };
      return { ...state, entries };
    }
    case 'load':
      return action.state;
  }
}

export const currentEntry = (s: NavState): Entry | null => s.entries[s.index] ?? null;
export const canGoBack = (s: NavState) => s.index > 0;
export const canGoForward = (s: NavState) => s.index >= 0 && s.index < s.entries.length - 1;

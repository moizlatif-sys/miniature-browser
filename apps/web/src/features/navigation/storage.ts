import { emptyNav, type Entry, type NavState } from './reducer';

/**
 * Keeps each person's back/forward stack in sessionStorage, so a refresh
 * restores where you were. Storage may be missing, full, or hold junk from an
 * older version; every one of those cases falls back to an empty stack.
 */

const VERSION = 1;
const key = (personId: string) => `mb:nav:v${VERSION}:${personId}`;
/** Characters per person. Snapshots carry page HTML, so this bounds the total. */
const BUDGET = 600_000;

export function loadNav(personId: string): NavState {
  try {
    const raw = sessionStorage.getItem(key(personId));
    if (!raw) return emptyNav;
    const parsed = JSON.parse(raw) as unknown;
    return isNavState(parsed) ? parsed : emptyNav;
  } catch {
    return emptyNav;
  }
}

export function saveNav(personId: string, state: NavState): void {
  let s = state;
  for (let attempt = 0; attempt < 60; attempt++) {
    const json = JSON.stringify(s);
    if (json.length <= BUDGET) {
      try {
        sessionStorage.setItem(key(personId), json);
        return;
      } catch {
        // Quota exceeded or storage unavailable: shrink and try again.
      }
    }
    if (s.entries.length <= 1) return; // cannot shrink further; keep it in memory only
    s = pruneOne(s);
  }
}

/** Drops the oldest entry, or the farthest forward one if we are at the start. Never the current one. */
function pruneOne(s: NavState): NavState {
  if (s.index > 0) return { entries: s.entries.slice(1), index: s.index - 1 };
  return { entries: s.entries.slice(0, -1), index: s.index };
}

export function loadPersonId(): string | null {
  try {
    return sessionStorage.getItem('mb:person');
  } catch {
    return null;
  }
}

export function savePersonId(id: string) {
  try {
    sessionStorage.setItem('mb:person', id);
  } catch {
    /* not essential */
  }
}

function isNavState(v: unknown): v is NavState {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as NavState;
  return (
    Array.isArray(s.entries) &&
    Number.isInteger(s.index) &&
    s.index >= -1 &&
    s.index < s.entries.length &&
    (s.entries.length === 0) === (s.index === -1) &&
    s.entries.every(isEntry)
  );
}

function isEntry(e: unknown): e is Entry {
  if (typeof e !== 'object' || e === null) return false;
  const x = e as Record<string, unknown>;
  if (typeof x.id !== 'string' || typeof x.address !== 'string') return false;
  if (x.scrollY !== null && typeof x.scrollY !== 'number') return false;
  if (x.kind === 'missing') return true;
  if (x.kind !== 'site') return false;
  const site = x.site as Record<string, unknown> | undefined;
  return !!site && typeof site.safeHtml === 'string' && typeof site.title === 'string';
}

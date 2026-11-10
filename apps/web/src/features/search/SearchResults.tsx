'use client';

import { Fragment, useLayoutEffect, useRef } from 'react';
import type { SearchResult } from '@/lib/api/types';

interface Props {
  query: string;
  results: SearchResult[];
  truncated: boolean;
  restoreY: number | null;
  onOpen: (address: string) => void;
  onScroll: (y: number) => void;
}

/**
 * A results page. It renders the snapshot stored in its navigation entry,
 * so coming back to it shows exactly the results that were left, at the
 * same scroll position.
 */
export function SearchResults({ query, results, truncated, restoreY, onOpen, onScroll }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = restoreY ?? 0;
    // Only on mount: later scroll updates come from this component itself.
  }, []);

  const handleScroll = () => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (scroller.current) onScroll(Math.round(scroller.current.scrollTop));
    }, 150);
  };

  return (
    <div className="scroll-page" ref={scroller} onScroll={handleScroll}>
      <section className="internal-page search-page" aria-labelledby="search-title">
        <h1 id="search-title">
          Results for “{query}”
        </h1>
        <p className="muted">
          {results.length === 0
            ? 'No page on this web mentions that. Try a shorter or different word.'
            : `${results.length}${truncated ? '+' : ''} page${results.length === 1 ? '' : 's'} · title matches first`}
        </p>
        <ol className="results">
          {results.map((r) => (
            <li key={r.id}>
              <button type="button" className="result" onClick={() => onOpen(r.address)}>
                <span className="result-title">
                  <Highlight text={r.title} query={query} />
                </span>
                <span className="result-address">
                  {r.address} · {r.authorName}
                </span>
                <span className="result-excerpt">
                  <Highlight text={r.excerpt} query={query} />
                </span>
              </button>
            </li>
          ))}
        </ol>
        {truncated && <p className="muted">Showing the first {results.length}. Narrow your search to see others.</p>}
      </section>
    </div>
  );
}

/** Marks matches using React elements; the text is never parsed as HTML. */
function Highlight({ text, query }: { text: string; query: string }) {
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts: { text: string; hit: boolean }[] = [];
  let i = 0;
  while (needle && i < text.length) {
    const at = lower.indexOf(needle, i);
    if (at === -1) break;
    if (at > i) parts.push({ text: text.slice(i, at), hit: false });
    parts.push({ text: text.slice(at, at + needle.length), hit: true });
    i = at + needle.length;
  }
  if (i < text.length) parts.push({ text: text.slice(i), hit: false });
  return (
    <>
      {parts.map((p, k) => (p.hit ? <mark key={k}>{p.text}</mark> : <Fragment key={k}>{p.text}</Fragment>))}
    </>
  );
}

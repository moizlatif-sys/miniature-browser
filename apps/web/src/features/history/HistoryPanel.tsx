'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import type { VisitMethod, VisitView } from '@/lib/api/types';

const METHOD_LABEL: Record<VisitMethod, string> = {
  typed: 'Typed',
  link: 'Link',
  back: 'Back',
  forward: 'Forward',
  history: 'From history',
  search_result: 'Search result',
};

const timeFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

interface Props {
  personId: string;
  personName: string;
  /** Bumped whenever a visit is saved, so an open panel shows it. */
  version: number;
  onOpen: (address: string) => void;
  onClose: () => void;
}

/** Newest-first visits for one person, read from the database, with Load more. */
export function HistoryPanel({ personId, personName, version, onOpen, onClose }: Props) {
  const [items, setItems] = useState<VisitView[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(
    async (from: string | null) => {
      const id = ++request.current;
      setLoading(true);
      setError(null);
      try {
        const page = await api.visits(personId, from);
        if (id !== request.current) return; // person changed or a newer load started
        setItems((prev) => (from ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
      } catch (err) {
        if (id === request.current) setError(err instanceof Error ? err.message : 'Could not load history.');
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [personId],
  );

  // Drop the previous person's list immediately, then load this one's.
  useEffect(() => {
    setItems([]);
    setCursor(null);
  }, [personId]);

  useEffect(() => {
    void load(null);
  }, [load, version]);

  return (
    <aside className="side-panel" aria-labelledby="history-title">
      <div className="side-panel-head">
        <h2 id="history-title">History · {personName}</h2>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="side-panel-body">
        {error && (
          <p className="panel-error" role="alert">
            {error}{' '}
            <button type="button" className="link-button" onClick={() => load(null)}>
              Retry
            </button>
          </p>
        )}
        {!loading && !error && items.length === 0 && <p className="muted">No visits yet. Pages you open will appear here.</p>}
        <ol className="history-list">
          {items.map((v) => (
            <li key={v.id}>
              <button type="button" className="history-item" onClick={() => onOpen(v.address)} title={`Open ${v.address}`}>
                <span className="history-title">
                  {v.outcome === 'not_found' && <span className="badge badge-missing">Nothing here</span>}
                  {v.title}
                </span>
                <span className="history-meta">
                  {v.address} · {timeFormat.format(new Date(v.visitedAt))} · {METHOD_LABEL[v.method]}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {loading && <p className="muted">Loading…</p>}
        {cursor && !loading && (
          <button type="button" className="btn load-more" onClick={() => load(cursor)}>
            Load more
          </button>
        )}
      </div>
    </aside>
  );
}

'use client';

import type { Entry } from '@/features/navigation/reducer';
import { PageFrame } from './PageFrame';

interface Props {
  entry: Entry | null;
  loading: string | null;
  onNavigate: (input: string) => void;
  onBlocked: (target: string) => void;
  onScroll: (entryId: string, y: number) => void;
}

export function Viewport({ entry, loading, onNavigate, onBlocked, onScroll }: Props) {
  return (
    <main className="viewport" aria-busy={!!loading}>
      {loading && <div className="loading-bar" role="status">Loading {loading}…</div>}
      {!entry && <StartScreen onNavigate={onNavigate} />}
      {entry?.kind === 'missing' && <MissingPage address={entry.address} />}
      {entry?.kind === 'site' && (
        <PageFrame
          // A new frame per entry: going back mounts a fresh frame and restores its saved scroll.
          key={entry.id}
          title={entry.site.title}
          safeHtml={entry.site.safeHtml}
          restoreY={entry.scrollY}
          fragment={entry.fragment}
          onNavigate={onNavigate}
          onBlocked={onBlocked}
          onScroll={(y) => onScroll(entry.id, y)}
        />
      )}
    </main>
  );
}

function StartScreen({ onNavigate }: { onNavigate: (input: string) => void }) {
  return (
    <section className="internal-page">
      <h1>A small web</h1>
      <p>Type an address in the bar above, or search for words that appear on a page.</p>
      <p>
        Not sure where to begin?{' '}
        <button type="button" className="link-button" onClick={() => onNavigate('start.zz')}>
          Open start.zz
        </button>
      </p>
    </section>
  );
}

function MissingPage({ address }: { address: string }) {
  return (
    <section className="internal-page" aria-labelledby="missing-title">
      <p className="badge badge-missing">Nothing here</p>
      <h1 id="missing-title">{address} does not exist</h1>
      <p>No one has published a page at this address. The link that brought you here may be broken, or the page was never written.</p>
      <p className="muted">You can go back, or publish something here yourself.</p>
    </section>
  );
}

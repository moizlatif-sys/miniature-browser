'use client';

import type { Page } from '@/features/navigation/useBrowser';
import { PageFrame } from './PageFrame';

interface Props {
  page: Page | null;
  loading: string | null;
  onNavigate: (input: string) => void;
  onBlocked: (target: string) => void;
  onScroll: (y: number) => void;
}

export function Viewport({ page, loading, onNavigate, onBlocked, onScroll }: Props) {
  return (
    <main className="viewport" aria-busy={!!loading}>
      {loading && <div className="loading-bar" role="status">Loading {loading}…</div>}
      {!page && <StartScreen onNavigate={onNavigate} />}
      {page?.kind === 'missing' && <MissingPage address={page.address} />}
      {page?.kind === 'site' && (
        <PageFrame
          key={page.id}
          title={page.site.title}
          safeHtml={page.site.safeHtml}
          restoreY={null}
          fragment={page.fragment}
          onNavigate={onNavigate}
          onBlocked={onBlocked}
          onScroll={onScroll}
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

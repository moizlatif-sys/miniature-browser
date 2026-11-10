'use client';

import type { Page } from '@/features/navigation/useBrowser';

interface Props {
  page: Page | null;
  loading: string | null;
  onNavigate: (input: string) => void;
}

export function Viewport({ page, loading, onNavigate }: Props) {
  return (
    <main className="viewport" aria-busy={!!loading}>
      {loading && <div className="loading-bar" role="status">Loading {loading}…</div>}
      {!page && <StartScreen onNavigate={onNavigate} />}
      {page?.kind === 'missing' && <MissingPage address={page.address} />}
      {page?.kind === 'site' && (
        <article className="placeholder-page">
          <h1>{page.site.title}</h1>
          <p className="muted">by {page.site.author.name}</p>
          {/* Shown as text until the containment layer renders it in a sandbox. */}
          <pre>{page.site.safeHtml}</pre>
        </article>
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

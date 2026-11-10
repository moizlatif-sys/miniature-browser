'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api/client';
import type { Person } from '@/lib/api/types';

interface Props {
  people: Person[];
  defaultAuthorId: string | null;
  /** Prefilled when arriving from a "Nothing here" page. */
  suggestedAddress: string;
  onOpen: (address: string) => void;
  onClose: () => void;
}

const EXAMPLE = `<h1>Hello from my corner</h1>
<p>This is my first page on the small web.</p>
<h2 id="links">Places I like</h2>
<ul>
  <li><a href="start.zz">The directory</a></li>
  <li><a href="garden.zz#compost">A good compost heap</a></li>
</ul>
<p style="text-align: center; font-style: italic;">Thanks for reading.</p>`;

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done'; address: string; title: string };

export function PublishPanel({ people, defaultAuthorId, suggestedAddress, onOpen, onClose }: Props) {
  const [authorId, setAuthorId] = useState(defaultAuthorId ?? '');
  const [address, setAddress] = useState(suggestedAddress);
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (suggestedAddress) setAddress(suggestedAddress);
  }, [suggestedAddress]);
  useEffect(() => {
    if (!authorId && defaultAuthorId) setAuthorId(defaultAuthorId);
  }, [authorId, defaultAuthorId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.kind === 'sending') return;
    setStatus({ kind: 'sending' });
    setError(null);
    setFieldErrors({});
    try {
      const site = await api.publish({ address, title, authorId, html });
      setStatus({ kind: 'done', address: site.address, title: site.title });
    } catch (err) {
      // Keep every field as typed so nothing is lost.
      setStatus({ kind: 'idle' });
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(err.kind === 'network' || !Object.keys(err.fieldErrors).length ? err.message : 'Please fix the highlighted fields.');
      } else {
        setError('Something went wrong.');
      }
    }
  };

  const reset = () => {
    setAddress('');
    setTitle('');
    setHtml('');
    setStatus({ kind: 'idle' });
  };

  const fieldError = (name: string) =>
    fieldErrors[name] ? (
      <span className="field-error" id={`publish-${name}-error`}>
        {fieldErrors[name]}
      </span>
    ) : null;
  const describedBy = (name: string, hint?: string) =>
    [fieldErrors[name] ? `publish-${name}-error` : '', hint ?? ''].filter(Boolean).join(' ') || undefined;

  return (
    <aside className="side-panel publish-panel" aria-labelledby="publish-title">
      <div className="side-panel-head">
        <h2 id="publish-title">Publish a page</h2>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="side-panel-body">
        {status.kind === 'done' ? (
          <div className="publish-done" role="status">
            <p>
              <strong>{status.title}</strong> is live at <code>{status.address}</code>.
            </p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => onOpen(status.address)}>
                Open page
              </button>
              <button type="button" className="btn" onClick={reset}>
                Publish another
              </button>
            </div>
          </div>
        ) : (
          <form className="publish-form" onSubmit={submit} noValidate>
            <label>
              <span>Publish as</span>
              <select value={authorId} onChange={(e) => setAuthorId(e.target.value)} aria-invalid={!!fieldErrors.authorId} aria-describedby={describedBy('authorId')}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {fieldError('authorId')}
            </label>

            <label>
              <span>Address</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="my-page.zz"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={!!fieldErrors.address}
                aria-describedby={describedBy('address', 'publish-address-hint')}
              />
              <span className="hint" id="publish-address-hint">Letters, digits and hyphens, ending in .zz</span>
              {fieldError('address')}
            </label>

            <label>
              <span>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-invalid={!!fieldErrors.title} aria-describedby={describedBy('title')} />
              {fieldError('title')}
            </label>

            <label>
              <span className="label-row">
                HTML
                <button type="button" className="link-button" onClick={() => setHtml(EXAMPLE)}>
                  Insert example
                </button>
              </span>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={12}
                spellCheck={false}
                aria-invalid={!!fieldErrors.html}
                aria-describedby={describedBy('html', 'publish-policy')}
              />
              {fieldError('html')}
            </label>

            {error && (
              <p className="panel-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={status.kind === 'sending'}>
              {status.kind === 'sending' ? 'Publishing…' : 'Publish'}
            </button>

            <details className="policy" id="publish-policy" open>
              <summary>What your HTML can contain</summary>
              <p>
                <strong>Kept:</strong> headings, paragraphs, lists, quotes, tables, <code>pre</code>/<code>code</code>, emphasis,
                ids, and links to pages on this web (<code>garden.zz</code>, <code>garden.zz#beds</code>, <code>#beds</code>).
              </p>
              <p>
                <strong>Inline styles:</strong> colour, background colour, alignment, weight, italics, size, small margins and
                padding, simple borders.
              </p>
              <p>
                <strong>Removed:</strong> scripts and event handlers, forms and inputs, images, audio, video, iframes, SVG,
                <code>&lt;style&gt;</code>, and links to the real internet (they appear greyed out and do nothing). Up to 100 KiB.
              </p>
            </details>
          </form>
        )}
      </div>
    </aside>
  );
}

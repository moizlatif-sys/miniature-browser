'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Person } from '@/lib/api/types';
import { displayTarget } from '@/lib/address';
import { useBrowser } from '@/features/navigation/useBrowser';
import type { PageEntry } from '@/features/navigation/reducer';
import { loadPersonId, savePersonId } from '@/features/navigation/storage';
import { HistoryPanel } from '@/features/history/HistoryPanel';
import { useVisitRecorder } from '@/features/history/useVisitRecorder';
import { PublishPanel } from '@/features/publishing/PublishPanel';
import type { VisitMethod } from '@/lib/api/types';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';

type Panel = 'history' | 'publish' | null;

export function Browser() {
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [publishAddress, setPublishAddress] = useState('');
  const [historyVersion, setHistoryVersion] = useState(0);

  const recorder = useVisitRecorder(useCallback(() => setHistoryVersion((v) => v + 1), []));
  const onArrive = useCallback(
    (forPerson: string, entry: PageEntry, method: VisitMethod) => {
      void recorder.record({
        eventId: crypto.randomUUID(),
        personId: forPerson,
        address: entry.address,
        method,
        navigationEntryId: entry.id,
      });
    },
    [recorder.record],
  );
  const browser = useBrowser(personId, onArrive);

  useEffect(() => {
    api
      .people()
      .then((list) => {
        setPeople(list);
        const remembered = loadPersonId();
        setPersonId(list.find((p) => p.id === remembered)?.id ?? list[0]?.id ?? null);
      })
      .catch((err: Error) => setPeopleError(err.message));
  }, []);

  const choosePerson = (id: string) => {
    savePersonId(id);
    setPersonId(id);
  };

  // Alt+← / Alt+→ like a real browser (only reaches us when focus is outside the page frame).
  const { back, forward } = browser;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); forward(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back, forward]);

  const entry = browser.ready ? browser.entry : null;
  const committedValue = !entry
    ? ''
    : entry.kind === 'search'
      ? entry.query
      : displayTarget(entry.address, entry.kind === 'site' ? entry.fragment : null);
  const person = people.find((p) => p.id === personId);
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  // The tab title follows the page, like a real browser.
  const pageTitle = entry?.kind === 'site' ? entry.site.title : entry?.kind === 'search' ? `“${entry.query}”` : entry?.address;
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · Miniature Browser` : 'Miniature Browser';
  }, [pageTitle]);

  // Escape closes the open panel and puts focus back on the address bar.
  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setPanel(null);
      document.getElementById('address')?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel]);

  return (
    <div className="browser">
      <Toolbar
        canBack={browser.canBack}
        canForward={browser.canForward}
        onBack={back}
        onForward={forward}
        people={people}
        personId={personId}
        onPersonChange={choosePerson}
        committedValue={committedValue}
        onSubmit={(value) => browser.go(value, 'typed')}
        loading={!!browser.loading}
        actions={
          <>
            <button type="button" className="btn" aria-pressed={panel === 'history'} onClick={() => toggle('history')}>
              History
            </button>
            <button type="button" className="btn" aria-pressed={panel === 'publish'} onClick={() => toggle('publish')}>
              Publish
            </button>
          </>
        }
      />
      {(browser.error || peopleError) && (
        <div className="notice notice-error" role="alert">
          <span>{browser.error ?? peopleError}</span>
          <span className="notice-actions">
            {(browser.retry || peopleError) && (
              <button type="button" className="link-button" onClick={browser.retry ?? (() => window.location.reload())}>
                Retry
              </button>
            )}
            <button type="button" className="link-button" onClick={browser.dismissError}>
              Dismiss
            </button>
          </span>
        </div>
      )}
      {browser.notice && (
        <div className="notice notice-warn" role="status">
          <span>{browser.notice}</span>
          <button type="button" className="link-button" onClick={browser.dismissNotice}>
            Dismiss
          </button>
        </div>
      )}
      {recorder.unsaved > 0 && (
        <div className="notice notice-warn" role="status">
          <span>History not saved ({recorder.unsaved} visit{recorder.unsaved === 1 ? '' : 's'}). The page is fine.</span>
          <button type="button" className="link-button" onClick={recorder.retry}>
            Retry
          </button>
        </div>
      )}
      <div className="workspace">
        <Viewport
          entry={entry}
          loading={browser.loading}
          onNavigate={(target) => browser.go(target, 'link')}
          onOpenResult={(address) => browser.go(address, 'search_result')}
          onPublishHere={(address) => {
            setPublishAddress(address);
            setPanel('publish');
          }}
          onBlocked={browser.blocked}
          onKeyNav={(action) => (action === 'back' ? back() : forward())}
          onScroll={browser.reportScroll}
        />
        {panel === 'history' && person && (
          <HistoryPanel
            personId={person.id}
            personName={person.name}
            version={historyVersion}
            onOpen={(address) => browser.go(address, 'history')}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === 'publish' && (
          <PublishPanel
            people={people}
            defaultAuthorId={personId}
            suggestedAddress={publishAddress}
            // Opening a published page is an ordinary navigation; publishing alone records no visit.
            onOpen={(address) => browser.go(address, 'typed')}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </div>
  );
}

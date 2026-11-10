'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Person } from '@/lib/api/types';
import { displayTarget } from '@/lib/address';
import { useBrowser } from '@/features/navigation/useBrowser';
import type { Entry } from '@/features/navigation/reducer';
import { loadPersonId, savePersonId } from '@/features/navigation/storage';
import { HistoryPanel } from '@/features/history/HistoryPanel';
import { useVisitRecorder } from '@/features/history/useVisitRecorder';
import type { VisitMethod } from '@/lib/api/types';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';

type Panel = 'history' | null;

export function Browser() {
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const recorder = useVisitRecorder(useCallback(() => setHistoryVersion((v) => v + 1), []));
  const onArrive = useCallback(
    (forPerson: string, entry: Entry, method: VisitMethod) => {
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
  const committedValue = entry ? displayTarget(entry.address, entry.kind === 'site' ? entry.fragment : null) : '';
  const person = people.find((p) => p.id === personId);
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

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
          <button type="button" className="btn" aria-pressed={panel === 'history'} onClick={() => toggle('history')}>
            History
          </button>
        }
      />
      {(browser.error || peopleError) && (
        <div className="notice notice-error" role="alert">
          <span>{browser.error ?? peopleError}</span>
          <button type="button" className="link-button" onClick={browser.dismissError}>
            Dismiss
          </button>
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
          onBlocked={browser.blocked}
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
      </div>
    </div>
  );
}

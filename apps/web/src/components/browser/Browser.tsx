'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Person } from '@/lib/api/types';
import { displayTarget } from '@/lib/address';
import { useBrowser } from '@/features/navigation/useBrowser';
import { loadPersonId, savePersonId } from '@/features/navigation/storage';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';

export function Browser() {
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const browser = useBrowser(personId);

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
      <div className="workspace">
        <Viewport
          entry={entry}
          loading={browser.loading}
          onNavigate={(target) => browser.go(target, 'link')}
          onBlocked={browser.blocked}
          onScroll={browser.reportScroll}
        />
      </div>
    </div>
  );
}

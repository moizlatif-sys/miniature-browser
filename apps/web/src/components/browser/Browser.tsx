'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Person } from '@/lib/api/types';
import { displayTarget } from '@/lib/address';
import { useBrowser } from '@/features/navigation/useBrowser';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';

export function Browser() {
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const browser = useBrowser();

  useEffect(() => {
    api
      .people()
      .then((list) => {
        setPeople(list);
        setPersonId((current) => current ?? list[0]?.id ?? null);
      })
      .catch((err: Error) => setPeopleError(err.message));
  }, []);

  const page = browser.page;
  const committedValue = page ? displayTarget(page.address, page.kind === 'site' ? page.fragment : null) : '';

  return (
    <div className="browser">
      <Toolbar
        people={people}
        personId={personId}
        onPersonChange={setPersonId}
        committedValue={committedValue}
        onSubmit={browser.go}
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
      <div className="workspace">
        <Viewport page={page} loading={browser.loading} onNavigate={browser.go} />
      </div>
    </div>
  );
}

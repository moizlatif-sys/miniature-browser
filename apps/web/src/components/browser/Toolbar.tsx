'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Person } from '@/lib/api/types';

interface Props {
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  people: Person[];
  personId: string | null;
  onPersonChange: (id: string) => void;
  committedValue: string;
  onSubmit: (value: string) => void;
  loading: boolean;
}

export function Toolbar(props: Props) {
  const { canBack, canForward, onBack, onForward, people, personId, onPersonChange, committedValue, onSubmit, loading } = props;
  // What is being typed is a draft; it only becomes navigation on Enter.
  const [draft, setDraft] = useState(committedValue);
  useEffect(() => setDraft(committedValue), [committedValue]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(draft);
  };

  return (
    <header className="toolbar">
      <div className="nav-buttons">
        <button type="button" className="btn btn-icon" onClick={onBack} disabled={!canBack} aria-label="Back" title="Back (Alt+←)">
          ←
        </button>
        <button type="button" className="btn btn-icon" onClick={onForward} disabled={!canForward} aria-label="Forward" title="Forward (Alt+→)">
          →
        </button>
      </div>
      <form className="address-form" onSubmit={submit} role="search">
        <label htmlFor="address" className="visually-hidden">
          Address or search
        </label>
        <input
          id="address"
          className="address-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setDraft(committedValue)}
          onFocus={(e) => e.target.select()}
          placeholder="Type an address like start.zz, or words to search"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn">
          {loading ? 'Loading…' : 'Go'}
        </button>
      </form>

      <label className="person-picker">
        <span>Browsing as</span>
        <select value={personId ?? ''} onChange={(e) => onPersonChange(e.target.value)} disabled={!people.length}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}

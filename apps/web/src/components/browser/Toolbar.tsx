'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Person } from '@/lib/api/types';

interface Props {
  people: Person[];
  personId: string | null;
  onPersonChange: (id: string) => void;
  committedValue: string;
  onSubmit: (value: string) => void;
  loading: boolean;
}

export function Toolbar({ people, personId, onPersonChange, committedValue, onSubmit, loading }: Props) {
  // What is being typed is a draft; it only becomes navigation on Enter.
  const [draft, setDraft] = useState(committedValue);
  useEffect(() => setDraft(committedValue), [committedValue]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(draft);
  };

  return (
    <header className="toolbar">
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

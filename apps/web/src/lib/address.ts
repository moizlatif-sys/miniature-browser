// Mirrors apps/api/src/common/address.ts. The API is the authority; this copy
// only decides, before any request, whether the address bar holds an address
// or a search.

const ADDRESS_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.zz$/;

export type Target =
  | { kind: 'address'; address: string; fragment: string | null }
  | { kind: 'fragment'; fragment: string }
  | { kind: 'invalid'; reason: string }
  | { kind: 'search'; query: string };

export function normalizeAddress(raw: string): string {
  return raw.trim().replace(/[A-Z]/g, (c) => c.toLowerCase());
}

/** Reads whatever was typed into the address bar (or found in a link). */
export function parseTarget(raw: string): Target {
  const value = raw.trim();
  if (!value) return { kind: 'invalid', reason: 'Type an address or something to search for.' };

  if (value.startsWith('#')) {
    return value.length > 1
      ? { kind: 'fragment', fragment: value.slice(1) }
      : { kind: 'invalid', reason: 'That link points nowhere.' };
  }

  const hash = value.indexOf('#');
  const address = normalizeAddress(hash === -1 ? value : value.slice(0, hash));
  const fragment = hash === -1 ? null : value.slice(hash + 1) || null;

  if (ADDRESS_PATTERN.test(address)) return { kind: 'address', address, fragment };

  // Looks like someone meant an address (ends in .zz or has a scheme) but it is malformed.
  if (/\.zz$/i.test(address) || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return {
      kind: 'invalid',
      reason: `"${value}" is not an address on this web. Addresses look like garden.zz.`,
    };
  }
  return { kind: 'search', query: value };
}

export function displayTarget(address: string, fragment: string | null) {
  return fragment ? `${address}#${fragment}` : address;
}

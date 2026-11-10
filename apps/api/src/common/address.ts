/**
 * Address rules for the miniature web.
 *
 * An address is one label followed by `.zz`, e.g. `garden.zz` or `night-radio.zz`.
 * The label is 1–63 ASCII letters, digits or internal hyphens. Addresses are
 * looked up in our own database; they never touch DNS or the real network.
 */
export const ADDRESS_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.zz$/;

export function normalizeAddress(raw: string): string {
  // Lower-case ASCII only, so Unicode lookalikes are left as-is and then rejected.
  return raw.trim().replace(/[A-Z]/g, (c) => c.toLowerCase());
}

export function isValidAddress(address: string): boolean {
  return ADDRESS_PATTERN.test(address);
}

/** Splits `garden.zz#pond` into its address and fragment. */
export function splitTarget(raw: string): { address: string; fragment: string | null } {
  const value = raw.trim();
  const hash = value.indexOf('#');
  if (hash === -1) return { address: normalizeAddress(value), fragment: null };
  return {
    address: normalizeAddress(value.slice(0, hash)),
    fragment: value.slice(hash + 1) || null,
  };
}

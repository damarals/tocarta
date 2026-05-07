/**
 * Filename-safe slug from a deck name. Lowercases ASCII, strips diacritics,
 * removes anything outside `[a-z0-9]`, collapses runs of separators into a
 * single hyphen, trims leading/trailing hyphens, caps the result at 64
 * characters, and falls back to `"deck"` when the input has nothing usable
 * so the produced filename is never empty.
 *
 * Pure: same input → same output, no I/O, no clock, no randomness.
 */
const MAX_LENGTH = 64;
const FALLBACK = 'deck';

export function slug(name: string): string {
  // 1) Strip combining diacritics: `Café` → `Cafe`.
  const ascii = name.normalize('NFKD').replace(/\p{M}/gu, '');
  // 2) Lowercase and replace anything not in [a-z0-9] with a hyphen.
  const replaced = ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  // 3) Trim leading/trailing hyphens.
  const trimmed = replaced.replace(/^-+|-+$/g, '');
  if (trimmed === '') return FALLBACK;
  // 4) Cap at MAX_LENGTH; if the cap lands on a hyphen (mid-separator),
  //    re-trim the trailing hyphen so the filename never ends in `-`.
  const capped = trimmed.length <= MAX_LENGTH ? trimmed : trimmed.slice(0, MAX_LENGTH);
  return capped.replace(/-+$/g, '') || FALLBACK;
}

import type { DeckPointer } from './deck-pointer';

/**
 * Session-scoped memory of deck pointers the user said "Not now" to.
 *
 * The set is module-level on purpose: it lives only for the lifetime of the
 * JS bundle (i.e. the running app process). Reinstalling, killing, or even
 * just reloading the app clears it — that's the whole point of "session
 * scope". A subsequent scan of the same card after relaunch should re-prompt.
 *
 * Acceptance criterion: declining must not re-prompt for the same card during
 * the same session.
 */
const declined = new Set<string>();

const keyFor = (pointer: DeckPointer): string =>
  `${pointer.provider}:${pointer.playlistId}`;

export function markDeclined(pointer: DeckPointer): void {
  declined.add(keyFor(pointer));
}

export function wasDeclined(pointer: DeckPointer): boolean {
  return declined.has(keyFor(pointer));
}

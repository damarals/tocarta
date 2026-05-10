import type { DroppedTrack } from './deck-generator';

/**
 * Ephemeral, in-memory hand-off from the Resolving screen to the Review screen.
 *
 * Drops are viewing state for the post-generation flow only — they are not part
 * of the persisted Deck schema (per PRD: a Deck is `{ id, name, sourceUrl,
 * createdAt, cards }`). The DeckGenerator emits dropped tracks alongside the
 * Deck; the Resolving screen stashes them here keyed by deckId, and the Review
 * screen reads them on mount.
 *
 * If the user enters Review through any other path (e.g., revisiting a saved
 * deck in the future), the store returns an empty array and the screen simply
 * renders the cards without drop banners.
 */

const store = new Map<string, DroppedTrack[]>();

export function setPostGenerationDrops(deckId: string, drops: DroppedTrack[]): void {
  store.set(deckId, drops);
}

export function takePostGenerationDrops(deckId: string): DroppedTrack[] {
  const drops = store.get(deckId) ?? [];
  store.delete(deckId);
  return drops;
}

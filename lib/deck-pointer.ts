import { parseDeezerPlaylistUrl } from './deezer-url';
import type { Deck } from './types';

/**
 * Deck-locating pointer carried by extended-format card codes per ADR-0013.
 * `provider` is the two-letter source tag (`DZ` for Deezer in V1; `SP`, `AM`,
 * `YT` reserved). `playlistId` is the provider-specific identifier.
 */
export type DeckPointer = {
  provider: string;
  playlistId: string;
};

/**
 * Rebuild the canonical playlist URL for a deck pointer. Returns `null` when
 * the provider is not supported by this version of the app — playback still
 * works (the ISRC drives audio), but the deck cannot be re-imported.
 */
export function reconstructPlaylistUrl(pointer: DeckPointer): string | null {
  if (pointer.provider === 'DZ') {
    return `https://www.deezer.com/playlist/${pointer.playlistId}`;
  }
  return null;
}

/**
 * Does the given deck come from the same playlist as the pointer? Compares
 * the parsed playlist id of the deck's `sourceUrl` with the pointer's
 * `playlistId`. Decks whose source URL doesn't parse for the pointer's
 * provider (legacy decks, foreign URLs, unsupported providers) never match.
 */
export function deckMatchesPointer(deck: Deck, pointer: DeckPointer): boolean {
  if (pointer.provider !== 'DZ') return false;
  const parsed = parseDeezerPlaylistUrl(deck.sourceUrl);
  if (parsed === null) return false;
  return parsed.playlistId === pointer.playlistId;
}

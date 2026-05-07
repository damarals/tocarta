import { deckMatchesPointer, reconstructPlaylistUrl } from '../lib/deck-pointer';
import type { Deck } from '../lib/types';

const deckWith = (sourceUrl: string): Deck => ({
  id: 'deck-1',
  name: 'Test Deck',
  sourceUrl,
  createdAt: 1_700_000_000_000,
  cards: [],
});

describe('reconstructPlaylistUrl', () => {
  test('returns canonical Deezer playlist URL for the DZ provider', () => {
    expect(reconstructPlaylistUrl({ provider: 'DZ', playlistId: '123' })).toBe(
      'https://www.deezer.com/playlist/123',
    );
  });

  test('returns null for an unsupported provider tag', () => {
    expect(reconstructPlaylistUrl({ provider: 'SP', playlistId: '123' })).toBeNull();
  });

  test('returns null for the AM provider tag (Apple Music — not yet supported)', () => {
    expect(reconstructPlaylistUrl({ provider: 'AM', playlistId: 'pl.abc' })).toBeNull();
  });

  test('returns null for the YT provider tag (YouTube Music — not yet supported)', () => {
    expect(reconstructPlaylistUrl({ provider: 'YT', playlistId: 'PLxyz' })).toBeNull();
  });
});

describe('deckMatchesPointer', () => {
  test('returns true when the deck source URL parses to the same Deezer playlist id', () => {
    const deck = deckWith('https://www.deezer.com/playlist/123');
    expect(deckMatchesPointer(deck, { provider: 'DZ', playlistId: '123' })).toBe(true);
  });

  test('returns true regardless of locale segment in the saved deck URL', () => {
    const deck = deckWith('https://www.deezer.com/en/playlist/123');
    expect(deckMatchesPointer(deck, { provider: 'DZ', playlistId: '123' })).toBe(true);
  });

  test("returns false when the deck's playlist id differs from the pointer", () => {
    const deck = deckWith('https://www.deezer.com/playlist/999');
    expect(deckMatchesPointer(deck, { provider: 'DZ', playlistId: '123' })).toBe(false);
  });

  test("returns false when the deck's source URL is not a Deezer playlist URL", () => {
    const deck = deckWith('https://example.com/some-foreign-source');
    expect(deckMatchesPointer(deck, { provider: 'DZ', playlistId: '123' })).toBe(false);
  });

  test('returns false for an unsupported provider regardless of deck contents', () => {
    const deck = deckWith('https://www.deezer.com/playlist/123');
    expect(deckMatchesPointer(deck, { provider: 'SP', playlistId: '123' })).toBe(false);
  });
});

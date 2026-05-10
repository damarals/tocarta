import AsyncStorage from '@react-native-async-storage/async-storage';

import { deckLibrary } from '../lib/deck-library';
import type { Deck } from '../lib/types';

const sampleDeck = (overrides: Partial<Deck> = {}): Deck => ({
  id: 'deck-1',
  name: 'Road Trip 2024',
  sourceUrl: 'https://www.deezer.com/playlist/1234',
  createdAt: 1_700_000_000_000,
  cards: [
    { isrc: 'USRC17607839', artist: 'Queen', title: 'Bohemian Rhapsody', year: 1975 },
    { isrc: 'GBAYE0601498', artist: 'Led Zeppelin', title: 'Stairway to Heaven', year: 1971 },
  ],
  ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('DeckLibrary.save', () => {
  test('persists the deck as JSON under decks/{id}', async () => {
    const deck = sampleDeck();

    await deckLibrary.save(deck);

    const raw = await AsyncStorage.getItem(`decks/${deck.id}`);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(deck);
  });
});

describe('DeckLibrary.load', () => {
  test('returns the deck previously saved', async () => {
    const deck = sampleDeck();
    await deckLibrary.save(deck);

    const loaded = await deckLibrary.load(deck.id);

    expect(loaded).toEqual(deck);
  });

  test('returns null when no deck exists for the id', async () => {
    const loaded = await deckLibrary.load('does-not-exist');

    expect(loaded).toBeNull();
  });
});

describe('DeckLibrary.list', () => {
  test('returns all decks ordered newest first by createdAt', async () => {
    const older = sampleDeck({ id: 'a', createdAt: 1_000 });
    const newer = sampleDeck({ id: 'b', createdAt: 3_000 });
    const middle = sampleDeck({ id: 'c', createdAt: 2_000 });

    await deckLibrary.save(older);
    await deckLibrary.save(newer);
    await deckLibrary.save(middle);

    const result = await deckLibrary.list();

    expect(result.map((d) => d.id)).toEqual(['b', 'c', 'a']);
  });

  test('returns an empty array when no decks have been saved', async () => {
    const result = await deckLibrary.list();

    expect(result).toEqual([]);
  });

  test('breaks ties on createdAt deterministically by id ascending', async () => {
    await deckLibrary.save(sampleDeck({ id: 'charlie', createdAt: 5_000 }));
    await deckLibrary.save(sampleDeck({ id: 'alpha', createdAt: 5_000 }));
    await deckLibrary.save(sampleDeck({ id: 'bravo', createdAt: 5_000 }));

    const first = await deckLibrary.list();
    const second = await deckLibrary.list();

    expect(first.map((d) => d.id)).toEqual(['alpha', 'bravo', 'charlie']);
    expect(second.map((d) => d.id)).toEqual(first.map((d) => d.id));
  });
});

describe('DeckLibrary.delete', () => {
  test('removes the deck so load returns null and list excludes it', async () => {
    const survivor = sampleDeck({ id: 'keep', createdAt: 1_000 });
    const target = sampleDeck({ id: 'gone', createdAt: 2_000 });
    await deckLibrary.save(survivor);
    await deckLibrary.save(target);

    await deckLibrary.delete(target.id);

    expect(await deckLibrary.load(target.id)).toBeNull();
    const remaining = await deckLibrary.list();
    expect(remaining.map((d) => d.id)).toEqual(['keep']);
  });

  test('is a no-op for an unknown id', async () => {
    await expect(deckLibrary.delete('never-saved')).resolves.toBeUndefined();
  });
});

describe('DeckLibrary.updateName', () => {
  test('persists the new name and leaves other fields untouched', async () => {
    const deck = sampleDeck();
    await deckLibrary.save(deck);

    await deckLibrary.updateName(deck.id, 'Summer Mix 2024');

    const loaded = await deckLibrary.load(deck.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('Summer Mix 2024');
    expect(loaded!.id).toBe(deck.id);
    expect(loaded!.sourceUrl).toBe(deck.sourceUrl);
    expect(loaded!.createdAt).toBe(deck.createdAt);
    expect(loaded!.cards).toEqual(deck.cards);
  });

  test('throws when the deck does not exist', async () => {
    await expect(deckLibrary.updateName('missing', 'Anything')).rejects.toThrow();
  });
});

describe('DeckLibrary.updateYearOverride', () => {
  test('sets yearOverride only on the matching card; deck and other cards untouched', async () => {
    const deck = sampleDeck({
      cards: [
        { isrc: 'AAA', artist: 'A', title: 'a', year: 2000 },
        { isrc: 'BBB', artist: 'B', title: 'b', year: 1999 },
        { isrc: 'CCC', artist: 'C', title: 'c', year: 1998 },
      ],
    });
    await deckLibrary.save(deck);

    await deckLibrary.updateYearOverride(deck.id, 'BBB', 1985);

    const loaded = await deckLibrary.load(deck.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(deck.id);
    expect(loaded!.name).toBe(deck.name);
    expect(loaded!.sourceUrl).toBe(deck.sourceUrl);
    expect(loaded!.createdAt).toBe(deck.createdAt);
    expect(loaded!.cards).toEqual([
      { isrc: 'AAA', artist: 'A', title: 'a', year: 2000 },
      { isrc: 'BBB', artist: 'B', title: 'b', year: 1999, yearOverride: 1985 },
      { isrc: 'CCC', artist: 'C', title: 'c', year: 1998 },
    ]);
  });

  test('overwrites a previous yearOverride on subsequent calls', async () => {
    const deck = sampleDeck({
      cards: [
        { isrc: 'AAA', artist: 'A', title: 'a', year: 2000, yearOverride: 1990 },
      ],
    });
    await deckLibrary.save(deck);

    await deckLibrary.updateYearOverride(deck.id, 'AAA', 1985);

    const loaded = await deckLibrary.load(deck.id);
    expect(loaded!.cards[0].yearOverride).toBe(1985);
    expect(loaded!.cards[0].year).toBe(2000);
  });

  test('throws when the deck does not exist', async () => {
    await expect(
      deckLibrary.updateYearOverride('missing', 'AAA', 1985),
    ).rejects.toThrow();
  });

  test('throws when the isrc is not present in the deck', async () => {
    const deck = sampleDeck({
      cards: [{ isrc: 'AAA', artist: 'A', title: 'a', year: 2000 }],
    });
    await deckLibrary.save(deck);

    await expect(
      deckLibrary.updateYearOverride(deck.id, 'ZZZ', 1985),
    ).rejects.toThrow();
  });
});

describe('DeckLibrary key namespacing', () => {
  test('does not collide with non-namespaced keys that share the deck id', async () => {
    const deck = sampleDeck({ id: 'x' });
    await deckLibrary.save(deck);
    // A foreign module writes to a key that happens to share the id but lacks the namespace.
    await AsyncStorage.setItem('x', JSON.stringify({ unrelated: true }));

    const loaded = await deckLibrary.load('x');

    expect(loaded).toEqual(deck);
  });

  test('list ignores keys outside the decks/ namespace', async () => {
    const deck = sampleDeck({ id: 'x' });
    await deckLibrary.save(deck);
    await AsyncStorage.setItem('cache/year/USRC17607839', '1975');
    await AsyncStorage.setItem('something-else', 'noise');

    const result = await deckLibrary.list();

    expect(result).toEqual([deck]);
  });
});

describe('DeckLibrary concurrency', () => {
  test('concurrent saves to the same deck leave the store in one of the two valid final states', async () => {
    const base = sampleDeck({ id: 'concurrent', cards: [] });
    await deckLibrary.save(base);

    const variantA: Deck = {
      ...base,
      cards: [{ isrc: 'A1', artist: 'Artist A', title: 'Track A', year: 2001 }],
    };
    const variantB: Deck = {
      ...base,
      cards: [{ isrc: 'B1', artist: 'Artist B', title: 'Track B', year: 2002 }],
    };

    await Promise.all([deckLibrary.save(variantA), deckLibrary.save(variantB)]);

    const loaded = await deckLibrary.load(base.id);
    expect(loaded).not.toBeNull();
    // Last-write-wins is acceptable; partial/torn state is not. The result must equal one of the two.
    expect([variantA, variantB]).toContainEqual(loaded);
  });

  test('concurrent updateYearOverride calls on different cards both apply', async () => {
    const deck = sampleDeck({
      id: 'concurrent-overrides',
      cards: [
        { isrc: 'AAA', artist: 'A', title: 'a', year: 2000 },
        { isrc: 'BBB', artist: 'B', title: 'b', year: 1999 },
      ],
    });
    await deckLibrary.save(deck);

    await Promise.all([
      deckLibrary.updateYearOverride(deck.id, 'AAA', 1985),
      deckLibrary.updateYearOverride(deck.id, 'BBB', 1986),
    ]);

    const loaded = await deckLibrary.load(deck.id);
    expect(loaded!.cards.find((c) => c.isrc === 'AAA')!.yearOverride).toBe(1985);
    expect(loaded!.cards.find((c) => c.isrc === 'BBB')!.yearOverride).toBe(1986);
  });
});

import { createDeckGenerator } from '../lib/deck-generator';
import type { ExtractResult } from '../lib/playlist-extractor';
import type { GenerateProgress } from '../lib/deck-generator';
import type { YearResolver } from '../lib/year-resolver';

type ResolveScript = Map<string, number | null>;

function fakeExtractor(result: ExtractResult): {
  extractFromDeezerUrl: (url: string) => Promise<ExtractResult>;
} {
  return {
    extractFromDeezerUrl: jest.fn(async () => result),
  };
}

function fakeResolver(script: ResolveScript): YearResolver {
  return {
    async resolve(isrc: string) {
      const year = script.get(isrc);
      if (year === undefined) {
        throw new Error(`fakeResolver: no script entry for ${isrc}`);
      }
      return { year };
    },
  };
}

describe('DeckGenerator on an empty playlist', () => {
  test('produces an empty deck and emits a single initial progress event', async () => {
    const extractor = fakeExtractor({
      name: 'Empty',
      tracks: [],
      droppedTracks: [],
    });
    const resolver = fakeResolver(new Map());
    const generator = createDeckGenerator({
      extractor,
      resolver,
      newId: () => 'deck-1',
      clock: () => 1_700_000_000_000,
    });
    const progress: GenerateProgress[] = [];

    const result = await generator.generate({
      url: 'https://www.deezer.com/playlist/0',
      onProgress: (p) => progress.push(p),
    });

    expect(result.deck).toEqual({
      id: 'deck-1',
      name: 'Empty',
      sourceUrl: 'https://www.deezer.com/playlist/0',
      createdAt: 1_700_000_000_000,
      cards: [],
    });
    expect(result.droppedTracks).toEqual([]);
    expect(progress).toEqual([{ done: 0, total: 0, dropped: 0 }]);
  });
});

describe('DeckGenerator with all tracks resolvable', () => {
  test('builds a deck containing each track in order with its resolved year', async () => {
    const extractor = fakeExtractor({
      name: 'Classic Rock',
      tracks: [
        { isrc: 'A', artist: 'Queen', title: 'Bohemian Rhapsody' },
        { isrc: 'B', artist: 'Led Zeppelin', title: 'Stairway to Heaven' },
      ],
      droppedTracks: [],
    });
    const resolver = fakeResolver(
      new Map([
        ['A', 1975],
        ['B', 1971],
      ]),
    );
    const generator = createDeckGenerator({
      extractor,
      resolver,
      newId: () => 'deck-rock',
      clock: () => 5_000,
    });
    const progress: GenerateProgress[] = [];

    const result = await generator.generate({
      url: 'https://www.deezer.com/playlist/123',
      onProgress: (p) => progress.push(p),
    });

    expect(result.deck.cards).toEqual([
      { isrc: 'A', artist: 'Queen', title: 'Bohemian Rhapsody', year: 1975 },
      { isrc: 'B', artist: 'Led Zeppelin', title: 'Stairway to Heaven', year: 1971 },
    ]);
    expect(result.droppedTracks).toEqual([]);
  });
});

describe('DeckGenerator with some tracks missing a year', () => {
  test("drops tracks the resolver returns null for and labels them with the right reason", async () => {
    const extractor = fakeExtractor({
      name: 'Mixed',
      tracks: [
        { isrc: 'A', artist: 'Known', title: 'Hit Song' },
        { isrc: 'B', artist: 'Obscure Band', title: 'Lost Track' },
        { isrc: 'C', artist: 'Other', title: 'Other Song' },
      ],
      droppedTracks: [],
    });
    const resolver = fakeResolver(
      new Map<string, number | null>([
        ['A', 1990],
        ['B', null],
        ['C', 2000],
      ]),
    );
    const generator = createDeckGenerator({
      extractor,
      resolver,
      newId: () => 'deck-mixed',
      clock: () => 0,
    });

    const result = await generator.generate({
      url: 'https://www.deezer.com/playlist/x',
    });

    expect(result.deck.cards).toEqual([
      { isrc: 'A', artist: 'Known', title: 'Hit Song', year: 1990 },
      { isrc: 'C', artist: 'Other', title: 'Other Song', year: 2000 },
    ]);
    expect(result.droppedTracks).toEqual([
      {
        artist: 'Obscure Band',
        title: 'Lost Track',
        reason: "Couldn't find a release year",
      },
    ]);
  });
});

describe('DeckGenerator propagates no-ISRC drops from the extractor', () => {
  test('includes extractor drops in the final droppedTracks list', async () => {
    const extractor = fakeExtractor({
      name: 'Has Untagged',
      tracks: [{ isrc: 'A', artist: 'Tagged', title: 'Has ISRC' }],
      droppedTracks: [
        {
          artist: 'Untagged Band',
          title: 'No ISRC Track',
          reason: "Track wasn't tagged with a unique ID",
        },
      ],
    });
    const resolver = fakeResolver(new Map([['A', 1990]]));
    const generator = createDeckGenerator({
      extractor,
      resolver,
      newId: () => 'deck-x',
      clock: () => 0,
    });

    const result = await generator.generate({
      url: 'https://www.deezer.com/playlist/x',
    });

    expect(result.deck.cards.map((c) => c.isrc)).toEqual(['A']);
    expect(result.droppedTracks).toEqual([
      {
        artist: 'Untagged Band',
        title: 'No ISRC Track',
        reason: "Track wasn't tagged with a unique ID",
      },
    ]);
  });
});

describe('DeckGenerator progress events', () => {
  test('emits an initial event then one per resolved track, with running counts', async () => {
    const extractor = fakeExtractor({
      name: 'Three',
      tracks: [
        { isrc: 'A', artist: 'A', title: 'a' },
        { isrc: 'B', artist: 'B', title: 'b' },
        { isrc: 'C', artist: 'C', title: 'c' },
      ],
      droppedTracks: [],
    });
    const resolver = fakeResolver(
      new Map<string, number | null>([
        ['A', 1990],
        ['B', null],
        ['C', 2000],
      ]),
    );
    const generator = createDeckGenerator({
      extractor,
      resolver,
      newId: () => 'd',
      clock: () => 0,
    });
    const progress: GenerateProgress[] = [];

    await generator.generate({
      url: 'https://www.deezer.com/playlist/x',
      onProgress: (p) => progress.push(p),
    });

    expect(progress).toEqual([
      { done: 0, total: 3, dropped: 0 },
      { done: 1, total: 3, dropped: 0 },
      { done: 2, total: 3, dropped: 1 },
      { done: 3, total: 3, dropped: 1 },
    ]);
  });

  test('initial event includes extractor-dropped tracks in the dropped count', async () => {
    const extractor = fakeExtractor({
      name: 'Has Drops',
      tracks: [{ isrc: 'A', artist: 'A', title: 'a' }],
      droppedTracks: [
        {
          artist: 'X',
          title: 'x',
          reason: "Track wasn't tagged with a unique ID",
        },
      ],
    });
    const resolver = fakeResolver(new Map([['A', 1990]]));
    const generator = createDeckGenerator({
      extractor,
      resolver,
      newId: () => 'd',
      clock: () => 0,
    });
    const progress: GenerateProgress[] = [];

    await generator.generate({
      url: 'https://www.deezer.com/playlist/x',
      onProgress: (p) => progress.push(p),
    });

    expect(progress[0]).toEqual({ done: 0, total: 1, dropped: 1 });
    expect(progress.at(-1)).toEqual({ done: 1, total: 1, dropped: 1 });
  });
});

describe('DeckGenerator 10-track integration fixture', () => {
  test('mixed playlist of 7 resolvable + 2 null-year + 1 no-ISRC produces 7-card deck and 3 drops', async () => {
    const extractor = fakeExtractor({
      name: 'Mixed Bag',
      tracks: [
        { isrc: 'T1', artist: 'A1', title: 't1' },
        { isrc: 'T2', artist: 'A2', title: 't2' },
        { isrc: 'T3', artist: 'A3', title: 't3' },
        { isrc: 'T4', artist: 'A4', title: 't4' },
        { isrc: 'T5', artist: 'A5', title: 't5' },
        { isrc: 'T6', artist: 'A6', title: 't6' },
        { isrc: 'T7', artist: 'A7', title: 't7' },
        { isrc: 'T8', artist: 'A8', title: 't8' },
        { isrc: 'T9', artist: 'A9', title: 't9' },
      ],
      droppedTracks: [
        {
          artist: 'NoIsrcArtist',
          title: 'untagged',
          reason: "Track wasn't tagged with a unique ID",
        },
      ],
    });
    const resolver = fakeResolver(
      new Map<string, number | null>([
        ['T1', 1970],
        ['T2', 1971],
        ['T3', null],
        ['T4', 1972],
        ['T5', 1973],
        ['T6', null],
        ['T7', 1974],
        ['T8', 1975],
        ['T9', 1976],
      ]),
    );
    const generator = createDeckGenerator({
      extractor,
      resolver,
      newId: () => 'mixed-deck',
      clock: () => 1_700_000_000_000,
    });
    const progress: GenerateProgress[] = [];

    const result = await generator.generate({
      url: 'https://www.deezer.com/playlist/mix',
      onProgress: (p) => progress.push(p),
    });

    expect(result.deck.cards.map((c) => c.isrc)).toEqual([
      'T1',
      'T2',
      'T4',
      'T5',
      'T7',
      'T8',
      'T9',
    ]);
    expect(result.deck.cards.every((c) => typeof c.year === 'number')).toBe(true);
    expect(result.droppedTracks).toEqual([
      {
        artist: 'NoIsrcArtist',
        title: 'untagged',
        reason: "Track wasn't tagged with a unique ID",
      },
      {
        artist: 'A3',
        title: 't3',
        reason: "Couldn't find a release year",
      },
      {
        artist: 'A6',
        title: 't6',
        reason: "Couldn't find a release year",
      },
    ]);

    // Initial event + one per resolve = 1 + 9 = 10 events.
    expect(progress.length).toBe(10);
    expect(progress[0]).toEqual({ done: 0, total: 9, dropped: 1 });
    expect(progress.at(-1)).toEqual({ done: 9, total: 9, dropped: 3 });
  });
});

describe('DeckGenerator abort signal', () => {
  test('throws an AbortError if the signal is already aborted on entry to the loop', async () => {
    const extractor = fakeExtractor({
      name: 'X',
      tracks: [{ isrc: 'A', artist: 'A', title: 'a' }],
      droppedTracks: [],
    });
    const resolver = fakeResolver(new Map([['A', 1990]]));
    const generator = createDeckGenerator({
      extractor,
      resolver,
      newId: () => 'd',
      clock: () => 0,
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      generator.generate({
        url: 'https://www.deezer.com/playlist/x',
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

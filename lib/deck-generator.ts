import type { Deck } from './types';
import type { YearResolver } from './year-resolver';

export type DropReason =
  | "Track wasn't tagged with a unique ID"
  | "Couldn't find a release year";

export type DroppedTrack = {
  artist: string;
  title: string;
  reason: DropReason;
};

export type GenerateProgress = {
  done: number;
  total: number;
  dropped: number;
};

export interface DeckGenerator {
  generate(opts: {
    url: string;
    onProgress?: (p: GenerateProgress) => void;
    signal?: AbortSignal;
  }): Promise<{ deck: Deck; droppedTracks: DroppedTrack[] }>;
}

type Extractor = {
  extractFromDeezerUrl: (url: string) => Promise<{
    name: string;
    tracks: { isrc: string; artist: string; title: string }[];
    droppedTracks: { artist: string; title: string; reason: DropReason }[];
  }>;
};

export function createDeckGenerator(opts: {
  extractor: Extractor;
  resolver: YearResolver;
  newId?: () => string;
  clock?: () => number;
}): DeckGenerator {
  const { extractor, resolver } = opts;
  const newId = opts.newId ?? (() => Math.random().toString(36).slice(2));
  const clock = opts.clock ?? (() => Date.now());

  return {
    async generate({ url, onProgress, signal }) {
      const checkAborted = (): void => {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
      };

      const extracted = await extractor.extractFromDeezerUrl(url);
      const total = extracted.tracks.length;
      const droppedTracks: DroppedTrack[] = extracted.droppedTracks.map((d) => ({
        artist: d.artist,
        title: d.title,
        reason: d.reason,
      }));
      onProgress?.({ done: 0, total, dropped: droppedTracks.length });

      const deck: Deck = {
        id: newId(),
        name: extracted.name,
        sourceUrl: url,
        createdAt: clock(),
        cards: [],
      };

      let done = 0;
      for (const track of extracted.tracks) {
        checkAborted();
        const { year } = await resolver.resolve(track.isrc);
        if (year === null) {
          droppedTracks.push({
            artist: track.artist,
            title: track.title,
            reason: "Couldn't find a release year",
          });
        } else {
          deck.cards.push({
            isrc: track.isrc,
            artist: track.artist,
            title: track.title,
            year,
          });
        }
        done += 1;
        onProgress?.({ done, total, dropped: droppedTracks.length });
      }

      return { deck, droppedTracks };
    },
  };
}

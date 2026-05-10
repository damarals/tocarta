import type { DroppedTrack } from '../lib/deck-generator';
import {
  setPostGenerationDrops,
  takePostGenerationDrops,
} from '../lib/post-generation-store';

const sampleDrops = (): DroppedTrack[] => [
  { artist: 'Queen', title: 'Lost Track', reason: "Couldn't find a release year" },
];

describe('post-generation-store', () => {
  test('takePostGenerationDrops returns drops set for the deck id', () => {
    const drops = sampleDrops();
    setPostGenerationDrops('deck-take-1', drops);

    expect(takePostGenerationDrops('deck-take-1')).toEqual(drops);
  });

  test('takePostGenerationDrops consumes the entry so a second call returns []', () => {
    setPostGenerationDrops('deck-take-2', sampleDrops());

    const first = takePostGenerationDrops('deck-take-2');
    const second = takePostGenerationDrops('deck-take-2');

    expect(first).toHaveLength(1);
    expect(second).toEqual([]);
  });

  test('takePostGenerationDrops returns [] for an unknown deck id', () => {
    expect(takePostGenerationDrops('deck-unknown')).toEqual([]);
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Deck } from './types';

export interface DeckLibrary {
  save(deck: Deck): Promise<void>;
  load(id: string): Promise<Deck | null>;
  list(): Promise<Deck[]>;
  delete(id: string): Promise<void>;
  updateName(id: string, name: string): Promise<void>;
  updateYearOverride(deckId: string, isrc: string, year: number): Promise<void>;
}

const KEY_PREFIX = 'decks/';

const keyFor = (id: string): string => `${KEY_PREFIX}${id}`;

/**
 * Per-key write queue. Operations that mutate `decks/{id}` are chained so that
 * an in-flight read-modify-write completes before the next one starts. Reads
 * remain unsynchronized — a stale read is acceptable; a torn write is not.
 */
const writeQueues = new Map<string, Promise<unknown>>();

function withWriteLock<T>(id: string, op: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(id) ?? Promise.resolve();
  // Run `op` after `previous` settles. Use the same handler for fulfilment and
  // rejection so a failed operation does not poison the chain — subsequent
  // queued operations still run.
  const next = previous.then(op, op);
  // The map's tail must not bubble unhandled rejections. Swallow them here;
  // the original `next` is returned to the caller, who handles its own errors.
  const tail = next.catch(() => undefined);
  writeQueues.set(id, tail);
  void tail.then(() => {
    if (writeQueues.get(id) === tail) writeQueues.delete(id);
  });
  return next;
}

async function readDeck(id: string): Promise<Deck | null> {
  const raw = await AsyncStorage.getItem(keyFor(id));
  if (raw === null) return null;
  return JSON.parse(raw) as Deck;
}

export const deckLibrary: DeckLibrary = {
  save(deck: Deck): Promise<void> {
    return withWriteLock(deck.id, async () => {
      await AsyncStorage.setItem(keyFor(deck.id), JSON.stringify(deck));
    });
  },
  load(id: string): Promise<Deck | null> {
    return readDeck(id);
  },
  async list(): Promise<Deck[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    const deckKeys = allKeys.filter((k) => k.startsWith(KEY_PREFIX));
    if (deckKeys.length === 0) return [];

    const entries = await AsyncStorage.multiGet(deckKeys);
    const decks: Deck[] = [];
    for (const [, raw] of entries) {
      if (raw === null) continue;
      decks.push(JSON.parse(raw) as Deck);
    }

    decks.sort((a, b) => {
      if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return decks;
  },
  delete(id: string): Promise<void> {
    return withWriteLock(id, async () => {
      await AsyncStorage.removeItem(keyFor(id));
    });
  },
  updateName(id: string, name: string): Promise<void> {
    return withWriteLock(id, async () => {
      const deck = await readDeck(id);
      if (deck === null) {
        throw new Error(`DeckLibrary.updateName: deck not found: ${id}`);
      }
      deck.name = name;
      await AsyncStorage.setItem(keyFor(id), JSON.stringify(deck));
    });
  },
  updateYearOverride(deckId: string, isrc: string, year: number): Promise<void> {
    return withWriteLock(deckId, async () => {
      const deck = await readDeck(deckId);
      if (deck === null) {
        throw new Error(`DeckLibrary.updateYearOverride: deck not found: ${deckId}`);
      }
      const index = deck.cards.findIndex((c) => c.isrc === isrc);
      if (index === -1) {
        throw new Error(
          `DeckLibrary.updateYearOverride: ISRC ${isrc} not in deck ${deckId}`,
        );
      }
      deck.cards[index] = { ...deck.cards[index], yearOverride: year };
      await AsyncStorage.setItem(keyFor(deckId), JSON.stringify(deck));
    });
  },
};

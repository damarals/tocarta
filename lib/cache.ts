import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

type CacheEnvelope<T> = { v: T; exp: number };

type Clock = () => number;

const defaultClock: Clock = () => Date.now();

export function createCache(opts: { clock?: Clock; namespace?: string } = {}): Cache {
  const clock = opts.clock ?? defaultClock;
  const namespace = opts.namespace ?? 'default';
  const prefix = namespace === '' ? 'cache/' : `cache/${namespace}/`;
  const storageKey = (key: string): string => `${prefix}${key}`;

  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = await AsyncStorage.getItem(storageKey(key));
      if (raw === null) return null;
      const envelope = JSON.parse(raw) as CacheEnvelope<T>;
      if (envelope.exp <= clock()) {
        await AsyncStorage.removeItem(storageKey(key));
        return null;
      }
      return envelope.v;
    },
    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
      const envelope: CacheEnvelope<T> = { v: value, exp: clock() + ttlMs };
      await AsyncStorage.setItem(storageKey(key), JSON.stringify(envelope));
    },
    async delete(key: string): Promise<void> {
      await AsyncStorage.removeItem(storageKey(key));
    },
  };
}

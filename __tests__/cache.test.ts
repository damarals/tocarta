import AsyncStorage from '@react-native-async-storage/async-storage';

import { createCache } from '../lib/cache';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Cache.get / Cache.set', () => {
  test('set then get returns the stored value', async () => {
    const cache = createCache({ clock: () => 0 });

    await cache.set('greeting', 'hello', 1_000);

    expect(await cache.get('greeting')).toBe('hello');
  });

  test('get returns null when no value has been stored for the key', async () => {
    const cache = createCache({ clock: () => 0 });

    expect(await cache.get('never-set')).toBeNull();
  });

  test('get returns null after the TTL has elapsed', async () => {
    let now = 1_000;
    const cache = createCache({ clock: () => now });

    await cache.set('greeting', 'hello', 5_000);
    now = 6_001;

    expect(await cache.get('greeting')).toBeNull();
  });

  test('get still returns the value at the moment just before TTL elapses', async () => {
    let now = 0;
    const cache = createCache({ clock: () => now });

    await cache.set('greeting', 'hello', 5_000);
    now = 4_999;

    expect(await cache.get('greeting')).toBe('hello');
  });

  test('a second set overwrites the prior value and resets the TTL', async () => {
    let now = 0;
    const cache = createCache({ clock: () => now });

    await cache.set('greeting', 'hello', 1_000);
    now = 500;
    await cache.set('greeting', 'goodbye', 1_000);
    now = 1_400;

    expect(await cache.get('greeting')).toBe('goodbye');
  });
});

describe('Cache.delete', () => {
  test('removes the value so subsequent get returns null', async () => {
    const cache = createCache({ clock: () => 0 });
    await cache.set('greeting', 'hello', 1_000);

    await cache.delete('greeting');

    expect(await cache.get('greeting')).toBeNull();
  });

  test('is a no-op for an unknown key', async () => {
    const cache = createCache({ clock: () => 0 });

    await expect(cache.delete('never-set')).resolves.toBeUndefined();
  });
});

describe('Cache namespacing', () => {
  test('two caches with different namespaces do not see each other values', async () => {
    const a = createCache({ clock: () => 0, namespace: 'alpha' });
    const b = createCache({ clock: () => 0, namespace: 'beta' });

    await a.set('shared', 'from-alpha', 10_000);
    await b.set('shared', 'from-beta', 10_000);

    expect(await a.get('shared')).toBe('from-alpha');
    expect(await b.get('shared')).toBe('from-beta');
  });

  test('an empty namespace produces the literal storage key cache/{key}', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });

    await cache.set('year/USRC17607839', 1975, 10_000);

    const raw = await AsyncStorage.getItem('cache/year/USRC17607839');
    expect(raw).not.toBeNull();
  });
});

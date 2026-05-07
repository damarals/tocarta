import AsyncStorage from '@react-native-async-storage/async-storage';

import { createCache, type Cache } from '../lib/cache';
import type { RateLimiter } from '../lib/rate-limiter';
import { createYearResolver } from '../lib/year-resolver';

type FetchMock = jest.Mock<Promise<Response>, Parameters<typeof fetch>>;

function recordingResponse(firstReleaseDate: string | null | undefined): Response {
  const body =
    firstReleaseDate === undefined
      ? { recordings: [{}] }
      : { recordings: [{ 'first-release-date': firstReleaseDate }] };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function emptyRecordings(): Response {
  return new Response(JSON.stringify({ recordings: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function statusResponse(status: number): Response {
  return new Response('error', { status });
}

function makeLimiter(): RateLimiter & { acquireCount: number } {
  let count = 0;
  return {
    get acquireCount() {
      return count;
    },
    async acquire() {
      count += 1;
    },
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('YearResolver caching', () => {
  test('cache hit short-circuits: no fetch, no rate-limit acquire', async () => {
    const cache: Cache = createCache({ clock: () => 0, namespace: '' });
    await cache.set('year/USRC17607839', { year: 1975 }, 30 * 24 * 3600 * 1_000);
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest.fn();
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await resolver.resolve('USRC17607839');

    expect(result).toEqual({ year: 1975 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(limiter.acquireCount).toBe(0);
  });
});

describe('YearResolver lookup', () => {
  test('parses the year from recordings[0].first-release-date', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(recordingResponse('1971-11-08'));
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await resolver.resolve('GBAYE0601498');

    expect(result).toEqual({ year: 1971 });
    expect(limiter.acquireCount).toBe(1);
  });

  test('hits the MusicBrainz ISRC endpoint with the courteous User-Agent', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(recordingResponse('1971-11-08'));
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    await resolver.resolve('GBAYE0601498');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://musicbrainz.org/ws/2/isrc/GBAYE0601498?inc=recordings&fmt=json',
    );
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('Tocarta/0.1 (silva.daniel86@gmail.com)');
    expect(headers.Accept).toBe('application/json');
  });

  test('returns null when first-release-date is empty, and caches the null', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(recordingResponse(''));
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const first = await resolver.resolve('GBAYE0601498');
    const second = await resolver.resolve('GBAYE0601498');

    expect(first).toEqual({ year: null });
    expect(second).toEqual({ year: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('returns null when first-release-date field is missing entirely', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(recordingResponse(undefined));
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await resolver.resolve('GBAYE0601498');

    expect(result).toEqual({ year: null });
  });

  test('returns null and caches when recordings array is empty', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest.fn().mockResolvedValueOnce(emptyRecordings());
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const first = await resolver.resolve('UNKNOWN');
    const second = await resolver.resolve('UNKNOWN');

    expect(first).toEqual({ year: null });
    expect(second).toEqual({ year: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('parses the year when first-release-date is just YYYY', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(recordingResponse('1985'));
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(await resolver.resolve('X')).toEqual({ year: 1985 });
  });
});

describe('YearResolver transient errors', () => {
  test('returns null on 404 and does not cache (next call retries)', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(statusResponse(404))
      .mockResolvedValueOnce(recordingResponse('2001'));
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const first = await resolver.resolve('TRANSIENT');
    const second = await resolver.resolve('TRANSIENT');

    expect(first).toEqual({ year: null });
    expect(second).toEqual({ year: 2001 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('returns null on 500 and does not cache', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(statusResponse(500))
      .mockResolvedValueOnce(recordingResponse('1999'));
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(await resolver.resolve('FLAKY')).toEqual({ year: null });
    expect(await resolver.resolve('FLAKY')).toEqual({ year: 1999 });
  });

  test('returns null when fetch throws (network error) and does not cache', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    const fetchMock: FetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(recordingResponse('2010'));
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(await resolver.resolve('OFFLINE')).toEqual({ year: null });
    expect(await resolver.resolve('OFFLINE')).toEqual({ year: 2010 });
  });
});

describe('YearResolver concurrency', () => {
  test('two simultaneous resolves both acquire from the rate limiter', async () => {
    const cache = createCache({ clock: () => 0, namespace: '' });
    const limiter = makeLimiter();
    // Each call must return a fresh Response — bodies are single-use.
    const fetchMock: FetchMock = jest.fn(
      (async () => recordingResponse('1980')) as unknown as typeof fetch,
    );
    const resolver = createYearResolver({
      cache,
      rateLimiter: limiter,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const [a, b] = await Promise.all([resolver.resolve('A'), resolver.resolve('B')]);

    expect(a).toEqual({ year: 1980 });
    expect(b).toEqual({ year: 1980 });
    expect(limiter.acquireCount).toBe(2);
  });
});

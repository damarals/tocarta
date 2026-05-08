import type { Cache } from './cache';
import type { RateLimiter } from './rate-limiter';

export interface YearResolver {
  resolve(isrc: string): Promise<{ year: number | null }>;
}

const USER_AGENT = 'Tocarta/0.1 (silva.daniel86@gmail.com)';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;

/**
 * `Cache.get` returns null both for a missing key and for a stored `null`,
 * so a confirmed-null result is wrapped here to disambiguate.
 */
type CachedYear = { year: number | null };

type MusicBrainzRecording = { 'first-release-date'?: unknown };

type MusicBrainzIsrcResponse = {
  recordings?: MusicBrainzRecording[];
};

function parseFirstReleaseYear(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})/.exec(value);
  if (match === null) return null;
  return parseInt(match[1], 10);
}

export function createYearResolver(opts: {
  cache: Cache;
  rateLimiter: RateLimiter;
  fetch?: typeof fetch;
}): YearResolver {
  const { cache, rateLimiter } = opts;
  const fetchImpl = opts.fetch ?? fetch;

  const lookup = async (isrc: string): Promise<{ year: number | null; cacheable: boolean }> => {
    await rateLimiter.acquire();
    let response: Response;
    try {
      response = await fetchImpl(
        `https://musicbrainz.org/ws/2/isrc/${isrc}?fmt=json`,
        {
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
          },
        },
      );
    } catch {
      return { year: null, cacheable: false };
    }
    if (!response.ok) return { year: null, cacheable: false };
    const body = (await response.json()) as MusicBrainzIsrcResponse;
    const recording = body.recordings?.[0];
    if (recording === undefined) return { year: null, cacheable: true };
    return { year: parseFirstReleaseYear(recording['first-release-date']), cacheable: true };
  };

  return {
    async resolve(isrc: string): Promise<{ year: number | null }> {
      const cached = await cache.get<CachedYear>(`year/${isrc}`);
      if (cached !== null) return { year: cached.year };

      const { year, cacheable } = await lookup(isrc);
      if (cacheable) {
        await cache.set<CachedYear>(`year/${isrc}`, { year }, THIRTY_DAYS_MS);
      }
      return { year };
    },
  };
}

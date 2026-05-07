/**
 * `AudioProvider` resolves an ISRC to a fresh, streamable preview URL. The
 * V1 implementation hits Deezer's ISRC lookup endpoint per ADR-0010; future
 * providers slot in by implementing the same interface (ADR-0006/0013 keep
 * the QR payload provider-agnostic).
 *
 * The contract intentionally returns ONLY a URL — never artist, title, year,
 * album, or cover art. Anti-spoiler discipline (ADR-0009) requires the
 * AntiSpoilerAudioPlayer to receive nothing it could leak to MediaSession.
 */
export interface AudioProvider {
  /**
   * Resolve `isrc` to a fresh signed preview URL. Throws an
   * {@link AudioProviderError} on any non-success outcome.
   */
  getPreviewUrl(isrc: string): Promise<string>;
}

/**
 * Discriminated error type thrown by {@link AudioProvider.getPreviewUrl}.
 * Callers branch on `kind` to render the appropriate UI message.
 */
export type AudioProviderError =
  /** The ISRC is not present in Deezer's catalogue (regional drop, retired track). */
  | { kind: 'not_found' }
  /** The track exists, but no preview is available (rare; some catalog tracks lack one). */
  | { kind: 'no_preview' }
  /** The network request itself failed (offline, DNS, TLS, timeout). */
  | { kind: 'network' }
  /** Anything else: non-404 HTTP error, malformed JSON, etc. */
  | { kind: 'unknown'; message: string };

type DeezerTrackResponse = {
  preview?: unknown;
  error?: { code?: number; type?: string; message?: string };
};

/**
 * Build a Deezer-backed {@link AudioProvider}. `fetch` is injected so tests
 * can mock the network without monkey-patching globals.
 */
export function createDeezerAudioProvider(opts: { fetch?: typeof fetch } = {}): AudioProvider {
  const fetchImpl = opts.fetch ?? fetch;

  return {
    async getPreviewUrl(isrc: string): Promise<string> {
      let response: Response;
      try {
        response = await fetchImpl(`https://api.deezer.com/track/isrc:${isrc}`);
      } catch {
        throw { kind: 'network' } satisfies AudioProviderError;
      }

      if (response.status === 404) {
        throw { kind: 'not_found' } satisfies AudioProviderError;
      }
      if (!response.ok) {
        throw {
          kind: 'unknown',
          message: `Deezer responded with HTTP ${response.status}`,
        } satisfies AudioProviderError;
      }

      let body: DeezerTrackResponse;
      try {
        body = (await response.json()) as DeezerTrackResponse;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'malformed JSON';
        throw { kind: 'unknown', message } satisfies AudioProviderError;
      }

      // Deezer returns 200 with `{ error: { ... } }` for unknown ISRCs.
      if (body.error !== undefined) {
        throw { kind: 'not_found' } satisfies AudioProviderError;
      }

      const preview = body.preview;
      if (typeof preview !== 'string' || preview === '') {
        throw { kind: 'no_preview' } satisfies AudioProviderError;
      }
      return preview;
    },
  };
}

/**
 * Module-level singleton used by the playback screen. Tests construct their
 * own instance with a mocked `fetch`.
 */
export const deezerAudioProvider: AudioProvider = createDeezerAudioProvider();

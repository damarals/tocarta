import { createDeezerAudioProvider, type AudioProviderError } from '../lib/audio-provider';

type FetchMock = jest.Mock<Promise<Response>, Parameters<typeof fetch>>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function trackResponse(preview: string): Response {
  return jsonResponse({ id: 12345, preview });
}

function notFoundResponse(): Response {
  // Deezer's documented error envelope for unknown tracks.
  return jsonResponse({ error: { type: 'DataException', message: 'no data', code: 800 } });
}

describe('deezerAudioProvider.getPreviewUrl', () => {
  test('hits the Deezer ISRC lookup endpoint with the bare ISRC', async () => {
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(trackResponse('https://cdn-preview-x.dzcdn.net/abc.mp3'));
    const provider = createDeezerAudioProvider({ fetch: fetchMock as unknown as typeof fetch });

    await provider.getPreviewUrl('GBAYE0601498');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deezer.com/track/isrc:GBAYE0601498');
  });

  test('returns the preview URL on a successful lookup', async () => {
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(trackResponse('https://cdn-preview-x.dzcdn.net/abc.mp3'));
    const provider = createDeezerAudioProvider({ fetch: fetchMock as unknown as typeof fetch });

    const url = await provider.getPreviewUrl('GBAYE0601498');

    expect(url).toBe('https://cdn-preview-x.dzcdn.net/abc.mp3');
  });

  test('throws { kind: "not_found" } when Deezer returns its 404-style error envelope', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValueOnce(notFoundResponse());
    const provider = createDeezerAudioProvider({ fetch: fetchMock as unknown as typeof fetch });

    await expect(provider.getPreviewUrl('USXXX0000001')).rejects.toMatchObject<AudioProviderError>({
      kind: 'not_found',
    });
  });

  test('throws { kind: "not_found" } on HTTP 404', async () => {
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response('not found', { status: 404 }));
    const provider = createDeezerAudioProvider({ fetch: fetchMock as unknown as typeof fetch });

    await expect(provider.getPreviewUrl('USXXX0000001')).rejects.toMatchObject<AudioProviderError>({
      kind: 'not_found',
    });
  });

  test('throws { kind: "no_preview" } when the preview field is empty', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValueOnce(trackResponse(''));
    const provider = createDeezerAudioProvider({ fetch: fetchMock as unknown as typeof fetch });

    await expect(provider.getPreviewUrl('GBAYE0601498')).rejects.toMatchObject<AudioProviderError>(
      { kind: 'no_preview' },
    );
  });

  test('throws { kind: "no_preview" } when the preview field is missing', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ id: 1 }));
    const provider = createDeezerAudioProvider({ fetch: fetchMock as unknown as typeof fetch });

    await expect(provider.getPreviewUrl('GBAYE0601498')).rejects.toMatchObject<AudioProviderError>(
      { kind: 'no_preview' },
    );
  });

  test('throws { kind: "network" } when fetch itself rejects', async () => {
    const fetchMock: FetchMock = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed'));
    const provider = createDeezerAudioProvider({ fetch: fetchMock as unknown as typeof fetch });

    await expect(provider.getPreviewUrl('GBAYE0601498')).rejects.toMatchObject<AudioProviderError>(
      { kind: 'network' },
    );
  });

  test('throws { kind: "unknown", message } on a non-OK, non-404 HTTP status', async () => {
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response('boom', { status: 503 }));
    const provider = createDeezerAudioProvider({ fetch: fetchMock as unknown as typeof fetch });

    await expect(provider.getPreviewUrl('GBAYE0601498')).rejects.toMatchObject<AudioProviderError>(
      { kind: 'unknown', message: expect.stringContaining('503') as unknown as string },
    );
  });
});

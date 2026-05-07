import { parseDeezerPlaylistUrl } from '../lib/deezer-url';

describe('parseDeezerPlaylistUrl', () => {
  test('parses canonical https://www.deezer.com/playlist/{id}', () => {
    expect(parseDeezerPlaylistUrl('https://www.deezer.com/playlist/908622995')).toEqual({
      playlistId: '908622995',
    });
  });

  test('parses host without www subdomain', () => {
    expect(parseDeezerPlaylistUrl('https://deezer.com/playlist/908622995')).toEqual({
      playlistId: '908622995',
    });
  });

  test('returns null for a non-Deezer host', () => {
    expect(parseDeezerPlaylistUrl('https://example.com/playlist/123')).toBeNull();
  });

  test('accepts http scheme', () => {
    expect(parseDeezerPlaylistUrl('http://www.deezer.com/playlist/908622995')).toEqual({
      playlistId: '908622995',
    });
  });

  test('accepts an optional two-letter locale segment before /playlist/', () => {
    expect(parseDeezerPlaylistUrl('https://www.deezer.com/en/playlist/908622995')).toEqual({
      playlistId: '908622995',
    });
  });

  test('ignores tracking query parameters', () => {
    expect(
      parseDeezerPlaylistUrl(
        'https://www.deezer.com/fr/playlist/908622995?utm_source=foo',
      ),
    ).toEqual({ playlistId: '908622995' });
  });

  test('returns null for a link.deezer.com share link (V1 does not resolve these)', () => {
    expect(parseDeezerPlaylistUrl('https://link.deezer.com/s/abc123')).toBeNull();
  });

  test('returns null for a string that is not a URL', () => {
    expect(parseDeezerPlaylistUrl('not a url')).toBeNull();
  });

  test('returns null for a non-numeric playlist id', () => {
    expect(parseDeezerPlaylistUrl('https://www.deezer.com/playlist/abc')).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(parseDeezerPlaylistUrl('')).toBeNull();
  });
});

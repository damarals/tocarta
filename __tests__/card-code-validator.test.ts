import { parseCardCode } from '../lib/card-code-validator';

describe('parseCardCode — extended format ISRC:PROVIDER:PLAYLIST_ID', () => {
  test('parses a Deezer extended payload with numeric playlist id', () => {
    expect(parseCardCode('USRC17607839:DZ:1234567890')).toEqual({
      isrc: 'USRC17607839',
      provider: 'DZ',
      playlistId: '1234567890',
    });
  });
});

describe('parseCardCode — legacy bare ISRC', () => {
  test('parses a bare ISRC with provider and playlistId omitted', () => {
    expect(parseCardCode('USRC17607839')).toEqual({ isrc: 'USRC17607839' });
  });
});

describe('parseCardCode — invalid provider segment', () => {
  test('rejects a single-letter provider', () => {
    expect(parseCardCode('USRC17607839:D:123')).toBeNull();
  });

  test('rejects a three-letter provider', () => {
    expect(parseCardCode('USRC17607839:DEZ:123')).toBeNull();
  });
});

describe('parseCardCode — playlist id character class', () => {
  test('accepts uppercase alphanumeric playlist ids', () => {
    expect(parseCardCode('USRC17607839:DZ:ABC123')).toEqual({
      isrc: 'USRC17607839',
      provider: 'DZ',
      playlistId: 'ABC123',
    });
  });

  test('rejects an empty playlist id', () => {
    expect(parseCardCode('USRC17607839:DZ:')).toBeNull();
  });
});

describe('parseCardCode — ISRC shape', () => {
  test('rejects a lowercase ISRC', () => {
    expect(parseCardCode('usrc17607839')).toBeNull();
  });

  test('rejects an 11-character ISRC (too short)', () => {
    expect(parseCardCode('USRC1760783')).toBeNull();
  });

  test('rejects a 13-character ISRC (too long)', () => {
    expect(parseCardCode('USRC176078399')).toBeNull();
  });

  test('rejects a non-digit in the trailing 7 numeric positions', () => {
    expect(parseCardCode('USRC1760783X')).toBeNull();
  });
});

describe('parseCardCode — junk QR payloads', () => {
  test('rejects an arbitrary URL', () => {
    expect(parseCardCode('https://example.com/song')).toBeNull();
  });

  test('rejects free-form text', () => {
    expect(parseCardCode('random text')).toBeNull();
  });

  test('rejects an empty string', () => {
    expect(parseCardCode('')).toBeNull();
  });

  test('rejects trailing whitespace (strict — no auto-trim)', () => {
    expect(parseCardCode('USRC17607839 ')).toBeNull();
  });

  test('rejects an extended payload missing the playlist id', () => {
    expect(parseCardCode('USRC17607839:DZ')).toBeNull();
  });
});

import { slug } from '../lib/slug';

describe('slug — filename-safe deck name', () => {
  test('lowercases and hyphenates spaces', () => {
    expect(slug('Hits dos Anos 80')).toBe('hits-dos-anos-80');
  });

  test('strips diacritics', () => {
    expect(slug('Café Tubaína')).toBe('cafe-tubaina');
  });

  test('trims leading/trailing whitespace and collapses internal runs', () => {
    expect(slug('  My Deck   ')).toBe('my-deck');
  });

  test('drops special characters and collapses the resulting gaps', () => {
    expect(slug('!!! special @#$ chars')).toBe('special-chars');
  });

  test('caps length at 64 characters', () => {
    const long = 'a'.repeat(100);
    expect(slug(long)).toHaveLength(64);
    expect(slug(long)).toBe('a'.repeat(64));
  });

  test('falls back to "deck" for empty input so the filename is never empty', () => {
    expect(slug('')).toBe('deck');
  });

  test('falls back to "deck" when the input only has unsupported characters', () => {
    expect(slug('!!!@@@###')).toBe('deck');
  });

  test('treats slashes as separators (path-like input)', () => {
    expect(slug('Olá / Mundo')).toBe('ola-mundo');
  });

  test('strips trailing/leading hyphens after sanitisation', () => {
    expect(slug('-leading and trailing-')).toBe('leading-and-trailing');
  });

  test('does not exceed 64 characters when the cap lands inside a word', () => {
    const name = `${'a'.repeat(63)} bbb`;
    const result = slug(name);
    expect(result.length).toBeLessThanOrEqual(64);
    // The cap must not produce a trailing hyphen.
    expect(result.endsWith('-')).toBe(false);
  });
});

import { eraColor } from '../lib/era-color';
import { tokens } from '../theme/tokens';

const WHITE = '#ffffff';

describe('eraColor — decade midpoints', () => {
  test('1955 (pre-1960 fold) → navy900 background, white text', () => {
    expect(eraColor(1955)).toEqual({ background: tokens.colors.navy900, text: WHITE });
  });

  test('1965 → orange background, navy900 text', () => {
    expect(eraColor(1965)).toEqual({ background: tokens.colors.orange, text: tokens.colors.navy900 });
  });

  test('1975 → gold background, navy900 text', () => {
    expect(eraColor(1975)).toEqual({ background: tokens.colors.gold, text: tokens.colors.navy900 });
  });

  test('1985 → pink background, white text', () => {
    expect(eraColor(1985)).toEqual({ background: tokens.colors.pink, text: WHITE });
  });

  test('1995 → lime background, navy900 text', () => {
    expect(eraColor(1995)).toEqual({ background: tokens.colors.lime, text: tokens.colors.navy900 });
  });

  test('2005 → cyan background, navy900 text', () => {
    expect(eraColor(2005)).toEqual({ background: tokens.colors.cyan, text: tokens.colors.navy900 });
  });

  test('2015 → violet background, white text', () => {
    expect(eraColor(2015)).toEqual({ background: tokens.colors.violet, text: WHITE });
  });

  test('2025 → coral background, navy900 text', () => {
    expect(eraColor(2025)).toEqual({ background: tokens.colors.coral, text: tokens.colors.navy900 });
  });
});

describe('eraColor — bucket boundaries', () => {
  test('1959 stays in pre-1960 bucket (navy900)', () => {
    expect(eraColor(1959).background).toBe(tokens.colors.navy900);
  });

  test('1960 lands in the 1960s bucket (orange)', () => {
    expect(eraColor(1960).background).toBe(tokens.colors.orange);
  });

  test('1969 stays in the 1960s bucket (orange)', () => {
    expect(eraColor(1969).background).toBe(tokens.colors.orange);
  });

  test('1970 lands in the 1970s bucket (gold)', () => {
    expect(eraColor(1970).background).toBe(tokens.colors.gold);
  });

  test('1979 stays in the 1970s bucket (gold)', () => {
    expect(eraColor(1979).background).toBe(tokens.colors.gold);
  });

  test('1980 lands in the 1980s bucket (pink)', () => {
    expect(eraColor(1980).background).toBe(tokens.colors.pink);
  });

  test('1989 stays in the 1980s bucket (pink)', () => {
    expect(eraColor(1989).background).toBe(tokens.colors.pink);
  });

  test('1990 lands in the 1990s bucket (lime)', () => {
    expect(eraColor(1990).background).toBe(tokens.colors.lime);
  });

  test('1999 stays in the 1990s bucket (lime)', () => {
    expect(eraColor(1999).background).toBe(tokens.colors.lime);
  });

  test('2000 lands in the 2000s bucket (cyan)', () => {
    expect(eraColor(2000).background).toBe(tokens.colors.cyan);
  });

  test('2009 stays in the 2000s bucket (cyan)', () => {
    expect(eraColor(2009).background).toBe(tokens.colors.cyan);
  });

  test('2010 lands in the 2010s bucket (violet)', () => {
    expect(eraColor(2010).background).toBe(tokens.colors.violet);
  });

  test('2019 stays in the 2010s bucket (violet)', () => {
    expect(eraColor(2019).background).toBe(tokens.colors.violet);
  });

  test('2020 lands in the 2020s+ bucket (coral)', () => {
    expect(eraColor(2020).background).toBe(tokens.colors.coral);
  });
});

describe('eraColor — extremes and defensive inputs', () => {
  test('1949 (pre-1950 fold) maps to the 1950s bucket per ADR-0014', () => {
    // ADR-0014: "1950s bucket also catches anything earlier"
    expect(eraColor(1949)).toEqual({ background: tokens.colors.navy900, text: WHITE });
  });

  test('2030 (far future) keeps the 2020s+ coral bucket', () => {
    expect(eraColor(2030).background).toBe(tokens.colors.coral);
  });

  test('0 (defensive) folds into the pre-1960 bucket', () => {
    expect(eraColor(0)).toEqual({ background: tokens.colors.navy900, text: WHITE });
  });

  test('null defaults to the vintage 1950s treatment (navy900/white)', () => {
    // Card.year is `number | null`. When the year is unknown we fall back to
    // the 1950s palette: same look as the pre-1960 fold, no extra bucket.
    expect(eraColor(null)).toEqual({ background: tokens.colors.navy900, text: WHITE });
  });
});

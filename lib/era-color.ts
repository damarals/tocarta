import { tokens } from '@/theme/tokens';

export type EraColor = { background: string; text: string };

const WHITE = '#ffffff';

/**
 * Resolve the back-of-card palette for a year via the 8-bucket era model
 * defined in ADR-0014. Pure: same input → same output, no I/O, no clock.
 *
 * Buckets:
 * - year < 1960 (incl. pre-1950 fold) → navy900 / white
 * - 1960..1969 → orange / navy900
 * - 1970..1979 → gold / navy900
 * - 1980..1989 → pink / white
 * - 1990..1999 → lime / navy900
 * - 2000..2009 → cyan / navy900
 * - 2010..2019 → violet / white
 * - year ≥ 2020 → coral / navy900
 *
 * `null` (unknown year — `Card.year` is `number | null`) folds into the
 * 1950s vintage treatment so an unresolved card still has a usable back.
 */
export function eraColor(year: number | null): EraColor {
  const { navy900, orange, gold, pink, lime, cyan, violet, coral } = tokens.colors;
  if (year === null || year < 1960) return { background: navy900, text: WHITE };
  if (year <= 1969) return { background: orange, text: navy900 };
  if (year <= 1979) return { background: gold, text: navy900 };
  if (year <= 1989) return { background: pink, text: WHITE };
  if (year <= 1999) return { background: lime, text: navy900 };
  if (year <= 2009) return { background: cyan, text: navy900 };
  if (year <= 2019) return { background: violet, text: WHITE };
  return { background: coral, text: navy900 };
}

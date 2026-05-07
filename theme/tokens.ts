// Typed shim over the CommonJS source of truth in `theme/tokens.cjs`.
// Keeping the literal values in a `.cjs` file lets `tailwind.config.js`
// require them directly without a TS loader, while app code still gets the
// strict `Tokens` type via this module.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const raw = require('./tokens.cjs') as { tokens: Tokens };

export type TokenColors = {
  // Brand palette — navy ramp
  navy950: string;
  navy900: string;
  navy800: string;
  navy700: string;
  navy600: string;
  navy500: string;
  navy400: string;
  navy200: string;
  navy50: string;

  // Brand palette — accents
  lime: string;
  limeD: string;
  limeL: string;

  gold: string;
  goldD: string;
  goldL: string;

  pink: string;
  pinkD: string;
  pinkL: string;

  cyan: string;
  cyanD: string;

  red: string;
  redD: string;

  // Era palette per ADR-0014. The 1950s era reuses navy900.
  orange: string;
  violet: string;
  coral: string;
};

export type TokenFonts = {
  display: string;
  body: string;
  serif: string;
  mono: string;
};

export type Tokens = {
  colors: TokenColors;
  fonts: TokenFonts;
};

export const tokens: Tokens = raw.tokens;

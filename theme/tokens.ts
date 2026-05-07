// Typed shim over the CommonJS source of truth in `theme/tokens.cjs`.
// Keeping the literal values in a `.cjs` file lets `tailwind.config.js`
// require them directly without a TS loader, while app code still gets the
// strict `Tokens` type via this module.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const raw = require('./tokens.cjs') as { tokens: Tokens };

export type TokenColors = {
  // Brand palette
  navy900: string;
  navy700: string;
  navy500: string;
  navy200: string;
  lime: string;
  limeD: string;
  pink: string;
  pinkD: string;
  gold: string;
  red: string;
  cyan: string;

  // Era palette per ADR-0014. The 1950s era reuses navy900.
  orange: string;
  violet: string;
  coral: string;
};

export type TokenFonts = {
  display: string;
  body: string;
};

export type Tokens = {
  colors: TokenColors;
  fonts: TokenFonts;
};

export const tokens: Tokens = raw.tokens;

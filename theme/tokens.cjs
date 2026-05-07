// Plain CommonJS source of truth for Tocarta design tokens. The TypeScript
// shim at `theme/tokens.ts` re-exports these values with strict types so app
// code gets autocomplete; `tailwind.config.js` requires this file directly so
// it can stay CJS without pulling in a TS loader.
//
// Era colors follow ADR-0014 (`docs/adr/0014-card-design-package.md`); the
// 1950s era reuses `navy900`.

/** @type {{ colors: Record<string, string>, fonts: { display: string, body: string } }} */
const tokens = {
  colors: {
    // Brand palette
    navy900: '#0d1422',
    navy700: '#1a1f2e',
    navy500: '#2a3344',
    navy200: '#a8b3c7',
    lime: '#c8e84a',
    limeD: '#a8c83a',
    pink: '#ec5b8d',
    pinkD: '#cc3b6d',
    gold: '#d4a857',
    red: '#ef4444',
    cyan: '#00b8d4',

    // Era palette per ADR-0014.
    orange: '#e87a3d',
    violet: '#8b5cf6',
    coral: '#f97a6b',
  },
  fonts: {
    display: 'Fraunces',
    body: 'Nunito',
  },
};

module.exports = { tokens };

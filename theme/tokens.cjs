// Plain CommonJS source of truth for Tocarta design tokens. The TypeScript
// shim at `theme/tokens.ts` re-exports these values with strict types so app
// code gets autocomplete; `tailwind.config.js` requires this file directly so
// it can stay CJS without pulling in a TS loader.
//
// Era colors follow ADR-0014 (`docs/adr/0014-card-design-package.md`); the
// 1950s era reuses `navy900`. Brand palette and font roles mirror the hi-fi
// prototype at `docs/design/tocarta.css`.

/**
 * @type {{
 *   colors: Record<string, string>,
 *   fonts: { display: string, body: string, serif: string, mono: string }
 * }}
 */
const tokens = {
  colors: {
    // Brand palette — navy ramp
    navy950: '#0A1024',
    navy900: '#0F172A',
    navy800: '#16213F',
    navy700: '#1F2D54',
    navy600: '#2A3D6E',
    navy500: '#3D5286',
    navy400: '#6B7BA3',
    navy200: '#C4CCDF',
    navy50: '#EEF1F8',

    // Brand palette — accents
    lime: '#58CC02',
    limeD: '#4AA802',
    limeL: '#89E219',

    gold: '#FFC800',
    goldD: '#D9A800',
    goldL: '#FFE066',

    pink: '#FF6BB5',
    pinkD: '#D94E94',
    pinkL: '#FFA1D1',

    cyan: '#22D3EE',
    cyanD: '#0EA5C5',

    red: '#FF4B4B',
    redD: '#D93838',

    // Era palette per ADR-0014.
    orange: '#e87a3d',
    violet: '#8b5cf6',
    coral: '#f97a6b',
  },
  fonts: {
    display: 'Nunito',
    body: 'Nunito',
    serif: 'Fraunces',
    mono: 'JetBrains Mono',
  },
};

module.exports = { tokens };

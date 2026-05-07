/** @type {import('tailwindcss').Config} */
// Tokens live in `theme/tokens.cjs` (typed via `theme/tokens.ts`). Importing
// them here keeps Tailwind and the rest of the app on a single source of
// truth for brand and era colors plus font families.
const { tokens } = require('./theme/tokens.cjs');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ...tokens.colors,

        // Semantic tokens (rnr / shadcn parity). Values come from the CSS
        // variables defined in global.css, so they react to color scheme.
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
      },
      fontFamily: {
        // The prototype swaps Fraunces (was display) with Nunito. Fraunces is
        // now a serif accent reserved for year numbers; JetBrains Mono is the
        // technical-microcopy face.
        display: [tokens.fonts.display, 'sans-serif'],
        body: [tokens.fonts.body, 'sans-serif'],
        serif: [tokens.fonts.serif, 'serif'],
        mono: [tokens.fonts.mono, 'monospace'],
      },
      boxShadow: {
        // Pushable button lifts (Duolingo-style) — the 5px solid colored
        // shadow that collapses to 1px on press. Mirrors `--vd-btn-lift` /
        // `--vd-btn-press` from the prototype CSS.
        'push-lime': '0 5px 0 0 #4AA802',
        'push-lime-active': '0 1px 0 0 #4AA802',
        'push-pink': '0 5px 0 0 #D94E94',
        'push-pink-active': '0 1px 0 0 #D94E94',
        'push-gold': '0 5px 0 0 #D9A800',
        'push-gold-active': '0 1px 0 0 #D9A800',
        'push-red': '0 5px 0 0 #D93838',
        'push-red-active': '0 1px 0 0 #D93838',
        // Card surface — `--vd-shadow-card` from the prototype.
        card: '0 6px 0 0 rgba(0,0,0,0.35), 0 12px 24px -8px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
};

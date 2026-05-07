/** @type {import('tailwindcss').Config} */
// All Tocarta tokens are inline here for now. A follow-up task will extract
// them into a TS module that this config and the rest of the app share.
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
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

        // Era palette (per ADR-0014). The 1950s era reuses navy900.
        orange: '#e87a3d',
        violet: '#8b5cf6',
        coral: '#f97a6b',

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
        display: ['Fraunces', 'serif'],
        body: ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

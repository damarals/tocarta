import { tokens } from '../theme/tokens';

test('exposes Tocarta brand and era palette per ADR-0014 and prototype', () => {
  expect(tokens).toEqual(
    expect.objectContaining({
      colors: expect.objectContaining({
        // Brand palette — navy ramp (hi-fi prototype values)
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

        // Era palette per ADR-0014 — unchanged.
        orange: '#e87a3d',
        violet: '#8b5cf6',
        coral: '#f97a6b',
      }),
      fonts: {
        display: 'Nunito',
        body: 'Nunito',
        serif: 'Fraunces',
        mono: 'JetBrains Mono',
      },
    }),
  );
});

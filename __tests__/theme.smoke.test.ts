import { tokens } from '../theme/tokens';

test('exposes Tocarta brand and era palette per ADR-0014', () => {
  expect(tokens).toEqual(
    expect.objectContaining({
      colors: expect.objectContaining({
        navy900: '#0d1422',
        navy700: '#1a1f2e',
        navy500: '#2a3344',
        navy200: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        lime: '#c8e84a',
        limeD: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        pink: '#ec5b8d',
        pinkD: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        gold: '#d4a857',
        red: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        cyan: '#00b8d4',
        orange: '#e87a3d',
        violet: '#8b5cf6',
        coral: '#f97a6b',
      }),
      fonts: {
        display: 'Fraunces',
        body: 'Nunito',
      },
    }),
  );
});

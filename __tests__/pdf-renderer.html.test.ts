import { pdfRenderer } from '../lib/pdf-renderer';
import type { Deck } from '../lib/types';

/**
 * 13-card fixture spanning 6 of the 8 era buckets (1955, 1968, 1985, 2002,
 * 2018, 2024). Thirteen forces 2 fronts + 2 backs = 4 pages, with the second
 * back page partial (one card only) so the snapshot exercises the partial-
 * page crop-mark layout.
 */
const FIXTURE_DECK: Deck = {
  id: 'deck_test',
  name: 'Hits dos Anos 80',
  sourceUrl: 'https://www.deezer.com/playlist/1234567890',
  createdAt: 0,
  cards: [
    { isrc: 'USRC11955001', artist: 'Chuck Berry', title: 'Maybellene', year: 1955 },
    { isrc: 'USRC11968001', artist: 'The Beatles', title: 'Hey Jude', year: 1968 },
    { isrc: 'USRC11985001', artist: 'a-ha', title: 'Take On Me', year: 1985 },
    { isrc: 'USRC12002001', artist: 'Coldplay', title: 'Clocks', year: 2002 },
    { isrc: 'USRC12018001', artist: 'Childish Gambino', title: 'This Is America', year: 2018 },
    { isrc: 'USRC12024001', artist: 'Sabrina Carpenter', title: 'Espresso', year: 2024 },
    { isrc: 'USRC11985002', artist: 'Madonna', title: 'Material Girl', year: 1985 },
    { isrc: 'USRC11985003', artist: 'Prince', title: 'When Doves Cry', year: 1985 },
    { isrc: 'USRC11985004', artist: 'Tears for Fears', title: 'Shout', year: 1985 },
    { isrc: 'USRC11985005', artist: 'Cyndi Lauper', title: 'Time After Time', year: 1985 },
    { isrc: 'USRC11985006', artist: 'Wham!', title: 'Last Christmas', year: 1985 },
    { isrc: 'USRC11985007', artist: 'Queen', title: 'I Want To Break Free', year: 1985 },
    {
      isrc: 'USRC11955002',
      artist: 'Elvis Presley',
      title: 'Heartbreak Hotel',
      year: 1956,
    },
  ],
};

describe('PdfRenderer.toHtml', () => {
  test('produces a deterministic HTML document for the 13-card fixture', () => {
    const html = pdfRenderer.toHtml(FIXTURE_DECK);
    expect(html).toMatchSnapshot();
  });

  test('is pure — repeated calls produce the same string', () => {
    const a = pdfRenderer.toHtml(FIXTURE_DECK);
    const b = pdfRenderer.toHtml(FIXTURE_DECK);
    expect(a).toBe(b);
  });

  test('encodes the QR payload as ISRC:DZ:PLAYLIST_ID', () => {
    const html = pdfRenderer.toHtml(FIXTURE_DECK);
    // The renderer encodes one QR per card; the data URI is opaque, but the
    // rendered SVG (or its source) must surface the deck pointer somewhere
    // in the HTML for downstream verification. We assert the playlist id and
    // a known ISRC are present in the document so a regression that drops
    // the deck pointer trips this test before the snapshot diff is read.
    expect(html).toContain('USRC11955001:DZ:1234567890');
  });

  test('uses A4 page size in @page CSS', () => {
    const html = pdfRenderer.toHtml(FIXTURE_DECK);
    expect(html).toContain('size: 210mm 297mm');
  });

  test('emits the expected page count: 4 pages for 13 cards', () => {
    const html = pdfRenderer.toHtml(FIXTURE_DECK);
    // Two fronts + two backs.
    const pages = html.match(/class="page /g) ?? [];
    expect(pages.length).toBe(4);
  });
});

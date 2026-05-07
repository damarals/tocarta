import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qrcode') as {
  create: (text: string, opts: object) => unknown;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const svgRenderer = require('qrcode/lib/renderer/svg-tag') as {
  render: (qrData: unknown, opts: object) => string;
};

import { parseDeezerPlaylistUrl } from './deezer-url';
import { eraColor } from './era-color';
import { slug } from './slug';
import { tokens } from '../theme/tokens';
import type { Card, Deck } from './types';

export type RenderedDeckPdf = { uri: string; filename: string };

export interface PdfRenderer {
  /** Pure HTML composer. No I/O, no clock, no randomness — snapshot-safe. */
  toHtml(deck: Deck): string;
  /** Renders the HTML to a PDF on disk and returns its uri + filename. */
  render(deck: Deck): Promise<RenderedDeckPdf>;
}

// ---------- ADR-0014 geometry (millimetres) ----------
const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const COLS = 3;
const ROWS = 4;
const CARDS_PER_PAGE = COLS * ROWS;
const CARD_MM = 60;
const GAP_MM = 6;
const MARGIN_X_MM = 9;
const MARGIN_Y_MM = 19.5;
const BLEED_MM = 3;
const SAFE_MM = 4;
const QR_MM = 36;
const QR_TOP_MM = 8;
const WORDMARK_GAP_MM = 0.5;
const WORDMARK_SIZE_MM = 5;
const YEAR_SIZE_MM = 21;
const ARTIST_SIZE_MM = 4;
const TITLE_SIZE_MM = 3.5;
const CROP_MARK_LEN_MM = 3;
const CROP_MARK_WEIGHT_PT = 0.25;
const PROVIDER_TAG = 'DZ';

// Eras whose bleed is a "dark" colour: 1950s (navy900), 1980s (pink), 2010s
// (violet). The crop-mark colour rule (per the issue) flips to white on a
// back page if at least one populated card on that page is in one of these.
function isDarkEra(year: number | null): boolean {
  if (year === null || year < 1960) return true; // 1950s navy900
  if (year >= 1980 && year <= 1989) return true; // 1980s pink
  if (year >= 2010 && year <= 2019) return true; // 2010s violet
  return false;
}

function effectiveYear(card: Card): number | null {
  return card.yearOverride ?? card.year;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Generate the QR SVG synchronously. Uses the qrcode library's pure
 * `create` (sync) + the `svg-tag` renderer (sync). Error correction `M`,
 * margin `0` (we control padding via card layout), 1 module = unit; the
 * SVG is sized in CSS to 36mm. Encoded payload follows ADR-0013.
 */
function qrSvg(payload: string): string {
  const qrData = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  return svgRenderer.render(qrData, {
    margin: 0,
    color: { dark: '#0d1422', light: '#ffffff' },
  });
}

function svgDataUri(svg: string): string {
  // No base64: shorter and stays readable for snapshot diffs. We strip the
  // trailing newline emitted by the renderer so the URI is canonical.
  const trimmed = svg.replace(/\n$/, '');
  const encoded = encodeURIComponent(trimmed)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;utf8,${encoded}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- Geometry helpers (positions in mm) ----------

type Pos = { left: number; top: number };

function frontCellPos(col: number, row: number): Pos {
  return {
    left: MARGIN_X_MM + col * (CARD_MM + GAP_MM),
    top: MARGIN_Y_MM + row * (CARD_MM + GAP_MM),
  };
}

/**
 * Back-page columns are mirrored so a long-edge flip (rotation around the
 * vertical 297mm edge) lands every back over its own front. The rows stay
 * in place; only column index is reflected: col → (COLS - 1 - col).
 */
function backCellPos(col: number, row: number): Pos {
  return frontCellPos(COLS - 1 - col, row);
}

// ---------- Crop marks ----------
//
// Crop marks are placed only at the four outer corners of the populated
// cells on the page, 3mm in length, 0.25pt stroke.

type CropRect = { left: number; top: number; right: number; bottom: number };

function cropRectForFront(populatedIdx: number[]): CropRect {
  // populatedIdx: linear cell indices that are populated on this page.
  // We compute the min/max col and min/max row, then place the marks at
  // the OUTER corners of that bounding box (so the outermost trim edges).
  const cols = populatedIdx.map((i) => i % COLS);
  const rows = populatedIdx.map((i) => Math.floor(i / COLS));
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const tl = frontCellPos(minCol, minRow);
  const br = frontCellPos(maxCol, maxRow);
  return {
    left: tl.left,
    top: tl.top,
    right: br.left + CARD_MM,
    bottom: br.top + CARD_MM,
  };
}

function cropRectForBack(populatedIdx: number[]): CropRect {
  // Mirror columns, then compute the bounding box in the back-page space.
  const mirrored = populatedIdx.map((i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return (COLS - 1 - col) + row * COLS;
  });
  const cols = mirrored.map((i) => i % COLS);
  const rows = mirrored.map((i) => Math.floor(i / COLS));
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const tl = frontCellPos(minCol, minRow);
  const br = frontCellPos(maxCol, maxRow);
  return {
    left: tl.left,
    top: tl.top,
    right: br.left + CARD_MM,
    bottom: br.top + CARD_MM,
  };
}

function cropMarksHtml(rect: CropRect, color: string): string {
  // Each corner gets two 3mm strokes (one horizontal, one vertical) anchored
  // outside the trim by 0mm gap (flush with the trim edge per the ADR).
  const w = `${CROP_MARK_WEIGHT_PT}pt`;
  const len = `${CROP_MARK_LEN_MM}mm`;
  const corners = [
    // Top-left
    [
      { left: rect.left - CROP_MARK_LEN_MM, top: rect.top, w: len, h: w, axis: 'h' },
      { left: rect.left, top: rect.top - CROP_MARK_LEN_MM, w: w, h: len, axis: 'v' },
    ],
    // Top-right
    [
      { left: rect.right, top: rect.top, w: len, h: w, axis: 'h' },
      { left: rect.right, top: rect.top - CROP_MARK_LEN_MM, w: w, h: len, axis: 'v' },
    ],
    // Bottom-left
    [
      { left: rect.left - CROP_MARK_LEN_MM, top: rect.bottom, w: len, h: w, axis: 'h' },
      { left: rect.left, top: rect.bottom, w: w, h: len, axis: 'v' },
    ],
    // Bottom-right
    [
      { left: rect.right, top: rect.bottom, w: len, h: w, axis: 'h' },
      { left: rect.right, top: rect.bottom, w: w, h: len, axis: 'v' },
    ],
  ];
  return corners
    .flat()
    .map(
      (m) =>
        `<div class="crop" style="left:${m.left}mm;top:${m.top}mm;width:${m.w};height:${m.h};background:${color};"></div>`,
    )
    .join('');
}

// ---------- Card visuals ----------

function frontCardHtml(card: Card, playlistId: string, pos: Pos): string {
  const payload = `${card.isrc}:${PROVIDER_TAG}:${playlistId}`;
  const svg = qrSvg(payload);
  const uri = svgDataUri(svg);
  // Bleed extends 3mm outside trim on each side. We render a "bleed box"
  // matching trim+bleed on both axes, then clip card content to the inner
  // 60mm trim box. For the front, the bleed is uniform white so this is
  // equivalent to just placing the card at the trim coordinates with no
  // outward fill required; we still emit the trim card to be explicit.
  return `<div class="card front" style="left:${pos.left}mm;top:${pos.top}mm;" data-payload="${escapeHtml(
    payload,
  )}">
  <img class="qr" src="${uri}" alt="" />
  <div class="wordmark">tocarta</div>
</div>`;
}

function backCardHtml(card: Card, pos: Pos): string {
  const year = effectiveYear(card);
  const era = eraColor(year);
  // Bleed: extend 3mm outside trim on every side, filled with the era bg.
  // The trim 60mm box sits on top with the same bg + safe-zone padding.
  const bleedLeft = pos.left - BLEED_MM;
  const bleedTop = pos.top - BLEED_MM;
  const bleedSize = CARD_MM + BLEED_MM * 2;
  const yearText = year === null ? '????' : String(year);
  return `<div class="bleed" style="left:${bleedLeft}mm;top:${bleedTop}mm;width:${bleedSize}mm;height:${bleedSize}mm;background:${era.background};"></div>
<div class="card back" style="left:${pos.left}mm;top:${pos.top}mm;background:${era.background};color:${era.text};">
  <div class="back-content">
    <div class="year">${escapeHtml(yearText)}</div>
    <div class="artist">${escapeHtml(card.artist)}</div>
    <div class="title" style="opacity:0.85;">${escapeHtml(card.title)}</div>
  </div>
</div>`;
}

// ---------- Page composition ----------

function renderFrontPage(pageCards: Card[], playlistId: string): string {
  const populatedIdx = pageCards.map((_c, i) => i);
  const rect = cropRectForFront(populatedIdx);
  const cards = pageCards
    .map((card, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return frontCardHtml(card, playlistId, frontCellPos(col, row));
    })
    .join('\n');
  const marks = cropMarksHtml(rect, '#0d1422'); // Black on the front page.
  return `<section class="page front-page">
${cards}
${marks}
</section>`;
}

function renderBackPage(pageCards: Card[]): string {
  const populatedIdx = pageCards.map((_c, i) => i);
  // Crop-mark colour rule: white if any populated card on this page is in a
  // dark-era bucket (1950s/1980s/2010s); navy900 otherwise. Keeps marks
  // visible against any era bleed.
  const anyDark = pageCards.some((c) => isDarkEra(effectiveYear(c)));
  const markColor = anyDark ? '#ffffff' : '#0d1422';
  const rect = cropRectForBack(populatedIdx);
  const backs = pageCards
    .map((card, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return backCardHtml(card, backCellPos(col, row));
    })
    .join('\n');
  const marks = cropMarksHtml(rect, markColor);
  return `<section class="page back-page">
${backs}
${marks}
</section>`;
}

// ---------- Document head ----------

function head(deck: Deck): string {
  const title = escapeHtml(deck.name);
  // @font-face references Google Fonts WOFF2 URLs. Documented in the release
  // checklist: at print time the renderer fetches these once; if the device
  // is offline, expo-print falls back to the system font and Fraunces /
  // Nunito are substituted. Keeping the references means: when online, the
  // intended typeface ships in the PDF; when offline, the layout still
  // works (geometry is the load-bearing thing).
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="author" content="Tocarta" />
<meta name="subject" content="Music year-guess card deck" />
<meta name="keywords" content="tocarta,music,cards" />
<style>
@font-face {
  font-family: 'Fraunces';
  font-weight: 600;
  font-style: normal;
  src: url('https://fonts.gstatic.com/s/fraunces/v34/6NUh8FyLNQOQZAnv9bYM3KSU.woff2') format('woff2');
}
@font-face {
  font-family: 'Nunito';
  font-weight: 400;
  font-style: normal;
  src: url('https://fonts.gstatic.com/s/nunito/v26/XRXV3I6Li01BKofINeaB.woff2') format('woff2');
}
@font-face {
  font-family: 'Nunito';
  font-weight: 700;
  font-style: normal;
  src: url('https://fonts.gstatic.com/s/nunito/v26/XRXW3I6Li01BKofA6sKUYevN.woff2') format('woff2');
}
@page {
  size: 210mm 297mm;
  margin: 0;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: ${tokens.colors.navy900};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page {
  position: relative;
  width: 210mm;
  height: 297mm;
  overflow: hidden;
  page-break-after: always;
}
.page:last-child { page-break-after: auto; }
.front-page { background: #ffffff; }
.back-page { background: #ffffff; }
.bleed {
  position: absolute;
}
.card {
  position: absolute;
  width: ${CARD_MM}mm;
  height: ${CARD_MM}mm;
  overflow: hidden;
}
.card.front {
  background: #ffffff;
}
.card.front .qr {
  position: absolute;
  left: ${(CARD_MM - QR_MM) / 2}mm;
  top: ${QR_TOP_MM}mm;
  width: ${QR_MM}mm;
  height: ${QR_MM}mm;
}
.card.front .wordmark {
  position: absolute;
  left: 0;
  right: 0;
  top: ${QR_TOP_MM + QR_MM + WORDMARK_GAP_MM}mm;
  text-align: center;
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: ${WORDMARK_SIZE_MM}mm;
  color: ${tokens.colors.navy900};
  text-transform: lowercase;
  letter-spacing: 0;
  line-height: 1;
}
.card.back {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${SAFE_MM}mm;
}
.back-content {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1mm;
}
.year {
  font-family: 'Fraunces', serif;
  font-weight: 600;
  font-size: ${YEAR_SIZE_MM}mm;
  line-height: 1;
}
.artist {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: ${ARTIST_SIZE_MM}mm;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title {
  font-family: 'Nunito', sans-serif;
  font-weight: 400;
  font-size: ${TITLE_SIZE_MM}mm;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.crop {
  position: absolute;
}
</style>
</head>`;
}

function buildHtml(deck: Deck): string {
  const parsed = parseDeezerPlaylistUrl(deck.sourceUrl);
  const playlistId = parsed?.playlistId ?? '';
  const pages = chunk(deck.cards, CARDS_PER_PAGE);
  const sections = pages
    .map((pageCards) => `${renderFrontPage(pageCards, playlistId)}\n${renderBackPage(pageCards)}`)
    .join('\n');
  return `${head(deck)}
<body>
${sections}
</body>
</html>`;
}

// ---------- The render call ----------

async function renderToFile(deck: Deck): Promise<RenderedDeckPdf> {
  const html = buildHtml(deck);
  const filename = `tocarta-${slug(deck.name)}.pdf`;
  // expo-print returns a temporary file path. We copy it into the cache
  // directory under the user-facing filename so the share sheet labels the
  // attachment correctly (`tocarta-{slug}.pdf`) instead of the random temp
  // name expo-print picks.
  const result = await Print.printToFileAsync({ html, base64: false });
  const source = new File(result.uri);
  const target = new File(Paths.cache, filename);
  try {
    if (target.exists) target.delete();
    source.copy(target);
    return { uri: target.uri, filename };
  } catch {
    // If copy fails for any reason, fall back to the raw uri so the share
    // sheet still works; the OS picks a generated filename.
    return { uri: result.uri, filename };
  }
}

export const pdfRenderer: PdfRenderer = {
  toHtml: buildHtml,
  render: renderToFile,
};

/**
 * Parsed Tocarta card code. The `isrc` is always present; `provider` and
 * `playlistId` are populated only for extended-format payloads (per
 * ADR-0013). Legacy bare-ISRC payloads omit them.
 */
export type CardCode = {
  isrc: string;
  provider?: string;
  playlistId?: string;
};

/**
 * Parse a scanned QR payload into a `CardCode`, or return `null` if the
 * payload is not a recognised Tocarta card code.
 *
 * Accepts two formats per ADR-0013:
 * - Extended: `ISRC:PROVIDER:PLAYLIST_ID` where ISRC matches
 *   `[A-Z]{2}[A-Z0-9]{3}[0-9]{7}`, PROVIDER is two uppercase letters, and
 *   PLAYLIST_ID is one or more uppercase alphanumeric characters.
 * - Legacy bare ISRC: `[A-Z]{2}[A-Z0-9]{3}[0-9]{7}` on its own.
 *
 * Strict by design: input is not trimmed. QR payloads do not carry
 * surrounding whitespace, so any whitespace is treated as a malformed code.
 */
export function parseCardCode(input: string): CardCode | null {
  const extended = /^([A-Z]{2}[A-Z0-9]{3}[0-9]{7}):([A-Z]{2}):([0-9A-Z]+)$/.exec(input);
  if (extended !== null) {
    return { isrc: extended[1], provider: extended[2], playlistId: extended[3] };
  }
  const legacy = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/.exec(input);
  if (legacy !== null) {
    return { isrc: legacy[0] };
  }
  return null;
}

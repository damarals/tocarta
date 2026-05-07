export function parseDeezerPlaylistUrl(url: string): { playlistId: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.host !== 'www.deezer.com' && parsed.host !== 'deezer.com') return null;
  const match = /^\/(?:[a-z]{2}\/)?playlist\/(\d+)$/.exec(parsed.pathname);
  if (match === null) return null;
  return { playlistId: match[1] };
}

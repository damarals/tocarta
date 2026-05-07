import { parseDeezerPlaylistUrl } from './deezer-url';

export type RawTrack = { isrc: string; artist: string; title: string };

export type ExtractorDroppedTrack = {
  artist: string;
  title: string;
  reason: "Track wasn't tagged with a unique ID";
};

export type ExtractResult = {
  name: string;
  tracks: RawTrack[];
  droppedTracks: ExtractorDroppedTrack[];
};

export type ExtractError =
  | { kind: 'invalid_url' }
  | { kind: 'not_found' }
  | { kind: 'private' }
  | { kind: 'network' }
  | { kind: 'unknown'; message: string };

const USER_AGENT = 'Tocarta/0.1 (silva.daniel86@gmail.com)';
const PAGE_SIZE = 100;

type DeezerTrackRaw = {
  isrc?: unknown;
  title?: unknown;
  artist?: { name?: unknown } | null;
};

type DeezerPlaylistResponse = {
  error?: { code?: number; type?: string; message?: string };
  title?: string;
  tracks?: {
    data?: DeezerTrackRaw[];
    total?: number;
    next?: string;
  };
};

type DeezerTracksPageResponse = {
  error?: { code?: number; type?: string; message?: string };
  data?: DeezerTrackRaw[];
  total?: number;
  next?: string;
};

function throwExtract(err: ExtractError): never {
  // Augment with a message so the thrown value still reads usefully in default
  // error formatters; the discriminant `kind` is what callers branch on.
  const error = new Error(`PlaylistExtractor: ${err.kind}`) as Error & ExtractError;
  Object.assign(error, err);
  throw error;
}

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
  } catch {
    throwExtract({ kind: 'network' });
  }
  if (response.status === 404) throwExtract({ kind: 'not_found' });
  if (response.status === 403) throwExtract({ kind: 'private' });
  if (!response.ok) {
    throwExtract({
      kind: 'unknown',
      message: `HTTP ${response.status} from ${url}`,
    });
  }
  try {
    return (await response.json()) as T;
  } catch {
    throwExtract({ kind: 'unknown', message: `Malformed JSON from ${url}` });
  }
}

/**
 * Deezer signals "not found" and "private" in the JSON body even when the
 * response status is 200. Map those to the same discriminants HTTP status
 * codes would produce.
 */
function checkDeezerErrorBody(error: { code?: number; type?: string } | undefined): void {
  if (!error) return;
  if (error.code === 800 || error.type === 'DataException') {
    throwExtract({ kind: 'not_found' });
  }
  if (error.code === 700 || error.type === 'PermissionException') {
    throwExtract({ kind: 'private' });
  }
  throwExtract({
    kind: 'unknown',
    message: `Deezer error ${error.type ?? 'unknown'} (${error.code ?? '?'})`,
  });
}

type ClassifiedTrack =
  | { kind: 'kept'; track: RawTrack }
  | { kind: 'dropped'; dropped: ExtractorDroppedTrack };

function classifyTrack(t: DeezerTrackRaw): ClassifiedTrack {
  const title = typeof t.title === 'string' ? t.title : '';
  const artistName =
    t.artist && typeof t.artist.name === 'string' ? t.artist.name : '';
  const isrc = typeof t.isrc === 'string' ? t.isrc : '';
  if (isrc === '') {
    return {
      kind: 'dropped',
      dropped: {
        artist: artistName,
        title,
        reason: "Track wasn't tagged with a unique ID",
      },
    };
  }
  return { kind: 'kept', track: { isrc, artist: artistName, title } };
}

export async function extractFromDeezerUrl(url: string): Promise<ExtractResult> {
  const parsed = parseDeezerPlaylistUrl(url);
  if (parsed === null) throwExtract({ kind: 'invalid_url' });

  const playlistUrl = `https://api.deezer.com/playlist/${parsed.playlistId}`;
  const playlist = await fetchJson<DeezerPlaylistResponse>(playlistUrl);
  checkDeezerErrorBody(playlist.error);

  const name = typeof playlist.title === 'string' ? playlist.title : '';
  const firstPage = playlist.tracks?.data ?? [];
  const total = playlist.tracks?.total ?? firstPage.length;

  const collected: RawTrack[] = [];
  const dropped: ExtractorDroppedTrack[] = [];
  const ingest = (page: DeezerTrackRaw[]): void => {
    for (const t of page) {
      const result = classifyTrack(t);
      if (result.kind === 'kept') collected.push(result.track);
      else dropped.push(result.dropped);
    }
  };

  ingest(firstPage);

  let index = firstPage.length;
  while (index < total) {
    const pageUrl = `https://api.deezer.com/playlist/${parsed.playlistId}/tracks?index=${index}&limit=${PAGE_SIZE}`;
    const page = await fetchJson<DeezerTracksPageResponse>(pageUrl);
    checkDeezerErrorBody(page.error);
    const pageTracks = page.data ?? [];
    if (pageTracks.length === 0) break;
    ingest(pageTracks);
    index += pageTracks.length;
  }

  return { name, tracks: collected, droppedTracks: dropped };
}

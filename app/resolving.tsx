import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { createCache } from '@/lib/cache';
import { createDeckGenerator } from '@/lib/deck-generator';
import { deckLibrary } from '@/lib/deck-library';
import {
  extractFromDeezerUrl,
  type ExtractError,
  type ExtractResult,
} from '@/lib/playlist-extractor';
import { createRateLimiter } from '@/lib/rate-limiter';
import { createYearResolver, type YearResolver } from '@/lib/year-resolver';

const cache = createCache({ namespace: '' });
const rateLimiter = createRateLimiter({ tokensPerSecond: 1 });
const yearResolver = createYearResolver({ cache, rateLimiter });

const LIVE_LOG_LINES = 5;

type ProgressView = {
  done: number;
  total: number;
  dropped: number;
};

type LogLine = {
  artist: string;
  title: string;
  year: number | null;
};

type ResolvingState =
  | { kind: 'working'; progress: ProgressView; log: LogLine[] }
  | { kind: 'finishing'; skippedCount: number }
  | { kind: 'error'; message: string };

function isExtractError(value: unknown): value is ExtractError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    typeof (value as { kind: unknown }).kind === 'string'
  );
}

function mapError(err: ExtractError): string {
  switch (err.kind) {
    case 'invalid_url':
      return "That doesn't look like a Deezer playlist link.";
    case 'not_found':
      return 'Playlist not found.';
    case 'private':
      return 'This playlist is private.';
    case 'network':
      return 'No internet connection.';
    case 'unknown':
      return "Couldn't load the playlist.";
  }
}

function formatEta(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'Almost done…';
  if (secondsRemaining < 60) return `~${secondsRemaining}s remaining`;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `~${minutes}m ${seconds}s remaining`;
}

function progressFraction(progress: ProgressView): number {
  if (progress.total === 0) return 0;
  return Math.min(1, progress.done / progress.total);
}

export default function ResolvingScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const [state, setState] = useState<ResolvingState>({
    kind: 'working',
    progress: { done: 0, total: 0, dropped: 0 },
    log: [],
  });
  // Strict mode and React Fast Refresh can fire effects twice; avoid running
  // the generator a second time and double-saving the deck.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (typeof url !== 'string' || url === '') {
      setState({ kind: 'error', message: "That doesn't look like a Deezer playlist link." });
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const log: LogLine[] = [];
    let progressView: ProgressView = { done: 0, total: 0, dropped: 0 };

    // Build a mapping of ISRC → track metadata at extract time so the
    // resolver-wrapper can attach (artist, title) to each live log entry.
    const trackByIsrc = new Map<string, { artist: string; title: string }>();
    const captureExtractor = {
      extractFromDeezerUrl: async (u: string): Promise<ExtractResult> => {
        const result = await extractFromDeezerUrl(u);
        for (const t of result.tracks) {
          trackByIsrc.set(t.isrc, { artist: t.artist, title: t.title });
        }
        return result;
      },
    };
    const loggingResolver: YearResolver = {
      async resolve(isrc) {
        const result = await yearResolver.resolve(isrc);
        if (!cancelled) {
          const meta = trackByIsrc.get(isrc) ?? { artist: '', title: isrc };
          log.push({ artist: meta.artist, title: meta.title, year: result.year });
          setState({ kind: 'working', progress: progressView, log: [...log] });
        }
        return result;
      },
    };
    const generator = createDeckGenerator({
      extractor: captureExtractor,
      resolver: loggingResolver,
      newId: () => Crypto.randomUUID(),
    });

    (async () => {
      try {
        const result = await generator.generate({
          url,
          signal: controller.signal,
          onProgress: (p) => {
            if (cancelled) return;
            progressView = p;
            setState({ kind: 'working', progress: p, log: [...log] });
          },
        });
        if (cancelled) return;

        await deckLibrary.save(result.deck);
        if (cancelled) return;

        const skipped = result.droppedTracks.length;
        if (skipped > 0) {
          setState({ kind: 'finishing', skippedCount: skipped });
          setTimeout(() => {
            if (!cancelled) router.replace('/');
          }, 1_400);
        } else {
          router.replace('/');
        }
      } catch (err) {
        if (cancelled) return;
        if ((err as { name?: string }).name === 'AbortError') return;
        const message = isExtractError(err)
          ? mapError(err)
          : "Couldn't load the playlist.";
        setState({ kind: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [router, url]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 px-6 py-6 gap-6">
        {state.kind === 'working' && <WorkingView progress={state.progress} log={state.log} />}
        {state.kind === 'finishing' && (
          <View className="flex-1 items-center justify-center gap-3">
            <Text className="font-display text-foreground text-2xl text-center">
              Saved
            </Text>
            <Text className="font-body text-muted-foreground text-base text-center">
              {state.skippedCount === 1
                ? '1 track was skipped.'
                : `${state.skippedCount} tracks were skipped.`}
            </Text>
          </View>
        )}
        {state.kind === 'error' && (
          <View className="flex-1 items-center justify-center gap-4">
            <Text className="font-display text-foreground text-2xl text-center">
              {state.message}
            </Text>
            <Pressable
              onPress={() => router.replace('/generate')}
              role="button"
              accessibilityLabel="Back to create"
              className="items-center justify-center rounded-full bg-primary px-6 py-3 active:bg-primary/90"
            >
              <Text className="font-body text-primary-foreground text-base font-bold">
                Back
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function WorkingView({
  progress,
  log,
}: {
  progress: ProgressView;
  log: LogLine[];
}): React.ReactElement {
  const fraction = progressFraction(progress);
  const remainingSeconds = Math.max(0, progress.total - progress.done);
  const recent = log.slice(-LIVE_LOG_LINES);

  return (
    <View className="flex-1 gap-6">
      <Text className="font-display text-foreground text-3xl">Resolving deck</Text>

      <View className="gap-2">
        <View className="h-3 w-full rounded-full bg-navy500 overflow-hidden">
          <View
            className="h-full bg-lime"
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        </View>
        <Text className="font-body text-muted-foreground text-sm">
          {progress.done}/{progress.total === 0 ? '?' : progress.total}
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Text className="font-body text-foreground text-base">
          {progress.done}/{progress.total === 0 ? '?' : progress.total} resolved
        </Text>
        {progress.dropped > 0 && (
          <View className="rounded-full bg-gold/20 px-3 py-1">
            <Text className="font-body text-gold text-sm">
              {progress.dropped} dropped
            </Text>
          </View>
        )}
      </View>

      <Text className="font-body text-muted-foreground text-sm">
        {progress.total === 0
          ? 'Loading the playlist…'
          : formatEta(remainingSeconds)}
      </Text>

      {recent.length > 0 && (
        <View className="rounded-xl border border-border bg-card p-3 gap-1">
          {recent.map((line, idx) => (
            <Text
              key={`${line.artist}-${line.title}-${idx}`}
              className="font-body text-card-foreground text-sm"
              numberOfLines={1}
            >
              {line.artist} — {line.title} → {line.year ?? '—'}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

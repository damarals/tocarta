import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand/BrandMark';
import { PushButton } from '@/components/ui/push-button';
import { Text } from '@/components/ui/text';
import { createCache } from '@/lib/cache';
import { createDeckGenerator } from '@/lib/deck-generator';
import { deckLibrary } from '@/lib/deck-library';
import {
  extractFromDeezerUrl,
  type ExtractError,
  type ExtractResult,
} from '@/lib/playlist-extractor';
import { setPostGenerationDrops } from '@/lib/post-generation-store';
import { createRateLimiter } from '@/lib/rate-limiter';
import { cn } from '@/lib/utils';
import { createYearResolver, type YearResolver } from '@/lib/year-resolver';

const cache = createCache({ namespace: '' });
const rateLimiter = createRateLimiter({ tokensPerSecond: 1 });
const yearResolver = createYearResolver({ cache, rateLimiter });

const LIVE_LOG_LINES = 5;
const LOG_OPACITIES = [0.3, 0.5, 0.7, 0.85, 1];

type ProgressView = {
  done: number;
  total: number;
  dropped: number;
};

type LogLine = {
  isrc: string;
  artist: string;
  title: string;
  year: number | null;
};

type ResolvingState =
  | { kind: 'working'; progress: ProgressView; log: LogLine[] }
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

function progressFraction(progress: ProgressView): number {
  if (progress.total === 0) return 0;
  return Math.min(1, progress.done / progress.total);
}

function formatEta(progress: ProgressView): string {
  const remaining = Math.max(0, progress.total - progress.done);
  if (progress.total === 0) return 'Loading…';
  if (remaining === 0) return 'Almost done';
  return `~${remaining}s left`;
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
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (typeof url !== 'string' || url === '') {
      setState({ kind: 'error', message: "That doesn't look like a Deezer playlist link." });
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
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
          log.push({ isrc, artist: meta.artist, title: meta.title, year: result.year });
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

        setPostGenerationDrops(result.deck.id, result.droppedTracks);
        router.replace(`/deck/${result.deck.id}`);
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

  const onCancel = () => {
    controllerRef.current?.abort();
    router.back();
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-background">
      {state.kind === 'working' && (
        <WorkingView progress={state.progress} log={state.log} onCancel={onCancel} />
      )}
      {state.kind === 'error' && (
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text
            className="text-foreground text-center"
            style={{
              fontFamily: 'Nunito_900Black',
              fontSize: 24,
              lineHeight: 28,
              letterSpacing: -0.36,
            }}
          >
            {state.message}
          </Text>
          <PushButton
            variant="primary"
            size="md"
            onPress={() => router.replace('/generate')}
            accessibilityLabel="Back to create"
          >
            Back
          </PushButton>
        </View>
      )}
    </SafeAreaView>
  );
}

function WorkingView({
  progress,
  log,
  onCancel,
}: {
  progress: ProgressView;
  log: LogLine[];
  onCancel: () => void;
}): React.ReactElement {
  const fraction = progressFraction(progress);
  const recent = log.slice(-LIVE_LOG_LINES);

  // Animate the bar fill width on each progress change with a 220ms ease.
  const widthAnim = useRef(new Animated.Value(fraction)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: fraction,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fraction, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center px-6">
        <BrandMark size={120} spinning glow="lime" />
        <Text
          className="text-foreground text-center mt-7"
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 28,
            lineHeight: 30,
            letterSpacing: -0.56,
          }}
        >
          Looking up release years…
        </Text>
        <Text
          className="font-display text-navy200 text-sm text-center mt-2.5"
          style={{
            fontFamily: 'Nunito_600SemiBold',
            lineHeight: 21,
            maxWidth: 280,
          }}
        >
          We&apos;re checking each track against the music database.
        </Text>

        <View className="w-full max-w-[320px] mt-9">
          <View className="h-2 rounded-full border-[1.5px] border-navy600 bg-navy900 overflow-hidden">
            <Animated.View
              className="h-full bg-gold"
              style={{ width: animatedWidth }}
            />
          </View>
          <View className="flex-row justify-between mt-3">
            <Text
              className="text-navy200"
              style={{
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 12,
              }}
            >
              {progress.done}/{progress.total === 0 ? '?' : progress.total}
            </Text>
            <Text
              className="text-navy200"
              style={{
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 12,
              }}
            >
              {formatEta(progress)}
            </Text>
          </View>
        </View>

        <View
          className="w-full max-w-[320px] mt-7"
          style={{ minHeight: LIVE_LOG_LINES * 22 }}
        >
          {recent.map((line, idx) => {
            const opacity =
              LOG_OPACITIES[
                Math.max(0, LOG_OPACITIES.length - recent.length + idx)
              ] ?? 1;
            const isDropped = line.year === null;
            const label = line.artist
              ? `${line.artist} — ${line.title}`
              : line.isrc;
            return (
              <Text
                key={`${line.isrc}-${idx}`}
                className={cn(isDropped ? 'text-red' : 'text-navy200')}
                numberOfLines={1}
                style={{
                  fontFamily: 'Nunito_600SemiBold',
                  fontSize: 13,
                  lineHeight: 22,
                  opacity,
                }}
              >
                {isDropped ? label : `${label} · ${line.year}`}
              </Text>
            );
          })}
        </View>
      </View>
      <View className="px-5 pb-2">
        <PushButton
          variant="ghost"
          size="lg"
          fullWidth
          onPress={onCancel}
          accessibilityLabel="Cancel"
        >
          Cancel
        </PushButton>
      </View>
    </View>
  );
}

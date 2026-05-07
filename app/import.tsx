import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import type { DeckPointer } from '@/lib/deck-pointer';
import { reconstructPlaylistUrl } from '@/lib/deck-pointer';
import { markDeclined } from '@/lib/import-session';
import { extractFromDeezerUrl } from '@/lib/playlist-extractor';
import { tokens } from '@/theme/tokens';

type ScreenState =
  | { kind: 'loading' }
  | { kind: 'unsupported' }
  | { kind: 'error' }
  | { kind: 'prompt'; name: string; trackCount: number };

const ERROR_MESSAGE =
  "Couldn't load this deck — the source playlist may have been removed.";
const UNSUPPORTED_MESSAGE =
  "Couldn't load this deck — provider not supported.";

export default function ImportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ provider?: string; playlistId?: string }>();
  const provider = typeof params.provider === 'string' ? params.provider : '';
  const playlistId = typeof params.playlistId === 'string' ? params.playlistId : '';
  const pointer: DeckPointer = { provider, playlistId };
  const reconstructed = reconstructPlaylistUrl(pointer);

  const [state, setState] = useState<ScreenState>(() =>
    reconstructed === null ? { kind: 'unsupported' } : { kind: 'loading' },
  );

  // Strict mode / Fast Refresh fires effects twice in dev. Avoid double-fetch.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (reconstructed === null) return;
    startedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const result = await extractFromDeezerUrl(reconstructed);
        if (cancelled) return;
        setState({
          kind: 'prompt',
          name: result.name,
          trackCount: result.tracks.length,
        });
      } catch {
        if (cancelled) return;
        setState({ kind: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reconstructed]);

  const onImport = (): void => {
    if (reconstructed === null) return;
    router.replace({ pathname: '/resolving', params: { url: reconstructed } });
  };

  const onNotNow = (): void => {
    markDeclined(pointer);
    router.replace('/');
  };

  const onBack = (): void => {
    router.replace('/');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-navy900">
      <View className="flex-1 px-6 py-8">
        {state.kind === 'loading' && <LoadingView />}
        {state.kind === 'unsupported' && (
          <ErrorView message={UNSUPPORTED_MESSAGE} onBack={onBack} />
        )}
        {state.kind === 'error' && (
          <ErrorView message={ERROR_MESSAGE} onBack={onBack} />
        )}
        {state.kind === 'prompt' && (
          <PromptView
            name={state.name}
            trackCount={state.trackCount}
            onImport={onImport}
            onNotNow={onNotNow}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function LoadingView(): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center gap-4">
      <ActivityIndicator color={tokens.colors.lime} />
      <Text className="font-body text-foreground text-base">
        Looking up the deck…
      </Text>
    </View>
  );
}

function ErrorView({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center gap-6">
      <Text className="font-display text-foreground text-2xl text-center leading-snug">
        {message}
      </Text>
      <Pressable
        onPress={onBack}
        role="button"
        accessibilityLabel="Back to Library"
        className="rounded-full bg-primary px-6 py-3 active:bg-primary/90"
      >
        <Text className="font-body text-primary-foreground text-base font-bold">
          Back to Library
        </Text>
      </Pressable>
    </View>
  );
}

function PromptView({
  name,
  trackCount,
  onImport,
  onNotNow,
}: {
  name: string;
  trackCount: number;
  onImport: () => void;
  onNotNow: () => void;
}): React.ReactElement {
  return (
    <View className="flex-1 justify-between">
      <View className="gap-3 pt-8">
        <Text className="font-body text-navy200 text-sm uppercase tracking-wide">
          Import this deck?
        </Text>
        <Text
          className="font-display text-foreground text-4xl leading-tight"
          numberOfLines={3}
        >
          {name}
        </Text>
        <Text className="font-body text-muted-foreground text-base">
          {trackCount === 1 ? '1 track' : `${trackCount} tracks`}
        </Text>
      </View>
      <View className="gap-3">
        <Pressable
          onPress={onImport}
          role="button"
          accessibilityLabel="Import this deck"
          className="items-center justify-center rounded-full bg-primary px-6 py-4 active:bg-primary/90"
        >
          <Text className="font-body text-primary-foreground text-base font-bold">
            Import this deck
          </Text>
        </Pressable>
        <Pressable
          onPress={onNotNow}
          role="button"
          accessibilityLabel="Not now"
          className="items-center justify-center rounded-full border border-border px-6 py-4 active:bg-navy700"
        >
          <Text className="font-body text-foreground text-base font-bold">
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

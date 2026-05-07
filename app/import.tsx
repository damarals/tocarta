import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand/BrandMark';
import { InlineAlert } from '@/components/ui/inline-alert';
import { PushButton } from '@/components/ui/push-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Surface } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { DeckPointer } from '@/lib/deck-pointer';
import { reconstructPlaylistUrl } from '@/lib/deck-pointer';
import { markDeclined } from '@/lib/import-session';
import { extractFromDeezerUrl } from '@/lib/playlist-extractor';

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
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      <ScreenHeader title="Import deck" />
      <View className="flex-1 px-5 pb-5">
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
    <View className="flex-1 items-center justify-center gap-7">
      <BrandMark size={88} spinning glow="lime" />
      <Text
        className="text-foreground text-center"
        style={{
          fontFamily: 'Nunito_900Black',
          fontSize: 24,
          lineHeight: 26,
          letterSpacing: -0.48,
        }}
      >
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
    <View className="flex-1 items-center justify-center gap-5">
      <InlineAlert tone="red" icon="alert-circle">
        <Text
          className="text-red"
          style={{
            fontFamily: 'Nunito_700Bold',
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {message}
        </Text>
      </InlineAlert>
      <PushButton
        variant="ghost"
        size="md"
        onPress={onBack}
        accessibilityLabel="Back to Library"
      >
        Back to Library
      </PushButton>
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
      <View className="gap-4 pt-6">
        <Text
          className="text-navy400"
          style={{
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 12,
            letterSpacing: 1.44,
            textTransform: 'uppercase',
          }}
        >
          Import this deck?
        </Text>
        <Surface>
          <View className="gap-2">
            <Text
              className="text-foreground"
              style={{
                fontFamily: 'Nunito_900Black',
                fontSize: 28,
                lineHeight: 32,
                letterSpacing: -0.56,
              }}
              numberOfLines={3}
            >
              {name}
            </Text>
            <Text
              className="text-navy200"
              style={{
                fontFamily: 'Nunito_600SemiBold',
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {trackCount === 1 ? '1 track' : `${trackCount} tracks`}
            </Text>
          </View>
        </Surface>
      </View>
      <View className="gap-3">
        <PushButton
          variant="primary"
          size="lg"
          fullWidth
          onPress={onImport}
          accessibilityLabel="Import this deck"
        >
          Import this deck
        </PushButton>
        <PushButton
          variant="ghost"
          size="lg"
          fullWidth
          onPress={onNotNow}
          accessibilityLabel="Not now"
        >
          Not now
        </PushButton>
      </View>
    </View>
  );
}

import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { deckLibrary } from '@/lib/deck-library';
import { extractFromDeezerUrl, type ExtractError } from '@/lib/playlist-extractor';
import type { Card, Deck } from '@/lib/types';

const LIME = 'rgb(200 232 74)';

type ResolvingState =
  | { kind: 'working' }
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

export default function ResolvingScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url?: string }>();
  const [state, setState] = useState<ResolvingState>({ kind: 'working' });
  // Strict mode and React Fast Refresh can fire effects twice; the network
  // call is idempotent but a second save would double the deck. Guard once.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (typeof url !== 'string' || url === '') {
      setState({ kind: 'error', message: "That doesn't look like a Deezer playlist link." });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const result = await extractFromDeezerUrl(url);
        if (cancelled) return;
        const cards: Card[] = result.tracks.map((t) => ({
          isrc: t.isrc,
          artist: t.artist,
          title: t.title,
          year: null,
        }));
        const deck: Deck = {
          id: Crypto.randomUUID(),
          name: result.name,
          sourceUrl: url,
          createdAt: Date.now(),
          cards,
        };
        await deckLibrary.save(deck);
        if (cancelled) return;
        router.replace('/');
      } catch (err) {
        if (cancelled) return;
        const message = isExtractError(err)
          ? mapError(err)
          : "Couldn't load the playlist.";
        setState({ kind: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, url]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8 gap-6">
        {state.kind === 'working' && (
          <View className="items-center gap-4">
            <ActivityIndicator size="large" color={LIME} />
            <Text className="font-display text-foreground text-2xl text-center">
              Working on your deck…
            </Text>
            <Text className="font-body text-muted-foreground text-base text-center">
              Fetching tracks from Deezer.
            </Text>
          </View>
        )}
        {state.kind === 'error' && (
          <View className="items-center gap-4 w-full">
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

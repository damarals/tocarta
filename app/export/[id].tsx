import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { deckLibrary } from '@/lib/deck-library';
import type { Deck } from '@/lib/types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; deck: Deck }
  | { kind: 'not-found' };

const LIME = 'rgb(200 232 74)';

export default function ExportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setState({ kind: 'not-found' });
      return;
    }
    deckLibrary
      .load(id)
      .then((deck) => {
        if (cancelled) return;
        setState(deck === null ? { kind: 'not-found' } : { kind: 'loaded', deck });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: 'not-found' });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8 gap-4">
        {state.kind === 'loading' && <ActivityIndicator color={LIME} />}
        {state.kind === 'not-found' && (
          <Text className="font-body text-muted-foreground text-base text-center">
            Deck not found.
          </Text>
        )}
        {state.kind === 'loaded' && (
          <View className="items-center gap-3">
            <Text className="font-display text-foreground text-3xl text-center">
              {state.deck.name}
            </Text>
            <Text className="font-body text-muted-foreground text-base text-center">
              Export coming in #7.
            </Text>
          </View>
        )}
        <Pressable
          onPress={() => router.back()}
          role="button"
          accessibilityLabel="Back"
          className="mt-4 items-center justify-center rounded-full bg-primary px-6 py-3 active:bg-primary/90"
        >
          <Text className="font-body text-primary-foreground text-base font-bold">
            Back
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

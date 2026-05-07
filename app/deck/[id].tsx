import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { deckLibrary } from '@/lib/deck-library';
import type { Deck } from '@/lib/types';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; deck: Deck }
  | { kind: 'not-found' };

export default function DeckDetailScreen() {
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
      <View className="flex-1 items-center justify-center px-8">
        {state.kind === 'loading' && (
          <View className="items-center gap-3">
            <ActivityIndicator color="rgb(200 232 74)" />
            <Text className="font-body text-muted-foreground text-base">Loading…</Text>
          </View>
        )}
        {state.kind === 'not-found' && (
          <Text className="font-body text-muted-foreground text-base text-center">
            Deck not found.
          </Text>
        )}
        {state.kind === 'loaded' && (
          <View className="items-center">
            <Text className="font-display text-foreground text-3xl text-center">
              {state.deck.name}
            </Text>
            <Text className="font-body text-muted-foreground text-base text-center mt-3">
              {state.deck.cards.length} cards
            </Text>
            <Text className="font-body text-muted-foreground text-sm text-center mt-6">
              Detail screen coming in #6.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

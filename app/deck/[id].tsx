import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { deckLibrary } from '@/lib/deck-library';
import type { Deck } from '@/lib/types';
import { tokens } from '@/theme/tokens';

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
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-background">
      <ScreenHeader title="Deck" />
      <View className="flex-1 items-center justify-center px-8">
        {state.kind === 'loading' && (
          <View className="items-center gap-3">
            <ActivityIndicator color={tokens.colors.lime} />
            <Text
              className="text-navy200"
              style={{
                fontFamily: 'Nunito_600SemiBold',
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              Loading…
            </Text>
          </View>
        )}
        {state.kind === 'not-found' && (
          <Text
            className="text-foreground text-center"
            style={{
              fontFamily: 'Nunito_900Black',
              fontSize: 22,
              lineHeight: 26,
              letterSpacing: -0.36,
            }}
          >
            Deck not found.
          </Text>
        )}
        {state.kind === 'loaded' && (
          <View className="items-center gap-3">
            <Text
              className="text-foreground text-center"
              style={{
                fontFamily: 'Nunito_900Black',
                fontSize: 28,
                lineHeight: 32,
                letterSpacing: -0.56,
              }}
              numberOfLines={3}
            >
              {state.deck.name}
            </Text>
            <Text
              className="text-navy200 text-center"
              style={{
                fontFamily: 'Nunito_600SemiBold',
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {state.deck.cards.length === 1
                ? '1 card'
                : `${state.deck.cards.length} cards`}
            </Text>
            <Text
              className="text-navy400 text-center mt-4"
              style={{
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 11,
                lineHeight: 14,
              }}
            >
              Detail screen coming in a follow-up.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

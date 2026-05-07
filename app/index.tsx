import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand/BrandMark';
import { Wordmark } from '@/components/brand/Wordmark';
import { DeckCard } from '@/components/library/DeckCard';
import { EmptyLibrary } from '@/components/library/EmptyLibrary';
import { FirstLaunchBanner } from '@/components/library/FirstLaunchBanner';
import { NewDeckFAB } from '@/components/library/NewDeckFAB';
import { ScanCTA } from '@/components/library/ScanCTA';
import { Text } from '@/components/ui/text';
import { deckLibrary } from '@/lib/deck-library';
import { tokens } from '@/theme/tokens';
import type { Deck } from '@/lib/types';

type LibraryState =
  | { kind: 'loading' }
  | { kind: 'loaded'; decks: Deck[] };

export default function LibraryScreen() {
  const router = useRouter();
  const [state, setState] = useState<LibraryState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    deckLibrary
      .list()
      .then((decks) => {
        if (cancelled) return;
        setState({ kind: 'loaded', decks });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: 'loaded', decks: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      deckLibrary
        .list()
        .then((decks) => {
          if (cancelled) return;
          setState({ kind: 'loaded', decks });
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const confirmDelete = useCallback((deck: Deck) => {
    Alert.alert(
      `Delete "${deck.name}"?`,
      'This is permanent. Year overrides for this deck will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deckLibrary
              .delete(deck.id)
              .then(() => {
                setState((current) =>
                  current.kind === 'loaded'
                    ? { kind: 'loaded', decks: current.decks.filter((d) => d.id !== deck.id) }
                    : current,
                );
              })
              .catch((err) => {
                Alert.alert('Could not delete deck', String(err));
              });
          },
        },
      ],
    );
  }, []);

  const deckCount = state.kind === 'loaded' ? state.decks.length : 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2.5 px-5 pt-5 pb-4">
        <BrandMark size={36} />
        <Wordmark size={22} variant="split" />
      </View>

      <View className="px-5">
        <FirstLaunchBanner className="mb-4" />
      </View>

      <View className="px-5 pb-5">
        <ScanCTA onPress={() => router.push('/scan')} />
      </View>

      {state.kind === 'loaded' && state.decks.length > 0 && (
        <View className="px-5 mt-1 mb-3">
          <Text
            className="font-display text-navy400 text-xs"
            style={{
              fontFamily: 'Nunito_800ExtraBold',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Your decks · {deckCount}
          </Text>
        </View>
      )}

      {state.kind === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.colors.lime} />
        </View>
      )}

      {state.kind === 'loaded' && state.decks.length === 0 && <EmptyLibrary />}

      {state.kind === 'loaded' && state.decks.length > 0 && (
        <FlatList
          data={state.decks}
          keyExtractor={(deck) => deck.id}
          contentContainerClassName="px-5 pb-32 gap-3.5"
          renderItem={({ item }) => (
            <DeckCard
              deck={item}
              onPress={() => router.push(`/deck/${item.id}`)}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      )}

      <NewDeckFAB onPress={() => router.push('/generate')} />
    </SafeAreaView>
  );
}

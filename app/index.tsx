import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/library/BrandMark';
import { DeckCard } from '@/components/library/DeckCard';
import { EmptyLibrary } from '@/components/library/EmptyLibrary';
import { FirstLaunchBanner } from '@/components/library/FirstLaunchBanner';
import { NewDeckFAB } from '@/components/library/NewDeckFAB';
import { Wordmark } from '@/components/library/Wordmark';
import { deckLibrary } from '@/lib/deck-library';
import type { Deck } from '@/lib/types';

type LibraryState =
  | { kind: 'loading' }
  | { kind: 'loaded'; decks: Deck[] };

const LIME = 'rgb(200 232 74)';

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

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-6 pt-2 pb-4">
        <BrandMark />
        <Wordmark className="text-foreground" />
      </View>
      <FirstLaunchBanner />
      {state.kind === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={LIME} />
        </View>
      )}
      {state.kind === 'loaded' && state.decks.length === 0 && <EmptyLibrary />}
      {state.kind === 'loaded' && state.decks.length > 0 && (
        <FlatList
          data={state.decks}
          keyExtractor={(deck) => deck.id}
          contentContainerClassName="px-6 pt-4 pb-32 gap-3"
          renderItem={({ item }) => (
            <DeckCard
              deck={item}
              onPress={() => router.push(`/deck/${item.id}`)}
              onLongPress={() => confirmDelete(item)}
            />
          )}
        />
      )}
      <NewDeckFAB />
    </SafeAreaView>
  );
}

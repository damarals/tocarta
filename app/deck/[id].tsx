import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeptRow } from '@/components/deck/KeptRow';
import { Dot } from '@/components/ui/dot';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Pill } from '@/components/ui/pill';
import { PushButton } from '@/components/ui/push-button';
import { Text } from '@/components/ui/text';
import type { DroppedTrack } from '@/lib/deck-generator';
import { deckLibrary } from '@/lib/deck-library';
import { takePostGenerationDrops } from '@/lib/post-generation-store';
import type { Card, Deck } from '@/lib/types';
import { tokens } from '@/theme/tokens';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; deck: Deck; drops: DroppedTrack[] }
  | { kind: 'not-found' };

type DeckRow =
  | { kind: 'kept'; card: Card }
  | { kind: 'dropped'; track: DroppedTrack };

const SUBTITLE_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

function rowKey(row: DeckRow, index: number): string {
  if (row.kind === 'kept') return `k:${row.card.isrc}`;
  return `d:${index}:${row.track.artist}:${row.track.title}`;
}

function buildRows(deck: Deck, drops: DroppedTrack[]): DeckRow[] {
  const rows: DeckRow[] = deck.cards.map((card) => ({ kind: 'kept', card }));
  for (const track of drops) rows.push({ kind: 'dropped', track });
  return rows;
}

function dropPercent(kept: number, dropped: number): number {
  const total = kept + dropped;
  if (total === 0) return 0;
  return Math.round((dropped / total) * 100);
}

function formatCreatedAt(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString('en-US', SUBTITLE_DATE_OPTIONS);
}

function buildSubtitle(
  keptCount: number,
  droppedCount: number,
  createdAt: number,
): string {
  const cards = `${keptCount} ${keptCount === 1 ? 'card' : 'cards'}`;
  if (droppedCount > 0) return `${cards} · ${droppedCount} skipped`;
  return `${cards} · created ${formatCreatedAt(createdAt)}`;
}

export default function DeckDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [editingIsrc, setEditingIsrc] = useState<string | null>(null);

  // Single-shot: takePostGenerationDrops consumes from the store; capture once on mount.
  const dropsRef = useRef<DroppedTrack[] | null>(null);

  const reload = useCallback(
    async (deckId: string): Promise<void> => {
      try {
        const deck = await deckLibrary.load(deckId);
        if (deck === null) {
          setState({ kind: 'not-found' });
          return;
        }
        const drops = dropsRef.current ?? [];
        setState({ kind: 'loaded', deck, drops });
      } catch {
        setState({ kind: 'not-found' });
      }
    },
    [],
  );

  useEffect(() => {
    if (!id) {
      setState({ kind: 'not-found' });
      return;
    }
    if (dropsRef.current === null) {
      dropsRef.current = takePostGenerationDrops(id);
    }
    void reload(id);
  }, [id, reload]);

  // Dismiss the year editor on Android hardware back without committing.
  useEffect(() => {
    if (editingIsrc === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setEditingIsrc(null);
      return true;
    });
    return () => sub.remove();
  }, [editingIsrc]);

  // Tapping outside the input collapses the soft keyboard via FlatList's
  // keyboardShouldPersistTaps="handled". Mirror that to dismiss the editor.
  useEffect(() => {
    if (editingIsrc === null) return;
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      setEditingIsrc(null);
    });
    return () => sub.remove();
  }, [editingIsrc]);

  const onCommitOverride = useCallback(
    async (deckId: string, isrc: string, year: number): Promise<void> => {
      await deckLibrary.updateYearOverride(deckId, isrc, year);
      setEditingIsrc(null);
      await reload(deckId);
    },
    [reload],
  );

  const onRename = useCallback(
    async (deckId: string, name: string): Promise<void> => {
      await deckLibrary.updateName(deckId, name);
      setState((current) =>
        current.kind === 'loaded'
          ? { ...current, deck: { ...current.deck, name } }
          : current,
      );
    },
    [],
  );

  const onDelete = useCallback(
    async (deckId: string): Promise<void> => {
      await deckLibrary.delete(deckId);
      router.replace('/');
    },
    [router],
  );

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-background">
      {state.kind === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.colors.lime} />
        </View>
      )}

      {state.kind === 'not-found' && (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text
            className="font-display text-foreground text-center"
            style={{
              fontFamily: 'Nunito_900Black',
              fontSize: 22,
              lineHeight: 26,
              letterSpacing: -0.36,
            }}
          >
            Deck not found.
          </Text>
          <PushButton
            variant="primary"
            size="md"
            onPress={() => router.replace('/')}
            accessibilityLabel="Back to library"
          >
            Back to library
          </PushButton>
        </View>
      )}

      {state.kind === 'loaded' && (
        <LoadedDeck
          deck={state.deck}
          drops={state.drops}
          editingIsrc={editingIsrc}
          onStartEdit={(isrc) => setEditingIsrc(isrc)}
          onCommitOverride={onCommitOverride}
          onOpenCard={(isrc) => router.push(`/card/${state.deck.id}/${isrc}`)}
          onExport={() => router.push(`/export/${state.deck.id}`)}
          onRename={onRename}
          onDelete={onDelete}
        />
      )}
    </SafeAreaView>
  );
}

type LoadedDeckProps = {
  deck: Deck;
  drops: DroppedTrack[];
  editingIsrc: string | null;
  onStartEdit: (isrc: string) => void;
  onCommitOverride: (deckId: string, isrc: string, year: number) => Promise<void>;
  onOpenCard: (isrc: string) => void;
  onExport: () => void;
  onRename: (deckId: string, name: string) => Promise<void>;
  onDelete: (deckId: string) => Promise<void>;
};

type FilterKind = 'all' | 'kept' | 'dropped';

function LoadedDeck({
  deck,
  drops,
  editingIsrc,
  onStartEdit,
  onCommitOverride,
  onOpenCard,
  onExport,
  onRename,
  onDelete,
}: LoadedDeckProps): React.ReactElement {
  const rows = useMemo(() => buildRows(deck, drops), [deck, drops]);
  const keptCount = deck.cards.length;
  const droppedCount = drops.length;
  const hasDrops = droppedCount > 0;
  const total = keptCount + droppedCount;
  const percent = dropPercent(keptCount, droppedCount);
  const isSparse = total > 0 && percent > 30;
  const hasMinorDrops = !isSparse && hasDrops;
  const firstDrop = drops[0];
  const subtitle = buildSubtitle(keptCount, droppedCount, deck.createdAt);
  const [filter, setFilter] = useState<FilterKind>('all');
  const visibleRows = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.kind === filter)),
    [rows, filter],
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      `Delete "${deck.name}"?`,
      'This is permanent. Year overrides for this deck will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(deck.id).catch((err) => {
              Alert.alert('Could not delete deck', String(err));
            });
          },
        },
      ],
    );
  }, [deck.id, deck.name, onDelete]);

  // The min-height: 0 flexbox fix referenced by #5: parent flex containers
  // must allow children to shrink below their content. On RN, putting a
  // FlatList directly inside a `flex-1` View works; the gotcha to avoid is
  // wrapping the list in a ScrollView, which silently breaks scrolling.
  return (
    <View className="flex-1" style={{ minHeight: 0 }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <RNText
                style={{
                  fontFamily: 'Nunito_900Black',
                  fontSize: 18,
                  lineHeight: 22,
                  letterSpacing: -0.18,
                  color: tokens.colors.navy50,
                }}
                numberOfLines={1}
              >
                {deck.name}
              </RNText>
              <RNText
                style={{
                  fontFamily: 'JetBrainsMono_500Medium',
                  fontSize: 11,
                  lineHeight: 14,
                  color: tokens.colors.navy400,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </RNText>
            </View>
          ),
          headerRight: () => (
            <View className="flex-row items-center gap-2">
              <PushButton
                variant="primary"
                size="sm"
                onPress={onExport}
                accessibilityLabel="Export PDF"
                icon={<Ionicons name="download" size={14} color={tokens.colors.navy900} />}
              >
                Export PDF
              </PushButton>
              <Pressable
                onPress={() => setMenuOpen(true)}
                role="button"
                accessibilityLabel="Deck actions"
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-2xl active:bg-navy700/50"
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color={tokens.colors.navy50}
                />
              </Pressable>
            </View>
          ),
        }}
      />

      <DeckActionsMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onRename={() => {
          setMenuOpen(false);
          setRenameOpen(true);
        }}
        onDelete={() => {
          setMenuOpen(false);
          confirmDelete();
        }}
      />

      <RenameDeckModal
        visible={renameOpen}
        initialName={deck.name}
        onClose={() => setRenameOpen(false)}
        onCommit={async (name) => {
          await onRename(deck.id, name);
          setRenameOpen(false);
        }}
      />

      <FlatList
        data={visibleRows}
        keyExtractor={(row, idx) => rowKey(row, idx)}
        contentContainerClassName="px-5 pt-2 pb-12 gap-2"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          hasDrops ? (
            <View className="gap-3 pb-3">
              {isSparse && (
                <InlineAlert tone="red" icon="warning">
                  <Text
                    className="text-red"
                    style={{
                      fontFamily: 'Nunito_700Bold',
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    <Text
                      className="text-red"
                      style={{
                        fontFamily: 'Nunito_900Black',
                        fontSize: 13,
                        lineHeight: 18,
                      }}
                    >
                      {percent}% of tracks dropped.
                    </Text>
                    {' '}That&apos;s a sparse deck. Consider a different playlist.
                  </Text>
                </InlineAlert>
              )}
              {hasMinorDrops && firstDrop && (
                <InlineAlert tone="gold" icon="information-circle">
                  <Text
                    className="text-gold"
                    style={{
                      fontFamily: 'Nunito_700Bold',
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    <Text
                      className="text-gold"
                      style={{
                        fontFamily: 'Nunito_900Black',
                        fontSize: 13,
                        lineHeight: 18,
                      }}
                    >
                      {droppedCount === 1 ? '1 skipped.' : `${droppedCount} skipped.`}
                    </Text>
                    {' '}Example: &ldquo;{firstDrop.artist} — {firstDrop.title}&rdquo;.
                  </Text>
                </InlineAlert>
              )}

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() =>
                    setFilter((prev) => (prev === 'kept' ? 'all' : 'kept'))
                  }
                  role="button"
                  accessibilityLabel={
                    filter === 'kept' ? 'Show all' : 'Filter to kept cards'
                  }
                  accessibilityState={{ selected: filter === 'kept' }}
                  style={{ opacity: filter === 'dropped' ? 0.4 : 1 }}
                >
                  <Pill tone="lime">
                    <Dot color="lime" />
                    <Text
                      className="text-limeL"
                      style={{
                        fontFamily: 'Nunito_800ExtraBold',
                        fontSize: 11,
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      {`${keptCount} ${keptCount === 1 ? 'card' : 'cards'}`}
                    </Text>
                  </Pill>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setFilter((prev) =>
                      prev === 'dropped' ? 'all' : 'dropped',
                    )
                  }
                  role="button"
                  accessibilityLabel={
                    filter === 'dropped'
                      ? 'Show all'
                      : 'Filter to skipped tracks'
                  }
                  accessibilityState={{ selected: filter === 'dropped' }}
                  style={{ opacity: filter === 'kept' ? 0.4 : 1 }}
                >
                  <Pill tone="red">
                    <Dot color="red" />
                    <Text
                      className="text-red"
                      style={{
                        fontFamily: 'Nunito_800ExtraBold',
                        fontSize: 11,
                        letterSpacing: 1.4,
                        textTransform: 'uppercase',
                      }}
                    >
                      {`${droppedCount} skipped`}
                    </Text>
                  </Pill>
                </Pressable>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.kind === 'dropped') {
            return <DroppedRow track={item.track} />;
          }
          const isEditing = editingIsrc === item.card.isrc;
          return (
            <KeptRow
              card={item.card}
              isEditing={isEditing}
              onStartEdit={() => onStartEdit(item.card.isrc)}
              onCommit={(year) => onCommitOverride(deck.id, item.card.isrc, year)}
              onOpenCard={() => onOpenCard(item.card.isrc)}
            />
          );
        }}
      />
    </View>
  );
}

function DroppedRow({ track }: { track: DroppedTrack }): React.ReactElement {
  return (
    <View
      accessibilityLabel={`Dropped: ${track.artist} — ${track.title}`}
      className="rounded-2xl border-[1.5px] bg-red/10 p-4"
      style={{ borderColor: '#8A1F1F' }}
    >
      <View className="flex-row items-center gap-2">
        <View className="flex-1 min-w-0">
          <Text
            className="text-foreground"
            style={{
              fontFamily: 'Nunito_800ExtraBold',
              fontSize: 14,
              lineHeight: 18,
            }}
            numberOfLines={1}
          >
            {track.title}
          </Text>
          <Text
            className="text-red mt-0.5"
            style={{
              fontFamily: 'Nunito_600SemiBold',
              fontSize: 12,
              lineHeight: 16,
            }}
            numberOfLines={1}
          >
            {dropReasonCopy(track.reason)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function dropReasonCopy(reason: DroppedTrack['reason']): string {
  // The DropReason union itself is plain English already; the wrapper exists
  // so the screen never has to reach for the underlying enum value and so
  // future reasons can be remapped here without touching the row component.
  return reason;
}

type DeckActionsMenuProps = {
  visible: boolean;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
};

function DeckActionsMenu({
  visible,
  onClose,
  onRename,
  onDelete,
}: DeckActionsMenuProps): React.ReactElement {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/50 items-end justify-start"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="mt-16 mr-3 rounded-2xl bg-navy800 border-[1.5px] border-navy600 overflow-hidden"
          style={{ minWidth: 200 }}
        >
          <Pressable
            onPress={onRename}
            role="button"
            accessibilityLabel="Rename deck"
            className="flex-row items-center gap-3 px-4 py-3 active:bg-navy700"
          >
            <Ionicons name="pencil" size={18} color={tokens.colors.navy50} />
            <RNText
              style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 15,
                color: tokens.colors.navy50,
              }}
            >
              Rename deck
            </RNText>
          </Pressable>
          <View className="h-px bg-navy600" />
          <Pressable
            onPress={onDelete}
            role="button"
            accessibilityLabel="Delete deck"
            className="flex-row items-center gap-3 px-4 py-3 active:bg-navy700"
          >
            <Ionicons name="trash" size={18} color={tokens.colors.red} />
            <RNText
              style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 15,
                color: tokens.colors.red,
              }}
            >
              Delete deck
            </RNText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type RenameDeckModalProps = {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onCommit: (name: string) => Promise<void>;
};

function RenameDeckModal({
  visible,
  initialName,
  onClose,
  onCommit,
}: RenameDeckModalProps): React.ReactElement {
  const [text, setText] = useState(initialName);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setText(initialName);
      setBusy(false);
    }
  }, [visible, initialName]);

  const trimmed = text.trim();
  const canCommit = trimmed.length > 0 && !busy;

  const submit = async (): Promise<void> => {
    if (!canCommit) return;
    setBusy(true);
    try {
      await onCommit(trimmed);
    } catch (err) {
      Alert.alert('Could not rename deck', String(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/60 items-center justify-center px-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full rounded-2xl bg-navy800 border-[1.5px] border-navy600 p-5 gap-4"
          style={{ maxWidth: 420 }}
        >
          <RNText
            style={{
              fontFamily: 'Nunito_900Black',
              fontSize: 18,
              lineHeight: 22,
              color: tokens.colors.navy50,
            }}
          >
            Rename deck
          </RNText>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => {
              void submit();
            }}
            autoFocus
            editable={!busy}
            selectTextOnFocus
            returnKeyType="done"
            accessibilityLabel="Deck name"
            placeholder="Deck name"
            placeholderTextColor="rgb(168 179 199 / 0.5)"
            style={{
              color: tokens.colors.navy50,
              fontFamily: 'Nunito_700Bold',
              fontSize: 16,
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
            className="rounded-xl border-[1.5px] border-lime bg-navy900"
          />
          <View className="flex-row justify-end gap-2">
            <PushButton
              variant="ghost"
              size="sm"
              onPress={onClose}
              accessibilityLabel="Cancel rename"
              disabled={busy}
            >
              Cancel
            </PushButton>
            <PushButton
              variant="primary"
              size="sm"
              onPress={() => {
                void submit();
              }}
              accessibilityLabel="Save name"
              disabled={!canCommit}
            >
              Save
            </PushButton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

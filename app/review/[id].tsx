import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Dot } from '@/components/ui/dot';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Pill } from '@/components/ui/pill';
import { PushButton } from '@/components/ui/push-button';
import { Text } from '@/components/ui/text';
import type { DroppedTrack } from '@/lib/deck-generator';
import { deckLibrary } from '@/lib/deck-library';
import { takePostGenerationDrops } from '@/lib/post-generation-store';
import type { Card, Deck } from '@/lib/types';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; deck: Deck; drops: DroppedTrack[] }
  | { kind: 'not-found' };

type ReviewRow =
  | { kind: 'kept'; card: Card }
  | { kind: 'dropped'; track: DroppedTrack };

const MIN_VALID_YEAR = 1900;
const MAX_VALID_YEAR = new Date().getFullYear();

function rowKey(row: ReviewRow, index: number): string {
  if (row.kind === 'kept') return `k:${row.card.isrc}`;
  return `d:${index}:${row.track.artist}:${row.track.title}`;
}

function buildRows(deck: Deck, drops: DroppedTrack[]): ReviewRow[] {
  const rows: ReviewRow[] = deck.cards.map((card) => ({ kind: 'kept', card }));
  for (const track of drops) rows.push({ kind: 'dropped', track });
  return rows;
}

function dropPercent(kept: number, dropped: number): number {
  const total = kept + dropped;
  if (total === 0) return 0;
  return Math.round((dropped / total) * 100);
}

export default function ReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [editingIsrc, setEditingIsrc] = useState<string | null>(null);

  // Read drops once on mount; re-renders must not re-take from the store.
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

  const onCommitOverride = useCallback(
    async (deckId: string, isrc: string, year: number): Promise<void> => {
      await deckLibrary.updateYearOverride(deckId, isrc, year);
      setEditingIsrc(null);
      await reload(deckId);
    },
    [reload],
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
        <LoadedReview
          deck={state.deck}
          drops={state.drops}
          editingIsrc={editingIsrc}
          onStartEdit={(isrc) => setEditingIsrc(isrc)}
          onCommitOverride={onCommitOverride}
          onOpenCard={(isrc) => router.push(`/card/${state.deck.id}/${isrc}`)}
          onExport={() => router.push(`/export/${state.deck.id}`)}
        />
      )}
    </SafeAreaView>
  );
}

type LoadedReviewProps = {
  deck: Deck;
  drops: DroppedTrack[];
  editingIsrc: string | null;
  onStartEdit: (isrc: string) => void;
  onCommitOverride: (deckId: string, isrc: string, year: number) => Promise<void>;
  onOpenCard: (isrc: string) => void;
  onExport: () => void;
};

function LoadedReview({
  deck,
  drops,
  editingIsrc,
  onStartEdit,
  onCommitOverride,
  onOpenCard,
  onExport,
}: LoadedReviewProps): React.ReactElement {
  const rows = useMemo(() => buildRows(deck, drops), [deck, drops]);
  const keptCount = deck.cards.length;
  const droppedCount = drops.length;
  const total = keptCount + droppedCount;
  const percent = dropPercent(keptCount, droppedCount);
  const isSparse = total > 0 && percent > 30;
  const hasMinorDrops = !isSparse && droppedCount > 0;
  const firstDrop = drops[0];

  // The min-height: 0 flexbox fix referenced by #5: parent flex containers
  // must allow children to shrink below their content. On RN, putting a
  // FlatList directly inside a `flex-1` View works; the gotcha to avoid is
  // wrapping the list in a ScrollView, which silently breaks scrolling.
  return (
    <View className="flex-1" style={{ minHeight: 0 }}>
      <Stack.Screen
        options={{
          title: 'Review deck',
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
                Review deck
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
                {`${keptCount} cards${droppedCount ? ` · ${droppedCount} dropped` : ''}`}
              </RNText>
            </View>
          ),
          headerRight: () => (
            <PushButton
              variant="primary"
              size="sm"
              onPress={onExport}
              accessibilityLabel="Export PDF"
              icon={<Ionicons name="download" size={14} color={tokens.colors.navy900} />}
            >
              Export PDF
            </PushButton>
          ),
        }}
      />

      <FlatList
        data={rows}
        keyExtractor={(row, idx) => rowKey(row, idx)}
        contentContainerClassName="px-5 pt-2 pb-12 gap-2"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
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
                  {`✓ ${keptCount} ${keptCount === 1 ? 'card' : 'cards'}`}
                </Text>
              </Pill>
              {droppedCount > 0 && (
                <Pill tone="red">
                  <Text
                    className="text-red"
                    style={{
                      fontFamily: 'Nunito_800ExtraBold',
                      fontSize: 11,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {droppedCount} dropped
                  </Text>
                </Pill>
              )}
            </View>
          </View>
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

type KeptRowProps = {
  card: Card;
  isEditing: boolean;
  onStartEdit: () => void;
  onCommit: (year: number) => Promise<void>;
  onOpenCard: () => void;
};

function KeptRow({
  card,
  isEditing,
  onStartEdit,
  onCommit,
  onOpenCard,
}: KeptRowProps): React.ReactElement {
  const displayYear = card.yearOverride ?? card.year;
  const hasOverride = card.yearOverride !== undefined;

  // Row-level tap opens the card preview. The year cell is a separate inner
  // Pressable that intercepts the press so editing the year stays one tap
  // away — the OVERRIDE / EDIT caption beneath the year is the affordance.
  return (
    <Pressable
      onPress={isEditing ? undefined : onOpenCard}
      disabled={isEditing}
      role="button"
      accessibilityLabel={`Open card preview for ${card.artist} — ${card.title}`}
      className="rounded-2xl border-[1.5px] border-navy600 bg-navy800 active:opacity-90"
    >
      <View className="flex-row items-center gap-2 p-4">
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
            {card.title}
          </Text>
          <Text
            className="text-navy200 mt-0.5"
            style={{
              fontFamily: 'Nunito_600SemiBold',
              fontSize: 12,
              lineHeight: 16,
            }}
            numberOfLines={1}
          >
            {card.artist}
          </Text>
        </View>
        {isEditing ? (
          <YearEditor
            initialYear={displayYear ?? MAX_VALID_YEAR}
            onCommit={onCommit}
          />
        ) : (
          <YearDisplay
            year={displayYear}
            hasOverride={hasOverride}
            onPress={onStartEdit}
            artist={card.artist}
            title={card.title}
          />
        )}
      </View>
    </Pressable>
  );
}

type YearDisplayProps = {
  year: number | null;
  hasOverride: boolean;
  onPress: () => void;
  artist: string;
  title: string;
};

function YearDisplay({
  year,
  hasOverride,
  onPress,
  artist,
  title,
}: YearDisplayProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityLabel={`Edit year for ${artist} — ${title}`}
      hitSlop={8}
      className="items-center min-w-[56px] py-1.5 px-1"
    >
      <Text
        className={cn(
          'font-serif',
          hasOverride ? 'text-pink' : 'text-foreground',
        )}
        style={{
          fontFamily: 'Fraunces_900Black',
          fontSize: 24,
          lineHeight: 24,
          letterSpacing: -0.48,
        }}
      >
        {year ?? '—'}
      </Text>
      <Text
        className={cn(
          'mt-0.5',
          hasOverride ? 'text-pink' : 'text-navy400',
        )}
        style={{
          fontFamily: 'Nunito_800ExtraBold',
          fontSize: 9,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
        }}
      >
        {hasOverride ? 'Override' : 'edit'}
      </Text>
    </Pressable>
  );
}

type YearEditorProps = {
  initialYear: number;
  onCommit: (year: number) => Promise<void>;
};

function YearEditor({ initialYear, onCommit }: YearEditorProps): React.ReactElement {
  const [text, setText] = useState(String(initialYear));
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);

  const tryCommit = async (): Promise<void> => {
    const trimmed = text.trim();
    const parsed = Number.parseInt(trimmed, 10);
    if (
      !/^\d{4}$/.test(trimmed) ||
      Number.isNaN(parsed) ||
      parsed < MIN_VALID_YEAR ||
      parsed > MAX_VALID_YEAR
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setBusy(true);
    try {
      await onCommit(parsed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-row items-center gap-2">
      <TextInput
        value={text}
        onChangeText={(next) => {
          setText(next.replace(/\D/g, '').slice(0, 4));
          if (invalid) setInvalid(false);
        }}
        onSubmitEditing={() => {
          void tryCommit();
        }}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
        autoFocus
        editable={!busy}
        selectTextOnFocus
        accessibilityLabel="Year"
        placeholder="YYYY"
        placeholderTextColor="rgb(168 179 199 / 0.5)"
        style={{
          color: tokens.colors.navy50,
          fontFamily: 'Fraunces_900Black',
          fontSize: 18,
          textAlign: 'center',
          width: 64,
          paddingVertical: 6,
          paddingHorizontal: 8,
        }}
        className={cn(
          'rounded-xl border-[1.5px] bg-navy900',
          invalid ? 'border-red' : 'border-lime',
        )}
      />
      <Pressable
        onPress={() => {
          void tryCommit();
        }}
        disabled={busy}
        role="button"
        accessibilityLabel="Save year"
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-xl bg-lime active:opacity-90"
        style={{
          shadowColor: tokens.colors.limeD,
          shadowOpacity: 1,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Ionicons name="checkmark" size={16} color={tokens.colors.navy900} />
      </Pressable>
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

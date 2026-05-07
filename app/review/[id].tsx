import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { DroppedTrack } from '@/lib/deck-generator';
import { deckLibrary } from '@/lib/deck-library';
import { takePostGenerationDrops } from '@/lib/post-generation-store';
import type { Card, Deck } from '@/lib/types';
import { cn } from '@/lib/utils';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; deck: Deck; drops: DroppedTrack[] }
  | { kind: 'not-found' };

type ReviewRow =
  | { kind: 'kept'; card: Card }
  | { kind: 'dropped'; track: DroppedTrack };

const LIME = 'rgb(200 232 74)';
const NAVY200 = 'rgb(168 179 199)';
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
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      {state.kind === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={LIME} />
        </View>
      )}

      {state.kind === 'not-found' && (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <Text className="font-body text-muted-foreground text-base text-center">
            Deck not found.
          </Text>
          <Pressable
            onPress={() => router.replace('/')}
            role="button"
            accessibilityLabel="Back to library"
            className="items-center justify-center rounded-full bg-primary px-6 py-3 active:bg-primary/90"
          >
            <Text className="font-body text-primary-foreground text-base font-bold">
              Back to library
            </Text>
          </Pressable>
        </View>
      )}

      {state.kind === 'loaded' && (
        <LoadedReview
          deck={state.deck}
          drops={state.drops}
          editingIsrc={editingIsrc}
          onStartEdit={(isrc) => setEditingIsrc(isrc)}
          onCancelEdit={() => setEditingIsrc(null)}
          onCommitOverride={onCommitOverride}
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
  onCancelEdit: () => void;
  onCommitOverride: (deckId: string, isrc: string, year: number) => Promise<void>;
  onExport: () => void;
};

function LoadedReview({
  deck,
  drops,
  editingIsrc,
  onStartEdit,
  onCancelEdit,
  onCommitOverride,
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
      {isSparse && (
        <View className="bg-red px-6 py-3">
          <Text className="font-body text-white text-sm leading-snug">
            {percent}% of tracks dropped. That&apos;s a sparse deck. Consider a different playlist.
          </Text>
        </View>
      )}
      {hasMinorDrops && firstDrop && (
        <View className="bg-gold px-6 py-3">
          <Text className="font-body text-navy900 text-sm leading-snug">
            {droppedCount === 1 ? '1 track skipped.' : `${droppedCount} tracks skipped.`}{' '}
            Example: &ldquo;{firstDrop.artist} — {firstDrop.title}&rdquo;.
          </Text>
        </View>
      )}

      <View className="flex-row items-start justify-between gap-3 px-6 pt-4 pb-3">
        <View className="flex-1 gap-2">
          <Text className="font-display text-foreground text-2xl">Review</Text>
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-lime px-3 py-1">
              <Text className="font-body text-navy900 text-xs font-bold">
                {`✓ ${keptCount} ${keptCount === 1 ? 'card' : 'cards'}`}
              </Text>
            </View>
            {droppedCount > 0 && (
              <View className="rounded-full bg-red px-3 py-1">
                <Text className="font-body text-white text-xs font-bold">
                  {`${droppedCount} dropped`}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Button onPress={onExport} accessibilityLabel="Export PDF">
          <Text>Export PDF</Text>
        </Button>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row, idx) => rowKey(row, idx)}
        contentContainerClassName="px-6 pt-2 pb-10 gap-2"
        keyboardShouldPersistTaps="handled"
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
              onCancelEdit={onCancelEdit}
              onCommit={(year) => onCommitOverride(deck.id, item.card.isrc, year)}
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
  onCancelEdit: () => void;
  onCommit: (year: number) => Promise<void>;
};

function KeptRow({
  card,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onCommit,
}: KeptRowProps): React.ReactElement {
  const displayYear = card.yearOverride ?? card.year;
  const hasOverride = card.yearOverride !== undefined;

  return (
    <Pressable
      onPress={isEditing ? undefined : onStartEdit}
      disabled={isEditing}
      role="button"
      accessibilityLabel={`Edit year for ${card.artist} — ${card.title}`}
      className="rounded-xl border border-navy500 bg-navy700 px-4 py-3 active:bg-navy700/80"
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-1">
          <Text className="font-body text-muted-foreground text-sm" numberOfLines={1}>
            {card.artist}
          </Text>
          <Text
            className="font-body text-foreground text-base font-bold"
            numberOfLines={1}
          >
            {card.title}
          </Text>
        </View>
        {isEditing ? (
          <YearEditor
            initialYear={displayYear ?? MAX_VALID_YEAR}
            onCommit={onCommit}
            onCancel={onCancelEdit}
          />
        ) : (
          <YearDisplay year={displayYear} hasOverride={hasOverride} />
        )}
      </View>
    </Pressable>
  );
}

type YearDisplayProps = {
  year: number | null;
  hasOverride: boolean;
};

function YearDisplay({ year, hasOverride }: YearDisplayProps): React.ReactElement {
  return (
    <View className="items-end min-w-[64px]">
      <Text
        className={cn(
          'font-display text-2xl',
          hasOverride ? 'text-pink' : 'text-foreground',
        )}
        style={{ fontSize: 24, lineHeight: 28 }}
      >
        {year ?? '—'}
      </Text>
      <Text
        className={cn(
          'font-body text-[10px] font-bold tracking-widest mt-0.5',
          hasOverride ? 'text-pink' : 'text-muted-foreground',
        )}
      >
        {hasOverride ? 'OVERRIDE' : 'EDIT'}
      </Text>
    </View>
  );
}

type YearEditorProps = {
  initialYear: number;
  onCommit: (year: number) => Promise<void>;
  onCancel: () => void;
};

function YearEditor({ initialYear, onCommit, onCancel }: YearEditorProps): React.ReactElement {
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
          setText(next);
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
        style={{ color: NAVY200, fontFamily: 'Fraunces', fontSize: 20, minWidth: 72 }}
        className={cn(
          'rounded-lg border bg-navy900 px-3 py-2 text-center',
          invalid ? 'border-red' : 'border-navy500',
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
        className="h-9 w-9 items-center justify-center rounded-full bg-lime active:bg-lime/90"
      >
        <Ionicons name="checkmark" size={20} color="rgb(13 20 34)" />
      </Pressable>
      <Pressable
        onPress={onCancel}
        disabled={busy}
        role="button"
        accessibilityLabel="Cancel edit"
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full bg-navy500 active:bg-navy500/80"
      >
        <Ionicons name="close" size={18} color="rgb(168 179 199)" />
      </Pressable>
    </View>
  );
}

function DroppedRow({ track }: { track: DroppedTrack }): React.ReactElement {
  return (
    <View
      accessibilityLabel={`Dropped: ${track.artist} — ${track.title}`}
      className="rounded-xl border border-red bg-red/15 px-4 py-3"
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-1">
          <Text className="font-body text-muted-foreground text-sm" numberOfLines={1}>
            {track.artist}
          </Text>
          <Text
            className="font-body text-foreground text-base font-bold"
            numberOfLines={1}
          >
            {track.title}
          </Text>
          <Text className="font-body text-red text-xs mt-0.5" numberOfLines={1}>
            {dropReasonCopy(track.reason)}
          </Text>
        </View>
        <View className="items-end min-w-[64px]">
          <Text
            className="font-display text-muted-foreground"
            style={{ fontSize: 24, lineHeight: 28 }}
          >
            —
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

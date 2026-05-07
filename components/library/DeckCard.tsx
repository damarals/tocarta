import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { Card, Deck } from '@/lib/types';

export type DeckStatus =
  | { kind: 'ready' }
  | { kind: 'resolving'; percent: number }
  | { kind: 'dropped'; count: number };

type DeckCardProps = {
  deck: Deck;
  onPress?: () => void;
  onLongPress?: () => void;
  className?: string;
};

const EM_DASH = '—';

const cardYear = (card: Card): number => card.yearOverride ?? card.year;

function deckStatus(_deck: Deck): DeckStatus {
  return { kind: 'ready' };
}

function statusLabel(status: DeckStatus): string {
  switch (status.kind) {
    case 'ready':
      return 'Ready';
    case 'resolving':
      return `Resolving · ${status.percent}%`;
    case 'dropped':
      return `${status.count} dropped`;
  }
}

const STATUS_PILL_CLASSES: Record<DeckStatus['kind'], string> = {
  ready: 'bg-primary',
  resolving: 'bg-gold',
  dropped: 'bg-red',
};

const STATUS_TEXT_CLASSES: Record<DeckStatus['kind'], string> = {
  ready: 'text-primary-foreground',
  resolving: 'text-navy900',
  dropped: 'text-navy900',
};

function cardCountLabel(count: number): string {
  return count === 1 ? '1 card' : `${count} cards`;
}

function yearRangeLabel(cards: Card[]): string {
  if (cards.length === 0) return EM_DASH;
  let min = cardYear(cards[0]);
  let max = min;
  for (let i = 1; i < cards.length; i++) {
    const y = cardYear(cards[i]);
    if (y < min) min = y;
    if (y > max) max = y;
  }
  if (min === max) return String(min);
  return `${min} ${EM_DASH} ${max}`;
}

export function DeckCard({ deck, onPress, onLongPress, className }: DeckCardProps) {
  const status = deckStatus(deck);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      role="button"
      accessibilityLabel={`Deck ${deck.name}`}
      className={cn(
        'rounded-xl border border-navy500 bg-navy700 p-5 active:bg-navy700/80',
        className,
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <Text className="font-display text-foreground text-2xl flex-1" numberOfLines={2}>
          {deck.name}
        </Text>
        <View className={cn('rounded-full px-2.5 py-1', STATUS_PILL_CLASSES[status.kind])}>
          <Text
            className={cn(
              'font-body text-xs font-bold uppercase tracking-wide',
              STATUS_TEXT_CLASSES[status.kind],
            )}
          >
            {statusLabel(status)}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-baseline justify-between gap-3">
        <Text className="font-body text-muted-foreground text-sm">
          {cardCountLabel(deck.cards.length)}
        </Text>
        <Text className="font-display text-muted-foreground text-base">
          {yearRangeLabel(deck.cards)}
        </Text>
      </View>
    </Pressable>
  );
}

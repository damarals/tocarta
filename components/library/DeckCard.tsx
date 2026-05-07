// DeckCard — list item on the Library home. Mirrors the prototype's
// `DeckCard` in docs/design/screens.jsx: a Surface with a status pill on
// top, the deck name in Nunito 900 18px, and a meta row with the year range
// in Fraunces. The accent border tints red when tracks were dropped.
import { View } from 'react-native';

import { Dot } from '@/components/ui/dot';
import { Pill } from '@/components/ui/pill';
import { Surface, type SurfaceAccent } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
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

const cardYear = (card: Card): number | null => card.yearOverride ?? card.year;

function deckStatus(_deck: Deck): DeckStatus {
  return { kind: 'ready' };
}

function cardCountLabel(count: number): string {
  return count === 1 ? '1 card' : `${count} cards`;
}

function yearRangeLabel(cards: Card[]): string {
  let min: number | null = null;
  let max: number | null = null;
  for (const card of cards) {
    const y = cardYear(card);
    if (y === null) continue;
    if (min === null || y < min) min = y;
    if (max === null || y > max) max = y;
  }
  if (min === null || max === null) return EM_DASH;
  if (min === max) return String(min);
  return `${min} ${EM_DASH} ${max}`;
}

function StatusPill({ status }: { status: DeckStatus }) {
  switch (status.kind) {
    case 'ready':
      return (
        <Pill tone="lime">
          <Dot color="lime" />
          <Text
            className="font-display text-limeL text-[11px]"
            style={{
              fontFamily: 'Nunito_800ExtraBold',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Ready
          </Text>
        </Pill>
      );
    case 'resolving':
      return (
        <Pill tone="gold">
          <Dot color="gold" pulse />
          <Text
            className="font-display text-gold text-[11px]"
            style={{
              fontFamily: 'Nunito_800ExtraBold',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Resolving · {status.percent}%
          </Text>
        </Pill>
      );
    case 'dropped':
      return (
        <Pill tone="red">
          <Dot color="red" />
          <Text
            className="font-display text-red text-[11px]"
            style={{
              fontFamily: 'Nunito_800ExtraBold',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {status.count} dropped
          </Text>
        </Pill>
      );
  }
}

function statusAccent(status: DeckStatus): SurfaceAccent {
  switch (status.kind) {
    case 'dropped':
      return 'red';
    case 'resolving':
      return 'gold';
    case 'ready':
    default:
      return 'default';
  }
}

export function DeckCard({ deck, onPress, onLongPress, className }: DeckCardProps) {
  const status = deckStatus(deck);
  const yearRange = yearRangeLabel(deck.cards);
  return (
    <Surface
      accent={statusAccent(status)}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`Deck ${deck.name}`}
      className={className}
    >
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center">
          <StatusPill status={status} />
        </View>
        <Text
          className="font-display text-foreground text-lg"
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 18,
            letterSpacing: -0.18,
            lineHeight: 21,
          }}
          numberOfLines={2}
        >
          {deck.name}
        </Text>
        <View className="flex-row items-center">
          <Text className="font-display font-bold text-navy200 text-xs">
            {cardCountLabel(deck.cards.length)}
            <Text className="text-navy600">{'  ·  '}</Text>
            <Text className="font-serif text-navy50">{yearRange}</Text>
          </Text>
        </View>
      </View>
    </Surface>
  );
}

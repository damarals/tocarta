import { Pressable, View } from 'react-native';

import { YearDisplay } from '@/components/deck/YearDisplay';
import { MAX_VALID_YEAR, YearEditor } from '@/components/deck/YearEditor';
import { Text } from '@/components/ui/text';
import type { Card } from '@/lib/types';

type KeptRowProps = {
  card: Card;
  isEditing: boolean;
  onStartEdit: () => void;
  onCommit: (year: number) => Promise<void>;
  onOpenCard: () => void;
};

export function KeptRow({
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

import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type YearDisplayProps = {
  year: number | null;
  hasOverride: boolean;
  onPress: () => void;
  artist: string;
  title: string;
};

export function YearDisplay({
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

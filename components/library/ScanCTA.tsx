import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

type ScanCTAProps = {
  onPress?: () => void;
  className?: string;
};

/**
 * Hero call-to-action on the Library home that takes the DJ straight to the
 * Scanner. Sized large enough to dominate the upper third of the screen so a
 * mid-game tap is unmissable; lime to signal the primary action.
 */
export function ScanCTA({ onPress = () => {}, className }: ScanCTAProps) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityLabel="Open scanner"
      className={cn(
        'mx-6 flex-row items-center gap-4 rounded-2xl bg-primary px-5 py-5 active:bg-primary/90',
        className,
      )}
    >
      <View className="rounded-full bg-pink p-3">
        <Ionicons name="camera-outline" size={28} color={tokens.colors.navy900} />
      </View>
      <View className="flex-1">
        <Text className="font-display text-primary-foreground text-2xl leading-tight">
          Open scanner
        </Text>
        <Text className="font-body text-primary-foreground/80 text-sm leading-snug mt-1">
          Scan a card to play its preview.
        </Text>
      </View>
    </Pressable>
  );
}

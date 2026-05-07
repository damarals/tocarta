// ScanCTA — hero card on the Library home that launches the Scanner.
// Mirrors the prototype `ScanCTA` in docs/design/screens.jsx: a navy800
// surface with a faint BrandMark bleeding off the top-right, a "Ready to
// play" lime pill, headline copy, and a primary push button.
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { BrandMark } from '@/components/brand/BrandMark';
import { Pill } from '@/components/ui/pill';
import { PushButton } from '@/components/ui/push-button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

type ScanCTAProps = {
  onPress?: () => void;
  className?: string;
};

/**
 * Hero call-to-action on the Library home. The surface is the navy800 card
 * tone (a future enhancement is to layer a navy800→navy700 gradient, which
 * needs `expo-linear-gradient` — kept flat for now). The faint brand mark
 * top-right is positioned to bleed off the edge so only ~120px is visible.
 */
export function ScanCTA({ onPress = () => {}, className }: ScanCTAProps) {
  return (
    <View
      className={cn(
        'relative overflow-hidden rounded-3xl border-[1.5px] border-navy600 bg-navy800 p-6 shadow-card',
        className,
      )}
    >
      {/* Decorative vinyl bleeding off the top-right corner. */}
      <View
        pointerEvents="none"
        className="absolute opacity-20"
        style={{ right: -60, top: -60 }}
      >
        <BrandMark size={180} />
      </View>

      <View className="gap-3">
        <Pill tone="lime">Ready to play</Pill>
        <Text
          className="text-foreground"
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 26,
            lineHeight: 28,
            letterSpacing: -0.52,
          }}
          numberOfLines={2}
        >
          Scan a card to start the round.
        </Text>
        <View className="mt-2">
          <PushButton
            variant="primary"
            size="lg"
            fullWidth
            onPress={onPress}
            accessibilityLabel="Open scanner"
            icon={
              <Ionicons name="camera" size={20} color={tokens.colors.navy900} />
            }
          >
            Open scanner
          </PushButton>
        </View>
      </View>
    </View>
  );
}

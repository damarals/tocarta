// NewDeckFAB — pinned bottom-right shortcut to /generate. Wraps the
// PushButton primitive so it carries the signature 5px lime push shadow.
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PushButton } from '@/components/ui/push-button';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

type NewDeckFABProps = {
  onPress?: () => void;
  className?: string;
};

export function NewDeckFAB({ onPress = () => {}, className }: NewDeckFABProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ bottom: insets.bottom + 24 }}
      className={cn('absolute right-5', className)}
    >
      <PushButton
        variant="primary"
        size="lg"
        onPress={onPress}
        accessibilityLabel="New deck"
        icon={<Ionicons name="add" size={20} color={tokens.colors.navy900} />}
      >
        New deck
      </PushButton>
    </View>
  );
}

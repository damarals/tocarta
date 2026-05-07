// EmptyLibrary — shown when the deck list is empty. Centered headline and a
// brief reassuring subtext, both in Nunito.
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export function EmptyLibrary() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text
        className="font-display text-foreground text-center"
        style={{
          fontFamily: 'Nunito_900Black',
          fontSize: 24,
          letterSpacing: -0.36,
          lineHeight: 28,
        }}
      >
        No decks yet
      </Text>
      <Text
        className="font-display text-navy200 text-center text-sm mt-3"
        style={{ fontFamily: 'Nunito_600SemiBold', lineHeight: 20 }}
      >
        Create your first deck from a Deezer playlist.
      </Text>
    </View>
  );
}

import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export function EmptyLibrary() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="font-display text-foreground text-3xl text-center">
        No decks yet
      </Text>
      <Text className="font-body text-muted-foreground text-base text-center mt-3">
        Create your first deck from a Deezer playlist.
      </Text>
    </View>
  );
}

import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/library/BrandMark';
import { EmptyLibrary } from '@/components/library/EmptyLibrary';
import { NewDeckFAB } from '@/components/library/NewDeckFAB';
import { Wordmark } from '@/components/library/Wordmark';

export default function LibraryScreen() {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-6 pt-2 pb-4">
        <BrandMark />
        <Wordmark className="text-foreground" />
      </View>
      <EmptyLibrary />
      <NewDeckFAB />
    </SafeAreaView>
  );
}

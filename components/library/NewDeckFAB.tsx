import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type NewDeckFABProps = {
  onPress?: () => void;
  className?: string;
};

export function NewDeckFAB({ onPress = () => {}, className }: NewDeckFABProps) {
  return (
    <Pressable
      onPress={onPress}
      role="button"
      accessibilityLabel="New deck"
      className={cn(
        'absolute bottom-6 right-6 flex-row items-center gap-2 rounded-full bg-primary px-5 py-4 shadow-lg shadow-black/30 active:bg-primary/90',
        className
      )}
    >
      <Text className="font-body text-primary-foreground text-2xl leading-none">+</Text>
      <Text className="font-body text-primary-foreground text-base font-bold">New deck</Text>
    </Pressable>
  );
}

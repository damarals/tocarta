import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  size?: number;
};

export function BrandMark({ className, size = 40 }: BrandMarkProps) {
  return (
    <View
      className={cn(
        'items-center justify-center rounded-xl bg-navy900 border border-lime/30',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Text
        className="font-display text-lime"
        style={{ fontSize: size * 0.6, lineHeight: size * 0.7 }}
      >
        t
      </Text>
    </View>
  );
}

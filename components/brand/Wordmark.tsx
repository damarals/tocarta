import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type WordmarkProps = {
  size?: number;
  className?: string;
};

export function Wordmark({ size = 32, className }: WordmarkProps) {
  const fontSize = size * 0.875;

  return (
    <View className={cn('flex-row', className)}>
      <Text
        className="text-navy50"
        style={{
          fontSize,
          fontFamily: 'Nunito_900Black',
          letterSpacing: -0.5,
          lineHeight: fontSize * 1.05,
        }}
      >
        TO
      </Text>
      <Text
        className="text-lime"
        style={{
          fontSize,
          fontFamily: 'Nunito_900Black',
          letterSpacing: -0.5,
          lineHeight: fontSize * 1.05,
        }}
      >
        CARTA
      </Text>
    </View>
  );
}

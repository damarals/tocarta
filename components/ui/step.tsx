// Step — numbered row used inside "What happens next" surfaces. Mirrors the
// prototype `Step` in docs/design/screens.jsx: a 28×28 numbered chip on the
// left, a Nunito 700 14px title on the right, separated by a hairline
// navy700 border (suppressed when `last` is true).
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type StepProps = {
  n: number;
  text: string;
  last?: boolean;
};

export function Step({ n, text, last }: StepProps) {
  return (
    <View
      className={cn(
        'flex-row items-start gap-3 py-3',
        !last && 'border-b border-navy700',
      )}
    >
      <View className="h-7 w-7 items-center justify-center rounded-xl border-[1.5px] border-navy500 bg-navy900">
        <Text
          className="font-display text-navy200 text-sm"
          style={{ fontFamily: 'Nunito_800ExtraBold' }}
        >
          {n}
        </Text>
      </View>
      <Text
        className="font-display text-foreground text-sm flex-1"
        style={{ fontFamily: 'Nunito_700Bold', lineHeight: 20 }}
      >
        {text}
      </Text>
    </View>
  );
}

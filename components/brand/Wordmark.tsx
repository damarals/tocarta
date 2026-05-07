// Brand wordmark — vinyl mark plus bicolor TO/CARTA. Mirrors
// `docs/design/assets/wordmark.svg` and the prototype's spacing relationship
// (mark height drives the type size at ~0.875×). The text colors were the
// historical bug: on dark surfaces "TO" reads in navy50 (off-white) and
// "CARTA" picks up the lime accent — the previous `text-navy900` made the
// wordmark invisible on the navy stage.
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

import { BrandMark } from './BrandMark';

type WordmarkVariant = 'full' | 'split' | 'mark-only';

type WordmarkProps = {
  variant?: WordmarkVariant;
  size?: number;
  className?: string;
};

export function Wordmark({
  variant = 'split',
  size = 32,
  className,
}: WordmarkProps) {
  if (variant === 'mark-only') {
    return <BrandMark size={size} className={className} />;
  }

  // 'full' and 'split' render the same composition — the asset showed them
  // as one piece. Keeping the variant distinct in the API leaves room for a
  // future stacked layout without breaking call sites.
  const fontSize = size * 0.875;

  return (
    <View className={cn('flex-row items-center', className)} style={{ gap: size * 0.25 }}>
      <BrandMark size={size} />
      <View className="flex-row">
        <Text
          className="font-display text-navy50"
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
          className="font-display text-lime"
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
    </View>
  );
}

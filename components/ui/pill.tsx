// Pill — small uppercase chip used for status, callouts, and filters.
// Mirrors the prototype `Pill` in docs/design/components.jsx: a translucent
// tinted background, matching tinted border, and Nunito 800 11px tracked
// uppercase text. Optional leading dot is part of the same composition in
// the proto, so the API takes children freely (callers can pass `<Dot/>`
// alongside text).
import * as React from 'react';
import { View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type PillTone = 'default' | 'lime' | 'gold' | 'pink' | 'cyan' | 'red';

type PillProps = {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
};

const TONE_CLASSES: Record<PillTone, { surface: string; text: string }> = {
  default: { surface: 'bg-navy700/40 border-navy600', text: 'text-navy200' },
  lime: { surface: 'bg-lime/10 border-lime/40', text: 'text-limeL' },
  gold: { surface: 'bg-gold/10 border-gold/40', text: 'text-gold' },
  pink: { surface: 'bg-pink/10 border-pink/40', text: 'text-pink' },
  cyan: { surface: 'bg-cyan/10 border-cyan/40', text: 'text-cyan' },
  red: { surface: 'bg-red/10 border-red/40', text: 'text-red' },
};

export function Pill({ tone = 'default', children, className, style }: PillProps) {
  const t = TONE_CLASSES[tone];
  return (
    <View
      className={cn(
        'flex-row items-center self-start rounded-full border-[1px] px-2.5 py-1',
        t.surface,
        className,
      )}
      style={style}
    >
      {React.Children.map(children, (child) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return (
            <Text
              className={cn('font-display text-[11px]', t.text)}
              style={{
                fontFamily: 'Nunito_800ExtraBold',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              {child}
            </Text>
          );
        }
        return child;
      })}
    </View>
  );
}

export type { PillTone };

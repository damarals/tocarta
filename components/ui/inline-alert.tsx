// InlineAlert — tinted callout used for review warnings and import errors.
// Mirrors the prototype `InlineAlert` in docs/design/components.jsx: a
// translucent tinted background with a 1.5px tinted border, a leading icon
// in the tinted color, and Nunito 700 13px tinted text.
import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

type AlertTone = 'gold' | 'red' | 'cyan';

type InlineAlertProps = {
  tone?: AlertTone;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  className?: string;
};

const TONE_CLASSES: Record<AlertTone, { surface: string; text: string }> = {
  gold: { surface: 'bg-gold/10 border-gold/40', text: 'text-gold' },
  red: { surface: 'bg-red/10 border-red/40', text: 'text-red' },
  cyan: { surface: 'bg-cyan/10 border-cyan/40', text: 'text-cyan' },
};

const TONE_HEX: Record<AlertTone, string> = {
  gold: tokens.colors.gold,
  red: tokens.colors.red,
  cyan: tokens.colors.cyan,
};

const DEFAULT_ICON: Record<AlertTone, keyof typeof Ionicons.glyphMap> = {
  gold: 'information-circle',
  red: 'alert-circle',
  cyan: 'information-circle',
};

export function InlineAlert({
  tone = 'gold',
  icon,
  children,
  className,
}: InlineAlertProps) {
  const t = TONE_CLASSES[tone];
  const iconName = icon ?? DEFAULT_ICON[tone];
  return (
    <View
      className={cn(
        'flex-row items-start gap-2.5 rounded-2xl border-[1.5px] p-4',
        t.surface,
        className,
      )}
    >
      <View style={{ marginTop: 1 }}>
        <Ionicons name={iconName} size={18} color={TONE_HEX[tone]} />
      </View>
      <View className="flex-1">
        {typeof children === 'string' ? (
          <Text
            className={cn('font-display', t.text)}
            style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export type { AlertTone };

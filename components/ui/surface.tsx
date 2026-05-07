// Surface — the navy800 panel that lifts off the navy900 background.
// Mirrors the prototype `Surface` in docs/design/components.jsx: navy800 fill,
// 1.5px navy600 border (or accent override), 20px radius, navy-tinted card
// shadow. Pressable when given an `onPress`.
import * as React from 'react';
import {
  Pressable,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { cn } from '@/lib/utils';

type SurfaceAccent = 'default' | 'gold' | 'red' | 'lime' | 'pink';

type SurfaceProps = {
  children: React.ReactNode;
  accent?: SurfaceAccent;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const ACCENT_BORDER: Record<SurfaceAccent, string> = {
  default: 'border-navy600',
  gold: 'border-gold/50',
  red: 'border-red/50',
  lime: 'border-lime/50',
  pink: 'border-pink/50',
};

export function Surface({
  children,
  accent = 'default',
  onPress,
  onLongPress,
  className,
  style,
  accessibilityLabel,
}: SurfaceProps) {
  const baseClasses = cn(
    'rounded-2xl border-[1.5px] bg-navy800 p-4 shadow-card',
    ACCENT_BORDER[accent],
    className,
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        role="button"
        accessibilityLabel={accessibilityLabel}
        className={cn(baseClasses, 'active:opacity-90')}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={baseClasses} style={style}>
      {children}
    </View>
  );
}

export type { SurfaceAccent };

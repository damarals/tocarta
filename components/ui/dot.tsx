// Dot — tiny filled circle used as a status indicator inside Pills.
// Mirrors the prototype `Dot` in docs/design/screens.jsx — 6×6 circle with
// optional pulse animation when paired with `resolving` status.
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { tokens } from '@/theme/tokens';

type DotColor = 'lime' | 'gold' | 'pink' | 'red' | 'cyan';

type DotProps = {
  color: DotColor;
  pulse?: boolean;
  size?: number;
};

const COLOR_HEX: Record<DotColor, string> = {
  lime: tokens.colors.lime,
  gold: tokens.colors.gold,
  pink: tokens.colors.pink,
  red: tokens.colors.red,
  cyan: tokens.colors.cyan,
};

export function Dot({ color, pulse = false, size = 6 }: DotProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      opacity.setValue(1);
    };
  }, [pulse, opacity]);

  if (pulse) {
    return (
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLOR_HEX[color],
          marginRight: 4,
          opacity,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLOR_HEX[color],
        marginRight: 4,
      }}
    />
  );
}

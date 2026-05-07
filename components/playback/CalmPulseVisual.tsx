// Anti-spoiler discipline (ADR-0009): visualisations are PURELY decorative.
// They take no track-identifying inputs.
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { tokens } from '@/theme/tokens';

const CIRCLE_SIZE = 240;

export function CalmPulseVisual({ active }: { active: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [active, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.95] });

  return (
    <View
      style={{
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: tokens.colors.pink,
          opacity,
          transform: [{ scale }],
        }}
      />
    </View>
  );
}

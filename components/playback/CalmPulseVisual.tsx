// Anti-spoiler discipline (ADR-0009): visualisations are PURELY decorative.
// They take no track-identifying inputs.
//
// The proto's PulseViz wraps a 200px BrandMark in a 1.2s tc-pulse animation;
// here we mirror it with a single pink disc breathing between scale 0.95
// and 1.05 over 1.4s, plus a soft glow halo. Simpler than RingsVisual,
// closer to a heartbeat.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { tokens } from '@/theme/tokens';

const CIRCLE_SIZE = 200;

export function CalmPulseVisual({ active }: { active: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 700,
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

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });

  return (
    <View
      style={{
        width: CIRCLE_SIZE * 1.3,
        height: CIRCLE_SIZE * 1.3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: CIRCLE_SIZE * 1.25,
          height: CIRCLE_SIZE * 1.25,
          borderRadius: CIRCLE_SIZE,
          backgroundColor: tokens.colors.pink,
          opacity: 0.18,
        }}
      />
      <Animated.View
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: tokens.colors.pink,
          transform: [{ scale }],
          ...Platform.select({
            ios: {
              shadowColor: tokens.colors.pink,
              shadowOpacity: 0.45,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
            },
            android: { elevation: 8 },
            default: {},
          }),
        }}
      />
    </View>
  );
}

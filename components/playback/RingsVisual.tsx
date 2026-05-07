// Anti-spoiler discipline (ADR-0009): visualisations are PURELY decorative.
// They receive no track-identifying inputs and render nothing the players
// could read. The only signal they take is whether playback is active, so
// the animation can pause when the audio pauses.
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { tokens } from '@/theme/tokens';

const RING_COUNT = 4;
const RING_SIZE = 240;

export function RingsVisual({ active }: { active: boolean }) {
  // Each ring shares the same animated value but offsets its appearance
  // through delay + interpolated opacity, so they pulse outward in sequence.
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      progress.setValue(0);
    };
  }, [active, progress]);

  return (
    <View
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: RING_COUNT }).map((_, i) => {
        const start = i / RING_COUNT;
        const scale = progress.interpolate({
          inputRange: [start, Math.min(1, start + 0.6)],
          outputRange: [0.4, 1],
          extrapolate: 'clamp',
        });
        const opacity = progress.interpolate({
          inputRange: [start, Math.min(1, start + 0.6)],
          outputRange: [0.7, 0],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: RING_SIZE / 2,
              borderWidth: 2,
              borderColor: tokens.colors.pink,
              transform: [{ scale }],
              opacity,
            }}
          />
        );
      })}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: tokens.colors.pink,
          opacity: 0.9,
        }}
      />
    </View>
  );
}

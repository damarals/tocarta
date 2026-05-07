// Anti-spoiler discipline (ADR-0009): visualisations are PURELY decorative.
// They take no track-identifying inputs. NO album art, NO labels — the disc
// is a featureless rotating ring.
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { tokens } from '@/theme/tokens';

const DISC_SIZE = 240;

export function VinylVisual({ active }: { active: boolean }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View
      style={{
        width: DISC_SIZE,
        height: DISC_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          width: DISC_SIZE,
          height: DISC_SIZE,
          borderRadius: DISC_SIZE / 2,
          backgroundColor: '#0a0d18',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: spin }],
        }}
      >
        {/* concentric grooves — render as thin ring outlines */}
        {[0.95, 0.8, 0.65, 0.5].map((scale, idx) => (
          <View
            key={idx}
            style={{
              position: 'absolute',
              width: DISC_SIZE * scale,
              height: DISC_SIZE * scale,
              borderRadius: (DISC_SIZE * scale) / 2,
              borderWidth: 1,
              borderColor: '#1a1f2e',
            }}
          />
        ))}
        {/* Centre label — solid pink, NO text. */}
        <View
          style={{
            width: DISC_SIZE * 0.28,
            height: DISC_SIZE * 0.28,
            borderRadius: DISC_SIZE * 0.14,
            backgroundColor: tokens.colors.pink,
          }}
        />
        {/* Spindle hole. */}
        <View
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: tokens.colors.navy900,
          }}
        />
      </Animated.View>
    </View>
  );
}

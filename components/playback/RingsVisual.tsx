// Anti-spoiler discipline (ADR-0009): visualisations are PURELY decorative.
// They receive no track-identifying inputs and render nothing the players
// could read. The only signal they take is whether playback is active, so
// the animation can pause when the audio pauses.
//
// Layout per docs/design/screens.jsx:961-989 — four pink rings expanding
// outward from a 132px disc with a Music icon at the center, plus a soft
// pink glow. RN doesn't ship a radial gradient primitive, so the disc uses
// a layered fill (pink core + pinkD bevel) to approximate the same lift.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { tokens } from '@/theme/tokens';

const RING_COUNT = 4;
const FRAME_SIZE = 220;
const DISC_SIZE = 132;

// Each ring renders at FRAME_SIZE and scales out from the center; opacity
// fades to zero by end-of-cycle. Widths/opacities cascade so successive
// pulses thin out the way the proto's CSS animation does.
const RING_BORDER = 1.5;
const RING_OPACITIES = [0.6, 0.4, 0.25, 0.1];

export function RingsVisual({ active }: { active: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const ringsLoop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    ringsLoop.start();
    pulseLoop.start();
    return () => {
      ringsLoop.stop();
      pulseLoop.stop();
      progress.setValue(0);
      pulse.setValue(0);
    };
  }, [active, progress, pulse]);

  const discScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  return (
    <View
      style={{
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {RING_OPACITIES.map((startOpacity, i) => {
        const offset = i / RING_COUNT;
        const scale = progress.interpolate({
          inputRange: [offset, Math.min(1, offset + 0.7)],
          outputRange: [0.6, 2.4],
          extrapolate: 'clamp',
        });
        const opacity = progress.interpolate({
          inputRange: [offset, Math.min(1, offset + 0.7)],
          outputRange: [startOpacity, 0],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: FRAME_SIZE,
              height: FRAME_SIZE,
              borderRadius: FRAME_SIZE / 2,
              borderWidth: RING_BORDER,
              borderColor: tokens.colors.pink,
              transform: [{ scale }],
              opacity,
            }}
          />
        );
      })}
      {/* Glow halo */}
      <View
        style={{
          position: 'absolute',
          width: DISC_SIZE * 1.2,
          height: DISC_SIZE * 1.2,
          borderRadius: DISC_SIZE,
          backgroundColor: tokens.colors.pink,
          opacity: 0.18,
        }}
      />
      <Animated.View
        style={{
          width: DISC_SIZE,
          height: DISC_SIZE,
          borderRadius: DISC_SIZE / 2,
          backgroundColor: tokens.colors.pink,
          alignItems: 'center',
          justifyContent: 'center',
          // Approximate the radial gradient with a thick inner pinkD ring.
          borderWidth: 8,
          borderColor: tokens.colors.pinkD,
          transform: [{ scale: discScale }],
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
      >
        <Ionicons name="musical-note" size={56} color="#fff" />
      </Animated.View>
    </View>
  );
}

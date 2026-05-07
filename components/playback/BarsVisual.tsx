// Anti-spoiler discipline (ADR-0009): visualisations are PURELY decorative.
// The bar heights are driven by random offsets seeded at mount, not by any
// audio-frequency analysis or track-identifying input.
//
// Layout per docs/design/screens.jsx:1019-1041 — 24 bars, each width 6px,
// gap 4px, fading from pink at the bottom toward gold at the top. RN
// doesn't render a true linear gradient without an extra dep; we stack a
// pink slug under a gold cap to fake the `linear-gradient(180deg, pink, gold)`
// look while keeping the install footprint zero.
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';

import { tokens } from '@/theme/tokens';

const BAR_COUNT = 24;
const FRAME_HEIGHT = 180;
const BAR_WIDTH = 6;
const BAR_GAP = 4;
const GOLD_CAP_HEIGHT = 14;

export function BarsVisual({ active }: { active: boolean }) {
  // Pre-compute a stable per-bar phase offset so the dance feels organic
  // rather than a uniform wave. Seeded at mount; deterministic per-bar.
  const phases = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => (i * 137.5) % 360),
    [],
  );

  // One animated value driving the whole grid; bars derive their own height
  // by interpolating with their phase.
  const tick = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.timing(tick, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      tick.setValue(0);
    };
  }, [active, tick]);

  return (
    <View
      style={{
        width: BAR_COUNT * (BAR_WIDTH + BAR_GAP),
        height: FRAME_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: BAR_GAP,
      }}
    >
      {phases.map((phase, i) => {
        const wave = tick.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [
            0.3 + 0.7 * Math.abs(Math.sin((phase + 0) * (Math.PI / 180))),
            0.3 + 0.7 * Math.abs(Math.sin((phase + 90) * (Math.PI / 180))),
            0.3 + 0.7 * Math.abs(Math.sin((phase + 180) * (Math.PI / 180))),
            0.3 + 0.7 * Math.abs(Math.sin((phase + 270) * (Math.PI / 180))),
            0.3 + 0.7 * Math.abs(Math.sin((phase + 360) * (Math.PI / 180))),
          ],
        });
        const height = wave.interpolate({
          inputRange: [0, 1],
          outputRange: [FRAME_HEIGHT * 0.15, FRAME_HEIGHT * 0.95],
        });
        return (
          <Animated.View
            key={i}
            style={{
              width: BAR_WIDTH,
              height,
              borderRadius: BAR_WIDTH / 2,
              backgroundColor: tokens.colors.pink,
              overflow: 'hidden',
              ...Platform.select({
                ios: {
                  shadowColor: tokens.colors.pink,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                },
                default: {},
              }),
            }}
          >
            {/* Gold cap fakes the bottom-up pink→gold gradient. */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: GOLD_CAP_HEIGHT,
                backgroundColor: tokens.colors.gold,
                opacity: 0.85,
              }}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

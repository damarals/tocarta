// SVG vinyl ornament that doubles as the brand mark. The geometry mirrors
// `docs/design/assets/logo-mark.svg` exactly so the rendered RN-SVG matches
// the prototype pixel-for-pixel. `spinning` rotates the disc on a 3.5s linear
// loop (the `tc-spin` keyframe in `docs/design/tocarta.css`); `glow` adds a
// halo behind the mark, color-keyed to the requested accent.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

type BrandGlow = 'lime' | 'pink' | 'gold';

type BrandMarkProps = {
  size?: number;
  spinning?: boolean;
  glow?: BrandGlow;
  className?: string;
};

const GLOW_RGB: Record<BrandGlow, string> = {
  lime: 'rgba(88,204,2,0.18)',
  pink: 'rgba(255,107,181,0.18)',
  gold: 'rgba(255,200,0,0.18)',
};

const GLOW_HEX: Record<BrandGlow, string> = {
  lime: tokens.colors.lime,
  pink: tokens.colors.pink,
  gold: tokens.colors.gold,
};

export function BrandMark({
  size = 64,
  spinning = false,
  glow,
  className,
}: BrandMarkProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) return;
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 3500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      rotation.setValue(0);
    };
  }, [spinning, rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const haloStyle: ViewStyle | undefined = glow
    ? {
        position: 'absolute',
        width: size * 1.35,
        height: size * 1.35,
        borderRadius: size,
        backgroundColor: GLOW_RGB[glow],
        // iOS-only shadow; Android falls back to the colored halo above.
        ...Platform.select({
          ios: {
            shadowColor: GLOW_HEX[glow],
            shadowOpacity: 0.45,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
          },
          android: { elevation: 8 },
          default: {},
        }),
      }
    : undefined;

  return (
    <View
      className={cn('items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {haloStyle && <View style={haloStyle} />}
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ rotate: spin }],
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          {/* Outer disc — navy fill, lime stroke. */}
          <Circle
            cx={32}
            cy={32}
            r={30}
            fill={tokens.colors.navy900}
            stroke={tokens.colors.lime}
            strokeWidth={3}
          />
          {/* Three groove rings — navy700 stroke. */}
          <Circle cx={32} cy={32} r={22} fill="none" stroke={tokens.colors.navy700} strokeWidth={1.5} />
          <Circle cx={32} cy={32} r={17} fill="none" stroke={tokens.colors.navy700} strokeWidth={1.5} />
          <Circle cx={32} cy={32} r={12} fill="none" stroke={tokens.colors.navy700} strokeWidth={1.5} />
          {/* Pink center label + spindle. */}
          <Circle cx={32} cy={32} r={7} fill={tokens.colors.pink} />
          <Circle cx={32} cy={32} r={2} fill={tokens.colors.navy900} />
          {/* Decorative sheen arc, top-left quadrant. */}
          <Path
            d="M14 22 a20 20 0 0 1 12 -10"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

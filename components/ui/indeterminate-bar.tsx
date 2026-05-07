// IndeterminateBar — pink slug sliding right→left over a navy track, used
// when there's progress to convey but no determinate value (e.g., audio
// playing for an unknown duration). Mirrors the prototype's
// `IndeterminateBar` in docs/design/screens.jsx: 8px tall with a 1.5px
// navy600 border, a 40%-wide pink slug animated 1.6s with a smooth
// cubic-bezier feel, looping until paused.
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { tokens } from '@/theme/tokens';

type IndeterminateBarProps = {
  paused?: boolean;
  width?: number | `${number}%`;
};

export function IndeterminateBar({
  paused = false,
  width = '100%',
}: IndeterminateBarProps) {
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused) return;
    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: 1600,
        // The proto runs ease-in-out cubic; bezier(.6,.05,.3,1) is the
        // closest RN preset that keeps the slug moving without sticking
        // at the edges.
        easing: Easing.bezier(0.6, 0.05, 0.3, 1),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      translate.setValue(0);
    };
  }, [paused, translate]);

  return (
    <View
      style={{
        width,
        height: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: tokens.colors.navy600,
        backgroundColor: tokens.colors.navy900,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          width: '40%',
          height: '100%',
          borderRadius: 999,
          backgroundColor: tokens.colors.pink,
          opacity: 0.95,
          transform: [
            {
              translateX: translate.interpolate({
                inputRange: [0, 1],
                outputRange: ['-100%', '300%'],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

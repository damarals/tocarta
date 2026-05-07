// IconButton — small pushable square action used in screen headers and
// scanner/playback chrome. Mirrors the prototype `IconButton` in
// docs/design/components.jsx: 40–48px square with a colored 4px shadow
// that collapses to 1px on press and a 3px translateY so the surface
// lands on the shadow. Visual sibling of PushButton, sized for icons only.
import * as React from 'react';
import {
  Platform,
  Pressable,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

import { cn } from '@/lib/utils';

type IconButtonProps = {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  size?: number;
  surfaceClass?: string;
  shadowColor?: string;
  className?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
};

export function IconButton({
  children,
  onPress,
  size = 40,
  surfaceClass = 'bg-navy800',
  shadowColor = '#0A1024',
  className,
  accessibilityLabel,
  disabled,
  testID,
}: IconButtonProps) {
  const [pressed, setPressed] = React.useState(false);

  const baseStyle: ViewStyle = {
    width: size,
    height: size,
  };
  const shadowStyle: ViewStyle | undefined = Platform.select({
    default: {
      shadowColor,
      shadowOpacity: 1,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: pressed ? 1 : 4 },
      transform: pressed ? [{ translateY: 3 }] : undefined,
    },
  });

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && setPressed(true)}
      onPressOut={() => setPressed(false)}
      role="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      disabled={disabled}
      className={cn(
        'items-center justify-center rounded-2xl',
        surfaceClass,
        disabled && 'opacity-50',
        className,
      )}
      style={[baseStyle, shadowStyle]}
    >
      {children}
    </Pressable>
  );
}

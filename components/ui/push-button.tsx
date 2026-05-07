// PushButton — the signature Tocarta interaction. A 5px solid colored
// shadow that collapses to 1px on press, with the button itself translating
// down 3px so the surface visibly meets the shadow. Mirrors the prototype's
// PushButton in docs/design/components.jsx and the --vd-btn-lift /
// --vd-btn-press tokens in docs/design/tocarta.css.
//
// This is the brand-flavored CTA. The rnr/shadcn `Button` in
// components/ui/button.tsx stays for low-stakes / utility surfaces.
import * as React from 'react';
import { Platform, Pressable, View, type GestureResponderEvent } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type PushButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warn';
type PushButtonSize = 'sm' | 'md' | 'lg';

type PushButtonProps = {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: PushButtonVariant;
  size?: PushButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  accessibilityLabel?: string;
  uppercase?: boolean;
  testID?: string;
};

type VariantStyle = {
  surface: string;
  text: string;
  liftShadow: string;
  pressedShadow: string;
  border?: string;
};

const VARIANTS: Record<PushButtonVariant, VariantStyle> = {
  primary: {
    surface: 'bg-lime',
    text: 'text-navy900',
    liftShadow: 'shadow-push-lime',
    pressedShadow: 'shadow-push-lime-active',
  },
  secondary: {
    surface: 'bg-pink',
    text: 'text-navy900',
    liftShadow: 'shadow-push-pink',
    pressedShadow: 'shadow-push-pink-active',
  },
  warn: {
    surface: 'bg-gold',
    text: 'text-navy900',
    liftShadow: 'shadow-push-gold',
    pressedShadow: 'shadow-push-gold-active',
  },
  danger: {
    surface: 'bg-red',
    text: 'text-navy50',
    liftShadow: 'shadow-push-red',
    pressedShadow: 'shadow-push-red-active',
  },
  ghost: {
    surface: 'bg-transparent',
    text: 'text-navy200',
    liftShadow: '',
    pressedShadow: '',
    border: 'border-[1.5px] border-navy600',
  },
};

type SizeStyle = {
  container: string;
  text: string;
  radius: string;
};

const SIZES: Record<PushButtonSize, SizeStyle> = {
  sm: {
    container: 'h-10 px-4',
    text: 'text-sm',
    radius: 'rounded-2xl',
  },
  md: {
    container: 'h-12 px-5',
    text: 'text-base',
    radius: 'rounded-2xl',
  },
  lg: {
    container: 'h-14 px-6',
    text: 'text-lg',
    radius: 'rounded-3xl',
  },
};

const DEFAULT_UPPERCASE: Record<PushButtonVariant, boolean> = {
  primary: true,
  secondary: true,
  danger: true,
  warn: true,
  ghost: false,
};

export function PushButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth,
  disabled,
  icon,
  className,
  accessibilityLabel,
  uppercase,
  testID,
}: PushButtonProps) {
  const [pressed, setPressed] = React.useState(false);
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const isUpper = uppercase ?? DEFAULT_UPPERCASE[variant];

  // ghost is the only variant without the lift; everything else gets the
  // colored shadow that collapses to 1px on press, plus a 3px translateY so
  // the surface visibly slides into the shadow.
  const showLift = variant !== 'ghost';
  const shadowClass = showLift ? (pressed ? v.pressedShadow : v.liftShadow) : '';
  const ghostActiveBg = variant === 'ghost' ? 'active:bg-navy700/50' : '';

  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={
        showLift && pressed
          ? Platform.select({ default: { transform: [{ translateY: 3 }] } })
          : undefined
      }
      className={cn(
        'flex-row items-center justify-center gap-2',
        s.container,
        s.radius,
        v.surface,
        v.border,
        shadowClass,
        ghostActiveBg,
        fullWidth && 'w-full',
        disabled && 'opacity-50',
        className,
      )}
    >
      {icon ? <View>{icon}</View> : null}
      <Text
        className={cn(
          'font-display font-black',
          s.text,
          v.text,
          isUpper && 'uppercase tracking-wider',
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export type { PushButtonProps, PushButtonVariant, PushButtonSize };

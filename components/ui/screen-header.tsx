// ScreenHeader — title row used at the top of inner screens. Mirrors the
// prototype `ScreenHeader` in docs/design/screens.jsx: an optional 40px
// IconButton on the left for back navigation, a title (Nunito 900 18px) +
// optional mono subtitle in the middle, and a free-form right slot for
// actions like an Export PDF button.
//
// In the RN app, Stack already renders the back chevron, so this component
// omits the left button by default. Pass `showBack` if a screen wants the
// large pushable IconButton instead of relying on the Stack header.
import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: (event: GestureResponderEvent) => void;
  showBack?: boolean;
  className?: string;
};

export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
  showBack = false,
  className,
}: ScreenHeaderProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-3 px-5 pt-3 pb-3',
        className,
      )}
    >
      {showBack && onBack && (
        <Pressable
          onPress={onBack}
          role="button"
          accessibilityLabel="Back"
          className="h-10 w-10 items-center justify-center rounded-2xl bg-navy800 active:bg-navy700"
          style={{
            shadowColor: tokens.colors.navy950,
            shadowOpacity: 1,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Ionicons name="arrow-back" size={20} color={tokens.colors.navy50} />
        </Pressable>
      )}
      <View className="flex-1 min-w-0">
        <Text
          className="font-display text-foreground"
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 18,
            lineHeight: 22,
            letterSpacing: -0.18,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-navy400 mt-0.5"
            style={{
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 11,
              lineHeight: 14,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View className="ml-2">{right}</View> : null}
    </View>
  );
}

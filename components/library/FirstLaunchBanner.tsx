// FirstLaunchBanner — one-shot disclosure on the Library home that decks
// are device-local and lost when Tocarta is uninstalled. Persists dismissal
// to AsyncStorage so it never reappears for the same install.
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

type FirstLaunchBannerProps = {
  className?: string;
};

const STORAGE_KEY = 'library/banner-dismissed';

type BannerStatus = 'loading' | 'visible' | 'dismissed';

export function FirstLaunchBanner({ className }: FirstLaunchBannerProps) {
  const [status, setStatus] = useState<BannerStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (cancelled) return;
        setStatus(value === 'true' ? 'dismissed' : 'visible');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('visible');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status !== 'visible') return null;

  const dismiss = () => {
    setStatus('dismissed');
    void AsyncStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <View
      className={cn(
        'flex-row items-start gap-3 rounded-2xl border-[1.5px] border-navy600 bg-navy800 p-4',
        className,
      )}
    >
      <View className="flex-1">
        <Text
          className="font-display text-foreground text-sm"
          style={{ fontFamily: 'Nunito_800ExtraBold', lineHeight: 20 }}
        >
          Decks live on this device only
        </Text>
        <Text
          className="font-display text-navy200 text-xs mt-1"
          style={{ fontFamily: 'Nunito_600SemiBold', lineHeight: 18 }}
        >
          Uninstalling Tocarta will lose them.
        </Text>
      </View>
      <Pressable
        onPress={dismiss}
        role="button"
        accessibilityLabel="Dismiss banner"
        hitSlop={12}
        className="rounded-full p-1 active:bg-navy700/60"
      >
        <Ionicons name="close" size={18} color={tokens.colors.navy400} />
      </Pressable>
    </View>
  );
}

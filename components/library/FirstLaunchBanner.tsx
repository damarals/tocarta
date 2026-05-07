import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

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
        'mx-6 flex-row items-start gap-3 rounded-xl border border-border bg-card px-4 py-3',
        className,
      )}
    >
      <View className="flex-1">
        <Text className="font-display text-card-foreground text-base leading-snug">
          Decks live on this device only
        </Text>
        <Text className="font-body text-muted-foreground text-sm leading-snug mt-1">
          Uninstalling Tocarta will lose them.
        </Text>
      </View>
      <Pressable
        onPress={dismiss}
        role="button"
        accessibilityLabel="Dismiss banner"
        hitSlop={12}
        className="rounded-full p-1 active:bg-muted"
      >
        <Ionicons name="close" size={20} color="rgb(168 179 199)" />
      </Pressable>
    </View>
  );
}

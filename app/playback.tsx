import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { parseCardCode } from '@/lib/card-code-validator';

/**
 * Placeholder route for issue #9. The Scanner navigates here on a valid scan
 * with the raw card code as the `code` query param. The real audio playback
 * — and its anti-spoiler MediaSession discipline — lands in the next slice.
 */
export default function PlaybackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const raw = typeof code === 'string' ? code : '';
  const parsed = parseCardCode(raw);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8 gap-3">
        <Text className="font-display text-foreground text-2xl text-center">
          Playback coming in #9
        </Text>
        <Text className="font-body text-muted-foreground text-base text-center">
          Card code received from scanner.
        </Text>
        <View className="mt-6 w-full rounded-xl border border-border bg-card p-4 gap-1">
          <Row label="card code" value={raw === '' ? '—' : raw} />
          <Row label="isrc" value={parsed?.isrc ?? '—'} />
          <Row label="provider" value={parsed?.provider ?? '—'} />
          <Row label="playlist id" value={parsed?.playlistId ?? '—'} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-3">
      <Text className="font-body text-muted-foreground text-sm w-24">{label}</Text>
      <Text className="font-body text-card-foreground text-sm flex-1" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { parseDeezerPlaylistUrl } from '@/lib/deezer-url';
import { cn } from '@/lib/utils';

const EXAMPLE_URL = 'https://www.deezer.com/playlist/908622995';
const PLACEHOLDER_TEXT_COLOR = 'rgb(168 179 199 / 0.5)';
const INPUT_TEXT_COLOR = 'rgb(168 179 199)';

const STEPS: readonly string[] = [
  'We fetch the tracks from Deezer.',
  "We look up each track's release year.",
  "Anything we can't identify gets skipped.",
  'You review the result before printing.',
];

type Validity = 'empty' | 'invalid' | 'valid';

function classify(input: string): Validity {
  if (input.trim() === '') return 'empty';
  return parseDeezerPlaylistUrl(input.trim()) === null ? 'invalid' : 'valid';
}

function helperText(validity: Validity): string {
  switch (validity) {
    case 'empty':
      return `Example: ${EXAMPLE_URL}`;
    case 'invalid':
      return "That doesn't look like a Deezer playlist link.";
    case 'valid':
      return 'Looks good.';
  }
}

const HELPER_CLASSES: Record<Validity, string> = {
  empty: 'text-muted-foreground',
  invalid: 'text-destructive',
  valid: 'text-primary',
};

const BORDER_CLASSES: Record<Validity, string> = {
  empty: 'border-border',
  invalid: 'border-destructive',
  valid: 'border-primary',
};

export default function GenerateScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const validity = useMemo(() => classify(url), [url]);

  const onSubmit = () => {
    if (validity !== 'valid') return;
    router.push({ pathname: '/resolving', params: { url: url.trim() } });
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-2 pb-10 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2">
          <Text className="font-display text-foreground text-4xl">Create a deck</Text>
          <Text className="font-body text-muted-foreground text-base leading-relaxed">
            Paste a public Deezer playlist link and we&apos;ll turn it into a deck.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="font-body text-foreground text-sm font-bold">
            Deezer playlist link
          </Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder={EXAMPLE_URL}
            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="url"
            inputMode="url"
            spellCheck={false}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            accessibilityLabel="Deezer playlist link"
            style={{ color: INPUT_TEXT_COLOR, fontFamily: 'Nunito' }}
            className={cn(
              'rounded-xl border bg-card px-4 py-4 text-base',
              BORDER_CLASSES[validity],
            )}
          />
          <Text className={cn('font-body text-sm', HELPER_CLASSES[validity])}>
            {helperText(validity)}
          </Text>
        </View>

        <View className="rounded-xl border border-border bg-card p-5 gap-3">
          <Text className="font-display text-card-foreground text-xl">
            What happens next
          </Text>
          {STEPS.map((step, idx) => (
            <View key={step} className="flex-row items-start gap-3">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Text className="font-body text-primary-foreground text-xs font-bold">
                  {idx + 1}
                </Text>
              </View>
              <Text className="font-body text-card-foreground text-base flex-1 leading-relaxed">
                {step}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="px-6 pb-6 pt-2">
        <Pressable
          onPress={onSubmit}
          disabled={validity !== 'valid'}
          role="button"
          accessibilityLabel="Resolve tracks"
          accessibilityState={{ disabled: validity !== 'valid' }}
          className={cn(
            'items-center justify-center rounded-full bg-primary px-6 py-4 active:bg-primary/90',
            validity !== 'valid' && 'opacity-50',
          )}
        >
          <Text className="font-body text-primary-foreground text-base font-bold">
            Resolve tracks
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

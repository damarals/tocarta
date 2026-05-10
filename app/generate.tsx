import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PushButton } from '@/components/ui/push-button';
import { Step } from '@/components/ui/step';
import { Text } from '@/components/ui/text';
import { parseDeezerPlaylistUrl } from '@/lib/deezer-url';
import { cn } from '@/lib/utils';
import { tokens } from '@/theme/tokens';

const EXAMPLE_URL = 'https://www.deezer.com/playlist/123456';
const PLACEHOLDER_TEXT_COLOR = 'rgba(196, 204, 223, 0.4)';
const INPUT_TEXT_COLOR = tokens.colors.navy50;

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
  empty: 'text-navy400',
  invalid: 'text-red',
  valid: 'text-lime',
};

const INPUT_BORDER_CLASSES: Record<Validity, string> = {
  empty: 'border-navy600',
  invalid: 'border-red',
  valid: 'border-lime',
};

function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <Text
      className={cn('font-display text-navy400 text-xs mb-2', className)}
      style={{
        fontFamily: 'Nunito_800ExtraBold',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}

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
        contentContainerClassName="px-5 pt-2 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <Text
          className="text-foreground"
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 28,
            lineHeight: 30,
            letterSpacing: -0.56,
          }}
        >
          Paste a Deezer playlist URL.
        </Text>
        <Text
          className="font-display text-navy200 text-sm mt-2.5"
          style={{ fontFamily: 'Nunito_600SemiBold', lineHeight: 21 }}
        >
          We fetch the tracks from Deezer and look up each track&apos;s release year.
          You&apos;ll review before printing.
        </Text>

        <View className="mt-6">
          <Eyebrow>Playlist URL</Eyebrow>
          <View className="relative">
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://..."
              placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="url"
              inputMode="url"
              spellCheck={false}
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              numberOfLines={1}
              accessibilityLabel="Deezer playlist link"
              style={{
                color: INPUT_TEXT_COLOR,
                fontFamily: 'JetBrainsMono_500Medium',
                fontSize: 13,
              }}
              className={cn(
                'rounded-2xl border-[1.5px] bg-navy800 px-4 py-3 pr-10',
                INPUT_BORDER_CLASSES[validity],
              )}
            />
            {validity === 'valid' && (
              <View
                className="absolute right-3"
                style={{ top: 0, bottom: 0, justifyContent: 'center' }}
                pointerEvents="none"
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={tokens.colors.lime}
                />
              </View>
            )}
          </View>
          <Text
            className={cn(
              'font-display text-xs mt-2',
              HELPER_CLASSES[validity],
            )}
            style={{ fontFamily: 'Nunito_600SemiBold', lineHeight: 18 }}
          >
            {helperText(validity)}
          </Text>
        </View>

        <View className="mt-6">
          <Eyebrow>What happens next</Eyebrow>
          <View className="rounded-2xl border-[1.5px] border-navy600 bg-navy800 px-4">
            {STEPS.map((step, idx) => (
              <Step
                key={step}
                n={idx + 1}
                text={step}
                last={idx === STEPS.length - 1}
              />
            ))}
          </View>
        </View>

        <View className="mt-6">
          <PushButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={validity !== 'valid'}
            onPress={onSubmit}
            accessibilityLabel="Resolve tracks"
          >
            Resolve tracks
          </PushButton>
          <Text
            className="font-display text-navy400 text-xs text-center mt-3"
            style={{ fontFamily: 'Nunito_700Bold', lineHeight: 18 }}
          >
            We&apos;ll let you review every track before printing.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

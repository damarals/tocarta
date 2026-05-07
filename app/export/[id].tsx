import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { deckLibrary } from '@/lib/deck-library';
import { pdfRenderer, type RenderedDeckPdf } from '@/lib/pdf-renderer';
import type { Deck } from '@/lib/types';

const LIME = 'rgb(200 232 74)';
const NAVY900 = 'rgb(13 20 34)';

/** Minimum time the rendering state stays on screen before flipping to done.
 *  Holds even if the underlying render is faster, so the spinner doesn't
 *  flash. The spinner is reassuring; a 200ms blink is not. */
const MIN_RENDERING_MS = 1000;

type ScreenState =
  | { kind: 'loading-deck' }
  | { kind: 'rendering'; deck: Deck }
  | { kind: 'done'; deck: Deck; rendered: RenderedDeckPdf }
  | { kind: 'error'; message: string }
  | { kind: 'not-found' };

export default function ExportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<ScreenState>({ kind: 'loading-deck' });
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setState({ kind: 'not-found' });
      return;
    }

    const run = async (): Promise<void> => {
      try {
        const deck = await deckLibrary.load(id);
        if (cancelled) return;
        if (deck === null) {
          setState({ kind: 'not-found' });
          return;
        }
        startedAt.current = Date.now();
        setState({ kind: 'rendering', deck });
        const rendered = await pdfRenderer.render(deck);
        if (cancelled) return;
        const elapsed = Date.now() - (startedAt.current ?? Date.now());
        const wait = Math.max(0, MIN_RENDERING_MS - elapsed);
        if (wait > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, wait));
          if (cancelled) return;
        }
        setState({ kind: 'done', deck, rendered });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Something went wrong.';
        setState({ kind: 'error', message });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8 gap-6">
        {(state.kind === 'loading-deck' || state.kind === 'rendering') && (
          <RenderingPanel />
        )}

        {state.kind === 'done' && (
          <DonePanel
            filename={state.rendered.filename}
            onShare={() => {
              void shareSafely(state.rendered.uri);
            }}
          />
        )}

        {state.kind === 'error' && (
          <ErrorPanel message={state.message} onBack={() => router.back()} />
        )}

        {state.kind === 'not-found' && (
          <View className="items-center gap-4">
            <Text className="font-body text-muted-foreground text-base text-center">
              Deck not found.
            </Text>
            <Pressable
              onPress={() => router.replace('/')}
              role="button"
              accessibilityLabel="Back to library"
              className="items-center justify-center rounded-full bg-primary px-6 py-3 active:bg-primary/90"
            >
              <Text className="font-body text-primary-foreground text-base font-bold">
                Back to library
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

async function shareSafely(uri: string): Promise<void> {
  // expo-sharing always supports a share sheet on iOS/Android in the
  // managed workflow. The check is here for web/edge cases — if it's
  // unavailable, surfacing the path is the most useful fallback.
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) return;
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save deck PDF',
      UTI: 'com.adobe.pdf',
    });
  } catch {
    // Sharing was cancelled or failed; nothing to do.
  }
}

function RenderingPanel(): React.ReactElement {
  return (
    <View className="items-center gap-5">
      <View
        accessibilityLabel="Rendering deck"
        className="h-32 w-32 items-center justify-center rounded-2xl border border-lime/40 bg-navy700"
      >
        <ActivityIndicator color={LIME} size="large" />
      </View>
      <Text className="font-display text-foreground text-2xl">
        Laying out the PDF…
      </Text>
      <Text className="font-body text-muted-foreground text-sm text-center max-w-[280px] leading-relaxed">
        Cards are being arranged for A4. Hold tight — this only takes a moment.
      </Text>
    </View>
  );
}

type DonePanelProps = { filename: string; onShare: () => void };

function DonePanel({ filename, onShare }: DonePanelProps): React.ReactElement {
  return (
    <View className="items-center gap-5">
      <View
        accessibilityLabel="PDF ready"
        className="h-32 w-32 items-center justify-center rounded-2xl bg-lime"
      >
        <Ionicons name="checkmark" size={64} color={NAVY900} />
      </View>
      <View className="items-center gap-2">
        <Text className="font-display text-foreground text-2xl text-center">
          Your deck is ready
        </Text>
        <Text
          accessibilityLabel="File name"
          className="font-body text-muted-foreground text-base text-center"
          style={{ fontFamily: 'Nunito' }}
        >
          {filename}
        </Text>
      </View>
      <View className="rounded-xl border border-navy500 bg-navy700 px-4 py-3 max-w-[320px]">
        <Text className="font-body text-muted-foreground text-sm leading-relaxed text-center">
          Print at 100% scale, no auto-rotate, flip on the long edge so the
          backs land on the right cards.
        </Text>
      </View>
      <Pressable
        onPress={onShare}
        role="button"
        accessibilityLabel="Save to files"
        className="items-center justify-center rounded-full bg-primary px-7 py-3 active:bg-primary/90"
      >
        <Text className="font-body text-primary-foreground text-base font-bold">
          Save to files
        </Text>
      </Pressable>
    </View>
  );
}

type ErrorPanelProps = { message: string; onBack: () => void };

function ErrorPanel({ message, onBack }: ErrorPanelProps): React.ReactElement {
  return (
    <View className="items-center gap-5">
      <View
        accessibilityLabel="Export failed"
        className="h-32 w-32 items-center justify-center rounded-2xl border border-red bg-navy700"
      >
        <Ionicons name="alert-circle" size={56} color="rgb(239 68 68)" />
      </View>
      <Text className="font-display text-foreground text-2xl text-center">
        We couldn&apos;t make the PDF
      </Text>
      <Text
        accessibilityLabel="Error details"
        className="font-body text-muted-foreground text-sm text-center max-w-[280px] leading-relaxed"
      >
        {message}
      </Text>
      <Pressable
        onPress={onBack}
        role="button"
        accessibilityLabel="Back"
        className="items-center justify-center rounded-full bg-primary px-7 py-3 active:bg-primary/90"
      >
        <Text className="font-body text-primary-foreground text-base font-bold">
          Back
        </Text>
      </Pressable>
    </View>
  );
}

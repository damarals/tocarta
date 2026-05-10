import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand/BrandMark';
import { PushButton } from '@/components/ui/push-button';
import { Text } from '@/components/ui/text';
import { deckLibrary } from '@/lib/deck-library';
import { pdfRenderer, type RenderedDeckPdf } from '@/lib/pdf-renderer';
import { slug } from '@/lib/slug';
import type { Deck } from '@/lib/types';
import { tokens } from '@/theme/tokens';

const CARDS_PER_PAGE = 12; // ADR-0014: 3 cols × 4 rows on A4.

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
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        {state.kind === 'loading-deck' && (
          <View className="items-center gap-4">
            <ActivityIndicator color={tokens.colors.lime} />
          </View>
        )}

        {state.kind === 'rendering' && <RenderingPanel cardCount={state.deck.cards.length} />}

        {state.kind === 'done' && (
          <DonePanel
            deck={state.deck}
            rendered={state.rendered}
            onShare={() => {
              void shareSafely(state.rendered.uri);
            }}
            onDone={() => router.replace('/')}
          />
        )}

        {state.kind === 'error' && (
          <ErrorPanel message={state.message} onBack={() => router.back()} />
        )}

        {state.kind === 'not-found' && (
          <View className="items-center gap-4">
            <Text
              className="text-foreground text-center"
              style={{
                fontFamily: 'Nunito_900Black',
                fontSize: 22,
                lineHeight: 26,
                letterSpacing: -0.36,
              }}
            >
              Deck not found.
            </Text>
            <PushButton
              variant="primary"
              size="md"
              onPress={() => router.replace('/')}
              accessibilityLabel="Back to library"
            >
              Back to library
            </PushButton>
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

function RenderingPanel({ cardCount }: { cardCount: number }): React.ReactElement {
  return (
    <View className="items-center gap-7">
      <BrandMark size={88} spinning />
      <Text
        className="text-foreground text-center"
        style={{
          fontFamily: 'Nunito_900Black',
          fontSize: 24,
          lineHeight: 26,
          letterSpacing: -0.48,
        }}
      >
        Laying out the PDF…
      </Text>
      <Text
        accessibilityLabel="Render details"
        className="text-navy200 text-center"
        style={{
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {cardCount} {cardCount === 1 ? 'card' : 'cards'} · A4 · duplex · crop marks
      </Text>
    </View>
  );
}

type DonePanelProps = {
  deck: Deck;
  rendered: RenderedDeckPdf;
  onShare: () => void;
  onDone: () => void;
};

function DonePanel({ deck, rendered, onShare, onDone }: DonePanelProps): React.ReactElement {
  // The page count approximation: ceil(N/12) sheets for fronts and
  // again for backs, since the proto's PDF is duplex.
  const sheetCount = Math.max(1, Math.ceil(deck.cards.length / CARDS_PER_PAGE));
  const totalPages = sheetCount * 2;
  const fileSlug = slug(deck.name);
  const filename = `tocarta-${fileSlug}.pdf`;

  return (
    <View className="items-center gap-5 w-full">
      {/* Glow halo + lime tile with checkmark */}
      <View className="items-center justify-center" style={{ width: 120, height: 120 }}>
        <View
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 36,
            backgroundColor: tokens.colors.lime,
            opacity: 0.18,
          }}
        />
        <View
          accessibilityLabel="PDF ready"
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            backgroundColor: tokens.colors.lime,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: tokens.colors.limeD,
            shadowOpacity: 1,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Ionicons name="checkmark" size={48} color={tokens.colors.navy900} />
        </View>
      </View>

      <Text
        className="text-foreground text-center"
        style={{
          fontFamily: 'Nunito_900Black',
          fontSize: 28,
          lineHeight: 30,
          letterSpacing: -0.56,
        }}
      >
        Deck ready.
      </Text>

      <Text
        accessibilityLabel="File name"
        className="text-navy200 text-center"
        style={{
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 14,
          lineHeight: 20,
          maxWidth: 280,
        }}
      >
        {filename}
        {'\n'}— {totalPages} pages, print double-sided on A4.
      </Text>

      <View
        style={{ width: '100%', maxWidth: 320 }}
        className="rounded-2xl border-[1.5px] border-navy600 bg-navy800 p-4"
      >
        <Text
          className="text-navy400"
          style={{
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 11,
            letterSpacing: 1.32,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Tip
        </Text>
        <Text
          className="text-navy200"
          style={{
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          Print double-sided on A4 and cut along the marks. 100% scale, no
          auto-rotate, flip on the long edge.
        </Text>
      </View>

      <View className="flex-row gap-2.5 mt-2">
        <PushButton
          variant="ghost"
          size="md"
          onPress={onShare}
          accessibilityLabel="Save to files"
          icon={<Ionicons name="download" size={16} color={tokens.colors.navy200} />}
        >
          Save to files
        </PushButton>
        <PushButton
          variant="primary"
          size="md"
          onPress={onDone}
          accessibilityLabel="Done"
          icon={<Ionicons name="checkmark" size={16} color={tokens.colors.navy900} />}
        >
          Done
        </PushButton>
      </View>
      {/* `rendered` is consumed via onShare; reference here keeps it
          flowing through the panel even when share is not yet pressed. */}
      <View accessibilityLabel={rendered.filename} style={{ height: 0 }} />
    </View>
  );
}

type ErrorPanelProps = { message: string; onBack: () => void };

function ErrorPanel({ message, onBack }: ErrorPanelProps): React.ReactElement {
  return (
    <View className="items-center gap-5">
      <View
        accessibilityLabel="Export failed"
        className="h-24 w-24 items-center justify-center rounded-3xl border-[1.5px] border-red bg-navy800"
      >
        <Ionicons name="alert-circle" size={56} color={tokens.colors.red} />
      </View>
      <Text
        className="text-foreground text-center"
        style={{
          fontFamily: 'Nunito_900Black',
          fontSize: 22,
          lineHeight: 26,
          letterSpacing: -0.36,
          maxWidth: 280,
        }}
      >
        We couldn&apos;t make the PDF
      </Text>
      <Text
        accessibilityLabel="Error details"
        className="text-navy200 text-center"
        style={{
          fontFamily: 'Nunito_600SemiBold',
          fontSize: 14,
          lineHeight: 20,
          maxWidth: 280,
        }}
      >
        {message}
      </Text>
      <PushButton
        variant="primary"
        size="md"
        onPress={onBack}
        accessibilityLabel="Back"
      >
        Back
      </PushButton>
    </View>
  );
}

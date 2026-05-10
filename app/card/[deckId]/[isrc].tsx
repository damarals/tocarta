import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '@/components/ui/text';
import { deckLibrary } from '@/lib/deck-library';
import { parseDeezerPlaylistUrl } from '@/lib/deezer-url';
import { eraColor } from '@/lib/era-color';
import type { Card, Deck } from '@/lib/types';
import { tokens } from '@/theme/tokens';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; deck: Deck; card: Card }
  | { kind: 'not-found' };

// Preview geometry. Print is 60×60mm; preview is 0.9× → 54mm,
// rendered at scale=0.9 so the inner card itself is 60mm-equivalent. Pick
// 240px as the on-screen card size so 1mm ≈ 4px and every measurement
// derived below stays close to the print ratios.
const CARD_PX = 240;
const MM = CARD_PX / 60;
const QR_PX = Math.round(36 * MM); // 144 — 36mm QR, 60% of card width.
const BACK_PADDING_PX = Math.round(4 * MM); // 16 — 4mm padding.
const YEAR_FONT_PX = Math.round(81); // 90px @ 0.9× scale.

function buildQrPayload(card: Card, deck: Deck): string {
  // ADR-0013: extended format `ISRC:PROVIDER:PLAYLIST_ID`. If the deck's
  // source URL doesn't parse (legacy/foreign deck), fall back to bare ISRC
  // — still scannable as a Tocarta card under the same ADR's compat note.
  const parsed = parseDeezerPlaylistUrl(deck.sourceUrl);
  if (parsed === null) return card.isrc;
  return `${card.isrc}:DZ:${parsed.playlistId}`;
}

export default function CardDetailScreen() {
  const { deckId, isrc } = useLocalSearchParams<{ deckId: string; isrc: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!deckId || !isrc) {
      setState({ kind: 'not-found' });
      return;
    }
    deckLibrary
      .load(deckId)
      .then((deck) => {
        if (cancelled) return;
        if (deck === null) {
          setState({ kind: 'not-found' });
          return;
        }
        const card = deck.cards.find((c) => c.isrc === isrc);
        if (card === undefined) {
          setState({ kind: 'not-found' });
          return;
        }
        setState({ kind: 'loaded', deck, card });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: 'not-found' });
      });
    return () => {
      cancelled = true;
    };
  }, [deckId, isrc]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-background">
      {state.kind === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.colors.lime} />
        </View>
      )}
      {state.kind === 'not-found' && (
        <View className="flex-1 items-center justify-center px-8">
          <Text
            className="text-foreground text-center"
            style={{
              fontFamily: 'Nunito_900Black',
              fontSize: 22,
              lineHeight: 26,
              letterSpacing: -0.36,
            }}
          >
            Card not found.
          </Text>
        </View>
      )}
      {state.kind === 'loaded' && <CardPreviews deck={state.deck} card={state.card} />}
    </SafeAreaView>
  );
}

type CardPreviewsProps = { deck: Deck; card: Card };

function CardPreviews({ deck, card }: CardPreviewsProps): React.ReactElement {
  const displayYear = card.yearOverride ?? card.year;
  const era = eraColor(displayYear);
  const qrPayload = buildQrPayload(card, deck);

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pt-1 pb-10">
        <Text
          className="text-navy200 mb-4"
          style={{
            fontFamily: 'Nunito_700Bold',
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          This is what gets printed. The QR side scans to play; the metadata
          side is flipped to reveal the answer.
        </Text>

        <CardLabeled label="Front · scan side">
          <CardFront qrPayload={qrPayload} />
        </CardLabeled>
        <View style={{ height: 16 }} />
        <CardLabeled label="Back · reveal side">
          <CardBack
            year={displayYear}
            artist={card.artist}
            title={card.title}
            background={era.background}
            text={era.text}
          />
        </CardLabeled>

        <View className="mt-6">
          <Eyebrow>Card code</Eyebrow>
          <View className="rounded-2xl border-[1.5px] border-navy600 bg-navy800 p-4">
            <Text
              accessibilityLabel="Card code"
              className="text-cyan"
              style={{
                fontFamily: 'JetBrainsMono_700Bold',
                fontSize: 14,
                lineHeight: 18,
              }}
            >
              {card.isrc}
            </Text>
            <Text
              className="text-navy400 mt-3"
              style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Other QR scanners see an opaque code, never a song. Anyone with
              Tocarta can scan to play, and missing decks can be re-imported
              from the QR.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Eyebrow({ children }: { children: string }): React.ReactElement {
  return (
    <Text
      className="text-navy400 mb-2"
      style={{
        fontFamily: 'Nunito_800ExtraBold',
        fontSize: 12,
        letterSpacing: 1.44,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}

function CardLabeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <View>
      <Eyebrow>{label}</Eyebrow>
      <View
        className="rounded-3xl border-[1.5px] border-dashed border-navy600 bg-navy950 items-center justify-center"
        style={{ padding: 24 }}
      >
        {children}
      </View>
    </View>
  );
}

function CardFront({
  qrPayload,
}: {
  qrPayload: string;
}): React.ReactElement {
  return (
    <View
      accessibilityLabel="Card front preview"
      style={{
        width: CARD_PX,
        height: CARD_PX,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        overflow: 'hidden',
        alignItems: 'center',
        paddingTop: 8 * MM,
      }}
    >
      <QRCode
        value={qrPayload}
        size={QR_PX}
        backgroundColor="#FFFFFF"
        color={tokens.colors.navy900}
      />
      <Text
        style={{
          fontFamily: 'Fraunces_600SemiBold',
          fontSize: 5 * MM,
          lineHeight: 5 * MM,
          color: tokens.colors.navy900,
          letterSpacing: -0.05,
          marginTop: 0.5 * MM,
        }}
      >
        tocarta
      </Text>
    </View>
  );
}

type CardBackProps = {
  year: number | null;
  artist: string;
  title: string;
  background: string;
  text: string;
};

function CardBack({
  year,
  artist,
  title,
  background,
  text,
}: CardBackProps): React.ReactElement {
  return (
    <View
      accessibilityLabel="Card back preview"
      style={{
        width: CARD_PX,
        height: CARD_PX,
        backgroundColor: background,
        borderRadius: 14,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        padding: BACK_PADDING_PX,
      }}
    >
      <Text
        style={{
          fontFamily: 'Fraunces_600SemiBold',
          fontSize: YEAR_FONT_PX,
          lineHeight: YEAR_FONT_PX,
          letterSpacing: -YEAR_FONT_PX * 0.02,
          color: text,
          textAlign: 'center',
          marginBottom: 4 * MM,
        }}
      >
        {year === null ? '—' : String(year)}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          fontFamily: 'Nunito_700Bold',
          fontSize: 4 * MM,
          lineHeight: 4 * MM * 1.2,
          color: text,
          textAlign: 'center',
          marginBottom: 1 * MM,
        }}
      >
        {artist}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          fontFamily: 'Nunito_400Regular',
          fontSize: 3.5 * MM,
          lineHeight: 3.5 * MM * 1.2,
          color: text,
          opacity: 0.85,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </View>
  );
}

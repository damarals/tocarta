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

const LIME = 'rgb(200 232 74)';

// Preview geometry. Print is 60×60mm; preview is roughly 0.9× → 54mm,
// rendered at 240px square so 1mm ≈ 4px. Every other dimension below is
// derived from this scale so the preview reads as a faithful 0.9× of print.
const CARD_PX = 240;
const MM = CARD_PX / 60;
const QR_PX = Math.round(36 * MM); // 144 — 36mm QR, 60% of card width.
const QR_TOP_PX = Math.round(8 * MM); // 32 — anchored 8mm from top.
const WORDMARK_GAP_PX = Math.round(0.5 * MM); // 2 — 0.5mm below QR.
const WORDMARK_FONT_PX = Math.round(5 * MM); // 20 — wordmark 5mm.
const YEAR_FONT_PX = Math.round(21 * MM); // 84 — year 21mm.
const ARTIST_FONT_PX = Math.round(4 * MM); // 16 — artist 4mm.
const TITLE_FONT_PX = Math.round(3.5 * MM); // 14 — title 3.5mm.
const BACK_PADDING_PX = Math.round(4 * MM); // 16 — 4mm padding.

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
          <ActivityIndicator color={LIME} />
        </View>
      )}
      {state.kind === 'not-found' && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-body text-muted-foreground text-base text-center">
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
    <ScrollView contentContainerClassName="px-6 pt-6 pb-10 gap-6 items-center">
      <CardFront qrPayload={qrPayload} />
      <CardBack
        year={displayYear}
        artist={card.artist}
        title={card.title}
        background={era.background}
        text={era.text}
      />
      <Explainer />
    </ScrollView>
  );
}

function CardFront({ qrPayload }: { qrPayload: string }): React.ReactElement {
  return (
    <View
      accessibilityLabel="Card front preview"
      style={{
        width: CARD_PX,
        height: CARD_PX,
        backgroundColor: '#ffffff',
        alignItems: 'center',
      }}
    >
      <View style={{ marginTop: QR_TOP_PX }}>
        <QRCode value={qrPayload} size={QR_PX} backgroundColor="#ffffff" color={tokens.colors.navy900} />
      </View>
      <Text
        style={{
          marginTop: WORDMARK_GAP_PX,
          fontFamily: 'Fraunces_600SemiBold',
          fontSize: WORDMARK_FONT_PX,
          lineHeight: WORDMARK_FONT_PX * 1.05,
          color: tokens.colors.navy900,
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

function CardBack({ year, artist, title, background, text }: CardBackProps): React.ReactElement {
  return (
    <View
      accessibilityLabel="Card back preview"
      style={{
        width: CARD_PX,
        height: CARD_PX,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: BACK_PADDING_PX,
      }}
    >
      <Text
        style={{
          fontFamily: 'Fraunces_600SemiBold',
          fontSize: YEAR_FONT_PX,
          lineHeight: YEAR_FONT_PX * 1.05,
          color: text,
        }}
      >
        {year === null ? '—' : String(year)}
      </Text>
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={{
          fontFamily: 'Nunito_700Bold',
          fontSize: ARTIST_FONT_PX,
          lineHeight: ARTIST_FONT_PX * 1.2,
          color: text,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {artist}
      </Text>
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={{
          fontFamily: 'Nunito',
          fontSize: TITLE_FONT_PX,
          lineHeight: TITLE_FONT_PX * 1.2,
          color: text,
          opacity: 0.85,
          textAlign: 'center',
          marginTop: 2,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function Explainer(): React.ReactElement {
  return (
    <View className="rounded-xl border border-navy500 bg-navy700 px-4 py-3 max-w-[280px]">
      <Text className="font-body text-muted-foreground text-sm leading-relaxed">
        The QR carries a card code and a pointer back to this deck. Other QR scanners
        see only an opaque code, never a song, so the answer never leaks. Anyone with
        Tocarta can scan to play, and missing decks are re-imported straight from the card.
      </Text>
    </View>
  );
}

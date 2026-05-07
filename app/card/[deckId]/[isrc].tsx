import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';

import { ScreenHeader } from '@/components/ui/screen-header';
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
  const isrcTail = card.isrc.slice(-6);

  return (
    <View className="flex-1">
      <ScreenHeader title="Card preview" />
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
          <CardFront qrPayload={qrPayload} isrcTail={isrcTail} />
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
  isrcTail,
}: {
  qrPayload: string;
  isrcTail: string;
}): React.ReactElement {
  return (
    <View
      accessibilityLabel="Card front preview"
      style={{
        width: CARD_PX,
        height: CARD_PX,
        backgroundColor: '#F4EDE0',
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Brand corner top-left */}
      <View
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Svg width={14} height={14} viewBox="0 0 32 32">
          <Circle cx={16} cy={16} r={14} fill={tokens.colors.navy900} />
          <Circle cx={16} cy={16} r={3} fill={tokens.colors.lime} />
        </Svg>
        <Text
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 11,
            color: tokens.colors.navy900,
            letterSpacing: 0.44,
            textTransform: 'uppercase',
          }}
        >
          tocarta
        </Text>
      </View>

      {/* ISRC tail top-right */}
      <Text
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 9,
          color: tokens.colors.navy400,
        }}
      >
        {isrcTail}
      </Text>

      {/* Centered QR in white frame */}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            padding: 6,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: 'rgba(15,23,42,0.18)',
          }}
        >
          <QRCode
            value={qrPayload}
            size={QR_PX}
            backgroundColor="#fff"
            color={tokens.colors.navy900}
          />
        </View>
      </View>

      {/* Bottom row: scan caption + lime play pill */}
      <View
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          right: 14,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <Text
          style={{
            fontFamily: 'Nunito_800ExtraBold',
            fontSize: 9,
            color: tokens.colors.navy400,
            letterSpacing: 0.9,
            textTransform: 'uppercase',
          }}
        >
          scan with the app
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            backgroundColor: tokens.colors.lime,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              fontFamily: 'Nunito_900Black',
              fontSize: 9,
              color: tokens.colors.navy900,
              letterSpacing: 0.9,
              textTransform: 'uppercase',
            }}
          >
            play
          </Text>
        </View>
      </View>
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
        position: 'relative',
      }}
    >
      {/* Brand corner top-left at 60% opacity */}
      <View
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          opacity: 0.6,
        }}
      >
        <Svg width={12} height={12} viewBox="0 0 32 32">
          <Circle cx={16} cy={16} r={13} fill="none" stroke={text} strokeWidth={3} />
          <Circle cx={16} cy={16} r={3} fill={text} />
        </Svg>
        <Text
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 9,
            color: text,
            letterSpacing: 0.36,
            textTransform: 'uppercase',
          }}
        >
          tocarta
        </Text>
      </View>

      {/* Decorative concentric rings bleed top-right */}
      <Svg
        width={120}
        height={120}
        viewBox="0 0 64 64"
        style={{ position: 'absolute', top: -30, right: -30, opacity: 0.12 }}
      >
        <Circle cx={32} cy={32} r={28} fill="none" stroke={text} strokeWidth={1.5} />
        <Circle cx={32} cy={32} r={20} fill="none" stroke={text} strokeWidth={1.5} />
        <Circle cx={32} cy={32} r={12} fill="none" stroke={text} strokeWidth={1.5} />
      </Svg>

      {/* Centered year */}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
          padding: BACK_PADDING_PX,
        }}
      >
        <Text
          style={{
            fontFamily: 'Fraunces_900Black',
            fontSize: YEAR_FONT_PX,
            lineHeight: YEAR_FONT_PX,
            letterSpacing: -YEAR_FONT_PX * 0.03,
            color: text,
            textAlign: 'center',
          }}
        >
          {year === null ? '—' : String(year)}
        </Text>
      </View>

      {/* Bottom: title + artist */}
      <View
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          right: 14,
          alignItems: 'center',
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            fontFamily: 'Nunito_900Black',
            fontSize: 12,
            lineHeight: 14,
            color: text,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'Nunito_700Bold',
            fontSize: 10,
            lineHeight: 12,
            color: text,
            opacity: 0.85,
            textAlign: 'center',
            marginTop: 3,
          }}
        >
          {artist}
        </Text>
      </View>
    </View>
  );
}

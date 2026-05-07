// PLAY-MODE SCREEN — anti-spoiler discipline applies (ADR-0009).
//
// This screen is allowed to know:
//   - the parsed Tocarta CardCode (`isrc`, optional `provider`/`playlistId`)
//   - the resolved preview URL
//   - playback timing (position, isPlaying, didFinish)
//
// It is NOT allowed to know — and therefore must NOT look up — the card's
// artist, title, year, album, or cover art. The only DeckLibrary access
// permitted is a *boolean* existence check at end-of-round to decide whether
// to route to the import-prompt screen (per Issue #13 / ADR-0013). That check
// must NEVER feed deck or track strings into UI state on this screen.
//
// The audio API is touched only through `AntiSpoilerAudioPlayer`. Direct
// `expo-av` imports here would be both an ADR-0009 violation and an ESLint
// error (`no-restricted-imports` enforces it).

import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarsVisual } from '@/components/playback/BarsVisual';
import { CalmPulseVisual } from '@/components/playback/CalmPulseVisual';
import { RingsVisual } from '@/components/playback/RingsVisual';
import { VinylVisual } from '@/components/playback/VinylVisual';
import { Dot } from '@/components/ui/dot';
import { IconButton } from '@/components/ui/icon-button';
import { IndeterminateBar } from '@/components/ui/indeterminate-bar';
import { Pill } from '@/components/ui/pill';
import { PushButton } from '@/components/ui/push-button';
import { Text } from '@/components/ui/text';
import {
  configureAudioModeForPlay,
  createAntiSpoilerAudioPlayer,
  type AntiSpoilerAudioPlayer,
  type PlaybackStatus,
} from '@/lib/anti-spoiler-audio-player';
import { deezerAudioProvider, type AudioProviderError } from '@/lib/audio-provider';
import { parseCardCode, type CardCode } from '@/lib/card-code-validator';
import { deckLibrary } from '@/lib/deck-library';
import {
  deckMatchesPointer,
  reconstructPlaylistUrl,
  type DeckPointer,
} from '@/lib/deck-pointer';
import { wasDeclined } from '@/lib/import-session';
import { tokens } from '@/theme/tokens';

/**
 * Visualisation chosen for V1. There is no UI selector — designers ship one
 * pick and revisit later. Switch the literal here to try the others; the
 * rendering is purely decorative and takes no track-identifying inputs.
 */
const VISUAL: 'rings' | 'calm-pulse' | 'vinyl' | 'bars' = 'rings';

type Phase =
  | { kind: 'loading' }
  | { kind: 'playing'; positionMillis: number }
  | { kind: 'paused'; positionMillis: number }
  | { kind: 'ended' }
  | { kind: 'error'; message: string }
  | { kind: 'invalid' };

export default function PlaybackScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const raw = typeof code === 'string' ? code : '';
  const parsed = useMemo(() => parseCardCode(raw), [raw]);

  const [phase, setPhase] = useState<Phase>(parsed === null ? { kind: 'invalid' } : { kind: 'loading' });
  const [isOnline, setIsOnline] = useState(true);
  // Player and abort flag held in refs so we don't re-create them per render.
  const playerRef = useRef<AntiSpoilerAudioPlayer | null>(null);
  const cancelledRef = useRef(false);
  // Round-end can be triggered both by natural `onEnded` and by the End-round
  // button. Route exactly once so we don't double-navigate.
  const routedRef = useRef(false);

  const routeAfterRound = useCallback(async (): Promise<void> => {
    if (routedRef.current) return;
    routedRef.current = true;
    cancelledRef.current = true;
    void playerRef.current?.stop();

    const next = await chooseNextRoute(parsed);
    if (next.kind === 'scan') {
      router.replace('/scan');
      return;
    }
    router.replace({
      pathname: '/import',
      params: { provider: next.pointer.provider, playlistId: next.pointer.playlistId },
    });
  }, [parsed, router]);

  // Defensive: a working Scanner never navigates here with an invalid code,
  // but the screen still has to handle it gracefully.
  useEffect(() => {
    if (parsed !== null) return;
    const t = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(t);
  }, [parsed, router]);

  // Network state — initial check + listener.
  useEffect(() => {
    let active = true;
    void Network.getNetworkStateAsync().then((s) => {
      if (active) setIsOnline(s.isConnected !== false);
    });
    const sub = Network.addNetworkStateListener((s) => {
      setIsOnline(s.isConnected !== false);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  // Resolve the preview URL and start playback.
  useEffect(() => {
    if (parsed === null) return;
    cancelledRef.current = false;
    const player = createAntiSpoilerAudioPlayer();
    playerRef.current = player;

    const onTick = (status: PlaybackStatus) => {
      if (cancelledRef.current) return;
      setPhase((prev) => {
        if (prev.kind === 'paused') return prev;
        if (prev.kind === 'ended' || prev.kind === 'error' || prev.kind === 'invalid') return prev;
        return { kind: 'playing', positionMillis: status.positionMillis };
      });
    };
    const onEnded = () => {
      if (cancelledRef.current) return;
      setPhase({ kind: 'ended' });
      void routeAfterRound();
    };

    void (async () => {
      try {
        // OS-level anti-spoiler enforcement (ADR-0009): set the audio mode so
        // the device stops playback when the screen locks or the app
        // backgrounds. With staysActiveInBackground=false, no MediaSession
        // card is created, so the lock screen / headphones / Android Auto
        // have nothing to surface.
        await configureAudioModeForPlay();
        if (cancelledRef.current) return;
        const url = await deezerAudioProvider.getPreviewUrl(parsed.isrc);
        if (cancelledRef.current) return;
        await player.play(url, { onTick, onEnded });
      } catch (e) {
        if (cancelledRef.current) return;
        setPhase({ kind: 'error', message: messageFor(e) });
      }
    })();

    return () => {
      cancelledRef.current = true;
      void player.stop();
      playerRef.current = null;
    };
  }, [parsed, routeAfterRound]);

  const onTogglePause = useCallback(async () => {
    const player = playerRef.current;
    if (player === null) return;
    if (phase.kind === 'playing') {
      await player.pause();
      setPhase({ kind: 'paused', positionMillis: phase.positionMillis });
    } else if (phase.kind === 'paused') {
      await player.resume();
      setPhase({ kind: 'playing', positionMillis: phase.positionMillis });
    }
  }, [phase]);

  const onEndRound = useCallback(() => {
    void routeAfterRound();
  }, [routeAfterRound]);

  const onClose = useCallback(() => {
    void routeAfterRound();
  }, [routeAfterRound]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-navy950">
      <TopBar onClose={onClose} />

      {/* Offline / error banners sit between the chrome and the visual */}
      <View className="px-5 gap-2">
        {!isOnline && <OfflineBanner />}
        {phase.kind === 'error' && <ErrorBanner message={phase.message} />}
        {phase.kind === 'invalid' && (
          <Text className="font-display text-foreground text-base text-center">
            Invalid scan, returning…
          </Text>
        )}
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Visualisation active={phase.kind === 'playing'} />
        <CountUpTimer phase={phase} />
        <ReassurancePill />
      </View>

      <View className="w-full px-6 pb-6 gap-4">
        <IndeterminateBar paused={phase.kind === 'paused' || phase.kind === 'loading'} />
        <Controls
          phase={phase}
          disabled={!isOnline || phase.kind === 'invalid' || phase.kind === 'loading'}
          onTogglePause={onTogglePause}
          onEndRound={onEndRound}
        />
      </View>
    </SafeAreaView>
  );
}

function Visualisation({ active }: { active: boolean }) {
  switch (VISUAL) {
    case 'calm-pulse':
      return <CalmPulseVisual active={active} />;
    case 'vinyl':
      return <VinylVisual active={active} />;
    case 'bars':
      return <BarsVisual active={active} />;
    case 'rings':
    default:
      return <RingsVisual active={active} />;
  }
}

function TopBar({ onClose }: { onClose: () => void }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5">
      <IconButton
        size={40}
        surfaceClass="bg-navy800"
        shadowColor={tokens.colors.navy950}
        onPress={onClose}
        accessibilityLabel="Close playback"
      >
        <Ionicons name="close" size={20} color="#fff" />
      </IconButton>
      <Pill tone="pink">
        <Dot color="pink" pulse />
        <Text
          className="text-pink"
          style={{
            fontFamily: 'Nunito_700Bold',
            fontSize: 11,
            letterSpacing: 0.44,
            textTransform: 'uppercase',
          }}
        >
          Playing — no peeking
        </Text>
      </Pill>
      <IconButton
        size={40}
        surfaceClass="bg-navy800"
        shadowColor={tokens.colors.navy950}
        onPress={() => undefined}
        accessibilityLabel="Volume"
      >
        <Ionicons name="volume-medium" size={18} color="#fff" />
      </IconButton>
    </View>
  );
}

function CountUpTimer({ phase }: { phase: Phase }) {
  const ms =
    phase.kind === 'playing' || phase.kind === 'paused'
      ? phase.positionMillis
      : phase.kind === 'ended'
        ? 30_000
        : 0;
  return (
    <Text
      accessibilityLabel="Elapsed time"
      style={{
        marginTop: 32,
        fontFamily: 'Fraunces_900Black',
        fontSize: 80,
        lineHeight: 80,
        letterSpacing: -3.2,
        color: tokens.colors.navy50,
        textAlign: 'center',
        // tabular-nums keeps the digits from wobbling as seconds tick.
        fontVariant: ['tabular-nums'],
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 24,
      }}
    >
      {formatPosition(ms)}
    </Text>
  );
}

function ReassurancePill() {
  return (
    <View
      className="flex-row items-center gap-2 mt-6 px-3.5 py-2 rounded-full"
      style={{
        backgroundColor: 'rgba(255,107,181,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,107,181,0.28)',
      }}
    >
      <Dot color="pink" size={5} />
      <Text
        className="text-navy200"
        style={{
          fontFamily: 'Nunito_700Bold',
          fontSize: 10,
          letterSpacing: 0.4,
        }}
      >
        lock screen and notifications hidden
      </Text>
    </View>
  );
}

function Controls({
  phase,
  disabled,
  onTogglePause,
  onEndRound,
}: {
  phase: Phase;
  disabled: boolean;
  onTogglePause: () => void;
  onEndRound: () => void;
}) {
  const isPlaying = phase.kind === 'playing';
  const pauseDisabled = disabled || (phase.kind !== 'playing' && phase.kind !== 'paused');

  return (
    <View className="flex-row items-center justify-center gap-3">
      <PushButton
        variant="ghost"
        size="md"
        onPress={onTogglePause}
        disabled={pauseDisabled}
        accessibilityLabel={isPlaying ? 'Pause' : 'Resume'}
        icon={
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={16}
            color={tokens.colors.navy200}
          />
        }
      >
        {isPlaying ? 'Pause' : 'Resume'}
      </PushButton>
      <PushButton
        variant="secondary"
        size="md"
        onPress={onEndRound}
        accessibilityLabel="End round"
      >
        End round
      </PushButton>
    </View>
  );
}

function OfflineBanner() {
  return (
    <View
      accessibilityLabel="Offline"
      className="rounded-2xl border-[1.5px] border-red bg-red/15 p-4"
    >
      <Text
        className="text-red"
        style={{
          fontFamily: 'Nunito_900Black',
          fontSize: 14,
          lineHeight: 18,
        }}
      >
        No internet — can&apos;t load this card. Reconnect to keep playing.
      </Text>
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View
      accessibilityLabel="Playback error"
      className="rounded-2xl border-[1.5px] border-red bg-red/15 p-4"
    >
      <Text
        className="text-red"
        style={{
          fontFamily: 'Nunito_900Black',
          fontSize: 14,
          lineHeight: 18,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

/** Format playback position as `M:SS`. No total/duration shown — the round
 *  ends when the audio ends, but the player isn't told "30s" up front. */
function formatPosition(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function messageFor(e: unknown): string {
  if (e !== null && typeof e === 'object' && 'kind' in e) {
    const err = e as AudioProviderError;
    switch (err.kind) {
      case 'not_found':
        return "We couldn't find this card on Deezer.";
      case 'no_preview':
        return 'No preview available for this track.';
      case 'network':
        return "No internet — audio can't play";
      case 'unknown':
        return 'Audio failed to start. Try again.';
    }
  }
  return 'Audio failed to start. Try again.';
}

type NextRoute =
  /** Card had no deck pointer, the deck is already in the Library, or the
   *  user already declined this pointer this session. Go back to scan. */
  | { kind: 'scan' }
  /** Card carried an unknown, supported pointer not yet declined. Offer
   *  import. */
  | { kind: 'import'; pointer: DeckPointer };

/**
 * Decide where Playback should route after the round ends. Pure routing
 * decision: this function reads the local DeckLibrary to test for a match,
 * but never returns or surfaces deck/track metadata to the caller — only the
 * pointer the screen already carries. Errors fall through to `scan` so a
 * misbehaving DeckLibrary can never trap the user on the playback screen.
 */
async function chooseNextRoute(parsed: CardCode | null): Promise<NextRoute> {
  if (parsed === null) return { kind: 'scan' };
  if (parsed.provider === undefined || parsed.playlistId === undefined) {
    return { kind: 'scan' };
  }
  const pointer: DeckPointer = {
    provider: parsed.provider,
    playlistId: parsed.playlistId,
  };
  if (reconstructPlaylistUrl(pointer) === null) return { kind: 'scan' };
  if (wasDeclined(pointer)) return { kind: 'scan' };
  try {
    const decks = await deckLibrary.list();
    if (decks.some((d) => deckMatchesPointer(d, pointer))) return { kind: 'scan' };
  } catch {
    return { kind: 'scan' };
  }
  return { kind: 'import', pointer };
}

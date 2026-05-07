// PLAY-MODE SCREEN — anti-spoiler discipline applies (ADR-0009).
//
// This screen is allowed to know:
//   - the parsed Tocarta CardCode (`isrc`, optional `provider`/`playlistId`)
//   - the resolved preview URL
//   - playback timing (position, isPlaying, didFinish)
//
// It is NOT allowed to know — and therefore must NOT look up — the card's
// artist, title, year, album, or cover art. It does not query the local
// DeckLibrary, because doing so would put identifying strings one render
// away from the UI. That's the whole game: scan -> audio -> physical reveal.
//
// The audio API is touched only through `AntiSpoilerAudioPlayer`. Direct
// `expo-av` imports here would be both an ADR-0009 violation and an ESLint
// error (`no-restricted-imports` enforces it).

import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarsVisual } from '@/components/playback/BarsVisual';
import { CalmPulseVisual } from '@/components/playback/CalmPulseVisual';
import { RingsVisual } from '@/components/playback/RingsVisual';
import { VinylVisual } from '@/components/playback/VinylVisual';
import { Text } from '@/components/ui/text';
import {
  createAntiSpoilerAudioPlayer,
  type AntiSpoilerAudioPlayer,
  type PlaybackStatus,
} from '@/lib/anti-spoiler-audio-player';
import { deezerAudioProvider, type AudioProviderError } from '@/lib/audio-provider';
import { parseCardCode } from '@/lib/card-code-validator';
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
    };

    void (async () => {
      try {
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
  }, [parsed]);

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
    cancelledRef.current = true;
    void playerRef.current?.stop();
    router.replace('/scan');
  }, [router]);

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-navy900">
      <View className="flex-1 items-center justify-between px-6 py-8">
        <TopPills />
        <View className="items-center gap-8">
          <Visualisation active={phase.kind === 'playing'} />
          <CountUpTimer phase={phase} />
          <ProgressBar paused={phase.kind === 'paused'} />
        </View>
        <View className="w-full items-center gap-4">
          {!isOnline && <OfflineBanner />}
          {phase.kind === 'error' && <ErrorBanner message={phase.message} />}
          {phase.kind === 'invalid' && (
            <Text className="font-body text-foreground text-base">Invalid scan, returning…</Text>
          )}
          <Controls
            phase={phase}
            disabled={!isOnline || phase.kind === 'invalid' || phase.kind === 'loading'}
            onTogglePause={onTogglePause}
            onEndRound={onEndRound}
          />
        </View>
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

function TopPills() {
  return (
    <View className="items-center gap-2">
      <View
        className="rounded-full px-4 py-2"
        style={{ backgroundColor: tokens.colors.pink }}
      >
        <Text className="font-body text-base font-bold" style={{ color: '#fff' }}>
          Playing — no peeking
        </Text>
      </View>
      <Text className="font-body text-navy200 text-xs">
        lock screen and notifications hidden
      </Text>
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
      className="font-display text-foreground"
      style={{
        fontSize: 80,
        // tabular-nums keeps the digits from wobbling as seconds tick.
        fontVariant: ['tabular-nums'],
        lineHeight: 88,
      }}
    >
      {formatPosition(ms)}
    </Text>
  );
}

function ProgressBar({ paused }: { paused: boolean }) {
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (paused) return;
    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [paused, translate]);

  // Indeterminate bar: a gradient slug slides along the track.
  return (
    <View
      style={{
        width: '80%',
        height: 4,
        borderRadius: 2,
        backgroundColor: '#1a1f2e',
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          width: '40%',
          height: '100%',
          backgroundColor: tokens.colors.pink,
          borderRadius: 2,
          opacity: 0.9,
          transform: [
            {
              translateX: translate.interpolate({
                inputRange: [0, 1],
                // From off-left to off-right, in % of bar width.
                outputRange: ['-100%', '300%'],
              }),
            },
          ],
        }}
      />
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
    <View className="w-full items-center gap-3">
      <Pressable
        accessibilityLabel={isPlaying ? 'Pause' : 'Resume'}
        role="button"
        disabled={pauseDisabled}
        onPress={onTogglePause}
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: tokens.colors.lime,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pauseDisabled ? 0.4 : 1,
        }}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={36}
          color={tokens.colors.navy900}
        />
      </Pressable>
      <Pressable
        onPress={onEndRound}
        accessibilityLabel="End round"
        role="button"
        className="rounded-full border border-border px-6 py-3 active:bg-navy700"
      >
        <Text className="font-body text-foreground text-base font-bold">End round</Text>
      </Pressable>
    </View>
  );
}

function OfflineBanner() {
  return (
    <View
      className="w-full rounded-md px-4 py-3"
      style={{ backgroundColor: tokens.colors.red }}
    >
      <Text className="font-body text-base font-bold" style={{ color: '#fff' }}>
        No internet — audio can&apos;t play
      </Text>
    </View>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View
      className="w-full rounded-md px-4 py-3"
      style={{ backgroundColor: tokens.colors.red }}
    >
      <Text className="font-body text-base font-bold" style={{ color: '#fff' }}>
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

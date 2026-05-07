/**
 * AntiSpoilerAudioPlayer — the SINGLE channel through which Tocarta touches
 * the audio API during play mode (per ADR-0009 and the V1 PRD's anti-spoiler
 * enforcement section).
 *
 * Rules this module exists to enforce:
 * 1. The only thing it accepts about a track is a preview URL. No artist,
 *    title, year, album, cover art, or any other identifying string.
 * 2. MediaSession metadata is set to a constant `{ title: "Tocarta", artist: "" }`
 *    on every play(), regardless of arguments. There is no path through the
 *    public API that lets a track-identifying string reach MediaSession or
 *    the underlying expo-av call site.
 * 3. Direct use of `expo-av` is forbidden anywhere else in the codebase
 *    (ESLint enforces this; this module is the only file that imports it).
 *
 * A future maintainer will be tempted to "improve UX" by populating
 * MediaSession with the now-playing track. That maintainer should read
 * ADR-0009 and reconsider; the central spoiler-prevention test in
 * `__tests__/anti-spoiler-audio-player.test.ts` will fail loudly if they
 * route metadata through here.
 */

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

/**
 * The only shape callers see for status updates. Intentionally narrow:
 * everything else expo-av emits (URI, durationMillis, etc.) is dropped at
 * this boundary.
 */
export type PlaybackStatus = {
  positionMillis: number;
  isPlaying: boolean;
  didFinish: boolean;
};

export interface AntiSpoilerAudioPlayer {
  play(
    previewUrl: string,
    callbacks?: {
      onTick?: (status: PlaybackStatus) => void;
      onEnded?: () => void;
    },
  ): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
}

/** Constant metadata sent to the OS audio session. NEVER per-track. */
const ANTI_SPOILER_METADATA = { title: 'Tocarta', artist: '' } as const;

type AudioStatusUpdate = {
  isLoaded?: boolean;
  positionMillis?: number;
  isPlaying?: boolean;
  didJustFinish?: boolean;
};

type SoundLike = {
  playAsync: () => Promise<unknown>;
  pauseAsync: () => Promise<unknown>;
  unloadAsync: () => Promise<unknown>;
  setOnPlaybackStatusUpdate: (cb: (s: AudioStatusUpdate) => void) => void;
};

type AudioModuleLike = {
  Sound: {
    createAsync: (
      source: { uri: string },
      ...rest: unknown[]
    ) => Promise<{ sound: SoundLike }>;
  };
};

/**
 * Build an AntiSpoilerAudioPlayer. `audioModule` and `setNowPlayingMetadata`
 * are injected so tests can spy on what the player sends to the audio API
 * and the OS — that's the whole point of the central spoiler-prevention
 * test.
 */
export function createAntiSpoilerAudioPlayer(opts?: {
  audioModule?: typeof Audio;
  setNowPlayingMetadata?: (m: { title: string; artist: string }) => void;
}): AntiSpoilerAudioPlayer {
  const audioModule: AudioModuleLike = (opts?.audioModule ?? Audio) as unknown as AudioModuleLike;
  // Default metadata writer is a no-op: expo-av on RN has no first-class
  // MediaSession API the way the web does. The injection point exists so
  // (a) tests can verify the player NEVER passes anything but the constant
  // and (b) a real implementation can be wired later (e.g. an Android native
  // module) without changing this module's public contract.
  const setNowPlaying = opts?.setNowPlayingMetadata ?? (() => {});

  let current: SoundLike | null = null;
  // Tracks `onEnded` per-play so a finished status is reported at most once.
  let onEndedFired = false;

  return {
    async play(previewUrl, callbacks) {
      // Defensive: tear down any prior sound before creating a new one. Both
      // the unload and the createAsync are awaited so the call order is
      // deterministic — important for the test that asserts a→unload→b.
      if (current !== null) {
        await current.unloadAsync();
        current = null;
      }
      onEndedFired = false;

      // CRITICAL: build the source object inline with ONLY a `uri` field. No
      // spread of caller-provided options, no extra keys, ever. This is the
      // single line that, if changed, leaks metadata into expo-av.
      const source = { uri: previewUrl };
      const { sound } = await audioModule.Sound.createAsync(source);
      current = sound;

      const onTick = callbacks?.onTick;
      const onEnded = callbacks?.onEnded;

      sound.setOnPlaybackStatusUpdate((status: AudioStatusUpdate) => {
        // Re-shape into our narrow PlaybackStatus type. Only the three
        // documented fields are passed through; anything else expo-av (or a
        // hostile spy) shovels into the status is dropped here.
        const tick: PlaybackStatus = {
          positionMillis:
            typeof status.positionMillis === 'number' ? status.positionMillis : 0,
          isPlaying: status.isPlaying === true,
          didFinish: status.didJustFinish === true,
        };
        if (onTick !== undefined) onTick(tick);
        if (tick.didFinish && onEnded !== undefined && !onEndedFired) {
          onEndedFired = true;
          onEnded();
        }
      });

      // CRITICAL: MediaSession is set to the constant. No branch reads from
      // `previewUrl` or `callbacks`; this line is allowlist-only.
      setNowPlaying({ ...ANTI_SPOILER_METADATA });

      await sound.playAsync();
    },

    async pause() {
      if (current !== null) {
        await current.pauseAsync();
      }
    },

    async resume() {
      if (current !== null) {
        await current.playAsync();
      }
    },

    async stop() {
      if (current !== null) {
        await current.unloadAsync();
        current = null;
      }
    },
  };
}

/**
 * Configure the OS audio session for play mode so that the lock screen,
 * notification shade, control centre, Bluetooth headphone displays, and
 * Android Auto have nothing identifying to surface.
 *
 * The defining choice is `staysActiveInBackground: false`. When the device
 * locks or the app backgrounds mid-play, audio stops and no MediaSession
 * card is created — so there is no surface left for OS-level metadata leaks
 * (per ADR-0009). This is the OS-level companion to the per-track scrubbing
 * `createAntiSpoilerAudioPlayer` already enforces.
 *
 * Call this once on Playback screen mount, before `play()`.
 */
export async function configureAudioModeForPlay(opts?: {
  audioModule?: typeof Audio;
}): Promise<void> {
  const audioModule = opts?.audioModule ?? Audio;
  await audioModule.setAudioModeAsync({
    // Stop audio cleanly when the app backgrounds or the device locks. With
    // this off, the OS does not create a persistent MediaSession card —
    // there's nothing for the lock screen or headphones to display.
    staysActiveInBackground: false,
    // Respect the user's silent switch on iOS. Doesn't affect anti-spoiler;
    // it's a UX choice — the table can be quiet when it needs to be.
    playsInSilentModeIOS: false,
    // Don't share the audio focus with other apps — a single 30-second
    // preview should fully own playback for that window.
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    // Don't lower volume in response to other apps; pause cleanly via the
    // DoNotMix mode above.
    shouldDuckAndroid: false,
  });
}

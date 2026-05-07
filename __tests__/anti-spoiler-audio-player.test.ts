import {
  createAntiSpoilerAudioPlayer,
  type PlaybackStatus,
} from '../lib/anti-spoiler-audio-player';

type StatusListener = (status: {
  positionMillis?: number;
  isLoaded?: boolean;
  isPlaying?: boolean;
  didJustFinish?: boolean;
}) => void;

type FakeSound = {
  uri: string;
  unloaded: boolean;
  paused: boolean;
  resumed: boolean;
  listener: StatusListener | null;
  playAsync: jest.Mock<Promise<void>, []>;
  pauseAsync: jest.Mock<Promise<void>, []>;
  unloadAsync: jest.Mock<Promise<void>, []>;
  setOnPlaybackStatusUpdate: jest.Mock<void, [StatusListener]>;
};

type FakeAudioModule = {
  Sound: {
    createAsync: jest.Mock<Promise<{ sound: FakeSound }>, [unknown, ...unknown[]]>;
  };
  /** Tracks call order across multiple sounds. */
  __callLog: string[];
  /** All FakeSound instances created, in creation order. */
  __sounds: FakeSound[];
};

function makeFakeAudioModule(): FakeAudioModule {
  const callLog: string[] = [];
  const sounds: FakeSound[] = [];

  const createAsync = jest.fn(async (source: unknown, ..._rest: unknown[]) => {
    const uri = (source as { uri?: string })?.uri ?? '';
    callLog.push(`create:${uri}`);

    const sound: FakeSound = {
      uri,
      unloaded: false,
      paused: false,
      resumed: false,
      listener: null,
      playAsync: jest.fn(async () => {
        callLog.push(`play:${uri}`);
      }),
      pauseAsync: jest.fn(async () => {
        sound.paused = true;
        callLog.push(`pause:${uri}`);
      }),
      unloadAsync: jest.fn(async () => {
        sound.unloaded = true;
        callLog.push(`unload:${uri}`);
      }),
      setOnPlaybackStatusUpdate: jest.fn((listener: StatusListener) => {
        sound.listener = listener;
      }),
    };
    sounds.push(sound);
    return { sound };
  });

  return {
    Sound: { createAsync },
    __callLog: callLog,
    __sounds: sounds,
  };
}

describe('AntiSpoilerAudioPlayer — anti-spoiler discipline', () => {
  test('play(url) calls Sound.createAsync exactly once, with ONLY { uri } and no other fields', async () => {
    const audioModule = makeFakeAudioModule();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
    });

    await player.play('https://cdn.example/preview.mp3');

    expect(audioModule.Sound.createAsync).toHaveBeenCalledTimes(1);
    const [source, ...rest] = audioModule.Sound.createAsync.mock.calls[0];
    // The source object must contain ONLY a `uri` field. No title, no artist,
    // no metadata of any kind may be passed to expo-av.
    expect(Object.keys(source as object).sort()).toEqual(['uri']);
    expect(source).toEqual({ uri: 'https://cdn.example/preview.mp3' });
    // No additional positional args may carry metadata into expo-av either.
    for (const arg of rest) {
      if (arg !== undefined && typeof arg === 'object' && arg !== null) {
        const stringValues = Object.values(arg).filter((v) => typeof v === 'string');
        expect(stringValues).not.toContain('Smuggled');
      }
    }
  });

  test('play(url) sets MediaSession metadata to constant { title: "Tocarta", artist: "" }', async () => {
    const audioModule = makeFakeAudioModule();
    const setNowPlayingMetadata = jest.fn();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
      setNowPlayingMetadata,
    });

    await player.play('https://cdn.example/preview.mp3');

    expect(setNowPlayingMetadata).toHaveBeenCalledTimes(1);
    expect(setNowPlayingMetadata).toHaveBeenCalledWith({ title: 'Tocarta', artist: '' });
  });

  test('smuggle attempt 1 — extra positional arg with metadata is dropped', async () => {
    const audioModule = makeFakeAudioModule();
    const setNowPlayingMetadata = jest.fn();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
      setNowPlayingMetadata,
    });

    // Bypass TypeScript: a caller could try to slip a third positional arg.
    await (player as unknown as {
      play: (url: string, cb: object, smuggled: object) => Promise<void>;
    }).play(
      'https://cdn.example/preview.mp3',
      { onTick: () => {} },
      { title: 'Smuggled Title', artist: 'Smuggled Artist' },
    );

    // Sound.createAsync still received only { uri }.
    const [source] = audioModule.Sound.createAsync.mock.calls[0];
    expect(source).toEqual({ uri: 'https://cdn.example/preview.mp3' });
    // Metadata setter received ONLY the constant.
    for (const call of setNowPlayingMetadata.mock.calls) {
      expect(call[0]).toEqual({ title: 'Tocarta', artist: '' });
    }
  });

  test('smuggle attempt 2 — extra fields on the callbacks object are dropped', async () => {
    const audioModule = makeFakeAudioModule();
    const setNowPlayingMetadata = jest.fn();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
      setNowPlayingMetadata,
    });

    await player.play('https://cdn.example/preview.mp3', {
      // The callback options are extended with metadata that must be ignored.
      ...({ title: 'Smuggled', artist: 'Smuggled', year: 1999, album: 'Smuggled' } as object),
    } as never);

    const [source] = audioModule.Sound.createAsync.mock.calls[0];
    expect(source).toEqual({ uri: 'https://cdn.example/preview.mp3' });
    for (const call of setNowPlayingMetadata.mock.calls) {
      expect(call[0]).toEqual({ title: 'Tocarta', artist: '' });
    }
  });

  test('smuggle attempt 3 — URL with metadata in the query string passes through verbatim, but MediaSession stays constant', async () => {
    const audioModule = makeFakeAudioModule();
    const setNowPlayingMetadata = jest.fn();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
      setNowPlayingMetadata,
    });

    const sneakyUrl = 'https://deezer.example/preview?title=Bohemian%20Rhapsody&artist=Queen';
    await player.play(sneakyUrl);

    // The contract isn't to sanitise the URL — it's to never send identifying
    // strings to MediaSession. The URL is fine; MediaSession must still be
    // the constant.
    const [source] = audioModule.Sound.createAsync.mock.calls[0];
    expect(source).toEqual({ uri: sneakyUrl });
    expect(setNowPlayingMetadata).toHaveBeenCalledWith({ title: 'Tocarta', artist: '' });
    for (const call of setNowPlayingMetadata.mock.calls) {
      expect(call[0]).toEqual({ title: 'Tocarta', artist: '' });
    }
  });

  test('pause() does not change MediaSession metadata', async () => {
    const audioModule = makeFakeAudioModule();
    const setNowPlayingMetadata = jest.fn();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
      setNowPlayingMetadata,
    });

    await player.play('https://cdn.example/preview.mp3');
    setNowPlayingMetadata.mockClear();
    await player.pause();

    expect(setNowPlayingMetadata).not.toHaveBeenCalled();
  });
});

describe('AntiSpoilerAudioPlayer — lifecycle', () => {
  test('stop() unloads the sound', async () => {
    const audioModule = makeFakeAudioModule();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
    });

    await player.play('https://cdn.example/preview.mp3');
    await player.stop();

    expect(audioModule.__sounds[0].unloadAsync).toHaveBeenCalledTimes(1);
    expect(audioModule.__sounds[0].unloaded).toBe(true);
  });

  test('play(b) after play(a) unloads a then plays b in order', async () => {
    const audioModule = makeFakeAudioModule();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
    });

    await player.play('https://cdn.example/a.mp3');
    await player.play('https://cdn.example/b.mp3');

    expect(audioModule.__callLog).toEqual([
      'create:https://cdn.example/a.mp3',
      'play:https://cdn.example/a.mp3',
      'unload:https://cdn.example/a.mp3',
      'create:https://cdn.example/b.mp3',
      'play:https://cdn.example/b.mp3',
    ]);
  });

  test('resume() calls playAsync on the existing sound (no new createAsync)', async () => {
    const audioModule = makeFakeAudioModule();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
    });

    await player.play('https://cdn.example/preview.mp3');
    await player.pause();
    await player.resume();

    expect(audioModule.Sound.createAsync).toHaveBeenCalledTimes(1);
    expect(audioModule.__sounds[0].playAsync).toHaveBeenCalledTimes(2);
  });
});

describe('AntiSpoilerAudioPlayer — callbacks', () => {
  test('onTick fires with PlaybackStatus-shaped objects only — no track strings ever bleed in', async () => {
    const audioModule = makeFakeAudioModule();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
    });
    const ticks: PlaybackStatus[] = [];

    await player.play('https://cdn.example/preview.mp3', {
      onTick: (s) => ticks.push(s),
    });

    // Simulate expo-av delivering a status update — including a smuggled field
    // that the player must NOT pass through to onTick.
    const listener = audioModule.__sounds[0].listener;
    expect(listener).not.toBeNull();
    listener!({
      isLoaded: true,
      positionMillis: 5000,
      isPlaying: true,
      didJustFinish: false,
      // Hostile injection — expo-av wouldn't normally produce this, but we
      // guard against any future status field that could leak metadata.
      ...({ title: 'Hostile', artist: 'Hostile' } as object),
    });

    expect(ticks).toHaveLength(1);
    expect(ticks[0]).toEqual({ positionMillis: 5000, isPlaying: true, didFinish: false });
    // Strict shape: only the three documented keys.
    expect(Object.keys(ticks[0]).sort()).toEqual(['didFinish', 'isPlaying', 'positionMillis']);
  });

  test('onEnded fires when didJustFinish flips to true', async () => {
    const audioModule = makeFakeAudioModule();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
    });
    const onEnded = jest.fn();

    await player.play('https://cdn.example/preview.mp3', { onEnded });

    const listener = audioModule.__sounds[0].listener!;
    listener({ isLoaded: true, positionMillis: 5000, isPlaying: true, didJustFinish: false });
    expect(onEnded).not.toHaveBeenCalled();

    listener({ isLoaded: true, positionMillis: 30_000, isPlaying: false, didJustFinish: true });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  test('onEnded fires at most once per play() call', async () => {
    const audioModule = makeFakeAudioModule();
    const player = createAntiSpoilerAudioPlayer({
      audioModule: audioModule as unknown as typeof import('expo-av').Audio,
    });
    const onEnded = jest.fn();

    await player.play('https://cdn.example/preview.mp3', { onEnded });

    const listener = audioModule.__sounds[0].listener!;
    listener({ isLoaded: true, positionMillis: 30_000, isPlaying: false, didJustFinish: true });
    listener({ isLoaded: true, positionMillis: 30_000, isPlaying: false, didJustFinish: true });

    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

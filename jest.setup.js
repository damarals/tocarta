jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-av is a thin native wrapper; AntiSpoilerAudioPlayer only ever touches
// it through the injected `audioModule` parameter, so tests that exercise
// the player wire their own fake. This stub keeps the bare `import { Audio }`
// from crashing under jest-expo (which throws on missing native modules).
jest.mock('expo-av', () => ({ Audio: { Sound: { createAsync: jest.fn() } } }));

// Same pattern for expo-network — the playback screen reads connectivity at
// runtime via dependency injection in tests.
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
  addNetworkStateListener: jest.fn(() => ({ remove: () => {} })),
}));

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  // Anti-spoiler enforcement (ADR-0009): expo-av is touched ONLY through
  // `lib/anti-spoiler-audio-player.ts`. Any other file importing it would
  // be one bad change away from publishing track metadata to MediaSession.
  // The player module and its test are the two legitimate import sites.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [
      'lib/anti-spoiler-audio-player.ts',
      '__tests__/anti-spoiler-audio-player.test.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-av',
              message:
                'Do not import expo-av directly. Use AntiSpoilerAudioPlayer from lib/anti-spoiler-audio-player.ts.',
            },
          ],
        },
      ],
    },
  },
]);

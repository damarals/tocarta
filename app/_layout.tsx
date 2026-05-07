import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tokens } from '@/theme/tokens';
import '../global.css';

SplashScreen.preventAutoHideAsync();

const NAVY900 = tokens.colors.navy900;
const NAVY50 = tokens.colors.navy50;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Display / body — Nunito covers both roles; load the weights actually
    // referenced by screens (regular through black) so Tailwind aliases like
    // font-display can resolve to the appropriate axis at runtime.
    Nunito: Nunito_400Regular,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,

    // Serif accent — Fraunces is reserved for year numbers and big moments.
    Fraunces: Fraunces_900Black,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_900Black,

    // Mono — technical microcopy (ISRCs, file names, debug strings).
    'JetBrains Mono': JetBrainsMono_500Medium,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: NAVY900 },
          headerTintColor: NAVY50,
          headerTitleStyle: { fontFamily: 'Nunito' },
          contentStyle: { backgroundColor: NAVY900 },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="generate" options={{ title: '' }} />
        <Stack.Screen
          name="resolving"
          options={{ title: '', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="deck/[id]" options={{ title: '' }} />
        <Stack.Screen
          name="review/[id]"
          options={{ title: '', headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="export/[id]" options={{ title: '' }} />
        <Stack.Screen name="card/[deckId]/[isrc]" options={{ title: '' }} />
        <Stack.Screen
          name="scan"
          options={{
            title: '',
            headerTransparent: true,
            contentStyle: { backgroundColor: '#000' },
          }}
        />
        <Stack.Screen name="playback" options={{ title: '' }} />
        <Stack.Screen
          name="import"
          options={{ title: '', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Nunito_400Regular,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../global.css';

SplashScreen.preventAutoHideAsync();

const NAVY900 = '#0d1422';
const NAVY200 = 'rgb(168 179 199)';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces: Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Nunito: Nunito_400Regular,
    Nunito_700Bold,
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
          headerTintColor: NAVY200,
          headerTitleStyle: { fontFamily: 'Fraunces' },
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
      </Stack>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

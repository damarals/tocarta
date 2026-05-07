import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { parseCardCode } from '@/lib/card-code-validator';
import { tokens } from '@/theme/tokens';

type ScanState =
  /** Camera is live, looking for a code. Lime corners + animated scan beam. */
  | { kind: 'aiming' }
  /** A QR was detected; validating. Pink corners + "checking…". */
  | { kind: 'found' }
  /** A valid Tocarta code was parsed. Pink corners + check. */
  | { kind: 'locked'; payload: string };

const VIEWFINDER_RATIO = 0.7;
const CORNER_LENGTH = 28;
const CORNER_THICKNESS = 4;
const FOUND_TO_LOCKED_MS = 200;
const LOCKED_TO_NAVIGATE_MS = 300;
const INVALID_FLASH_MS = 600;
const TOAST_VISIBLE_MS = 1600;

const PERMISSION_DENIAL_COPY =
  'Tocarta needs the camera to scan cards. Open Settings to grant access.';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>({ kind: 'aiming' });
  const [invalidFlash, setInvalidFlash] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  // Once a valid code is locked, ignore further callbacks so we don't double-fire.
  const lockedRef = useRef(false);

  // Ask for permission once, on first mount, if it's still undetermined.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      if (lockedRef.current) return;

      const parsed = parseCardCode(data);
      if (parsed === null) {
        // Invalid scan: flash corners red, show toast, stay in aiming.
        setInvalidFlash(true);
        setToastVisible(true);
        setTimeout(() => setInvalidFlash(false), INVALID_FLASH_MS);
        setTimeout(() => setToastVisible(false), TOAST_VISIBLE_MS);
        return;
      }

      // Valid scan: visual progression aiming → found → locked → navigate.
      lockedRef.current = true;
      setScanState({ kind: 'found' });
      setTimeout(() => {
        setScanState({ kind: 'locked', payload: data });
        setTimeout(() => {
          router.push(`/playback?code=${encodeURIComponent(data)}`);
        }, LOCKED_TO_NAVIGATE_MS);
      }, FOUND_TO_LOCKED_MS);
    },
    [router],
  );

  if (!permission) {
    // Permission state still loading from native — render nothing briefly.
    return <SafeAreaView className="flex-1 bg-background" />;
  }

  if (!permission.granted) {
    return <PermissionDeniedView canAskAgain={permission.canAskAgain} onAsk={requestPermission} />;
  }

  return (
    <View className="flex-1 bg-background">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcode}
      />
      <Viewfinder state={scanState} invalidFlash={invalidFlash} />
      {toastVisible && <Toast message="Not a Tocarta card" />}
    </View>
  );
}

function PermissionDeniedView({
  canAskAgain,
  onAsk,
}: {
  canAskAgain: boolean;
  onAsk: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-8 gap-6">
        <Ionicons name="camera-outline" size={48} color={tokens.colors.lime} />
        <Text className="font-display text-foreground text-2xl text-center leading-snug">
          {PERMISSION_DENIAL_COPY}
        </Text>
        <Pressable
          onPress={canAskAgain ? onAsk : () => Linking.openSettings()}
          role="button"
          accessibilityLabel="Open Settings"
          className="rounded-full bg-primary px-6 py-3 active:bg-primary/90"
        >
          <Text className="font-body text-primary-foreground text-base font-bold">
            {canAskAgain ? 'Allow camera' : 'Open Settings'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Viewfinder({ state, invalidFlash }: { state: ScanState; invalidFlash: boolean }) {
  const screenWidth = Dimensions.get('window').width;
  const size = Math.round(screenWidth * VIEWFINDER_RATIO);

  const cornerColor = invalidFlash
    ? tokens.colors.red
    : state.kind === 'aiming'
      ? tokens.colors.lime
      : tokens.colors.pink;

  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      <View style={{ width: size, height: size }}>
        <Corner color={cornerColor} corner="topLeft" />
        <Corner color={cornerColor} corner="topRight" />
        <Corner color={cornerColor} corner="bottomLeft" />
        <Corner color={cornerColor} corner="bottomRight" />
        {state.kind === 'aiming' && <ScanBeam height={size} color={tokens.colors.lime} />}
      </View>
      <View className="mt-6 px-4 py-2">
        <SubtitleForState state={state} invalidFlash={invalidFlash} />
      </View>
    </View>
  );
}

function SubtitleForState({ state, invalidFlash }: { state: ScanState; invalidFlash: boolean }) {
  if (invalidFlash) {
    return (
      <Text className="font-body text-foreground text-base font-bold">
        Not a Tocarta card
      </Text>
    );
  }
  if (state.kind === 'aiming') {
    return (
      <Text className="font-body text-foreground text-base">
        Aim at a Tocarta card
      </Text>
    );
  }
  if (state.kind === 'found') {
    return (
      <Text className="font-body text-foreground text-base">
        checking…
      </Text>
    );
  }
  return (
    <Text className="font-body text-pink text-base font-bold">
      {'✓'} looks good
    </Text>
  );
}

type CornerName = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

function Corner({ color, corner }: { color: string; corner: CornerName }) {
  const horizontal: 'left' | 'right' = corner === 'topLeft' || corner === 'bottomLeft' ? 'left' : 'right';
  const vertical: 'top' | 'bottom' = corner === 'topLeft' || corner === 'topRight' ? 'top' : 'bottom';

  return (
    <View
      style={{
        position: 'absolute',
        [horizontal]: 0,
        [vertical]: 0,
        width: CORNER_LENGTH,
        height: CORNER_LENGTH,
        borderColor: color,
        borderTopWidth: vertical === 'top' ? CORNER_THICKNESS : 0,
        borderBottomWidth: vertical === 'bottom' ? CORNER_THICKNESS : 0,
        borderLeftWidth: horizontal === 'left' ? CORNER_THICKNESS : 0,
        borderRightWidth: horizontal === 'right' ? CORNER_THICKNESS : 0,
      }}
    />
  );
}

function ScanBeam({ height, color }: { height: number; color: string }) {
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const range = Math.max(1, height - CORNER_THICKNESS);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translate, {
          toValue: range,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [height, translate]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: CORNER_LENGTH / 2,
        right: CORNER_LENGTH / 2,
        top: 0,
        height: 2,
        backgroundColor: color,
        opacity: 0.85,
        transform: [{ translateY: translate }],
      }}
    />
  );
}

function Toast({ message }: { message: string }) {
  return (
    <SafeAreaView
      pointerEvents="none"
      edges={['bottom']}
      className="absolute inset-x-0 bottom-0 items-center"
    >
      <View className="mb-8 rounded-full bg-navy900/90 px-5 py-3 border border-red">
        <Text className="font-body text-foreground text-sm">{message}</Text>
      </View>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Dot } from '@/components/ui/dot';
import { IconButton } from '@/components/ui/icon-button';
import { Pill } from '@/components/ui/pill';
import { PushButton } from '@/components/ui/push-button';
import { Text } from '@/components/ui/text';
import { parseCardCode } from '@/lib/card-code-validator';
import { tokens } from '@/theme/tokens';

type ScanState =
  /** Camera is live, looking for a code. Lime corners + animated scan beam. */
  | { kind: 'aiming' }
  /** A QR was detected; validating. Pink corners + "checking…". */
  | { kind: 'found'; payload: string }
  /** A valid Tocarta code was parsed. Pink corners + check. */
  | { kind: 'locked'; payload: string };

const VIEWFINDER_SIZE = 240;
const CORNER_LENGTH = 32;
const CORNER_THICKNESS = 3;
const CORNER_RADIUS = 14;
const FOUND_TO_LOCKED_MS = 200;
const LOCKED_TO_NAVIGATE_MS = 300;
const INVALID_FLASH_MS = 600;

const PERMISSION_DENIAL_COPY =
  'Tocarta needs the camera to scan cards.';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>({ kind: 'aiming' });
  const [invalidFlash, setInvalidFlash] = useState(false);
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
        // Invalid scan: flash corners red, stay in aiming.
        setInvalidFlash(true);
        setTimeout(() => setInvalidFlash(false), INVALID_FLASH_MS);
        return;
      }

      // Valid scan: aiming → found → locked → navigate.
      lockedRef.current = true;
      setScanState({ kind: 'found', payload: data });
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
    return (
      <PermissionDeniedView
        canAskAgain={permission.canAskAgain}
        onAsk={requestPermission}
      />
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcode}
      />
      <ScannerChrome
        scanState={scanState}
        invalidFlash={invalidFlash}
        onClose={() => router.back()}
      />
    </View>
  );
}

type ScannerChromeProps = {
  scanState: ScanState;
  invalidFlash: boolean;
  onClose: () => void;
};

function ScannerChrome({
  scanState,
  invalidFlash,
  onClose,
}: ScannerChromeProps): React.ReactElement {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1">
      {/* Top bar */}
      <View
        pointerEvents="box-none"
        className="flex-row items-center justify-between px-4 py-3.5"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <IconButton
          size={40}
          surfaceClass="bg-black/50"
          shadowColor="rgba(0,0,0,0.7)"
          onPress={onClose}
          accessibilityLabel="Close scanner"
        >
          <Ionicons name="close" size={20} color="#fff" />
        </IconButton>
        <Pill tone="lime">
          <Dot color="lime" pulse />
          <Text
            className="text-limeL"
            style={{
              fontFamily: 'Nunito_800ExtraBold',
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Scanning
          </Text>
        </Pill>
        <View style={{ width: 40 }} />
      </View>

      {/* Viewfinder */}
      <View pointerEvents="none" className="flex-1 items-center justify-center">
        <Viewfinder scanState={scanState} invalidFlash={invalidFlash} />
      </View>

      {/* Bottom hint */}
      <BottomHint scanState={scanState} invalidFlash={invalidFlash} />
    </SafeAreaView>
  );
}

type ViewfinderProps = {
  scanState: ScanState;
  invalidFlash: boolean;
};

function Viewfinder({
  scanState,
  invalidFlash,
}: ViewfinderProps): React.ReactElement {
  const cornerColor = invalidFlash
    ? tokens.colors.red
    : scanState.kind === 'aiming'
      ? tokens.colors.lime
      : tokens.colors.pink;

  return (
    <View style={{ width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE }}>
      <Corner color={cornerColor} corner="topLeft" />
      <Corner color={cornerColor} corner="topRight" />
      <Corner color={cornerColor} corner="bottomLeft" />
      <Corner color={cornerColor} corner="bottomRight" />
      {scanState.kind === 'aiming' && <ScanBeam />}
      {scanState.kind !== 'aiming' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: CORNER_RADIUS,
            backgroundColor: 'rgba(255,107,181,0.10)',
          }}
        />
      )}
    </View>
  );
}

type CornerName = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

function Corner({ color, corner }: { color: string; corner: CornerName }) {
  const horizontal: 'left' | 'right' =
    corner === 'topLeft' || corner === 'bottomLeft' ? 'left' : 'right';
  const vertical: 'top' | 'bottom' =
    corner === 'topLeft' || corner === 'topRight' ? 'top' : 'bottom';

  // Match-by-corner border-radius mirrors the proto's 14px-rounded outer
  // bracket. RN doesn't compose `borderTopLeftRadius` with directional
  // borders cleanly, so we set the matching corner radius explicitly.
  const radius =
    corner === 'topLeft'
      ? { borderTopLeftRadius: CORNER_RADIUS }
      : corner === 'topRight'
        ? { borderTopRightRadius: CORNER_RADIUS }
        : corner === 'bottomLeft'
          ? { borderBottomLeftRadius: CORNER_RADIUS }
          : { borderBottomRightRadius: CORNER_RADIUS };

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
        ...radius,
      }}
    />
  );
}

function ScanBeam(): React.ReactElement {
  // 1.6s top→bottom beam with the proto's tc-scan ease cubic-bezier(.2,.8,.2,1).
  const translate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(translate, {
          toValue: 1,
          duration: 1600,
          easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.delay(1280),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      translate.setValue(0);
      opacity.setValue(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 4,
        right: 4,
        top: 0,
        height: 2,
        backgroundColor: tokens.colors.lime,
        opacity,
        transform: [
          {
            translateY: translate.interpolate({
              inputRange: [0, 1],
              outputRange: [0, VIEWFINDER_SIZE - CORNER_THICKNESS],
            }),
          },
        ],
      }}
    />
  );
}

type BottomHintProps = {
  scanState: ScanState;
  invalidFlash: boolean;
};

function BottomHint({
  scanState,
  invalidFlash,
}: BottomHintProps): React.ReactElement {
  const headline = invalidFlash
    ? 'Not a Tocarta card'
    : scanState.kind === 'aiming'
      ? 'Point at a Tocarta card.'
      : scanState.kind === 'found'
        ? 'Card detected.'
        : 'Loading preview…';

  const monoLine =
    scanState.kind === 'found' || scanState.kind === 'locked'
      ? scanState.payload
      : '';

  const headlineColor = invalidFlash ? tokens.colors.red : '#fff';
  const monoColor =
    scanState.kind === 'locked' ? tokens.colors.pink : tokens.colors.navy200;

  return (
    <View
      style={{
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 12,
      }}
    >
      <Text
        accessibilityLabel="Scanner status"
        style={{
          fontFamily: 'Nunito_900Black',
          fontSize: 18,
          lineHeight: 22,
          color: headlineColor,
          textAlign: 'center',
          letterSpacing: -0.18,
        }}
      >
        {headline}
      </Text>
      <Text
        style={{
          marginTop: 6,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 11,
          lineHeight: 14,
          color: monoColor,
          textAlign: 'center',
        }}
      >
        {monoLine}
      </Text>
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
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      className="flex-1 bg-background"
    >
      <View className="flex-1 items-center justify-center px-8 gap-5">
        <View className="rounded-3xl border-[1.5px] border-navy600 bg-navy800 p-6 items-center gap-4">
          <Ionicons
            name="camera-outline"
            size={40}
            color={tokens.colors.lime}
          />
          <Text
            className="text-foreground text-center"
            style={{
              fontFamily: 'Nunito_900Black',
              fontSize: 22,
              lineHeight: 26,
              letterSpacing: -0.36,
            }}
          >
            {PERMISSION_DENIAL_COPY}
          </Text>
          <Text
            className="text-navy200 text-center"
            style={{
              fontFamily: 'Nunito_600SemiBold',
              fontSize: 14,
              lineHeight: 20,
              maxWidth: 260,
            }}
          >
            {canAskAgain
              ? 'Allow camera access to scan a card.'
              : 'Open Settings to grant access.'}
          </Text>
          <PushButton
            variant="primary"
            size="md"
            onPress={canAskAgain ? onAsk : () => Linking.openSettings()}
            accessibilityLabel={canAskAgain ? 'Allow camera' : 'Open Settings'}
          >
            {canAskAgain ? 'Allow camera' : 'Open Settings'}
          </PushButton>
        </View>
      </View>
    </SafeAreaView>
  );
}

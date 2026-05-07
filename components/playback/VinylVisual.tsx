// Anti-spoiler discipline (ADR-0009): visualisations are PURELY decorative.
// They take no track-identifying inputs. NO album art, NO labels — the disc
// is the brand vinyl mark, spinning at idle while the proto's
// `tc-spin` keyframe runs.
//
// The proto landed on `<BrandMark size={240} spinning glow="pink" />`;
// dropping the prior custom geometry keeps the brand consistent across
// loading / resolving / playback surfaces.
import { View } from 'react-native';

import { BrandMark } from '@/components/brand/BrandMark';

const FRAME_SIZE = 240;

export function VinylVisual({ active }: { active: boolean }) {
  return (
    <View
      style={{
        width: FRAME_SIZE,
        height: FRAME_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BrandMark size={FRAME_SIZE} spinning={active} glow="pink" />
    </View>
  );
}

// Decorative vinyl ornament. Mirrors `docs/design/assets/vinyl.svg` — a
// single-color disc with two grooves and a sheen, intended for surfaces
// that want a quiet musical accent (e.g., the ScanCTA background).
//
// `color` accepts any RN-SVG paint string and tints the disc + grooves; the
// sheen highlight and inner spindle stay neutral so the ornament reads on
// both light and dark accents.
import Svg, { Circle } from 'react-native-svg';

type VinylProps = {
  size?: number;
  color?: string;
};

export function Vinyl({ size = 32, color = 'currentColor' }: VinylProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Circle cx={16} cy={16} r={14} fill={color} stroke={color} strokeWidth={1.5} />
      <Circle cx={16} cy={16} r={10} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
      <Circle cx={16} cy={16} r={6} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
      <Circle cx={16} cy={16} r={3} fill="rgba(255,255,255,0.35)" />
      <Circle cx={16} cy={16} r={1} fill="rgba(0,0,0,0.6)" />
    </Svg>
  );
}

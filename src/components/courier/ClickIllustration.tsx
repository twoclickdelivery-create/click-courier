import React from 'react';
import Svg, {
  Circle,
  Ellipse,
  G,
  Defs,
  RadialGradient,
  Stop,
  ClipPath,
} from 'react-native-svg';
import { Text as SvgText } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';

const CX   = 135;
const CY   = 130;
const R    = 122;
const N    = 34;
const MAX_R = 118;

// Pre-compute ring data once
const RINGS = Array.from({ length: N }, (_, i) => {
  const r    = 4 + (i * (MAX_R - 4)) / (N - 1);
  const rot  = i * 2.6;
  const ry   = r * 0.9;
  const ridge = i % 2 === 0;
  const op   = ridge
    ? Math.max(0.07, 0.36 - i * 0.008)
    : Math.max(0.02, 0.12 - i * 0.003);
  const col  = ridge
    ? `rgba(172,46,66,${op.toFixed(3)})`
    : `rgba(60,6,14,${op.toFixed(3)})`;
  return { r, rot, ry, col };
});

export const ClickIllustration: React.FC = () => (
  <View style={styles.wrap}>
    <Svg width={270} height={280} viewBox="0 0 270 280">
      <Defs>
        {/* Radial fill: dark centre → warm burgundy edge */}
        <RadialGradient id="cFill" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor="#0C0206" />
          <Stop offset="40%"  stopColor="#240810" />
          <Stop offset="75%"  stopColor="#380C18" />
          <Stop offset="100%" stopColor="#1C0408" />
        </RadialGradient>

        {/* Vignette overlay */}
        <RadialGradient id="cVign" cx="50%" cy="50%" r="50%">
          <Stop offset="55%"  stopColor="rgba(0,0,0,0)" />
          <Stop offset="100%" stopColor="rgba(0,0,0,0.62)" />
        </RadialGradient>

        <ClipPath id="cClip">
          <Circle cx={CX} cy={CY} r={R} />
        </ClipPath>
      </Defs>

      {/* Base circle */}
      <Circle cx={CX} cy={CY} r={R} fill="url(#cFill)" />

      {/* Spiral fingerprint rings */}
      <G clipPath="url(#cClip)">
        {RINGS.map((ring, i) => (
          <Ellipse
            key={i}
            cx={CX}
            cy={CY}
            rx={parseFloat(ring.r.toFixed(1))}
            ry={parseFloat(ring.ry.toFixed(1))}
            stroke={ring.col}
            strokeWidth={2}
            fill="none"
            transform={`rotate(${ring.rot.toFixed(1)}, ${CX}, ${CY})`}
          />
        ))}
      </G>

      {/* Vignette on top of rings */}
      <Circle cx={CX} cy={CY} r={R} fill="url(#cVign)" />

      {/* "click" — serif, regular weight */}
      <SvgText
        x={CX}
        y={157}
        textAnchor="middle"
        fill="rgba(255,255,255,0.97)"
        fontSize={88}
        fontWeight="400"
        fontFamily="Georgia, Times New Roman, serif"
        letterSpacing={-3}
      >
        click
      </SvgText>

      {/* Tagline */}
      <SvgText
        x={CX}
        y={184}
        textAnchor="middle"
        fill="rgba(255,255,255,0.58)"
        fontSize={13}
        fontFamily="Georgia, Times New Roman, serif"
        letterSpacing={1.5}
      >
        курьерская служба
      </SvgText>
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
});

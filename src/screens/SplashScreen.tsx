import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg';
import { Text as SvgText } from 'react-native-svg';
import { fonts } from '../theme/typography';

// ── Fingerprint ring data (same as ClickIllustration) ───────────────────────
const CX = 135, CY = 130, R = 122, N = 34, MAX_R = 118;
const RINGS = Array.from({ length: N }, (_, i) => {
  const r     = 4 + (i * (MAX_R - 4)) / (N - 1);
  const rot   = i * 2.6;
  const ry    = r * 0.9;
  const ridge = i % 2 === 0;
  const op    = ridge
    ? Math.max(0.07, 0.36 - i * 0.008)
    : Math.max(0.02, 0.12 - i * 0.003);
  const col   = ridge
    ? `rgba(172,46,66,${op.toFixed(3)})`
    : `rgba(60,6,14,${op.toFixed(3)})`;
  return { r, rot, ry, col };
});

interface Props { onDone: () => void; }

export const SplashScreen: React.FC<Props> = ({ onDone }) => {
  // Animation values
  const logoScale  = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const sheetY     = useRef(new Animated.Value(60)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo bounces in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1, delay: 200, friction: 7, tension: 50, useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 600, delay: 200,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();

    // Sheet slides up
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 0, duration: 600, delay: 900,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1, duration: 500, delay: 900,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>

      {/* ── DARK AREA WITH CIRCLE LOGO ── */}
      <View style={styles.dark}>
        <Animated.View style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}>
          <Svg width={270} height={280} viewBox="0 0 270 280">
            <Defs>
              <RadialGradient id="cFill" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#0C0206" />
                <Stop offset="40%"  stopColor="#240810" />
                <Stop offset="75%"  stopColor="#380C18" />
                <Stop offset="100%" stopColor="#1C0408" />
              </RadialGradient>
              <RadialGradient id="cVign" cx="50%" cy="50%" r="50%">
                <Stop offset="55%"  stopColor="rgba(0,0,0,0)" />
                <Stop offset="100%" stopColor="rgba(0,0,0,0.62)" />
              </RadialGradient>
              <ClipPath id="cClip">
                <Circle cx={CX} cy={CY} r={R} />
              </ClipPath>
            </Defs>

            <Circle cx={CX} cy={CY} r={R} fill="url(#cFill)" />

            <G clipPath="url(#cClip)">
              {RINGS.map((ring, i) => (
                <Ellipse
                  key={i}
                  cx={CX} cy={CY}
                  rx={parseFloat(ring.r.toFixed(1))}
                  ry={parseFloat(ring.ry.toFixed(1))}
                  stroke={ring.col}
                  strokeWidth={2}
                  fill="none"
                  transform={`rotate(${ring.rot.toFixed(1)}, ${CX}, ${CY})`}
                />
              ))}
            </G>

            <Circle cx={CX} cy={CY} r={R} fill="url(#cVign)" />

            <SvgText
              x={CX} y={157}
              textAnchor="middle"
              fill="#F4C2CC"
              fontSize={88}
              fontWeight="400"
              fontFamily="Georgia, Times New Roman, serif"
              letterSpacing={-3}
            >
              click
            </SvgText>

            <SvgText
              x={CX} y={184}
              textAnchor="middle"
              fill="rgba(255,255,255,0.58)"
              fontSize={13}
              fontFamily="Georgia, Times New Roman, serif"
              letterSpacing={1.5}
            >
              курьерская служба
            </SvgText>
          </Svg>
        </Animated.View>
      </View>

      {/* ── CAPTION ── */}
      <Animated.View style={[
        styles.captionWrap,
        { opacity: sheetOpacity, transform: [{ translateY: sheetY }] },
      ]}>
        <View style={styles.caption}>
          <Text style={styles.captionTitle}>С возвращением!</Text>
          <Text style={styles.captionSub}>Войдите, чтобы начать смену</Text>
        </View>

        {/* ── WHITE SHEET ── */}
        <View style={styles.sheet}>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.82 }]}
            onPress={onDone}
          >
            <Text style={styles.btnText}>Войти →</Text>
          </Pressable>
        </View>
      </Animated.View>

    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060103',
  },
  dark: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionWrap: {
    // sits at bottom
  },
  caption: {
    backgroundColor: '#6E1222',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
    alignItems: 'center',
  },
  captionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  captionSub: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 5,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -22,
    padding: 20,
    paddingBottom: 48,
  },
  btn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: '#6E1222',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6E1222',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

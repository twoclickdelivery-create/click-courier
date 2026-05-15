import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/typography';

/* ── Single bone ── */
interface BoneProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Bone: React.FC<BoneProps> = ({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={[
        // eslint-disable-next-line react-native/no-inline-styles
        { width: width as any, height, borderRadius, backgroundColor: colors.bg4, opacity },
        style,
      ]}
    />
  );
};

/* ── Order card skeleton — matches NewOrderRow layout ── */
export const SkeletonOrderCard: React.FC = () => (
  <View style={sk.card}>
    <View style={sk.main}>
      <Bone width={10} height={10} borderRadius={5} style={{ marginTop: 3, flexShrink: 0 }} />
      <View style={sk.body}>
        <Bone height={14} width="60%" />
        <Bone height={12} width="45%" style={{ marginTop: 6 }} />
        <Bone height={11} width="55%" style={{ marginTop: 6 }} />
      </View>
      <View style={sk.meta}>
        <Bone height={16} width={50} />
        <Bone height={11} width={40} style={{ marginTop: 6 }} />
      </View>
    </View>
    <View style={sk.actions}>
      <Bone height={38} borderRadius={radii.md} style={{ flex: 1 }} />
      <Bone height={38} borderRadius={radii.md} style={{ flex: 2 }} />
    </View>
  </View>
);

/* ── Goal bar skeleton ── */
export const SkeletonGoalBar: React.FC = () => (
  <View style={sk.goalCard}>
    <View style={sk.goalRow}>
      <Bone height={14} width="35%" />
      <Bone height={12} width="25%" />
    </View>
    <Bone height={8} borderRadius={8} style={{ marginBottom: spacing.sm }} />
    <Bone height={8} borderRadius={8} />
  </View>
);

const sk = StyleSheet.create({
  card: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  body: { flex: 1, gap: 0 },
  meta: { alignItems: 'flex-end', flexShrink: 0, gap: 0 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  goalCard: {
    backgroundColor: colors.bg2,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
});

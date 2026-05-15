import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, radii, spacing } from '../../theme/typography';

interface Props {
  active: boolean;
  accuracy?: number;
  onToggle?: () => void;
}

export const GeoStrip: React.FC<Props> = ({ active, accuracy, onToggle }) => (
  <Pressable onPress={onToggle} style={[styles.strip, active ? styles.stripOn : styles.stripOff]}>
    <View style={[styles.dot, { backgroundColor: active ? colors.green : colors.textMuted }]} />
    <View style={{ flex: 1 }}>
      <Text style={[styles.label, { color: active ? colors.green : colors.textMuted }]}>
        {active ? 'Геолокация активна' : 'Геолокация отключена'}
      </Text>
      {active && accuracy !== undefined ? (
        <Text style={styles.sub}>Точность ±{Math.round(accuracy)} м</Text>
      ) : !active ? (
        <Text style={styles.sub}>Нажмите, чтобы включить отслеживание</Text>
      ) : (
        <Text style={styles.sub}>Маршрут отслеживается</Text>
      )}
    </View>
    <View style={[styles.badge, active ? styles.badgeOn : styles.badgeOff]}>
      <Text style={[styles.badgeText, { color: active ? colors.green : colors.textMuted }]}>
        {active ? 'ВКЛ' : 'ВЫКЛ'}
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    gap: spacing.md,
  },
  stripOn: {
    backgroundColor: 'rgba(46,139,87,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,139,87,0.20)',
  },
  stripOff: {
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeOn: {
    backgroundColor: 'rgba(46,139,87,0.12)',
  },
  badgeOff: {
    backgroundColor: colors.bg3,
  },
  badgeText: {
    fontFamily: fonts.sansBold ?? fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

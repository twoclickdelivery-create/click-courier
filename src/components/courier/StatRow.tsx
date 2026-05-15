import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, radii, spacing, typography } from '../../theme/typography';

interface Stat {
  label: string;
  value: string;
  accent?: 'orange' | 'green' | 'blue' | 'amber' | 'default';
}

interface Props {
  stats: Stat[];
}

const accentMap = {
  orange: colors.primary,
  green: colors.green,
  blue: colors.blue,
  amber: colors.amber,
  default: colors.text,
};

export const StatRow: React.FC<Props> = ({ stats }) => (
  <View style={styles.row}>
    {stats.map((s, i) => (
      <View
        key={s.label}
        style={[styles.cell, i < stats.length - 1 && styles.cellDivider]}
      >
        <Text style={styles.label}>{s.label}</Text>
        <Text style={[styles.value, { color: accentMap[s.accent ?? 'default'] }]}>
          {s.value}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  cellDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  value: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
});

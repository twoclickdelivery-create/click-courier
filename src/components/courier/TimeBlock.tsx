import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, radii, spacing } from '../../theme/typography';

interface Props {
  ready: string;
  due: string;
  arrived?: string;
  diffMinutes?: number;
}

const fmtDiff = (mins?: number) => {
  if (mins === undefined) return '—';
  if (mins === 0) return 'точно';
  const sign = mins > 0 ? '+' : '−';
  return `${sign}${Math.abs(mins)} мин`;
};

const diffColor = (mins?: number) => {
  if (mins === undefined) return colors.textMuted;
  if (mins <= -1) return colors.green;
  if (mins >= 1) return colors.danger;
  return colors.amber;
};

export const TimeBlock: React.FC<Props> = ({ ready, due, arrived, diffMinutes }) => (
  <View style={styles.wrap}>
    <Cell label="ГОТОВ" value={ready} accent={colors.amber} />
    <View style={styles.divider} />
    <Cell label="НАДО БЫТЬ" value={due} accent={colors.text} />
    <View style={styles.divider} />
    <Cell
      label="ПРИБЫЛ"
      value={arrived ?? '—'}
      sublabel={fmtDiff(diffMinutes)}
      sublabelColor={diffColor(diffMinutes)}
      accent={arrived ? colors.green : colors.textMuted}
    />
  </View>
);

const Cell: React.FC<{
  label: string;
  value: string;
  sublabel?: string;
  sublabelColor?: string;
  accent?: string;
}> = ({ label, value, sublabel, sublabelColor, accent }) => (
  <View style={styles.cell}>
    <Text style={styles.cellLabel}>{label}</Text>
    <Text style={[styles.cellValue, { color: accent ?? colors.text }]}>{value}</Text>
    {sublabel ? (
      <Text style={[styles.cellSub, { color: sublabelColor ?? colors.textMuted }]}>
        {sublabel}
      </Text>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.bg3,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: {
    width: 1,
    backgroundColor: colors.divider,
    marginVertical: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  cellLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.textMuted,
    marginBottom: 4,
  },
  cellValue: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  cellSub: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 2,
  },
});

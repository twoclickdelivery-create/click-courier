import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radii, spacing, typography } from '../theme/typography';

interface ShiftToggleProps {
  isOn: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export const ShiftToggle: React.FC<ShiftToggleProps> = ({
  isOn,
  onToggle,
  compact,
}) => (
  <Pressable
    onPress={onToggle}
    style={[
      styles.container,
      compact && styles.compact,
      { backgroundColor: isOn ? colors.successLight : colors.backgroundSecondary },
    ]}
  >
    <View
      style={[
        styles.dot,
        { backgroundColor: isOn ? colors.shiftOn : colors.shiftOff },
      ]}
    />
    <Text
      style={[
        typography.smallBold,
        { color: isOn ? colors.successDark : colors.textSecondary },
      ]}
    >
      {isOn ? 'На смене' : 'Не на смене'}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  compact: { paddingVertical: 6, paddingHorizontal: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
});

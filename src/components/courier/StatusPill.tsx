import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radii, spacing } from '../../theme/typography';

interface Props {
  isOnline: boolean;
  onPress?: () => void;
  /** When true, renders on a dark/purple background (default false = white bg) */
  dark?: boolean;
}

export const StatusPill: React.FC<Props> = ({ isOnline, onPress, dark = false }) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.pill,
      isOnline
        ? (dark ? styles.pillOnDark : styles.pillOnLight)
        : (dark ? styles.pillOffDark : styles.pillOffLight),
    ]}
  >
    <View
      style={[
        styles.dot,
        { backgroundColor: isOnline ? '#2E8B57' : (dark ? 'rgba(255,255,255,0.40)' : 'rgba(26,26,46,0.30)') },
      ]}
    />
    <Text style={[
      styles.label,
      { color: isOnline ? '#2E8B57' : (dark ? 'rgba(255,255,255,0.60)' : 'rgba(26,26,46,0.50)') },
    ]}>
      {isOnline ? 'На смене' : 'Не на смене'}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    gap: 8,
  },
  pillOnLight: {
    backgroundColor: 'rgba(46,139,87,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,139,87,0.25)',
  },
  pillOffLight: {
    backgroundColor: 'rgba(26,26,46,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(26,26,46,0.12)',
  },
  pillOnDark: {
    backgroundColor: 'rgba(46,139,87,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(46,139,87,0.35)',
  },
  pillOffDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
});

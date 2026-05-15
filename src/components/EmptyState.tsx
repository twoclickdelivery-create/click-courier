import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/typography';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ emoji, title, subtitle }) => (
  <View style={styles.container}>
    <Text style={styles.emoji}>{emoji}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emoji: { fontSize: 56, marginBottom: spacing.base },
  title: {
    ...typography.h3,
    textAlign: 'center',
    color: colors.text,
  },
  subtitle: {
    ...typography.small,
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 6,
  },
});

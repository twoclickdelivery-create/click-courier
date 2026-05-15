import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, spacing, typography } from '../../theme/typography';

export interface StepDef {
  label: string;
  caption?: string;
}

interface Props {
  steps: StepDef[];
  current: number;
}

export const StepFlow: React.FC<Props> = ({ steps, current }) => (
  <View style={styles.wrap}>
    {steps.map((step, i) => {
      const isDone = i < current;
      const isActive = i === current;
      const isLast = i === steps.length - 1;
      return (
        <View key={i} style={styles.row}>
          <View style={styles.gutter}>
            <View
              style={[
                styles.bullet,
                isDone && styles.bulletDone,
                isActive && styles.bulletActive,
              ]}
            >
              {isDone ? (
                <Text style={styles.bulletText}>✓</Text>
              ) : (
                <Text
                  style={[
                    styles.bulletText,
                    { color: isActive ? colors.primary : colors.textMuted },
                  ]}
                >
                  {i + 1}
                </Text>
              )}
            </View>
            {!isLast ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: isDone ? colors.primary : colors.border2 },
                ]}
              />
            ) : null}
          </View>
          <View style={[styles.body, isLast && { paddingBottom: 0 }]}>
            <Text
              style={[
                styles.label,
                {
                  color: isActive
                    ? colors.text
                    : isDone
                      ? colors.textSecondary
                      : colors.textMuted,
                },
              ]}
            >
              {step.label}
            </Text>
            {step.caption ? (
              <Text style={styles.caption}>{step.caption}</Text>
            ) : null}
          </View>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  wrap: {},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gutter: {
    width: 28,
    alignItems: 'center',
  },
  bullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.bg3,
    borderWidth: 1.5,
    borderColor: colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  bulletDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bulletText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: '#ffffff',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 32,
    marginVertical: 2,
  },
  body: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  label: {
    ...typography.bodyBold,
  },
  caption: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
});

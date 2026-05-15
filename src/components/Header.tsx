import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography } from '../theme/typography';
import { ShiftToggle } from './ShiftToggle';
import { useAuthStore } from '../store/authStore';
import { useOrdersStore } from '../store/ordersStore';

export const Header: React.FC = () => {
  const courier = useAuthStore((s) => s.courier);
  const isOnShift = useAuthStore((s) => s.isOnShift);
  const toggle = useAuthStore((s) => s.toggleShift);
  const todayEarnings = useOrdersStore((s) => s.todayEarnings);
  const todayCount = useOrdersStore((s) => s.todayCount);

  if (!courier) return null;

  const initial = courier.name.charAt(0);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={typography.h3} numberOfLines={1}>
            {courier.name.split(' ')[0]}
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            {todayEarnings.toLocaleString('ru-RU')} ₽ • {todayCount} зак.
          </Text>
        </View>
        <ShiftToggle isOn={isOnShift} onToggle={toggle} compact />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
});

import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusPill } from '../components/courier/StatusPill';
import { colors } from '../theme/colors';
import { fonts, radii, spacing } from '../theme/typography';
import { useAuthStore } from '../store/authStore';
import { useOrdersStore } from '../store/ordersStore';
import { TransportType } from '../types';

const transportLabels: Record<TransportType, { label: string; emoji: string }> = {
  foot: { label: 'Пешком',    emoji: '🚶' },
  bike: { label: 'Велосипед', emoji: '🚴' },
  car:  { label: 'Авто',      emoji: '🚗' },
};

export const ProfileScreen: React.FC = () => {
  const courier = useAuthStore((s) => s.courier);
  const isOnShift = useAuthStore((s) => s.isOnShift);
  const toggle = useAuthStore((s) => s.toggleShift);
  const logout = useAuthStore((s) => s.logout);
  const shiftStartedAt = useAuthStore((s) => s.shiftStartedAt);
  const updateTransport = useAuthStore((s) => s.updateTransport);
  const todayEarnings = useOrdersStore((s) => s.todayEarnings);
  const todayCount = useOrdersStore((s) => s.todayCount);

  if (!courier) return null;

  const shiftDuration = (() => {
    if (!isOnShift || !shiftStartedAt) return '—';
    const ms = Date.now() - shiftStartedAt;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}ч ${m}м`;
  })();

  const handleLogout = () =>
    Alert.alert('Выйти из аккаунта?', 'Вы будете разлогинены', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── dark purple header ── */}
      <View style={styles.header}>
        <Text style={styles.appLabel}>
          <Text style={styles.appBold}>click</Text>
          <Text style={styles.appThin}>courier</Text>
        </Text>

        {/* avatar + name inside header */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{courier.name.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{courier.name}</Text>
          <Text style={styles.phone}>{courier.phone}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <StatusPill isOnline={isOnShift} onPress={toggle} dark />
          </View>
        </View>
      </View>

      {/* ── white content ── */}
      <ScrollView
        style={styles.whiteArea}
        contentContainerStyle={styles.whiteContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Today stats */}
        <View style={styles.statsCard}>
          <StatCell label="На смене" value={shiftDuration} />
          <View style={styles.statsDivider} />
          <StatCell label="Заказы" value={`${todayCount}`} accent={colors.primary} />
          <View style={styles.statsDivider} />
          <StatCell label="Заработок" value={`${todayEarnings} ₽`} accent={colors.green} />
        </View>

        {/* Транспорт — редактируемый выбор */}
        <View style={styles.transportHeaderRow}>
          <Text style={styles.groupLabel}>Транспорт</Text>
          <Text style={styles.transportSubHint}>Нажмите чтобы изменить</Text>
        </View>
        <View style={styles.transportRow}>
          {(Object.keys(transportLabels) as TransportType[]).map((type) => {
            const active = courier.transport === type;
            return (
              <Pressable
                key={type}
                style={[styles.transportBtn, active && styles.transportBtnActive]}
                onPress={() => updateTransport(type)}
              >
                <Text style={styles.transportBtnEmoji}>
                  {transportLabels[type].emoji}
                </Text>
                <Text
                  style={[
                    styles.transportBtnLabel,
                    active && styles.transportBtnLabelActive,
                  ]}
                >
                  {transportLabels[type].label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Personal stats */}
        <Text style={styles.groupLabel}>Личная статистика</Text>
        <View style={styles.statsCol}>
          <StatRow
            label="Всего заказов"
            value={String(courier.totalOrders)}
            accent={colors.primary}
          />
          <View style={styles.rowDivider} />
          <StatRow
            label="Рейтинг"
            value={`${courier.rating.toFixed(1)} ★`}
            accent="#C03030"
          />
          <View style={styles.rowDivider} />
          <StatRow
            label="Заработок · месяц"
            value={`${courier.monthEarnings.toLocaleString('ru-RU')} ₽`}
            accent={colors.green}
          />
        </View>

        {/* Meta info — 2×2 grid */}
        <Text style={styles.groupLabel}>О курьере</Text>
        <View style={styles.metaGrid}>
          {/* Row 1 */}
          <View style={styles.metaGridRow}>
            <View style={styles.metaGridCell}>
              <Text style={styles.metaGridIcon}>📍</Text>
              <Text style={styles.metaGridLabel}>Город</Text>
              <Text style={styles.metaGridValue}>Махачкала</Text>
            </View>
            <View style={styles.metaGridDivV} />
            <View style={styles.metaGridCell}>
              <Text style={styles.metaGridIcon}>📅</Text>
              <Text style={styles.metaGridLabel}>С нами с</Text>
              <Text style={styles.metaGridValue}>Янв 2024</Text>
            </View>
          </View>
          {/* Divider */}
          <View style={styles.metaGridDivH} />
          {/* Row 2 */}
          <View style={styles.metaGridRow}>
            <View style={styles.metaGridCell}>
              <Text style={styles.metaGridIcon}>💰</Text>
              <Text style={styles.metaGridLabel}>Всего заработано</Text>
              <Text style={[styles.metaGridValue, { color: colors.green }]}>
                {(courier.monthEarnings * 6).toLocaleString('ru-RU')} ₽
              </Text>
            </View>
            <View style={styles.metaGridDivV} />
            <View style={styles.metaGridCell}>
              <Text style={styles.metaGridIcon}>🗺</Text>
              <Text style={styles.metaGridLabel}>Зона</Text>
              <Text style={styles.metaGridValue}>Центр</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnText}>Выйти из аккаунта</Text>
        </Pressable>

        <Text style={styles.versionText}>
          CLICK Курьер · Сервис доставки · Махачкала
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCell: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent,
}) => (
  <View style={styles.statsCell}>
    <Text style={[styles.statsCellValue, accent ? { color: accent } : null]}>
      {value}
    </Text>
    <Text style={styles.statsCellLabel}>{label}</Text>
  </View>
);

const StatRow: React.FC<{ label: string; value: string; accent?: string }> = ({
  label,
  value,
  accent,
}) => (
  <View style={styles.statRow}>
    <Text style={styles.statRowLabel}>{label}</Text>
    <Text style={[styles.statRowValue, accent ? { color: accent } : null]}>
      {value}
    </Text>
  </View>
);


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDark },

  /* header */
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 44,
    backgroundColor: colors.bgDark,
    alignItems: 'center',
  },
  appLabel: { alignSelf: 'flex-start' },
  appBold: {
    fontFamily: fonts.sansBold ?? fonts.sans,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  appThin: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '300',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: spacing.sm,
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold ?? fonts.sans,
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    fontFamily: fonts.sansBold ?? fonts.sans,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  phone: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },

  /* white area */
  whiteArea: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
  },
  whiteContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },

  /* today stats */
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statsCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statsCellValue: {
    fontFamily: fonts.sansBold ?? fonts.sans,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  statsCellLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginVertical: 6,
  },

  /* group label */
  groupLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },

  /* transport — editable selector */
  transportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  transportSubHint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
  },
  transportRow: { flexDirection: 'row', gap: spacing.sm },
  transportBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  transportBtnActive: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  transportBtnEmoji: { fontSize: 24, marginBottom: 4 },
  transportBtnLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
  },
  transportBtnLabelActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },

  /* stats column */
  statsCol: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
  },
  statRowLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },
  statRowValue: {
    fontFamily: fonts.sansBold ?? fonts.sans,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },

  /* meta grid 2×2 */
  metaGrid: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  metaGridRow: {
    flexDirection: 'row',
  },
  metaGridCell: {
    flex: 1,
    padding: spacing.md,
    gap: 2,
  },
  metaGridDivH: {
    height: 1,
    backgroundColor: colors.divider,
  },
  metaGridDivV: {
    width: 1,
    backgroundColor: colors.divider,
  },
  metaGridIcon: {
    fontSize: 14,
    marginBottom: 2,
  },
  metaGridLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
  },
  metaGridValue: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },

  /* logout */
  logoutBtn: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(192,48,48,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(192,48,48,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  logoutBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.danger,
    fontWeight: '600',
  },

  versionText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: 0.3,
  },
});

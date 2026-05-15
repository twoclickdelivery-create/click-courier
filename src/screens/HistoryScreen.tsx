import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts, radii, spacing } from '../theme/typography';
import { useOrdersStore } from '../store/ordersStore';
import { Order } from '../types';

type Range = 'today' | 'week' | 'month';
const RANGE_LABEL: Record<Range, string> = {
  today: 'Сегодня',
  week:  'Неделя',
  month: 'Месяц',
};

const DAY_ABBR = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const fmtTime = (ts?: number) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

/* ─────────────── helpers ─────────────── */
const startOfDay = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const HistoryScreen: React.FC = () => {
  const [range, setRange] = useState<Range>('today');
  const orders = useOrdersStore((s) => s.orders);
  const computeEarnings = useOrdersStore((s) => s.computeEarnings);

  const allDone = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'delivered' || o.status === 'cancelled')
        .sort((a, b) => (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0)),
    [orders]
  );

  const filtered = useMemo(() => {
    const limit =
      range === 'today'
        ? startOfDay()
        : range === 'week'
        ? Date.now() - 7 * 86_400_000
        : Date.now() - 30 * 86_400_000;
    return allDone.filter((o) => (o.deliveredAt ?? 0) >= limit);
  }, [allDone, range]);

  const todayTotal = useMemo(
    () =>
      allDone
        .filter((o) => o.status === 'delivered' && (o.deliveredAt ?? 0) >= startOfDay())
        .reduce((s, o) => s + o.payment, 0),
    [allDone]
  );
  const weekTotal = useMemo(
    () =>
      allDone
        .filter(
          (o) => o.status === 'delivered' && (o.deliveredAt ?? 0) >= Date.now() - 7 * 86_400_000
        )
        .reduce((s, o) => s + o.payment, 0),
    [allDone]
  );
  const monthTotal = useMemo(
    () =>
      allDone
        .filter(
          (o) => o.status === 'delivered' && (o.deliveredAt ?? 0) >= Date.now() - 30 * 86_400_000
        )
        .reduce((s, o) => s + o.payment, 0),
    [allDone]
  );

  /* Недельный чарт */
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dayStart = startOfDay(6 - i);
      const dayEnd   = dayStart + 86_400_000;
      const dayOrders = allDone.filter(
        (o) => o.status === 'delivered' &&
               (o.deliveredAt ?? 0) >= dayStart &&
               (o.deliveredAt ?? 0) < dayEnd
      );
      const total = dayOrders.reduce((s, o) => s + o.payment, 0);
      const d = new Date(dayStart);
      // isToday: сравниваем начало дня, а не просто индекс — работает через полночь
      const todayStart = startOfDay(0);
      return { label: DAY_ABBR[d.getDay()], total, isToday: dayStart === todayStart };
    });
  }, [allDone]);

  const maxDay = Math.max(...weekDays.map((d) => d.total), 1);

  const filterTotal = filtered
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + o.payment, 0);
  const filterCount = filtered.filter((o) => o.status === 'delivered').length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Тёмный заголовок ── */}
      <View style={styles.header}>
        <Text style={styles.appLabel}>
          <Text style={styles.appBold}>Click</Text>
          <Text style={styles.appDot}> · </Text>
          <Text style={styles.appThin}>в одно касание</Text>
        </Text>
        <Text style={styles.title}>Заработок</Text>

        {/* три чипа */}
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={[styles.chipValue, { color: '#4ADE80' }]}>
              {todayTotal.toLocaleString('ru-RU')} ₽
            </Text>
            <Text style={styles.chipLabel}>Сегодня</Text>
          </View>
          <View style={styles.chip}>
            <Text style={[styles.chipValue, { color: '#C4B5FD' }]}>
              {weekTotal.toLocaleString('ru-RU')} ₽
            </Text>
            <Text style={styles.chipLabel}>Неделя</Text>
          </View>
          <View style={styles.chip}>
            <Text style={[styles.chipValue, { color: '#FCD34D' }]}>
              {monthTotal.toLocaleString('ru-RU')} ₽
            </Text>
            <Text style={styles.chipLabel}>Месяц</Text>
          </View>
        </View>
      </View>

      {/* ── Белая зона ── */}
      <ScrollView
        style={styles.whiteArea}
        contentContainerStyle={styles.whiteContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Недельный бар-чарт */}
        <View style={chartSt.card}>
          <Text style={chartSt.chartTitle}>📊 Неделя по дням</Text>
          <View style={chartSt.chart}>
            {weekDays.map((day, idx) => {
              const pct = day.total / maxDay;
              const barH = Math.max(pct * 80, day.total > 0 ? 6 : 2);
              return (
                <View key={idx} style={chartSt.col}>
                  <View style={chartSt.barWrap}>
                    <View
                      style={[
                        chartSt.bar,
                        { height: barH },
                        day.isToday ? chartSt.barToday : chartSt.barPast,
                      ]}
                    />
                  </View>
                  <Text style={[chartSt.dayLabel, day.isToday && chartSt.dayLabelToday]}>
                    {day.label}
                  </Text>
                  {day.isToday && day.total > 0 && (
                    <Text style={chartSt.todayAmt}>{day.total}₽</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Сводка за период */}
        {filterCount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Выполнено заказов</Text>
              <Text style={styles.summaryValue}>{filterCount}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Итого заработано</Text>
              <Text style={[styles.summaryValue, { color: colors.green }]}>
                {filterTotal.toLocaleString('ru-RU')} ₽
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Средний чек</Text>
              <Text style={styles.summaryValue}>
                {Math.round(filterTotal / filterCount)} ₽
              </Text>
            </View>
          </View>
        )}

        {/* период */}
        <View style={styles.periodRow}>
          {(['today', 'week', 'month'] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              style={[styles.periodBtn, range === r && styles.periodBtnActive]}
            >
              <Text
                style={[styles.periodText, range === r && styles.periodTextActive]}
              >
                {RANGE_LABEL[r]}
              </Text>
            </Pressable>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyTitle}>Нет заказов</Text>
            <Text style={styles.emptyCaption}>
              За этот период нет завершённых заказов
            </Text>
          </View>
        ) : (
          filtered.map((item) => (
            <EarnRow key={item.id} order={item} computeEarnings={computeEarnings} />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─────────────────── WeekChart styles ─────────────────── */
const chartSt = StyleSheet.create({
  card: {
    backgroundColor: colors.bgDark,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 4,
  },
  col: {
    flex: 1,
    alignItems: 'center',
  },
  barWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '70%',
    borderRadius: 4,
    minHeight: 2,
  },
  barPast: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  barToday: {
    backgroundColor: '#4ADE80',
  },
  dayLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 4,
  },
  dayLabelToday: {
    color: '#4ADE80',
    fontWeight: '600' as const,
    fontFamily: fonts.sansSemiBold,
  },
  todayAmt: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: '#4ADE80',
    marginTop: 2,
  },
});

/* ─────────────────── EarnRow ─────────────────── */
const EarnRow: React.FC<{
  order: Order;
  computeEarnings: (o: Order) => { base: number; distanceBonus: number; timeBonus: number; total: number };
}> = ({ order, computeEarnings }) => {
  const [expanded, setExpanded] = useState(false);
  const cancelled = order.status === 'cancelled';
  const breakdown = computeEarnings(order);

  return (
    <Pressable
      style={rowSt.card}
      onPress={() => !cancelled && setExpanded((v) => !v)}
    >
      <View style={rowSt.main}>
        <View style={[rowSt.bullet, { backgroundColor: cancelled ? colors.danger : colors.green }]}>
          <Text style={rowSt.bulletText}>{cancelled ? '✕' : '✓'}</Text>
        </View>

        <View style={rowSt.body}>
          <Text style={rowSt.num} numberOfLines={1}>
            {order.number} · {order.restaurant.name}
          </Text>
          <Text style={rowSt.addr} numberOfLines={1}>
            → {order.client.address}
          </Text>
        </View>

        <View style={rowSt.right}>
          <Text
            style={[rowSt.amount, { color: cancelled ? colors.textMuted : colors.green }]}
          >
            {cancelled ? '—' : `+${order.payment} ₽`}
          </Text>
          <Text style={rowSt.time}>{fmtTime(order.deliveredAt)}</Text>
          {!cancelled && (
            <Text style={rowSt.chevron}>{expanded ? '▲' : '▼'}</Text>
          )}
        </View>
      </View>

      {/* Разбивка заработка */}
      {expanded && !cancelled && (
        <View style={rowSt.breakdown}>
          <BreakLine label="Базовая ставка" value={breakdown.base} />
          <BreakLine label={`Бонус дистанция (${order.distanceKm} км)`} value={breakdown.distanceBonus} />
          <BreakLine label="Бонус скорость" value={breakdown.timeBonus} highlight={breakdown.timeBonus > 0} />
          <View style={rowSt.breakDivider} />
          <View style={rowSt.breakTotal}>
            <Text style={rowSt.breakTotalLabel}>Итого</Text>
            <Text style={rowSt.breakTotalValue}>{breakdown.total} ₽</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
};

const BreakLine: React.FC<{
  label: string;
  value: number;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <View style={rowSt.breakRow}>
    <Text style={rowSt.breakLabel}>{label}</Text>
    <Text style={[rowSt.breakValue, highlight && { color: colors.green }]}>
      {value > 0 ? `+${value} ₽` : '0 ₽'}
    </Text>
  </View>
);

/* ─────────────────── Styles ─────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDark },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bgDark,
  },
  appLabel: {},
  appBold: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  appDot: { fontFamily: fonts.sans, fontSize: 15, color: 'rgba(255,255,255,.3)' },
  appThin: { fontFamily: fonts.sans, fontSize: 15, color: 'rgba(255,255,255,.5)' },
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.md,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,.10)',
    borderRadius: radii.lg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chipValue: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  chipLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: 'rgba(255,255,255,.45)',
    marginTop: 3,
  },

  whiteArea: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  whiteContent: {
    padding: spacing.base,
    paddingBottom: 100,
  },

  summaryCard: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  summaryDivider: { height: 1, backgroundColor: colors.divider },

  periodRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.bg2,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  periodTextActive: { color: '#fff', fontWeight: '600' },

  empty: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  emptyCaption: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});

const rowSt = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  bullet: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bulletText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  body: { flex: 1 },
  num: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  addr: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end' },
  amount: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  time: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },

  /* breakdown */
  breakdown: {
    backgroundColor: colors.bg2,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  breakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
  },
  breakValue: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.text,
  },
  breakDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  breakTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakTotalLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  breakTotalValue: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.green,
    letterSpacing: -0.3,
  },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CourierHeader } from '../components/courier/CourierHeader';
import { SkeletonOrderCard, SkeletonGoalBar } from '../components/Skeleton';
import { colors } from '../theme/colors';
import { fonts, radii, spacing } from '../theme/typography';
import { useAuthStore } from '../store/authStore';
import { useOrdersStore } from '../store/ordersStore';
import { useLocationStore } from '../store/locationStore';
import { Coordinates, Order, OrderStatus, TransportType } from '../types';
import type { NavigationProp } from '@react-navigation/native';

// ── Цели дня ────────────────────────────────────────────────────────────────
const DAY_GOAL_MONEY  = 2000;
const DAY_GOAL_ORDERS = 10;

// ── Скорость км/мин по типу транспорта ──────────────────────────────────────
const SPEED: Record<TransportType, number> = {
  foot: 0.067,   // 4 км/ч
  bike: 0.25,    // 15 км/ч
  car:  0.50,    // 30 км/ч в городе
};

const MAX_MINUTES_TO_REST = 15; // максимум минут от курьера до ресторана
const DETOUR_FACTOR = 1.25;     // допустимое удлинение маршрута «по пути»

const RESTAURANT_COLORS = [
  '#C4943A', '#4A7EC4', '#2E8B57', '#8B5C9E', '#C03030', '#7B5CF6',
];

// ── Геодезия ─────────────────────────────────────────────────────────────────
function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.latitude  - a.latitude)  * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
    Math.cos((b.latitude * Math.PI) / 180) *
    sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

interface EnrichedOrder extends Order {
  minutesToRestaurant: number;
  kmToRestaurant: number;
  isOnRoute: boolean;
}

interface Props {
  navigation: NavigationProp<any>;
}

export const OrdersScreen: React.FC<Props> = ({ navigation }) => {
  const courier       = useAuthStore((s) => s.courier);
  const isOnShift     = useAuthStore((s) => s.isOnShift);
  const setShift      = useAuthStore((s) => s.setShift);
  const orders        = useOrdersStore((s) => s.orders);
  const todayEarnings = useOrdersStore((s) => s.todayEarnings);
  const todayCount    = useOrdersStore((s) => s.todayCount);
  const acceptOrder   = useOrdersStore((s) => s.acceptOrder);
  const declineOrder  = useOrdersStore((s) => s.declineOrder);
  const hydrate       = useOrdersStore((s) => s.hydrate);
  const location      = useLocationStore((s) => s.current);

  // Skeleton on initial mount — disappears after hydrate settles
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    hydrate();
    const t = setTimeout(() => setIsInitialLoad(false), 650);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const newOrders  = useMemo(() => orders.filter((o) => o.status === 'new'), [orders]);
  const inProgress = useMemo(
    () => orders.filter(
      (o) => o.status !== 'new' && o.status !== 'delivered' && o.status !== 'cancelled'
    ),
    [orders]
  );

  const transport = (courier?.transport ?? 'bike') as TransportType;
  const speedKmMin = SPEED[transport] ?? SPEED['bike']; // fallback — никогда не будет undefined/NaN

  // ── Пункт назначения активного заказа (если есть) ─────────────────────────
  const activeDestination: Coordinates | null = useMemo(() => {
    if (!inProgress.length) return null;
    const active = inProgress[0];
    if (
      active.status === 'going_to_client' ||
      active.status === 'at_client' ||
      active.status === 'picked_up'
    ) {
      return active.client.coordinates;
    }
    return active.restaurant.coordinates;
  }, [inProgress]);

  // ── Фильтрация и обогащение новых заказов ─────────────────────────────────
  const reachableOrders = useMemo((): EnrichedOrder[] => {
    return newOrders
      .map((order) => {
        const kmToRest    = haversineKm(location, order.restaurant.coordinates);
        const minToRest   = kmToRest / speedKmMin;

        // Проверка «по пути»: нет удлинения маршрута более DETOUR_FACTOR
        let isOnRoute = false;
        if (activeDestination) {
          const directKm   = haversineKm(location, activeDestination);
          const detourKm   = kmToRest + haversineKm(order.restaurant.coordinates, activeDestination);
          isOnRoute = directKm > 0.1 && detourKm <= directKm * DETOUR_FACTOR;
        }

        return {
          ...order,
          minutesToRestaurant: Math.round(minToRest),
          kmToRestaurant: Number(kmToRest.toFixed(1)),
          isOnRoute,
        };
      })
      .filter((o) => o.minutesToRestaurant <= MAX_MINUTES_TO_REST)
      .sort((a, b) => a.minutesToRestaurant - b.minutesToRestaurant);
  }, [newOrders, location, speedKmMin, activeDestination]);

  const handleAccept = (id: string) => {
    acceptOrder(id);
    // Если уже есть активные заказы — остаёмся на экране заказов,
    // чтобы первый заказ не пропал из виду. Курьер видит оба в списке.
    if (inProgress.length === 0) {
      navigation.navigate('ActiveOrder', { orderId: id });
    }
    // Если inProgress.length > 0 — новый заказ появится в hero-картах сверху
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Бордовая шапка */}
      <CourierHeader
        courierName={courier?.name ?? 'Курьер'}
        courierCode={courier?.id ?? '—'}
        isOnline={isOnShift}
        onToggleShift={() => setShift(!isOnShift)}
      />

      {/* Статистика дня — в тёмной зоне */}
      <View style={styles.statsStrip}>
        <StripCell value={`${todayEarnings.toLocaleString('ru-RU')} ₽`} label="Сегодня"  color="#4ADE80" />
        <View style={styles.stripSep} />
        <StripCell value={String(todayCount)}                            label="Заказов"  color="#C4B5FD" />
        <View style={styles.stripSep} />
        <StripCell value={`${courier?.rating?.toFixed(1) ?? '5.0'} ★`}  label="Рейтинг"  color="#FCD34D" />
      </View>

      {/* Белая зона */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {isInitialLoad ? (
          /* ── Skeleton на первой загрузке ── */
          <>
            <SkeletonGoalBar />
            <SkeletonOrderCard />
            <SkeletonOrderCard />
          </>
        ) : (
          /* ── Настоящий контент ── */
          <>
            {/* Цель дня */}
            <GoalBar earned={todayEarnings} ordersCount={todayCount} />

            {/* Активные заказы */}
            {inProgress.length > 0 && (
              <View>
                {inProgress.length > 1 && (
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>В работе</Text>
                    <View style={[styles.badge, { backgroundColor: '#7B5CF6' }]}>
                      <Text style={styles.badgeText}>{inProgress.length}</Text>
                    </View>
                  </View>
                )}
                {inProgress.map((order) => (
                  <Pressable
                    key={order.id}
                    onPress={() => navigation.navigate('ActiveOrder', { orderId: order.id })}
                    style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                  >
                    <ActiveOrderHero order={order} />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Новые заказы */}
            {!isOnShift ? (
              <OfflineCard onStart={() => setShift(true)} />
            ) : reachableOrders.length > 0 ? (
              <View>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Новые заказы</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{reachableOrders.length}</Text>
                  </View>
                  <Text style={styles.sectionHint}>≤{MAX_MINUTES_TO_REST} мин до ресторана</Text>
                </View>
                {reachableOrders.map((order) => (
                  <NewOrderRow
                    key={order.id}
                    order={order}
                    onAccept={() => handleAccept(order.id)}
                    onDecline={() => declineOrder(order.id)}
                  />
                ))}
                {newOrders.length > reachableOrders.length && (
                  <Text style={styles.skippedHint}>
                    + {newOrders.length - reachableOrders.length} заказа слишком далеко для вашего транспорта
                  </Text>
                )}
              </View>
            ) : newOrders.length > 0 ? (
              <TooFarCard count={newOrders.length} transport={transport} />
            ) : inProgress.length === 0 ? (
              <WaitingCard onRefresh={() => hydrate()} />
            ) : null}

            <View style={{ height: spacing.xxxl + 20 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─────────────────────── StripCell ─────────────────────── */
const StripCell: React.FC<{ value: string; label: string; color?: string }> = ({
  value, label, color,
}) => (
  <View style={styles.stripCell}>
    <Text style={[styles.stripValue, color ? { color } : null]}>{value}</Text>
    <Text style={styles.stripLabel}>{label}</Text>
  </View>
);

/* ─────────────────────── GoalBar ───────────────────────── */
const GoalBar: React.FC<{ earned: number; ordersCount: number }> = ({
  earned, ordersCount,
}) => {
  const moneyPct   = Math.min(earned / DAY_GOAL_MONEY, 1);
  const ordersPct  = Math.min(ordersCount / DAY_GOAL_ORDERS, 1);
  const moneyLeft  = Math.max(DAY_GOAL_MONEY - earned, 0);
  const ordersLeft = Math.max(DAY_GOAL_ORDERS - ordersCount, 0);
  const done       = moneyPct >= 1 && ordersPct >= 1;

  return (
    <View style={goalSt.card}>
      <View style={goalSt.row}>
        <Text style={goalSt.title}>🎯 Цель дня</Text>
        <Text style={[goalSt.status, done && { color: colors.green }]}>
          {done
            ? '✅ Выполнена!'
            : moneyLeft > 0
            ? `ещё ${moneyLeft.toLocaleString('ru-RU')} ₽`
            : `ещё ${ordersLeft} заказов`}
        </Text>
      </View>

      {/* Деньги */}
      <View style={goalSt.barRow}>
        <Text style={goalSt.barLabel}>💰</Text>
        <View style={goalSt.trackWrap}>
          <View style={goalSt.track}>
            <View style={[goalSt.fill, { width: `${moneyPct * 100}%` as any, backgroundColor: colors.green }]} />
          </View>
          <Text style={goalSt.barPct}>{Math.round(moneyPct * 100)}%</Text>
        </View>
        <Text style={goalSt.goal}>{DAY_GOAL_MONEY.toLocaleString('ru-RU')} ₽</Text>
      </View>

      {/* Заказы */}
      <View style={[goalSt.barRow, { marginBottom: 0 }]}>
        <Text style={goalSt.barLabel}>📦</Text>
        <View style={goalSt.trackWrap}>
          <View style={goalSt.track}>
            <View style={[goalSt.fill, { width: `${ordersPct * 100}%` as any, backgroundColor: colors.primary }]} />
          </View>
          <Text style={goalSt.barPct}>{ordersCount}/{DAY_GOAL_ORDERS}</Text>
        </View>
        <Text style={goalSt.goal}>{DAY_GOAL_ORDERS} зак.</Text>
      </View>
    </View>
  );
};

const goalSt = StyleSheet.create({
  card: {
    backgroundColor: colors.bg2,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 14, fontWeight: '600', color: colors.text },
  status: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textMuted },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  barLabel: { fontSize: 14, width: 22 },
  trackWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: colors.bg3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 8 },
  barPct: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, width: 32, textAlign: 'right' },
  goal: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.textMuted, width: 60, textAlign: 'right' },
});

/* ─────────────────── ActiveOrderHero ────────────────────── */
const STAGE_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'going_to_restaurant', label: 'Ресторан' },
  { key: 'at_restaurant',       label: 'Ресторан' },
  { key: 'picked_up',           label: 'Везём' },
  { key: 'going_to_client',     label: 'Везём' },
  { key: 'at_client',           label: 'Клиент' },
];

const stageIdx = (status: OrderStatus) => {
  const i = STAGE_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
};

const ActiveOrderHero: React.FC<{ order: Order }> = ({ order }) => {
  const idx      = stageIdx(order.status);
  const progress = ((idx + 1) / STAGE_STEPS.length) * 100;
  const stageLabel = STAGE_STEPS[idx]?.label ?? '—';

  // Цвет индикатора по стадии
  const stageColor =
    order.status === 'going_to_restaurant' || order.status === 'at_restaurant'
      ? colors.amber
      : order.status === 'picked_up' || order.status === 'going_to_client'
      ? '#7B5CF6'
      : colors.green;

  return (
    <View style={heroSt.card}>
      <View style={heroSt.top}>
        <View>
          <Text style={[heroSt.badge, { color: stageColor }]}>
            ⚡ В РАБОТЕ · {stageLabel.toUpperCase()}
          </Text>
          <Text style={heroSt.number}>{order.number}</Text>
        </View>
        <Text style={heroSt.payment}>+{order.payment} ₽</Text>
      </View>
      <Text style={heroSt.route} numberOfLines={1}>
        🍽 {order.restaurant.name} → {order.client.address}
      </Text>
      <View style={heroSt.progressTrack}>
        <View style={[heroSt.progressFill, { width: `${progress}%` as any, backgroundColor: stageColor }]} />
      </View>
      <View style={heroSt.stages}>
        <Text style={heroSt.stageLeft}>Ресторан</Text>
        <Text style={[heroSt.stageCurrent, { color: stageColor }]}>▶ {stageLabel}</Text>
        <Text style={heroSt.stageRight}>Клиент</Text>
      </View>
      <Text style={heroSt.hint}>Нажмите чтобы открыть →</Text>
    </View>
  );
};

const heroSt = StyleSheet.create({
  card: {
    backgroundColor: colors.text,
    borderRadius: radii.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  badge: { fontFamily: fonts.sansSemiBold, fontSize: 10, letterSpacing: 0.8, color: '#7B5CF6', marginBottom: 4 },
  number: { fontFamily: fonts.sansBold, fontSize: 22, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  payment: { fontFamily: fonts.sansBold, fontSize: 24, fontWeight: '700', color: '#4ADE80', letterSpacing: -0.5 },
  route: { fontFamily: fonts.sans, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: spacing.md },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden', marginBottom: spacing.xs },
  progressFill: { height: '100%', backgroundColor: '#7B5CF6', borderRadius: 4 },
  stages: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  stageLeft: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  stageCurrent: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: '#C4B5FD', fontWeight: '600' },
  stageRight: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  hint: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'right' },
});

/* ─────────────────── NewOrderRow ────────────────────────── */
const NewOrderRow: React.FC<{
  order: EnrichedOrder;
  onAccept: () => void;
  onDecline: () => void;
}> = ({ order, onAccept, onDecline }) => {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const declined = useRef(false);

  useEffect(() => {
    declined.current = false;
    setSecondsLeft(30);
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (!declined.current) { declined.current = true; onDecline(); }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const timerColor =
    secondsLeft > 20 ? colors.green : secondsLeft > 10 ? colors.amber : colors.danger;

  const charCode = order.restaurant.name.charCodeAt(0) % RESTAURANT_COLORS.length;
  const dotColor = RESTAURANT_COLORS[charCode];

  return (
    <View style={rowSt.card}>
      {/* «По пути» бейдж */}
      {order.isOnRoute && (
        <View style={rowSt.onRouteBadge}>
          <Text style={rowSt.onRouteBadgeText}>🛣 По пути</Text>
        </View>
      )}

      <View style={rowSt.main}>
        <View style={[rowSt.dot, { backgroundColor: dotColor }]} />

        <View style={rowSt.body}>
          <Text style={rowSt.name} numberOfLines={1}>
            {order.number} · {order.restaurant.name}
          </Text>
          {/* Адрес клиента */}
          <Text style={rowSt.addr} numberOfLines={1}>
            → {order.client.address}
          </Text>
          {/* До ресторана */}
          <View style={rowSt.distRow}>
            <Text style={rowSt.distText}>
              🍽 {order.kmToRestaurant} км · {order.minutesToRestaurant} мин до ресторана
            </Text>
          </View>
        </View>

        <View style={rowSt.meta}>
          <Text style={rowSt.payment}>{order.payment} ₽</Text>
          <Text style={[rowSt.timer, { color: timerColor }]}>⏱ {secondsLeft} с</Text>
        </View>
      </View>

      <View style={rowSt.actions}>
        <Pressable
          style={({ pressed }) => [rowSt.declineBtn, pressed && { opacity: 0.7 }]}
          onPress={() => { declined.current = true; onDecline(); }}
        >
          <Text style={rowSt.declineText}>Отказаться</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [rowSt.acceptBtn, pressed && { opacity: 0.85 }]}
          onPress={onAccept}
        >
          <Text style={rowSt.acceptText}>Принять</Text>
        </Pressable>
      </View>
    </View>
  );
};

const rowSt = StyleSheet.create({
  card: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  onRouteBadge: {
    backgroundColor: colors.greenFaint,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(46,139,87,0.12)',
  },
  onRouteBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.green,
    fontWeight: '600',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 3, flexShrink: 0 },
  body: { flex: 1 },
  name: { fontFamily: fonts.sansSemiBold, fontSize: 14, fontWeight: '600', color: colors.text },
  addr: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  distRow: { marginTop: 4 },
  distText: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted },
  meta: { alignItems: 'flex-end', flexShrink: 0 },
  payment: { fontFamily: fonts.sansBold, fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  timer: { fontFamily: fonts.mono, fontSize: 11, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border2,
  },
  declineText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textSecondary },
  acceptBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  acceptText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
});

/* ─────────── WaitingCard / OfflineCard / TooFarCard ────── */
const WaitingCard: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const now = new Date();
  const hour = now.getHours();
  const isQuietHour = hour >= 14 && hour < 15;

  return (
    <View style={styles.bigCard}>
      <View style={styles.waitDot} />
      <Text style={styles.bigTitle}>Ожидаем заказ</Text>
      <Text style={styles.bigCaption}>
        {isQuietHour
          ? `Тихий час ${hour}:00–${hour + 1}:00 — заказов обычно меньше. Обновите ленту через несколько минут.`
          : 'Ближайший заказ придёт автоматически. Убедитесь, что включена смена.'}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.bigBtn, { marginTop: spacing.base }, pressed && { opacity: 0.85 }]}
        onPress={onRefresh}
      >
        <Text style={styles.bigBtnText}>Обновить ленту →</Text>
      </Pressable>
    </View>
  );
};

const OfflineCard: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <View style={styles.bigCard}>
    <Text style={styles.bigEmoji}>🌙</Text>
    <Text style={styles.bigTitle}>Вы не на смене</Text>
    <Text style={styles.bigCaption}>Включите смену, чтобы начать получать заказы</Text>
    <Pressable onPress={onStart} style={styles.bigBtn}>
      <Text style={styles.bigBtnText}>Начать смену</Text>
    </Pressable>
  </View>
);

const TooFarCard: React.FC<{ count: number; transport: TransportType }> = ({ count, transport }) => {
  const transportLabel: Record<TransportType, string> = {
    foot: 'пешком',
    bike: 'на велосипеде',
    car:  'на авто',
  };
  return (
    <View style={styles.bigCard}>
      <Text style={styles.bigEmoji}>📍</Text>
      <Text style={styles.bigTitle}>{count} заказ{count > 1 ? 'а' : ''} рядом</Text>
      <Text style={styles.bigCaption}>
        Все заказы дальше {MAX_MINUTES_TO_REST} минут {transportLabel[transport]}.{'\n'}
        Переключите транспорт или дождитесь ближайшего заказа.
      </Text>
    </View>
  );
};

/* ─────────────────── Styles ─────────────────── */
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bgDark },
  scroll: { flex: 1, backgroundColor: colors.bg },
  body:   { paddingHorizontal: spacing.base, paddingTop: spacing.base },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.bgDark,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  stripCell:  { flex: 1, alignItems: 'center' },
  stripValue: { fontFamily: fonts.sansBold, fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: '#FFFFFF' },
  stripLabel: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  stripSep:   { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sectionTitle: { fontFamily: fonts.sansSemiBold, fontSize: 16, fontWeight: '600', color: colors.text },
  sectionHint:  { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, flex: 1, textAlign: 'right' },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  skippedHint: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  bigCard: {
    backgroundColor: colors.bg2,
    borderRadius: radii.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  waitDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.amber, marginBottom: spacing.md },
  bigEmoji: { fontSize: 36, marginBottom: spacing.md },
  bigTitle: { fontFamily: fonts.sansBold, fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  bigCaption: { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  bigBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  bigBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: '#ffffff', fontWeight: '600' },
});

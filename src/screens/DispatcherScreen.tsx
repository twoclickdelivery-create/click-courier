import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DispatcherMap, MappedCourier } from '../components/DispatcherMap';
import { colors } from '../theme/colors';
import { fonts, radii, spacing } from '../theme/typography';
import { useAuthStore } from '../store/authStore';
import { useOrdersStore } from '../store/ordersStore';
import { mockCouriers, courierLocations } from '../data/mockCouriers';
import { Order, OrderStatus, Courier } from '../types';
import type { NavigationProp } from '@react-navigation/native';

interface Props {
  navigation: NavigationProp<any>;
}

type Tab = 'feed' | 'orders' | 'couriers' | 'map';

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const a2 =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon * sinLon;
  return R * 2 * Math.asin(Math.sqrt(a2));
}

// ── Order urgency ─────────────────────────────────────────────────────────────
function getWaitMin(order: Order): number {
  return (Date.now() - order.createdAt) / 60000;
}
function getUrgencyBorder(order: Order): string {
  if (order.status !== 'new') return colors.border;
  const w = getWaitMin(order);
  if (w > 10) return colors.danger;
  if (w > 5) return colors.amber;
  return colors.primary;
}
function getUrgencyBg(order: Order): string | undefined {
  if (order.status !== 'new') return undefined;
  const w = getWaitMin(order);
  if (w > 10) return colors.dangerFaint;
  if (w > 5) return colors.amberFaint;
  return undefined;
}
function getWaitLabel(order: Order): string | null {
  if (order.status !== 'new') return null;
  const m = Math.floor(getWaitMin(order));
  return m < 1 ? 'только что' : `${m} мин`;
}
// Sort score: new orders by urgency first (longer wait → higher priority)
function urgencyScore(order: Order): number {
  if (order.status !== 'new') return 0;
  return getWaitMin(order);
}

const stageByStatus: Partial<Record<OrderStatus, string>> = {
  new:                 'НОВЫЙ',
  accepted:            'ПРИНЯТ',
  going_to_restaurant: 'В РЕСТОРАН',
  at_restaurant:       'ЗАБИРАЕТ',
  picked_up:           'В ПУТИ',
  going_to_client:     'К КЛИЕНТУ',
  at_client:           'У КЛИЕНТА',
  delivered:           'ВЫПОЛНЕН',
  cancelled:           'ОТМЕНЁН',
};

const stageColor: Partial<Record<OrderStatus, string>> = {
  new:                 colors.primary,
  accepted:            colors.amber,
  going_to_restaurant: colors.amber,
  at_restaurant:       colors.amber,
  picked_up:           colors.blue,
  going_to_client:     colors.blue,
  at_client:           colors.purple,
  delivered:           colors.green,
  cancelled:           colors.danger,
};

const transportEmoji = { foot: '🚶', bike: '🚴', car: '🚗' } as const;
// Max orders per transport type (capacity limit)
const MAX_LOAD = { foot: 2, bike: 3, car: 5 } as const;

/* ────────────────────────────── MAIN SCREEN ────────────────────────────────── */

export const DispatcherScreen: React.FC<Props> = ({ navigation }) => {
  const [tab, setTab] = useState<Tab>('feed');
  const orders        = useOrdersStore((s) => s.orders);
  const acceptOrder   = useOrdersStore((s) => s.acceptOrder);
  const declineOrder  = useOrdersStore((s) => s.declineOrder);
  const setOrderCourierId = useOrdersStore((s) => s.setOrderCourierId);
  const addAutoOrder  = useOrdersStore((s) => s.addAutoOrder);
  const hydrate       = useOrdersStore((s) => s.hydrate);
  const logout        = useAuthStore((s) => s.logout);

  const [onlineCouriers, setOnlineCouriers] = useState<Set<string>>(
    () => new Set(mockCouriers.slice(0, 3).map((c) => c.id))
  );
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Badge: count of new orders not yet seen by dispatcher
  const prevNewCountRef = useRef(0);
  const [unseenNew, setUnseenNew] = useState(0);

  useEffect(() => { hydrate(); }, [hydrate]);

  // ── Auto-dispatch: simulate new order every 25 s ────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      addAutoOrder();
    }, 25000);
    return () => clearInterval(interval);
  }, [addAutoOrder]);

  // ── Track unseen new orders (badge on Feed tab) ──────────────────────────────
  const newOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'new').length,
    [orders]
  );
  useEffect(() => {
    const prev = prevNewCountRef.current;
    if (newOrdersCount > prev && tab !== 'feed') {
      setUnseenNew((n) => n + (newOrdersCount - prev));
    }
    prevNewCountRef.current = newOrdersCount;
  }, [newOrdersCount, tab]);

  // Clear badge when dispatcher opens Feed tab
  useEffect(() => {
    if (tab === 'feed') setUnseenNew(0);
  }, [tab]);

  // ── Derived state ────────────────────────────────────────────────────────────
  const ordersInProgress = useMemo(
    () => orders.filter((o) => o.status !== 'new' && o.status !== 'delivered' && o.status !== 'cancelled'),
    [orders]
  );

  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const today = orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
    const delivered = today.filter((o) => o.status === 'delivered');
    const earnings = delivered.reduce((s, o) => s + (isFinite(o.payment) ? o.payment : 0), 0);

    let avgTimeMin: number | null = null;
    if (delivered.length > 0) {
      const total = delivered.reduce((sum, o) => {
        const mins = o.deliveredAt && o.acceptedAt
          ? (o.deliveredAt - o.acceptedAt) / 60000
          : o.estimatedTimeMin;
        return sum + (isFinite(mins) ? mins : 0);
      }, 0);
      avgTimeMin = Math.round(total / delivered.length);
    }

    // "Зависшие" — курьер >15 мин ждёт у ресторана или едет к нему
    const stuckOrders = ordersInProgress.filter((o) => {
      if (o.status !== 'at_restaurant' && o.status !== 'going_to_restaurant') return false;
      const waitMin = (Date.now() - (o.acceptedAt ?? o.createdAt)) / 60000;
      return waitMin > 15;
    }).length;

    return {
      newCount:     newOrdersCount,
      activeCount:  ordersInProgress.length,
      onlineCount:  onlineCouriers.size,
      todayCount:   today.length,
      earnings,
      avgTimeMin,
      stuckOrders,
    };
  }, [orders, onlineCouriers, ordersInProgress, newOrdersCount]);

  const allActiveOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled')
        .sort((a, b) => b.createdAt - a.createdAt),
    [orders]
  );

  const onlineList = mockCouriers.filter((c) => onlineCouriers.has(c.id));

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLogout = () =>
    Alert.alert('Выйти?', 'Завершить смену диспетчера', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: logout },
    ]);

  const handleAssign = (orderId: string, courier: Courier) => {
    // Проверить: курьер всё ещё онлайн
    if (!onlineCouriers.has(courier.id)) {
      Alert.alert('Ошибка', `${courier.name} только что ушёл офлайн`);
      return;
    }
    Alert.alert('Назначить курьера?', `${courier.name} получит заказ`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Назначить',
        onPress: () => {
          // Атомарное принятие: возвращает false если заказ уже не 'new'
          const ok = acceptOrder(orderId, courier.id);
          if (!ok) {
            Alert.alert('Поздно', 'Этот заказ уже принят или отменён');
            return;
          }
          Alert.alert('Назначено ✓', `${courier.name} получил заказ`);
        },
      },
    ]);
  };

  const handleReassign = (orderId: string, courier: Courier) => {
    if (!onlineCouriers.has(courier.id)) {
      Alert.alert('Ошибка', `${courier.name} сейчас офлайн`);
      return;
    }
    Alert.alert('Переназначить?', `Передать заказ: ${courier.name}`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Переназначить',
        onPress: () => {
          setOrderCourierId(orderId, courier.id);
          Alert.alert('Готово ✓', `Заказ передан ${courier.name}`);
        },
      },
    ]);
  };

  const handleDecline = (orderId: string) => {
    Alert.alert(
      'Отклонить заказ?',
      'Заказ будет отменён. Это действие необратимо.',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Отклонить',
          style: 'destructive',
          onPress: () => {
            const ok = declineOrder(orderId);
            if (!ok) Alert.alert('Нельзя отклонить', 'Заказ уже в работе у курьера');
          },
        },
      ]
    );
  };

  const toggleOnline = (id: string) => {
    setOnlineCouriers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenDetail = (id: string) =>
    navigation.navigate('DispatcherOrderDetail', { orderId: id });

  /* ── RENDER ────────────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── BURGUNDY HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.appLabel}>
              <Text style={styles.appBold}>Click</Text>
              <Text style={styles.appThin}> · в одно касание</Text>
            </Text>
            <Text style={styles.brandSub}>Диспетчерская</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
          <Pressable onPress={handleLogout} hitSlop={12} style={{ marginLeft: spacing.md }}>
            <Text style={styles.logoutBtn}>Выйти</Text>
          </Pressable>
        </View>

        {/* Stat chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsBand}>
          <StatChip label="Новые"    value={`${stats.newCount}`}                    accent="#FF6B8A" pulse={stats.newCount > 0} />
          <StatChip label="В работе" value={`${stats.activeCount}`}                 accent="#60AFFF" />
          <StatChip label="Курьеры"  value={`${stats.onlineCount}/${mockCouriers.length}`} accent="#4ADE80" />
          <StatChip label="Оборот"   value={`${stats.earnings} ₽`}                 accent="#FCD34D" />
          <StatChip label="Заказов"  value={`${stats.todayCount}`}                  accent="#C4B5FD" />
          {stats.avgTimeMin !== null
            ? <StatChip label="Ср. время" value={`${stats.avgTimeMin} мин`} accent="#34D399" />
            : null}
          {stats.stuckOrders > 0
            ? <StatChip label="🚨 Зависли" value={`${stats.stuckOrders}`} accent={colors.danger} pulse />
            : null}
        </ScrollView>
      </View>

      {/* ── WARM WHITE AREA ── */}
      <View style={styles.whiteArea}>
        {/* TABS */}
        <View style={styles.tabsRow}>
          <TabBtn
            label="Лента"
            active={tab === 'feed'}
            onPress={() => setTab('feed')}
            badge={unseenNew}
          />
          <TabBtn
            label={`Заказы ${allActiveOrders.length}`}
            active={tab === 'orders'}
            onPress={() => setTab('orders')}
          />
          <TabBtn
            label={`Курьеры ${mockCouriers.length}`}
            active={tab === 'couriers'}
            onPress={() => setTab('couriers')}
          />
          <TabBtn label="Карта" active={tab === 'map'} onPress={() => setTab('map')} />
          <TabBtn
            label="Клиенты"
            active={false}
            onPress={() => navigation.navigate('Clients')}
          />
        </View>

        {/* CONTENT */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {tab === 'feed' ? (
            <FeedTab
              orders={allActiveOrders}
              onlineCouriers={onlineList}
              ordersInProgress={ordersInProgress}
              onAssign={handleAssign}
              onReassign={handleReassign}
              onDecline={handleDecline}
              onOpenDetail={handleOpenDetail}
              onSelect={(id) => { setActiveOrderId(id); setTab('map'); }}
            />
          ) : tab === 'orders' ? (
            <OrdersTab
              orders={orders.sort((a, b) => b.createdAt - a.createdAt)}
              onOpenDetail={handleOpenDetail}
            />
          ) : tab === 'couriers' ? (
            <CouriersTab
              couriers={mockCouriers}
              onlineCouriers={onlineCouriers}
              onToggle={toggleOnline}
              ordersInProgress={ordersInProgress}
            />
          ) : (
            <MapTab
              allOrders={allActiveOrders}
              mappedCouriers={mockCouriers.map((c) => ({
                courier: c,
                online: onlineCouriers.has(c.id),
                coordinate: courierLocations[c.id] ?? { latitude: 42.98, longitude: 47.5 },
              }))}
              selectedId={activeOrderId}
              onSelect={setActiveOrderId}
              onOpenDetail={handleOpenDetail}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

/* ─────────────────────────────── FEED TAB ──────────────────────────────────── */

const FeedTab: React.FC<{
  orders: Order[];
  onlineCouriers: Courier[];
  ordersInProgress: Order[];
  onAssign: (orderId: string, courier: Courier) => void;
  onReassign: (orderId: string, courier: Courier) => void;
  onDecline: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onSelect: (id: string) => void;
}> = ({ orders, onlineCouriers, ordersInProgress, onAssign, onReassign, onDecline, onOpenDetail, onSelect }) => {
  const [search, setSearch] = useState('');

  const q = search.toLowerCase().trim();
  const filtered = q === '' ? orders : orders.filter(
    (o) =>
      o.number.toLowerCase().includes(q) ||
      o.restaurant.name.toLowerCase().includes(q) ||
      o.client.name.toLowerCase().includes(q) ||
      o.client.address.toLowerCase().includes(q)
  );

  const newOrders = filtered
    .filter((o) => o.status === 'new')
    .sort((a, b) => urgencyScore(b) - urgencyScore(a)); // самые ждущие — первыми

  const inWork = filtered.filter((o) => o.status !== 'new');

  return (
    <View>
      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по заказу, ресторану, клиенту..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {newOrders.length > 0 ? (
        <>
          <SectionHeader title="НОВЫЕ ЗАКАЗЫ" count={newOrders.length} accent={colors.primary} />
          {newOrders.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              onlineCouriers={onlineCouriers}
              ordersInProgress={ordersInProgress}
              onAssign={(c) => onAssign(o.id, c)}
              onReassign={(c) => onReassign(o.id, c)}
              onDecline={() => onDecline(o.id)}
              onOpenDetail={() => onOpenDetail(o.id)}
              onMap={() => onSelect(o.id)}
            />
          ))}
        </>
      ) : null}

      {inWork.length > 0 ? (
        <>
          <SectionHeader title="В РАБОТЕ" count={inWork.length} accent={colors.blue} />
          {inWork.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              onlineCouriers={onlineCouriers}
              ordersInProgress={ordersInProgress}
              onAssign={(c) => onAssign(o.id, c)}
              onReassign={(c) => onReassign(o.id, c)}
              onDecline={() => onDecline(o.id)}
              onOpenDetail={() => onOpenDetail(o.id)}
              onMap={() => onSelect(o.id)}
            />
          ))}
        </>
      ) : null}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{q ? '🔍' : '📭'}</Text>
          <Text style={styles.emptyTitle}>{q ? 'Ничего не найдено' : 'Заказов нет'}</Text>
          <Text style={styles.emptyCaption}>
            {q ? 'Попробуйте другой запрос' : 'Все заказы выполнены или отменены'}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

/* ────────────────────────────── ORDERS TAB ─────────────────────────────────── */

const FILTER_CHIPS = [
  { key: 'all',        label: 'Все' },
  { key: 'new',        label: 'Новые' },
  { key: 'inprogress', label: 'В работе' },
  { key: 'delivered',  label: 'Доставлены' },
  { key: 'cancelled',  label: 'Отменены' },
];

const OrdersTab: React.FC<{
  orders: Order[];
  onOpenDetail: (id: string) => void;
}> = ({ orders, onOpenDetail }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredByStatus =
    statusFilter === 'all'        ? orders
    : statusFilter === 'new'       ? orders.filter((o) => o.status === 'new')
    : statusFilter === 'inprogress'? orders.filter((o) => !['new', 'delivered', 'cancelled'].includes(o.status))
    : orders.filter((o) => o.status === statusFilter);

  const q = search.toLowerCase().trim();
  const filteredAll = q === '' ? filteredByStatus : filteredByStatus.filter(
    (o) =>
      o.number.toLowerCase().includes(q) ||
      o.restaurant.name.toLowerCase().includes(q) ||
      o.client.name.toLowerCase().includes(q) ||
      o.client.address.toLowerCase().includes(q)
  );

  // Sort: urgent new orders first, then recency
  const sorted = [...filteredAll].sort((a, b) => {
    const sa = urgencyScore(a);
    const sb = urgencyScore(b);
    if (sa !== sb) return sb - sa;
    return b.createdAt - a.createdAt;
  });

  return (
    <View>
      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по номеру, ресторану, клиенту..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <SectionHeader title="ВСЕ ЗАКАЗЫ" count={sorted.length} accent={colors.text} />

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsContent}
        style={styles.filterChipsScroll}
      >
        {FILTER_CHIPS.map((chip) => {
          const active = statusFilter === chip.key;
          return (
            <Pressable
              key={chip.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(chip.key)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {sorted.map((o) => {
        const waitLabel = getWaitLabel(o);
        const borderColor = getUrgencyBorder(o);
        return (
          <Pressable
            key={o.id}
            onPress={() => onOpenDetail(o.id)}
            style={[
              styles.allOrderRow,
              o.status === 'new' && { borderColor, borderWidth: 1.5 },
            ]}
          >
            <View style={[styles.allOrderDot, { backgroundColor: stageColor[o.status] ?? colors.bg3 }]} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={styles.allOrderHead}>
                <Text style={styles.allOrderNumber}>{o.number}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {waitLabel ? (
                    <Text style={[styles.allOrderWait, { color: borderColor }]}>
                      ⏱ {waitLabel}
                    </Text>
                  ) : null}
                  <Text style={styles.allOrderStatus}>{stageByStatus[o.status] ?? '—'}</Text>
                </View>
              </View>
              <Text style={styles.allOrderAddr} numberOfLines={1}>
                {o.restaurant.name} → {o.client.address}
              </Text>
              <View style={styles.allOrderFooter}>
                <Text style={styles.allOrderPay}>{o.payment} ₽</Text>
                <Text style={styles.allOrderDist}>{o.distanceKm} км</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.allOrderArrow}>→</Text>
              </View>
            </View>
          </Pressable>
        );
      })}

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Нет заказов</Text>
          <Text style={styles.emptyCaption}>По выбранному фильтру ничего нет</Text>
        </View>
      ) : null}
    </View>
  );
};

/* ─────────────────────────────── COURIERS TAB ──────────────────────────────── */

const CouriersTab: React.FC<{
  couriers: Courier[];
  onlineCouriers: Set<string>;
  ordersInProgress: Order[];
  onToggle: (id: string) => void;
}> = ({ couriers, onlineCouriers, ordersInProgress, onToggle }) => (
  <View>
    <SectionHeader title="КУРЬЕРЫ" count={couriers.length} accent={colors.green} />
    {couriers.map((c) => (
      <CourierRow
        key={c.id}
        courier={c}
        online={onlineCouriers.has(c.id)}
        ordersAssigned={ordersInProgress.filter((o) => o.courierId === c.id).length}
        onToggle={() => onToggle(c.id)}
      />
    ))}
  </View>
);

/* ──────────────────────────────── MAP TAB ──────────────────────────────────── */

const MapTab: React.FC<{
  allOrders: Order[];
  mappedCouriers: MappedCourier[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenDetail: (id: string) => void;
}> = ({ allOrders, mappedCouriers, selectedId, onSelect, onOpenDetail }) => {
  const onlineCount = mappedCouriers.filter((c) => c.online).length;
  return (
    <View>
      <SectionHeader title="ЖИВАЯ КАРТА" count={allOrders.length} accent={colors.blue} />

      <View style={styles.mapBox}>
        <DispatcherMap
          orders={allOrders}
          couriers={mappedCouriers}
          selectedOrderId={selectedId}
          onOrderPress={onSelect}
          onCourierPress={() => undefined}
        />
        <View style={styles.legendOverlay}>
          {[
            { color: colors.amber, label: 'Ресторан' },
            { color: colors.green, label: 'Клиент' },
            { color: colors.blue,  label: `Курьер · ${onlineCount}/${mappedCouriers.length}` },
          ].map((item) => (
            <View key={item.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {selectedId ? (
        <Pressable onPress={() => onSelect(null)} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>× СНЯТЬ ВЫБОР</Text>
        </Pressable>
      ) : null}

      {allOrders.length > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm }}>
            Активные заказы
          </Text>
          {allOrders.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => onSelect(o.id)}
              onLongPress={() => onOpenDetail(o.id)}
              style={[styles.mapPick, selectedId === o.id && styles.mapPickActive]}
            >
              <View style={[styles.mapPickDot, { backgroundColor: stageColor[o.status] ?? colors.bg3 }]} />
              <Text style={styles.mapPickNumber}>{o.number}</Text>
              <Text style={styles.mapPickAddr} numberOfLines={1}>{o.client.address}</Text>
              <Text style={styles.mapPickPay}>{o.payment} ₽</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

/* ──────────────────────────── ORDER ROW ────────────────────────────────────── */

type RankedCourier = { courier: Courier; dist: number; active: number };

const CourierPickerList: React.FC<{
  onlineCouriers: Courier[];
  ordersInProgress: Order[];
  restaurantCoords: { latitude: number; longitude: number };
  title: string;
  onPick: (c: Courier) => void;
  onClose: () => void;
}> = ({ onlineCouriers, ordersInProgress, restaurantCoords, title, onPick, onClose }) => {
  const ranked: RankedCourier[] = useMemo(() => {
    return onlineCouriers
      .map((c) => {
        const loc = courierLocations[c.id] ?? { latitude: 42.98, longitude: 47.5 };
        const dist = haversineKm(loc, restaurantCoords);
        const active = ordersInProgress.filter((o) => o.courierId === c.id).length;
        return { courier: c, dist, active };
      })
      .sort((a, b) => a.active !== b.active ? a.active - b.active : a.dist - b.dist);
  }, [onlineCouriers, ordersInProgress, restaurantCoords]);

  return (
    <View style={orderStyles.pickerBox}>
      <Text style={orderStyles.pickerTitle}>{title}</Text>
      {onlineCouriers.length === 0 ? (
        <Text style={orderStyles.pickerEmpty}>
          Нет онлайн-курьеров — включите в вкладке «Курьеры»
        </Text>
      ) : (
        ranked.map(({ courier: c, dist, active }, idx) => {
          const maxLoad = MAX_LOAD[c.transport];
          const overloaded = active >= maxLoad;
          return (
            <Pressable
              key={c.id}
              style={[orderStyles.pickerItem, overloaded && orderStyles.pickerItemWarn]}
              onPress={() => onPick(c)}
            >
              <Text style={orderStyles.pickerEmoji}>{transportEmoji[c.transport]}</Text>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={orderStyles.pickerName}>{c.name}</Text>
                  {idx === 0 && !overloaded ? (
                    <View style={orderStyles.recoBadge}>
                      <Text style={orderStyles.recoBadgeText}>⭐ РЕКОМЕНДУЕМ</Text>
                    </View>
                  ) : null}
                  {overloaded ? (
                    <View style={orderStyles.warnBadge}>
                      <Text style={orderStyles.warnBadgeText}>ПЕРЕГРУЖЕН</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={orderStyles.pickerSub}>
                  ★ {c.rating.toFixed(1)} · {dist.toFixed(1)} км до рест. · {active}/{maxLoad} зак.
                </Text>
              </View>
              <Text style={[orderStyles.pickerArrow, overloaded && { color: colors.amber }]}>→</Text>
            </Pressable>
          );
        })
      )}
      <Pressable onPress={onClose}>
        <Text style={orderStyles.pickerCancel}>Отмена</Text>
      </Pressable>
    </View>
  );
};

// Use React.memo to prevent re-render on every order list scroll
const OrderRow = React.memo<{
  order: Order;
  onlineCouriers: Courier[];
  ordersInProgress: Order[];
  onAssign: (c: Courier) => void;
  onReassign: (c: Courier) => void;
  onDecline: () => void;
  onOpenDetail: () => void;
  onMap: () => void;
}>(({ order, onlineCouriers, ordersInProgress, onAssign, onReassign, onDecline, onOpenDetail, onMap }) => {
  const [picking, setPicking] = useState(false);
  const isNew = order.status === 'new';
  const borderColor = getUrgencyBorder(order);
  const bgColor = getUrgencyBg(order);
  const waitLabel = getWaitLabel(order);
  const hasOnline = onlineCouriers.length > 0;

  return (
    <View style={[
      orderStyles.card,
      { borderColor },
      bgColor ? { backgroundColor: bgColor } : null,
      isNew && { borderWidth: 1.5 },
    ]}>
      <Pressable onPress={onOpenDetail}>
        <View style={orderStyles.head}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={orderStyles.number}>{order.number}</Text>
            <View style={[
              orderStyles.statusPill,
              { backgroundColor: (stageColor[order.status] ?? colors.bg3) + '33',
                borderColor: stageColor[order.status] ?? colors.border2 }
            ]}>
              <Text style={[orderStyles.statusText, { color: stageColor[order.status] ?? colors.text }]}>
                {stageByStatus[order.status] ?? '—'}
              </Text>
            </View>
            {waitLabel ? (
              <Text style={[orderStyles.waitTag, {
                color: borderColor === colors.danger ? colors.danger
                     : borderColor === colors.amber  ? colors.amber
                     : colors.textMuted,
              }]}>
                ⏱ {waitLabel}
              </Text>
            ) : null}
          </View>
          <Text style={orderStyles.address} numberOfLines={1}>
            {order.restaurant.name} → {order.client.address}
          </Text>
        </View>

        <View style={orderStyles.metaRow}>
          <Meta label="ОПЛАТА" value={`${order.payment} ₽`} color={colors.green} />
          <Meta label="ЧЕК"    value={`${order.total} ₽`} />
          <Meta label="ДИСТ."  value={`${order.distanceKm} км`} />
          <Meta label="~ВРЕМЯ" value={`${order.estimatedTimeMin}м`} />
        </View>

        <View style={orderStyles.contactRow}>
          <Text style={orderStyles.contactItem}>📞 {order.client.phone}</Text>
          <Text style={orderStyles.contactItem}>👤 {order.client.name}</Text>
        </View>
      </Pressable>

      {picking ? (
        <CourierPickerList
          onlineCouriers={onlineCouriers}
          ordersInProgress={ordersInProgress}
          restaurantCoords={order.restaurant.coordinates}
          title={isNew ? 'НАЗНАЧИТЬ КУРЬЕРА' : 'ПЕРЕНАЗНАЧИТЬ ЗАКАЗ'}
          onPick={(c) => { setPicking(false); if (isNew) onAssign(c); else onReassign(c); }}
          onClose={() => setPicking(false)}
        />
      ) : isNew ? (
        <View style={orderStyles.actions}>
          <Pressable style={orderStyles.btnSecondary} onPress={onDecline}>
            <Text style={orderStyles.btnSecondaryText}>✕ ОТКЛ.</Text>
          </Pressable>
          <Pressable style={orderStyles.btnSecondary} onPress={onMap}>
            <Text style={orderStyles.btnSecondaryText}>📍 КАРТА</Text>
          </Pressable>
          <Pressable
            style={[orderStyles.btnPrimary, !hasOnline && orderStyles.btnDisabled]}
            onPress={() => hasOnline ? setPicking(true) : Alert.alert('Нет курьеров', 'Включите курьеров во вкладке «Курьеры»')}
          >
            <Text style={orderStyles.btnPrimaryText}>НАЗНАЧИТЬ →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={orderStyles.actions}>
          <Pressable style={orderStyles.btnSecondary} onPress={onMap}>
            <Text style={orderStyles.btnSecondaryText}>📍 КАРТА</Text>
          </Pressable>
          <Pressable style={orderStyles.btnSecondary} onPress={onOpenDetail}>
            <Text style={orderStyles.btnSecondaryText}>→ ДЕТАЛИ</Text>
          </Pressable>
          <Pressable
            style={[orderStyles.btnReassign, !hasOnline && orderStyles.btnDisabled]}
            onPress={() => hasOnline ? setPicking(true) : Alert.alert('Нет курьеров', 'Включите курьеров во вкладке «Курьеры»')}
          >
            <Text style={orderStyles.btnReassignText}>↔ ПЕРЕНАЗ.</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

const Meta: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <View style={orderStyles.metaItem}>
    <Text style={orderStyles.metaLabel}>{label}</Text>
    <Text style={[orderStyles.metaValue, color ? { color } : null]}>{value}</Text>
  </View>
);

/* ──────────────────────────── COURIER ROW ──────────────────────────────────── */

const CourierRow: React.FC<{
  courier: Courier;
  online: boolean;
  ordersAssigned: number;
  onToggle: () => void;
}> = ({ courier, online, ordersAssigned, onToggle }) => {
  const maxLoad  = MAX_LOAD[courier.transport];
  const loadPct  = Math.min(ordersAssigned / maxLoad, 1);
  const loadColor = loadPct >= 1 ? colors.danger : loadPct >= 0.6 ? colors.amber : colors.green;

  const handleCall = () => {
    const phone = courier.phone.replace(/\s/g, '');
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Ошибка', 'Не удалось открыть телефон')
    );
  };

  return (
    <View style={[courierStyles.card, online && courierStyles.cardOnline]}>
      <View style={courierStyles.avatar}>
        <Text style={courierStyles.avatarText}>{courier.name.charAt(0)}</Text>
        <View style={[courierStyles.statusDot, { backgroundColor: online ? colors.green : colors.textMuted }]} />
      </View>

      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={courierStyles.name}>{courier.name}</Text>
        <Text style={courierStyles.phone}>{courier.phone}</Text>
        <View style={courierStyles.statsRow}>
          <Text style={courierStyles.transportTag}>{transportEmoji[courier.transport]} {courier.transport.toUpperCase()}</Text>
          <Text style={courierStyles.rating}>★ {courier.rating.toFixed(1)}</Text>
          <Text style={courierStyles.count}>{courier.totalOrders} зак.</Text>
          {ordersAssigned > 0
            ? <Text style={[courierStyles.load, { color: loadColor }]}>{ordersAssigned}/{maxLoad} активных</Text>
            : online ? <Text style={courierStyles.free}>свободен</Text> : null}
        </View>

        {/* Полоса загрузки — только если онлайн */}
        {online ? (
          <View style={courierStyles.loadBarBg}>
            <View style={[courierStyles.loadBarFill, { width: `${loadPct * 100}%` as any, backgroundColor: loadColor }]} />
          </View>
        ) : null}
      </View>

      {/* Кнопка звонка */}
      <Pressable onPress={handleCall} hitSlop={8} style={courierStyles.callBtn}>
        <Text style={courierStyles.callIcon}>📞</Text>
      </Pressable>

      <Pressable onPress={onToggle} style={courierStyles.toggle}>
        <Text style={[courierStyles.toggleText, { color: online ? colors.green : colors.textMuted }]}>
          {online ? 'НА СМЕНЕ' : 'ОФФЛАЙН'}
        </Text>
      </Pressable>
    </View>
  );
};

/* ──────────────────────────────── BITS ─────────────────────────────────────── */

const SectionHeader: React.FC<{ title: string; count: number; accent: string }> = ({ title, count, accent }) => (
  <View style={styles.sectionRow}>
    <View style={[styles.sectionDot, { backgroundColor: accent }]} />
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={{ flex: 1 }} />
    <Text style={styles.sectionCount}>{count}</Text>
  </View>
);

const StatChip: React.FC<{ label: string; value: string; accent: string; pulse?: boolean }> = ({ label, value, accent, pulse }) => (
  <View style={styles.statChip}>
    <View style={styles.statChipHead}>
      <View style={[styles.statChipDot, { backgroundColor: accent }]} />
      <Text style={styles.statChipLabel}>{label}</Text>
      {pulse ? <Text style={styles.statChipPulse}>● live</Text> : null}
    </View>
    <Text style={[styles.statChipValue, { color: accent }]}>{value}</Text>
  </View>
);

const TabBtn: React.FC<{ label: string; active: boolean; onPress: () => void; badge?: number }> = ({ label, active, onPress, badge }) => (
  <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    {badge && badge > 0 ? (
      <View style={styles.tabBadge}>
        <Text style={styles.tabBadgeText}>{badge > 9 ? '9+' : badge}</Text>
      </View>
    ) : null}
  </Pressable>
);

/* ──────────────────────────────── STYLES ───────────────────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDark },

  header: {
    backgroundColor: colors.bgDark,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 36,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appLabel: {},
  appBold: { fontFamily: fonts.sansBold, fontSize: 18, color: '#FFFFFF', letterSpacing: -0.3 },
  appThin: { fontFamily: fonts.sans, fontSize: 18, color: 'rgba(255,255,255,0.65)', letterSpacing: -0.3 },
  brandSub: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  livePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(46,139,87,0.20)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(46,139,87,0.35)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80', marginRight: 5 },
  liveLabel: { fontFamily: fonts.sansMedium, fontSize: 11, color: '#4ADE80' },
  logoutBtn: { fontFamily: fonts.sansMedium, fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  statsBand: { gap: spacing.sm },
  statChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: 100,
  },
  statChipHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statChipDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statChipLabel: { fontFamily: fonts.sans, fontSize: 11, color: 'rgba(255,255,255,0.60)', flex: 1 },
  statChipPulse: { fontFamily: fonts.sans, fontSize: 10, color: '#FF6B8A' },
  statChipValue: { fontFamily: fonts.sansBold, fontSize: 20, letterSpacing: -0.4 },

  whiteArea: {
    flex: 1, backgroundColor: colors.bg,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -24, overflow: 'hidden',
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
    gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 9,
    backgroundColor: colors.bg2, borderRadius: radii.lg, alignItems: 'center',
    position: 'relative',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.textSecondary },
  tabTextActive: { color: '#FFFFFF', fontFamily: fonts.sansSemiBold },
  tabBadge: {
    position: 'absolute', top: -4, right: 2,
    backgroundColor: colors.danger, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: '#fff' },

  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl },

  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  sectionTitle: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.text },
  sectionCount: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.textMuted },

  empty: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.textMuted },
  emptyCaption: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg2, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, marginBottom: spacing.md, height: 44,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.text, paddingVertical: 0 },

  filterChipsScroll: { marginBottom: spacing.md, marginHorizontal: -spacing.lg },
  filterChipsContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radii.pill, backgroundColor: colors.bg2,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primaryFaint, borderColor: colors.primary },
  filterChipText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textSecondary },
  filterChipTextActive: { color: colors.primary, fontFamily: fonts.sansSemiBold },

  allOrderRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, padding: spacing.md,
    borderRadius: radii.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  allOrderDot: { width: 10, height: 10, borderRadius: 5 },
  allOrderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  allOrderNumber: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.text },
  allOrderWait: { fontFamily: fonts.sansMedium, fontSize: 10 },
  allOrderStatus: { fontFamily: fonts.sansMedium, fontSize: 10, color: colors.textMuted },
  allOrderAddr: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  allOrderFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.sm },
  allOrderPay: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.green },
  allOrderDist: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted },
  allOrderArrow: { fontFamily: fonts.sans, fontSize: 18, color: colors.primary },

  mapBox: {
    height: 380, backgroundColor: colors.bg2, borderRadius: radii.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border, position: 'relative',
  },
  legendOverlay: {
    position: 'absolute', bottom: spacing.sm, left: spacing.sm,
    backgroundColor: 'rgba(28,20,16,0.85)',
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.md,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontFamily: fonts.sans, fontSize: 11, color: '#FFFFFF' },
  clearBtn: { alignSelf: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: 6 },
  clearBtnText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textMuted },
  mapPick: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg2,
    padding: spacing.sm, borderRadius: radii.lg, marginBottom: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  mapPickActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  mapPickDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  mapPickNumber: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.text, marginRight: 8 },
  mapPickAddr: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary, flex: 1 },
  mapPickPay: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.green, marginLeft: 6 },
});

const orderStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg, borderRadius: radii.xl,
    padding: spacing.md, marginBottom: spacing.md,
    shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  head: { marginBottom: spacing.md },
  number: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.text, letterSpacing: -0.3 },
  address: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill, borderWidth: 1 },
  statusText: { fontFamily: fonts.sansMedium, fontSize: 10 },
  waitTag: { fontFamily: fonts.sansMedium, fontSize: 10 },
  metaRow: {
    flexDirection: 'row', backgroundColor: colors.bg2,
    borderRadius: radii.lg, paddingVertical: spacing.sm, marginBottom: spacing.sm,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  metaValue: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.text },
  contactRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  contactItem: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: 6 },
  btnSecondary: {
    flex: 1, paddingVertical: 10, borderRadius: radii.lg,
    backgroundColor: colors.bg2, alignItems: 'center',
  },
  btnSecondaryText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.textSecondary },
  btnPrimary: {
    flex: 2, paddingVertical: 10, borderRadius: radii.lg,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  btnPrimaryText: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: '#ffffff' },
  btnReassign: {
    flex: 1, paddingVertical: 10, borderRadius: radii.lg,
    backgroundColor: colors.bg3, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border2,
  },
  btnReassignText: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.textSecondary },
  btnDisabled: { opacity: 0.4 },
  pickerBox: {
    backgroundColor: colors.bg2, borderRadius: radii.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  pickerTitle: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm, letterSpacing: 0.5 },
  pickerEmpty: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  pickerItemWarn: { backgroundColor: colors.amberFaint },
  pickerEmoji: { fontSize: 22 },
  pickerName: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text },
  pickerSub: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  pickerArrow: { fontFamily: fonts.sans, fontSize: 18, color: colors.primary },
  pickerCancel: {
    fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textMuted,
    textAlign: 'center', marginTop: spacing.md,
  },
  recoBadge: {
    backgroundColor: colors.amberFaint, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.amber,
  },
  recoBadgeText: { fontFamily: fonts.sansMedium, fontSize: 9, color: colors.amber, letterSpacing: 0.3 },
  warnBadge: {
    backgroundColor: colors.dangerFaint, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radii.pill, borderWidth: 1, borderColor: colors.danger,
  },
  warnBadgeText: { fontFamily: fonts.sansMedium, fontSize: 9, color: colors.danger, letterSpacing: 0.3 },
});

const courierStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, padding: spacing.md,
    borderRadius: radii.xl, marginBottom: spacing.sm,
    shadowColor: colors.shadow, shadowOpacity: 0.07, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  cardOnline: { borderColor: 'rgba(22,163,74,0.30)' },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 18, color: '#ffffff' },
  statusDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: colors.bg,
  },
  name: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.text },
  phone: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.sm, flexWrap: 'wrap' },
  transportTag: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.textSecondary },
  rating: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.amber },
  count: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted },
  load: { fontFamily: fonts.sansMedium, fontSize: 11 },
  free: { fontFamily: fonts.sansMedium, fontSize: 11, color: colors.green },
  loadBarBg: {
    height: 4, backgroundColor: colors.bg3,
    borderRadius: 2, marginTop: 6, overflow: 'hidden',
  },
  loadBarFill: { height: 4, borderRadius: 2 },
  callBtn: { paddingHorizontal: 6, paddingVertical: 8, marginRight: 4 },
  callIcon: { fontSize: 18 },
  toggle: { paddingHorizontal: 8, paddingVertical: 8 },
  toggleText: { fontFamily: fonts.sansSemiBold, fontSize: 11 },
});

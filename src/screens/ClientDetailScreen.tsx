import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  Linking,
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
import { useClientsStore } from '../store/clientsStore';
import { ClientTag, Order } from '../types';
import type { NavigationProp, RouteProp } from '@react-navigation/native';

interface Props {
  navigation: NavigationProp<any>;
  route: RouteProp<{ ClientDetail: { phone: string } }, 'ClientDetail'>;
}

const TAG_LABELS: Record<ClientTag, string> = {
  vip:       '⭐ VIP',
  frequent:  '🔥 Частый',
  new:       '🆕 Новый',
  returning: '↩ Вернулся',
  lost:      '💔 Потерян',
};

const AVATAR_COLORS = [
  '#6E1222', '#2563EB', '#16A34A', '#D97706',
  '#7C3AED', '#0891B2', '#C03030', '#4B5563',
];

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function fmtMoney(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

// Detect the most repeated item set for "repeat order" CTA
function findFavItems(orders: Order[]): string | null {
  const delivered = orders.filter((o) => o.status === 'delivered');
  if (delivered.length < 2) return null;

  const signatures = new Map<string, number>();
  delivered.forEach((order) => {
    const sig = order.items.map((i) => `${i.name}×${i.quantity}`).join(', ');
    signatures.set(sig, (signatures.get(sig) ?? 0) + 1);
  });

  let best: [string, number] = ['', 0];
  signatures.forEach((count, sig) => {
    if (count > best[1]) best = [sig, count];
  });

  return best[1] >= 2 ? `${best[0]} — ${best[1]} раза` : null;
}

const statusLabel: Partial<Record<Order['status'], string>> = {
  delivered: '✓ Доставлен',
  cancelled: '✗ Отменён',
  new:                 'Новый',
  going_to_restaurant: 'Едет в ресторан',
  at_restaurant:       'В ресторане',
  picked_up:           'В пути',
  going_to_client:     'К клиенту',
  at_client:           'У клиента',
};

const statusColor: Partial<Record<Order['status'], string>> = {
  delivered: colors.green,
  cancelled: colors.danger,
};

export const ClientDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phone } = route.params;
  const orders = useOrdersStore((s) => s.orders);
  const { getByPhone, buildFromOrders } = useClientsStore();

  // Ensure profiles are built
  useEffect(() => {
    buildFromOrders(orders);
  }, [orders, buildFromOrders]);

  const client = getByPhone(phone);

  const clientOrders = useMemo(
    () =>
      orders
        .filter((o) => o.client.phone === phone)
        .sort((a, b) => b.createdAt - a.createdAt),
    [orders, phone]
  );

  const favItems = useMemo(() => findFavItems(clientOrders), [clientOrders]);

  if (!client) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Клиент не найден</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Назад</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const callClient = () =>
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() =>
      Alert.alert('Не удалось открыть номер')
    );

  const handleRepeat = () => {
    Alert.alert(
      'Повторный заказ',
      `Создать заказ для ${client.name} из ${client.favoriteRestaurants[0]?.name ?? 'любимого ресторана'}?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Создать', onPress: () => Alert.alert('Готово', 'Заказ добавлен в ленту диспетчера') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerBack}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <Text style={styles.headerBackText}>← Клиенты</Text>
        </Pressable>

        <View style={styles.headerProfile}>
          <View style={[styles.avatar, { backgroundColor: avatarColor(client.name) }]}>
            <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{client.name}</Text>
            <Pressable onPress={callClient}>
              <Text style={styles.headerPhone}>{client.phone} 📞</Text>
            </Pressable>
            {client.tags.length > 0 && (
              <View style={styles.headerTags}>
                {client.tags.map((tag) => (
                  <View key={tag} style={styles.headerTag}>
                    <Text style={styles.headerTagText}>{TAG_LABELS[tag]}</Text>
                  </View>
                ))}
                <View style={styles.headerTag}>
                  <Text style={styles.headerTagText}>
                    С нами с {fmtDate(client.firstOrderAt)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats 2×2 ── */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCell icon="📦" label="Всего заказов" value={String(client.totalOrders)} accent={colors.primary} />
            <View style={styles.statsGridDivV} />
            <StatCell icon="💰" label="Потрачено" value={fmtMoney(client.totalSpent)} accent={colors.green} />
          </View>
          <View style={styles.statsGridDivH} />
          <View style={styles.statsRow}>
            <StatCell icon="🧾" label="Средний чек" value={fmtMoney(client.avgOrderValue)} />
            <View style={styles.statsGridDivV} />
            <StatCell
              icon="📅"
              label="Последний заказ"
              value={fmtDate(client.lastOrderAt)}
              small
            />
          </View>
        </View>

        {/* ── Repeat CTA ── */}
        {favItems && (
          <View style={styles.repeatBanner}>
            <Text style={styles.repeatIcon}>🔁</Text>
            <View style={styles.repeatBody}>
              <Text style={styles.repeatTitle}>Любимый заказ</Text>
              <Text style={styles.repeatSub} numberOfLines={2}>{favItems}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.repeatBtn, pressed && { opacity: 0.85 }]}
              onPress={handleRepeat}
            >
              <Text style={styles.repeatBtnText}>Повторить</Text>
            </Pressable>
          </View>
        )}

        {/* ── Favourite restaurants ── */}
        {client.favoriteRestaurants.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>☕ Любимые рестораны</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.restRow}
            >
              {client.favoriteRestaurants.map((r) => (
                <View key={r.id} style={styles.restChip}>
                  <Text style={styles.restEmoji}>🍽</Text>
                  <Text style={styles.restName} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.restCount}>{r.orderCount} зак.</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Addresses ── */}
        {client.addresses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📍 Адреса доставки</Text>
            {client.addresses.map((addr, idx) => (
              <View key={idx} style={styles.addrCard}>
                <Text style={styles.addrIcon}>{idx === 0 ? '🏠' : '📌'}</Text>
                <View style={styles.addrBody}>
                  <Text style={styles.addrStreet}>{addr.address}</Text>
                  {addr.apartment ? (
                    <Text style={styles.addrApt}>кв. {addr.apartment}</Text>
                  ) : null}
                  {addr.comment ? (
                    <Text style={styles.addrComment}>💬 {addr.comment}</Text>
                  ) : null}
                </View>
                <View style={styles.addrCount}>
                  <Text style={styles.addrCountNum}>{addr.useCount}</Text>
                  <Text style={styles.addrCountLabel}>раз</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Order history ── */}
        <Text style={styles.sectionTitle}>История заказов · {clientOrders.length}</Text>
        {clientOrders.map((order) => (
          <Pressable
            key={order.id}
            style={({ pressed }) => [styles.orderRow, pressed && { opacity: 0.85 }]}
            onPress={() => navigation.navigate('DispatcherOrderDetail', { orderId: order.id })}
          >
            <View
              style={[
                styles.orderDot,
                { backgroundColor: statusColor[order.status] ?? colors.amber },
              ]}
            />
            <View style={styles.orderBody}>
              <Text style={styles.orderNum}>
                #{order.number} · {order.restaurant.name}
              </Text>
              <Text style={styles.orderItems} numberOfLines={1}>
                {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
              </Text>
              <Text style={styles.orderDate}>{fmtDateTime(order.createdAt)}</Text>
            </View>
            <View style={styles.orderRight}>
              <Text style={styles.orderSum}>{fmtMoney(order.total)}</Text>
              <Text
                style={[
                  styles.orderStatus,
                  { color: statusColor[order.status] ?? colors.textMuted },
                ]}
              >
                {statusLabel[order.status] ?? order.status}
              </Text>
            </View>
          </Pressable>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ── Sub-components ── */
const StatCell: React.FC<{
  icon: string; label: string; value: string; accent?: string; small?: boolean;
}> = ({ icon, label, value, accent, small }) => (
  <View style={styles.statCell}>
    <Text style={styles.statCellIcon}>{icon}</Text>
    <Text style={styles.statCellLabel}>{label}</Text>
    <Text style={[styles.statCellValue, accent ? { color: accent } : null, small ? { fontSize: 14 } : null]}>
      {value}
    </Text>
  </View>
);

/* ── Styles ── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDark },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorText: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.text },
  backBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  backBtnText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.primary },

  header: {
    backgroundColor: colors.bgDark,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  headerBack: { marginBottom: spacing.md },
  headerBackText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerProfile: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.20)',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerPhone: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
    marginTop: 3,
  },
  headerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  headerTag: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerTagText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },

  body: { flex: 1, backgroundColor: colors.bg },
  bodyContent: { padding: spacing.md },

  statsGrid: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  statsRow: { flexDirection: 'row' },
  statsGridDivH: { height: 1, backgroundColor: colors.divider },
  statsGridDivV: { width: 1, backgroundColor: colors.divider },
  statCell: { flex: 1, padding: spacing.md, gap: 2 },
  statCellIcon: { fontSize: 16, marginBottom: 2 },
  statCellLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCellValue: {
    fontFamily: fonts.sansBold,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },

  repeatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaint,
    borderWidth: 1.5,
    borderColor: 'rgba(110,18,34,0.18)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  repeatIcon: { fontSize: 24, flexShrink: 0 },
  repeatBody: { flex: 1 },
  repeatTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  repeatSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  repeatBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    flexShrink: 0,
  },
  repeatBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  restRow: { gap: 8, paddingBottom: spacing.sm },
  restChip: {
    backgroundColor: colors.bg2,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 90,
  },
  restEmoji: { fontSize: 22, marginBottom: 4 },
  restName: { fontFamily: fonts.sansSemiBold, fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center' },
  restCount: { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted, marginTop: 1 },

  addrCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bg2,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
    gap: spacing.sm,
  },
  addrIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  addrBody: { flex: 1 },
  addrStreet: { fontFamily: fonts.sansSemiBold, fontSize: 13, fontWeight: '600', color: colors.text },
  addrApt: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  addrComment: { fontFamily: fonts.sans, fontSize: 11, color: colors.amber, marginTop: 3 },
  addrCount: { alignItems: 'center', flexShrink: 0 },
  addrCountNum: { fontFamily: fonts.sansBold, fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  addrCountLabel: { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted },

  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
    gap: spacing.sm,
  },
  orderDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  orderBody: { flex: 1, minWidth: 0 },
  orderNum: { fontFamily: fonts.sansSemiBold, fontSize: 13, fontWeight: '600', color: colors.text },
  orderItems: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  orderDate: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', flexShrink: 0 },
  orderSum: { fontFamily: fonts.sansBold, fontSize: 14, fontWeight: '700', color: colors.text },
  orderStatus: { fontFamily: fonts.sansSemiBold, fontSize: 10, fontWeight: '600', marginTop: 2 },
});

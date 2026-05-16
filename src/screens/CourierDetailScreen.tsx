import React, { useMemo } from 'react';
import {
  Linking,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { fonts, radii, spacing } from '../theme/typography';
import { mockCouriers } from '../data/mockCouriers';
import { useOrdersStore } from '../store/ordersStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CourierDetail'>;

const transportLabel = { foot: '🚶 Пешком', bike: '🚴 Велосипед', car: '🚗 Авто' } as const;

const statusLabels: Record<string, string> = {
  new: 'Новый',
  going_to_restaurant: 'К ресторану',
  at_restaurant: 'Забирает',
  picked_up: 'В пути',
  going_to_client: 'К клиенту',
  at_client: 'У клиента',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};
const statusColors: Record<string, string> = {
  delivered: colors.green,
  cancelled: colors.danger,
  new: colors.primary,
};

function fmt(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const CourierDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { courierId } = route.params;
  const courier = mockCouriers.find((c) => c.id === courierId);
  const orders = useOrdersStore((s) => s.orders);

  const courierOrders = useMemo(
    () => orders
      .filter((o) => o.courierId === courierId)
      .sort((a, b) => b.createdAt - a.createdAt),
    [orders, courierId]
  );

  const delivered = courierOrders.filter((o) => o.status === 'delivered');
  const thisMonth = useMemo(() => {
    const now = new Date();
    return delivered.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [delivered]);

  if (!courier) {
    return (
      <SafeAreaView style={st.safe}>
        <Text style={{ color: colors.text, padding: spacing.xl }}>Курьер не найден</Text>
      </SafeAreaView>
    );
  }

  const handleCall = () => {
    Linking.openURL(`tel:${courier.phone.replace(/\s/g, '')}`).catch(() =>
      Alert.alert('Ошибка', 'Не удалось открыть телефон')
    );
  };

  const recentOrders = courierOrders.slice(0, 15);

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={st.backBtn}>
          <Text style={st.backText}>← Назад</Text>
        </Pressable>
        <Text style={st.headerTitle}>Профиль курьера</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={st.body} showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={st.avatarSection}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{courier.name.charAt(0)}</Text>
          </View>
          <Text style={st.name}>{courier.fullName ?? courier.name}</Text>
          <Text style={st.phone}>{courier.phone}</Text>
          <View style={st.tagRow}>
            {courier.selfEmployed && (
              <View style={st.tag}>
                <Text style={st.tagText}>✓ Самозанятый</Text>
              </View>
            )}
            <View style={[st.tag, { backgroundColor: colors.primaryFaint, borderColor: colors.primary }]}>
              <Text style={[st.tagText, { color: colors.primary }]}>
                {transportLabel[courier.transport]}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={st.statsGrid}>
          <StatBox label="Всего заказов" value={`${courier.totalOrders}`} accent={colors.blue} />
          <StatBox label="За месяц" value={`${thisMonth.length || Math.round(courier.totalOrders / 6)}`} accent={colors.green} />
          <StatBox label="Рейтинг" value={`★ ${courier.rating.toFixed(1)}`} accent={colors.amber} />
          <StatBox label="Выплаты / мес" value={`${courier.monthEarnings.toLocaleString('ru')} ₽`} accent={colors.primary} />
        </View>

        {/* Info */}
        <View style={st.infoCard}>
          <SectionTitle title="ДАННЫЕ" />
          <InfoRow label="ИНН" value={courier.inn ?? '—'} />
          <InfoRow label="Телефон" value={courier.phone} onPress={handleCall} actionLabel="Позвонить" />
          <InfoRow
            label="Оферта принята"
            value={courier.ofertaAcceptedAt ? fmt(courier.ofertaAcceptedAt) : '—'}
          />
          <InfoRow
            label="Дата регистрации"
            value={courier.registeredAt ? fmt(courier.registeredAt) : '—'}
          />
        </View>

        {/* Orders history */}
        <View style={st.historyCard}>
          <SectionTitle title={`ИСТОРИЯ ЗАКАЗОВ · ${recentOrders.length > 0 ? recentOrders.length : courier.totalOrders}`} />

          {recentOrders.length > 0 ? (
            recentOrders.map((o) => (
              <View key={o.id} style={st.orderRow}>
                <View style={[st.orderDot, { backgroundColor: statusColors[o.status] ?? colors.textMuted }]} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={st.orderHead}>
                    <Text style={st.orderNumber}>{o.number}</Text>
                    <Text style={[st.orderStatus, { color: statusColors[o.status] ?? colors.textMuted }]}>
                      {statusLabels[o.status] ?? o.status}
                    </Text>
                  </View>
                  <Text style={st.orderAddr} numberOfLines={1}>
                    {o.restaurant.name} → {o.client.address}
                  </Text>
                  <View style={st.orderFooter}>
                    <Text style={st.orderPay}>{o.payment} ₽</Text>
                    <Text style={st.orderDate}>
                      {new Date(o.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </Text>
                    {o.rating ? <Text style={st.orderRating}>★ {o.rating}</Text> : null}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={st.noOrders}>
              <Text style={st.noOrdersEmoji}>📦</Text>
              <Text style={st.noOrdersText}>
                {courier.totalOrders} заказов выполнено за всё время.{'\n'}
                Заказы назначенные через приложение появятся здесь.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/* ── Sub-components ── */

const StatBox: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <View style={[st.statBox, { borderTopColor: accent }]}>
    <Text style={[st.statValue, { color: accent }]}>{value}</Text>
    <Text style={st.statLabel}>{label}</Text>
  </View>
);

const InfoRow: React.FC<{
  label: string;
  value: string;
  onPress?: () => void;
  actionLabel?: string;
}> = ({ label, value, onPress, actionLabel }) => (
  <View style={st.infoRow}>
    <Text style={st.infoLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={st.infoValue}>{value}</Text>
      {onPress && actionLabel ? (
        <Pressable onPress={onPress} style={st.actionBtn}>
          <Text style={st.actionBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <Text style={st.sectionTitle}>{title}</Text>
);

/* ── Styles ── */

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDark },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgDark,
  },
  backBtn: { width: 60 },
  backText: { fontFamily: fonts.sansMedium, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: '#fff' },

  body: { paddingBottom: 40 },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.bgDark,
    paddingBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontFamily: fonts.sansBold, fontSize: 32, color: '#fff' },
  name: { fontFamily: fonts.sansBold, fontSize: 20, color: '#fff', textAlign: 'center' },
  phone: { fontFamily: fonts.mono, fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tagText: { fontFamily: fonts.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    backgroundColor: colors.border,
    marginTop: -1,
  },
  statBox: {
    width: '50%',
    backgroundColor: colors.bg,
    padding: spacing.lg,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.sansBold, fontSize: 22, fontWeight: '700' },
  statLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 2, textAlign: 'center' },

  infoCard: {
    backgroundColor: colors.bg,
    marginTop: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted },
  infoValue: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primaryFaint,
    borderRadius: radii.sm,
  },
  actionBtnText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.primary },

  historyCard: {
    backgroundColor: colors.bg,
    marginTop: 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

  orderRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  orderNumber: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.text },
  orderStatus: { fontFamily: fonts.sansMedium, fontSize: 12 },
  orderAddr: { fontFamily: fonts.sans, fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  orderFooter: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  orderPay: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.text },
  orderDate: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
  orderRating: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.amber },

  noOrders: { alignItems: 'center', paddingVertical: spacing.xl },
  noOrdersEmoji: { fontSize: 36, marginBottom: spacing.md },
  noOrdersText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

import React, { useMemo, useState } from 'react';
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
import { DispatcherMap } from '../components/DispatcherMap';
import { Button } from '../components/Button';
import { TimeBlock } from '../components/courier/TimeBlock';
import { StepFlow } from '../components/courier/StepFlow';
import { colors } from '../theme/colors';
import { fonts, radii, spacing, typography } from '../theme/typography';
import { useOrdersStore } from '../store/ordersStore';
import { mockCouriers, courierLocations } from '../data/mockCouriers';
import { OrderStatus } from '../types';
import type { NavigationProp, RouteProp } from '@react-navigation/native';

interface Props {
  navigation: NavigationProp<any>;
  route: RouteProp<
    { DispatcherOrderDetail: { orderId: string } },
    'DispatcherOrderDetail'
  >;
}

const stageByStatus: Partial<Record<OrderStatus, string>> = {
  new: 'НОВЫЙ',
  accepted: 'ПРИНЯТ',
  going_to_restaurant: 'ЕДЕТ В РЕСТОРАН',
  at_restaurant: 'ЗАБИРАЕТ ЗАКАЗ',
  picked_up: 'В ПУТИ К КЛИЕНТУ',
  going_to_client: 'К КЛИЕНТУ',
  at_client: 'У КЛИЕНТА',
  delivered: 'ВЫПОЛНЕН',
  cancelled: 'ОТМЕНЁН',
};

const stageColor: Partial<Record<OrderStatus, string>> = {
  new: colors.primary,
  accepted: colors.amber,
  going_to_restaurant: colors.amber,
  at_restaurant: colors.amber,
  picked_up: colors.blue,
  going_to_client: colors.blue,
  at_client: colors.purple,
  delivered: colors.green,
  cancelled: colors.danger,
};

const stageIndex = (s: OrderStatus): number => {
  switch (s) {
    case 'new':
      return -1;
    case 'accepted':
    case 'going_to_restaurant':
      return 0;
    case 'at_restaurant':
    case 'picked_up':
      return 1;
    case 'going_to_client':
    case 'at_client':
      return 2;
    case 'delivered':
      return 3;
    default:
      return -1;
  }
};

const fmtTime = (ts?: number) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

export const DispatcherOrderDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const order = useOrdersStore((s) =>
    s.getOrderById(route.params.orderId)
  );
  const declineOrder = useOrdersStore((s) => s.declineOrder);
  const chatMessages = useOrdersStore((s) => s.chatMessages);
  const addMessage = useOrdersStore((s) => s.addChatMessage);
  const [chatText, setChatText] = useState('');

  const stepIdx = useMemo(
    () => (order ? stageIndex(order.status) : -1),
    [order?.status]
  );

  if (!order) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Заказ не найден</Text>
          <Button
            label="НАЗАД"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const acceptedAt = order.acceptedAt ?? order.createdAt;
  const dueTs = acceptedAt + order.estimatedTimeMin * 60_000;

  const callPhone = (raw: string) =>
    Linking.openURL(`tel:${raw.replace(/\s/g, '')}`).catch(() =>
      Alert.alert('Не удалось открыть номер')
    );

  const handleCancel = () =>
    Alert.alert('Отменить заказ?', 'Это действие нельзя будет отменить', [
      { text: 'Назад', style: 'cancel' },
      {
        text: 'Отменить заказ',
        style: 'destructive',
        onPress: () => {
          declineOrder(order.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>← НАЗАД</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <View
          style={[
            styles.statusPill,
            {
              borderColor: stageColor[order.status] ?? colors.border2,
              backgroundColor: (stageColor[order.status] ?? colors.bg3) + '22',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: stageColor[order.status] ?? colors.text },
            ]}
          >
            {stageByStatus[order.status] ?? '—'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>ЗАКАЗ</Text>
          <Text style={styles.heroNumber}>{order.number}</Text>
          <Text style={styles.heroDate}>
            {new Date(order.createdAt).toLocaleString('ru-RU')}
          </Text>
        </View>

        {/* 2×2 meta grid */}
        <View style={styles.metaGrid}>
          {/* Row 1 */}
          <View style={styles.metaGridRow}>
            <View style={styles.metaGridCell}>
              <Text style={styles.metaGridIcon}>💰</Text>
              <Text style={styles.metaGridLabel}>ОПЛАТА КУРЬЕРУ</Text>
              <Text style={[styles.metaGridValue, { color: colors.green }]}>
                {order.payment} ₽
              </Text>
            </View>
            <View style={styles.metaGridDivV} />
            <View style={styles.metaGridCell}>
              <Text style={styles.metaGridIcon}>🧾</Text>
              <Text style={styles.metaGridLabel}>ЧЕК ЗАКАЗА</Text>
              <Text style={styles.metaGridValue}>{order.total} ₽</Text>
            </View>
          </View>
          {/* Divider */}
          <View style={styles.metaGridDivH} />
          {/* Row 2 */}
          <View style={styles.metaGridRow}>
            <View style={styles.metaGridCell}>
              <Text style={styles.metaGridIcon}>📍</Text>
              <Text style={styles.metaGridLabel}>РАССТОЯНИЕ</Text>
              <Text style={[styles.metaGridValue, { color: colors.primary }]}>
                {order.distanceKm} км
              </Text>
            </View>
            <View style={styles.metaGridDivV} />
            <View style={styles.metaGridCell}>
              <Text style={styles.metaGridIcon}>⏱</Text>
              <Text style={styles.metaGridLabel}>РАСЧ. ВРЕМЯ</Text>
              <Text style={styles.metaGridValue}>{order.estimatedTimeMin} мин</Text>
            </View>
          </View>
        </View>

        {stepIdx >= 0 ? (
          <>
            <SectionLabel>ВРЕМЕННАЯ ЛИНИЯ</SectionLabel>
            <TimeBlock
              ready={fmtTime(acceptedAt)}
              due={fmtTime(dueTs)}
              arrived={
                order.deliveredAt ? fmtTime(order.deliveredAt) : undefined
              }
              diffMinutes={
                order.deliveredAt
                  ? Math.round((order.deliveredAt - dueTs) / 60_000)
                  : undefined
              }
            />
          </>
        ) : null}

        {/* MAP */}
        <SectionLabel>МАРШРУТ + БЛИЖАЙШИЕ КУРЬЕРЫ</SectionLabel>
        <View style={styles.mapBox}>
          <DispatcherMap
            orders={[order]}
            couriers={mockCouriers.map((c) => ({
              courier: c,
              online: true,
              coordinate: courierLocations[c.id] ?? {
                latitude: 42.98,
                longitude: 47.5,
              },
            }))}
            selectedOrderId={order.id}
          />
        </View>

        {/* RESTAURANT */}
        <SectionLabel>🍽 РЕСТОРАН</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.cardPrimary}>{order.restaurant.name}</Text>
          <Text style={styles.cardSecondary}>{order.restaurant.address}</Text>
          <Pressable
            style={styles.callRow}
            onPress={() => callPhone(order.restaurant.phone)}
          >
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callText}>{order.restaurant.phone}</Text>
            <Text style={styles.callBtn}>ПОЗВОНИТЬ</Text>
          </Pressable>
        </View>

        {/* CLIENT */}
        <SectionLabel>👤 КЛИЕНТ</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.cardPrimary}>{order.client.name}</Text>
          <Text style={styles.cardSecondary}>
            {order.client.address}
            {order.client.apartment ? `, ${order.client.apartment}` : ''}
          </Text>
          <Pressable
            style={styles.callRow}
            onPress={() => callPhone(order.client.phone)}
          >
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callText}>{order.client.phone}</Text>
            <Text style={styles.callBtn}>ПОЗВОНИТЬ</Text>
          </Pressable>
          {order.client.comment ? (
            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>💬 КОММЕНТАРИЙ</Text>
              <Text style={styles.commentText}>«{order.client.comment}»</Text>
            </View>
          ) : null}
        </View>

        {/* ITEMS */}
        <SectionLabel>{`СОСТАВ ЗАКАЗА · ${order.items.length}`}</SectionLabel>
        <View style={styles.card}>
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{it.name}</Text>
              <Text style={styles.itemQty}>×{it.quantity}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ИТОГО</Text>
            <Text style={styles.totalValue}>{order.total} ₽</Text>
          </View>
        </View>

        {/* PROGRESS */}
        {stepIdx >= 0 ? (
          <>
            <SectionLabel>ЭТАПЫ ВЫПОЛНЕНИЯ</SectionLabel>
            <View style={styles.card}>
              <StepFlow
                current={stepIdx}
                steps={[
                  { label: 'Курьер едет в ресторан', caption: order.restaurant.name },
                  {
                    label: 'Забирает и везёт',
                    caption: `Готовность ~${order.estimatedTimeMin} мин`,
                  },
                  { label: 'Доставка клиенту', caption: order.client.address },
                  { label: 'Завершён', caption: order.deliveredAt ? fmtTime(order.deliveredAt) : '' },
                ]}
              />
            </View>
          </>
        ) : null}

        {/* META */}
        <SectionLabel>ТЕХНИЧЕСКИЕ ДАННЫЕ</SectionLabel>
        <View style={styles.metaCard}>
          <MetaRow k="ID заказа" v={order.id} mono />
          <MetaRow k="Создан" v={new Date(order.createdAt).toLocaleString('ru-RU')} />
          {order.acceptedAt ? (
            <MetaRow
              k="Принят"
              v={new Date(order.acceptedAt).toLocaleString('ru-RU')}
            />
          ) : null}
          {order.pickedUpAt ? (
            <MetaRow
              k="Забран"
              v={new Date(order.pickedUpAt).toLocaleString('ru-RU')}
            />
          ) : null}
          {order.deliveredAt ? (
            <MetaRow
              k="Доставлен"
              v={new Date(order.deliveredAt).toLocaleString('ru-RU')}
            />
          ) : null}
          <MetaRow k="Термосумка" v={order.needsThermoBag ? 'Нужна' : 'Нет'} />
          {order.rating ? (
            <MetaRow k="Оценка клиента" v={`★ ${order.rating}.0`} />
          ) : null}
        </View>

        {/* CHAT */}
        <SectionLabel>💬 ЧАТ С КУРЬЕРОМ</SectionLabel>
        <View style={styles.chatBox}>
          {chatMessages.length === 0 ? (
            <Text style={styles.chatEmpty}>Нет сообщений</Text>
          ) : (
            chatMessages.slice(-5).map((msg, idx) => (
              <View
                key={idx}
                style={[
                  styles.chatMsgRow,
                  msg.fromDispatcher ? styles.chatMsgRowRight : styles.chatMsgRowLeft,
                ]}
              >
                <View
                  style={[
                    styles.chatBubble,
                    msg.fromDispatcher ? styles.chatBubbleDispatcher : styles.chatBubbleCourier,
                  ]}
                >
                  <Text style={styles.chatBubbleText}>{msg.text}</Text>
                  <Text style={styles.chatBubbleTime}>
                    {new Date(msg.createdAt).getHours().toString().padStart(2, '0')}:
                    {new Date(msg.createdAt).getMinutes().toString().padStart(2, '0')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={chatText}
            onChangeText={setChatText}
            placeholder="Написать сообщение..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={() => {
              if (chatText.trim()) {
                addMessage({ fromDispatcher: true, text: chatText.trim(), createdAt: Date.now(), read: false });
                setChatText('');
              }
            }}
          />
          <Pressable
            style={[styles.chatSendBtn, !chatText.trim() && styles.chatSendBtnDisabled]}
            onPress={() => {
              if (chatText.trim()) {
                addMessage({ fromDispatcher: true, text: chatText.trim(), createdAt: Date.now(), read: false });
                setChatText('');
              }
            }}
          >
            <Text style={styles.chatSendText}>Отправить</Text>
          </Pressable>
        </View>

        {order.status !== 'delivered' && order.status !== 'cancelled' ? (
          <Button
            label="ОТМЕНИТЬ ЗАКАЗ"
            variant="danger"
            fullWidth
            onPress={handleCancel}
            style={{ marginTop: spacing.lg }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const SectionLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text style={styles.sectionLabel}>{children}</Text>
);

const MetaRow: React.FC<{ k: string; v: string; mono?: boolean }> = ({
  k,
  v,
  mono,
}) => (
  <View style={styles.metaRow}>
    <Text style={styles.metaKey}>{k}</Text>
    <Text style={[styles.metaVal, mono && { fontFamily: fonts.mono }]}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.text,
    letterSpacing: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  heroLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  heroNumber: {
    fontFamily: fonts.displayBold,
    fontSize: 40,
    color: colors.text,
    letterSpacing: -1,
    marginTop: 2,
  },
  heroDate: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  /* 2×2 meta grid */
  metaGrid: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  metaGridRow: {
    flexDirection: 'row',
  },
  metaGridCell: {
    flex: 1,
    padding: spacing.md,
    paddingVertical: spacing.base,
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
    fontSize: 16,
    marginBottom: 4,
  },
  metaGridLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  metaGridValue: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.4,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPrimary: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text,
  },
  cardSecondary: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    backgroundColor: colors.bg3,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  callIcon: { fontSize: 16 },
  callText: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  callBtn: {
    fontFamily: fonts.displayBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 1,
  },
  commentBox: {
    backgroundColor: colors.amberFaint,
    borderColor: colors.amber,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  commentLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.amber,
    letterSpacing: 1.5,
  },
  commentText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemName: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  itemQty: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  totalValue: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text,
  },
  mapBox: {
    height: 280,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaCard: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  metaKey: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textMuted,
  },
  metaVal: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.text,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text,
  },

  /* chat */
  chatBox: {
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
  },
  chatEmpty: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  chatMsgRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  chatMsgRowRight: {
    justifyContent: 'flex-end',
  },
  chatMsgRowLeft: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '75%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chatBubbleDispatcher: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  chatBubbleCourier: {
    backgroundColor: colors.bg3 ?? colors.bg2,
    borderColor: colors.border,
    borderWidth: 1,
  },
  chatBubbleText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.text,
  },
  chatBubbleTime: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    textAlign: 'right',
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.bg2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.text,
  },
  chatSendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  chatSendBtnDisabled: {
    opacity: 0.45,
  },
  chatSendText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

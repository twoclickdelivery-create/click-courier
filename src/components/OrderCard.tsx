import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from '../utils/haptics';
import { Order } from '../types';
import { colors } from '../theme/colors';
import { radii, spacing, typography } from '../theme/typography';
import { Button } from './Button';

interface NewOrderCardProps {
  order: Order;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  countdownSec?: number;
}

export const NewOrderCard: React.FC<NewOrderCardProps> = ({
  order,
  onAccept,
  onDecline,
  countdownSec = 15,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(countdownSec);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => undefined
    );
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          onDecline(order.id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [order.id, onDecline]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.fire}>🔥</Text>
        <Text style={styles.headerTitle}>НОВЫЙ ЗАКАЗ</Text>
        <View style={styles.dotSep} />
        <Text style={styles.orderNum}>{order.number}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>📍 Откуда</Text>
        <Text style={styles.sectionValue}>{order.restaurant.name}</Text>
        <Text style={styles.sectionAddress}>{order.restaurant.address}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>📍 Куда</Text>
        <Text style={styles.sectionValue}>{order.client.address}</Text>
        <Text style={styles.sectionAddress}>
          {order.distanceKm} км • {order.estimatedTimeMin} мин
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>💰 К оплате</Text>
          <Text style={styles.metaValue}>{order.payment} ₽</Text>
        </View>
        {order.needsThermoBag ? (
          <View style={styles.thermoBag}>
            <Text style={styles.thermoBagText}>🎒 Термосумка</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.timerWrap}>
        <View style={styles.timerBar}>
          <View
            style={[
              styles.timerFill,
              { width: `${(secondsLeft / countdownSec) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.timerText}>⏱ {secondsLeft} сек</Text>
      </View>

      <View style={styles.buttons}>
        <Button
          label="Отклонить"
          variant="ghost"
          onPress={() => onDecline(order.id)}
          style={{ flex: 1 }}
        />
        <View style={{ width: spacing.sm }} />
        <Button
          label="Принять"
          variant="success"
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
              () => undefined
            );
            onAccept(order.id);
          }}
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
};

interface InProgressCardProps {
  order: Order;
  onPress: () => void;
}

export const InProgressCard: React.FC<InProgressCardProps> = ({ order, onPress }) => {
  const stage =
    order.status === 'going_to_restaurant' || order.status === 'at_restaurant'
      ? 'Едет в ресторан'
      : 'Везёт клиенту';
  return (
    <Pressable onPress={onPress} style={styles.simpleCard}>
      <View style={styles.simpleRow}>
        <Text style={styles.orderNum}>{order.number}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{stage}</Text>
        </View>
      </View>
      <Text style={[typography.body, { marginTop: 6 }]} numberOfLines={1}>
        {order.restaurant.name} → {order.client.address}
      </Text>
      <Text style={[typography.small, { color: colors.textSecondary, marginTop: 4 }]}>
        {order.distanceKm} км • {order.estimatedTimeMin} мин • {order.payment} ₽
      </Text>
    </Pressable>
  );
};

interface HistoryCardProps {
  order: Order;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({ order }) => {
  const date = order.deliveredAt
    ? new Date(order.deliveredAt).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  return (
    <View style={styles.simpleCard}>
      <View style={styles.simpleRow}>
        <Text style={styles.orderNum}>{order.number}</Text>
        <Text style={[typography.small, { color: colors.textSecondary }]}>{date}</Text>
      </View>
      <Text style={[typography.body, { marginTop: 6 }]} numberOfLines={1}>
        {order.restaurant.name} → {order.client.address}
      </Text>
      <View style={[styles.simpleRow, { marginTop: 8 }]}>
        <Text style={[typography.smallBold, { color: colors.success }]}>
          +{order.payment} ₽
        </Text>
        <Text style={typography.small}>
          {'⭐'.repeat(order.rating ?? 5)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  fire: { fontSize: 18 },
  headerTitle: {
    ...typography.smallBold,
    color: colors.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  dotSep: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginHorizontal: 8,
  },
  orderNum: { ...typography.smallBold, color: colors.textSecondary },
  section: { marginVertical: 6 },
  sectionLabel: { ...typography.tiny, color: colors.textSecondary },
  sectionValue: { ...typography.bodyBold, marginTop: 2 },
  sectionAddress: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  metaItem: {},
  metaLabel: { ...typography.tiny, color: colors.textSecondary },
  metaValue: { ...typography.h3, color: colors.text, marginTop: 2 },
  thermoBag: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  thermoBagText: { ...typography.small, color: '#92400E', fontWeight: '600' },
  timerWrap: { marginTop: spacing.sm, marginBottom: spacing.md },
  timerBar: {
    height: 6,
    backgroundColor: colors.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: { height: '100%', backgroundColor: colors.primary },
  timerText: {
    ...typography.tiny,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  buttons: { flexDirection: 'row' },
  simpleCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  simpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  statusBadgeText: {
    ...typography.tiny,
    color: colors.info,
    fontWeight: '600',
  },
});

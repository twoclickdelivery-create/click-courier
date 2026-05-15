import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from '../../utils/haptics';
import { Order } from '../../types';
import { colors } from '../../theme/colors';
import { fonts, radii, spacing } from '../../theme/typography';

const isWeb = Platform.OS === 'web';

interface Props {
  order: Order;
  onAccept: () => void;
  onDecline: () => void;
  durationSec?: number;
}

export const IncomingOrderCard: React.FC<Props> = ({
  order,
  onAccept,
  onDecline,
  durationSec = 30,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(durationSec);
  const declinedRef = useRef(false);

  useEffect(() => {
    declinedRef.current = false;
    setSecondsLeft(durationSec);
  }, [order.id, durationSec]);

  useEffect(() => {
    if (!isWeb) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      ).catch(() => undefined);
    }
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [order.id]);

  useEffect(() => {
    if (secondsLeft === 0 && !declinedRef.current) {
      declinedRef.current = true;
      const t = setTimeout(() => onDecline(), 0);
      return () => clearTimeout(t);
    }
  }, [secondsLeft, onDecline]);

  const progress = secondsLeft / durationSec;
  const progressColor =
    progress > 0.5 ? colors.primary : progress > 0.25 ? colors.amber : colors.danger;

  return (
    <View style={styles.card}>
      {/* Timer strip */}
      <View style={styles.timerStrip}>
        <View style={styles.timerLeft}>
          <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.timerLabel}>Новый заказ</Text>
        </View>
        <Text style={[styles.timerValue, { color: progressColor }]}>
          {secondsLeft} с
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` as any, backgroundColor: progressColor },
          ]}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.orderLabel}>Заказ</Text>
          <Text style={styles.orderNumber}>{order.number}</Text>
        </View>
        <View style={styles.payBlock}>
          <Text style={styles.payValue}>{order.payment} ₽</Text>
          <Text style={styles.payLabel}>вам</Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.amber }]} />
          <View style={styles.routeText}>
            <Text style={styles.routeName} numberOfLines={1}>{order.restaurant.name}</Text>
            <Text style={styles.routeAddr} numberOfLines={1}>{order.restaurant.address}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: colors.green }]} />
          <View style={styles.routeText}>
            <Text style={styles.routeName} numberOfLines={1}>{order.client.name}</Text>
            <Text style={styles.routeAddr} numberOfLines={1}>{order.client.address}</Text>
          </View>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <MetaCell label="Расстояние" value={`${order.distanceKm} км`} />
        <MetaCell label="Позиций"    value={`${order.items.length}`} />
        <MetaCell label="Чек"        value={`${order.total} ₽`} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btnDecline, pressed && { opacity: 0.7 }]}
          onPress={onDecline}
        >
          <Text style={styles.btnDeclineText}>Отказаться</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnAccept, pressed && { opacity: 0.88 }]}
          onPress={() => {
            if (!isWeb) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
            }
            onAccept();
          }}
        >
          <Text style={styles.btnAcceptText}>Взять заказ</Text>
        </Pressable>
      </View>
    </View>
  );
};

const MetaCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.metaCell}>
    <Text style={styles.metaLabel}>{label}</Text>
    <Text style={styles.metaValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg2,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  timerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  timerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  timerLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.text,
  },
  timerValue: {
    fontFamily: fonts.monoBold,
    fontSize: 16,
  },

  progressTrack: {
    height: 3,
    backgroundColor: colors.bg4,
  },
  progressFill: {
    height: '100%',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.base,
    paddingBottom: 0,
  },
  orderLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  orderNumber: {
    fontFamily: fonts.sansBold,
    fontSize: 20,
    color: colors.text,
    letterSpacing: -0.3,
  },
  payBlock: { alignItems: 'flex-end' },
  payValue: {
    fontFamily: fonts.sansBold,
    fontSize: 26,
    color: colors.green,
    letterSpacing: -0.5,
  },
  payLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
  },

  route: {
    padding: spacing.base,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.border2,
    marginLeft: 4,
    marginVertical: 4,
  },
  routeName: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.text,
  },
  routeAddr: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },

  metaRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.md,
  },
  metaCell: { flex: 1 },
  metaLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 3,
  },
  metaValue: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    color: colors.text,
  },

  actions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  btnDecline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border2,
    backgroundColor: 'transparent',
  },
  btnDeclineText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  btnAccept: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  btnAcceptText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: '#ffffff',
  },
});

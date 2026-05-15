import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Coordinates, Courier, Order } from '../types';
import { colors } from '../theme/colors';
import { fonts, radii, spacing } from '../theme/typography';

export interface MappedCourier {
  courier: Courier;
  online: boolean;
  coordinate: Coordinates;
}

interface Props {
  orders: Order[];
  couriers: MappedCourier[];
  selectedOrderId?: string | null;
  onOrderPress?: (id: string) => void;
  onCourierPress?: (id: string) => void;
}

const transportEmoji = { foot: '🚶', bike: '🚴', car: '🚗' } as const;

export const DispatcherMap: React.FC<Props> = ({ orders, couriers }) => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>🗺 Карта на устройстве</Text>
    <Text style={styles.subtitle}>
      Запусти на iPhone/Android — там показано {orders.length} заказов и{' '}
      {couriers.filter((c) => c.online).length} курьеров онлайн
    </Text>

    <Text style={styles.sectionLabel}>КУРЬЕРЫ ({couriers.length})</Text>
    {couriers.map((c) => (
      <View
        key={c.courier.id}
        style={[
          styles.row,
          { borderColor: c.online ? colors.green : colors.border },
        ]}
      >
        <Text style={styles.rowEmoji}>{transportEmoji[c.courier.transport]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{c.courier.name}</Text>
          <Text style={styles.rowCoord}>
            {c.coordinate.latitude.toFixed(4)},{' '}
            {c.coordinate.longitude.toFixed(4)}
          </Text>
        </View>
        <Text
          style={{
            ...styles.rowStatus,
            color: c.online ? colors.green : colors.textMuted,
          }}
        >
          {c.online ? '● ОНЛАЙН' : '○ ОФФЛАЙН'}
        </Text>
      </View>
    ))}

    <Text style={styles.sectionLabel}>ЗАКАЗЫ ({orders.length})</Text>
    {orders.map((o) => (
      <View key={o.id} style={[styles.row, { borderColor: colors.primary }]}>
        <Text style={styles.rowEmoji}>📦</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{o.number}</Text>
          <Text style={styles.rowCoord}>
            🍽 {o.restaurant.coordinates.latitude.toFixed(4)},{' '}
            {o.restaurant.coordinates.longitude.toFixed(4)} → 📍{' '}
            {o.client.coordinates.latitude.toFixed(4)},{' '}
            {o.client.coordinates.longitude.toFixed(4)}
          </Text>
        </View>
        <Text style={{ ...styles.rowStatus, color: colors.primary }}>
          {o.distanceKm} км
        </Text>
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg2,
    padding: spacing.md,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg3,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderColor: colors.border,
  },
  rowEmoji: { fontSize: 18, marginRight: 8 },
  rowName: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    color: colors.text,
  },
  rowCoord: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowStatus: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
});

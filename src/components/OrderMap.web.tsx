import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Coordinates } from '../types';
import { colors } from '../theme/colors';
import { fonts, radii, spacing } from '../theme/typography';

interface Props {
  courier: Coordinates;
  restaurant: Coordinates;
  client: Coordinates;
  restaurantTitle?: string;
  restaurantSubtitle?: string;
  clientSubtitle?: string;
}

export const OrderMap: React.FC<Props> = ({
  restaurant,
  client,
  restaurantTitle,
  restaurantSubtitle,
  clientSubtitle,
}) => (
  <View style={styles.container}>
    <View style={styles.glow} />
    <Text style={styles.icon}>🗺</Text>
    <Text style={styles.title}>Карта доступна на устройстве</Text>

    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: colors.amber }]} />
      <Text style={styles.label} numberOfLines={1}>
        {restaurantTitle ?? 'Ресторан'}
        {restaurantSubtitle ? ` · ${restaurantSubtitle}` : ''}
      </Text>
    </View>
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: colors.green }]} />
      <Text style={styles.label} numberOfLines={1}>
        Клиент {clientSubtitle ? `· ${clientSubtitle}` : ''}
      </Text>
    </View>

    <Text style={styles.coords}>
      {restaurant.latitude.toFixed(4)}, {restaurant.longitude.toFixed(4)} →{' '}
      {client.latitude.toFixed(4)}, {client.longitude.toFixed(4)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primaryFaint,
    opacity: 0.4,
  },
  icon: { fontSize: 48, marginBottom: spacing.sm },
  title: {
    fontFamily: fonts.displayBold,
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: colors.bg3,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.text,
  },
  coords: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});

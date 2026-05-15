import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  UrlTile,
} from 'react-native-maps';
import { Coordinates, Courier, Order } from '../types';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { MAKHACHKALA_CENTER } from '../data/locations';

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

export const DispatcherMap: React.FC<Props> = ({
  orders,
  couriers,
  selectedOrderId,
  onOrderPress,
  onCourierPress,
}) => {
  const region = useMemo(() => {
    const allCoords: Coordinates[] = [];
    orders.forEach((o) => {
      allCoords.push(o.restaurant.coordinates);
      allCoords.push(o.client.coordinates);
    });
    couriers.forEach((c) => allCoords.push(c.coordinate));

    if (allCoords.length === 0) {
      return {
        ...MAKHACHKALA_CENTER,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
    }

    const lats = allCoords.map((c) => c.latitude);
    const lngs = allCoords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.02) * 1.6,
      longitudeDelta: Math.max(maxLng - minLng, 0.02) * 1.6,
    };
  }, [orders, couriers]);

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      showsMyLocationButton={Platform.OS === 'android'}
      showsCompass={false}
    >
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
      />

      {/* Маршруты заказов */}
      {orders.map((o) => (
        <Polyline
          key={`line-${o.id}`}
          coordinates={[o.restaurant.coordinates, o.client.coordinates]}
          strokeColor={
            selectedOrderId === o.id ? colors.primary : 'rgba(255,77,26,0.45)'
          }
          strokeWidth={selectedOrderId === o.id ? 5 : 2.5}
          lineDashPattern={selectedOrderId === o.id ? undefined : [6, 6]}
        />
      ))}

      {/* Рестораны */}
      {orders.map((o) => (
        <Marker
          key={`r-${o.id}`}
          coordinate={o.restaurant.coordinates}
          onPress={() => onOrderPress?.(o.id)}
          tracksViewChanges={false}
        >
          <View style={[styles.pin, { backgroundColor: colors.amber }]}>
            <Text style={styles.pinIcon}>🍽</Text>
          </View>
          <View style={styles.label}>
            <Text style={styles.labelText}>{o.number}</Text>
          </View>
        </Marker>
      ))}

      {/* Клиенты */}
      {orders.map((o) => (
        <Marker
          key={`c-${o.id}`}
          coordinate={o.client.coordinates}
          onPress={() => onOrderPress?.(o.id)}
          tracksViewChanges={false}
        >
          <View
            style={[
              styles.pin,
              { backgroundColor: colors.green, borderColor: colors.green },
            ]}
          >
            <Text style={styles.pinIcon}>📍</Text>
          </View>
        </Marker>
      ))}

      {/* Курьеры */}
      {couriers.map((mc) => (
        <Marker
          key={`co-${mc.courier.id}`}
          coordinate={mc.coordinate}
          onPress={() => onCourierPress?.(mc.courier.id)}
          tracksViewChanges={false}
        >
          <View
            style={[
              styles.courierPin,
              {
                backgroundColor: mc.online ? colors.blue : colors.bg3,
                borderColor: mc.online ? colors.blue : colors.textMuted,
              },
            ]}
          >
            <Text style={styles.courierEmoji}>
              {transportEmoji[mc.courier.transport]}
            </Text>
            {mc.online ? <View style={styles.courierOnline} /> : null}
          </View>
          <View style={styles.label}>
            <Text style={styles.labelText} numberOfLines={1}>
              {mc.courier.name.split(' ')[0]}
            </Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
};

const styles = StyleSheet.create({
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinIcon: { fontSize: 14 },
  courierPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  courierEmoji: { fontSize: 18 },
  courierOnline: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  label: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'center',
  },
  labelText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: colors.text,
    letterSpacing: 0.5,
  },
});

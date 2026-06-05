import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, UrlTile } from 'react-native-maps';
import { Coordinates } from '../types';
import { colors } from '../theme/colors';

interface Props {
  courier: Coordinates;
  restaurant: Coordinates;
  client: Coordinates;
  restaurantTitle?: string;
  restaurantSubtitle?: string;
  clientSubtitle?: string;
}

const OrderMapInner: React.FC<Props> = ({
  courier,
  restaurant,
  client,
  restaurantTitle,
  restaurantSubtitle,
  clientSubtitle,
}) => {
  // Регион считается один раз — initialRegion и так не реагирует на изменения
  const initialRegion = useMemo(
    () => ({
      latitude: (restaurant.latitude + client.latitude) / 2,
      longitude: (restaurant.longitude + client.longitude) / 2,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    }),
    // умышленно фиксируем при первом маунте: иначе MapView будет тяжело
    // дёргаться при каждом тике геолокации курьера
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const polyCoords = useMemo(
    () => [courier, restaurant, client],
    [courier.latitude, courier.longitude, restaurant.latitude, restaurant.longitude, client.latitude, client.longitude]
  );

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton={Platform.OS === 'android'}
      // Отключаем то, что в курьерском use-case не нужно — сильно снимает нагрузку с GPU
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      moveOnMarkerPress={false}
      loadingEnabled
      loadingBackgroundColor={colors.bg2}
    >
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
      />
      <Marker
        coordinate={courier}
        title="Я"
        pinColor={colors.mapCourier}
        tracksViewChanges={false}
      />
      <Marker
        coordinate={restaurant}
        title={restaurantTitle}
        description={restaurantSubtitle}
        pinColor={colors.mapRestaurant}
        tracksViewChanges={false}
      />
      <Marker
        coordinate={client}
        title="Клиент"
        description={clientSubtitle}
        pinColor={colors.mapClient}
        tracksViewChanges={false}
      />
      <Polyline
        coordinates={polyCoords}
        strokeColor={colors.primary}
        strokeWidth={4}
      />
    </MapView>
  );
};

// memo: предотвращает перерендер карты при каждом тике order/UI
export const OrderMap = React.memo(OrderMapInner);

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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

export const OrderMap: React.FC<Props> = ({
  courier,
  restaurant,
  client,
  restaurantTitle,
  restaurantSubtitle,
  clientSubtitle,
}) => {
  const region = {
    latitude: (restaurant.latitude + client.latitude) / 2,
    longitude: (restaurant.longitude + client.longitude) / 2,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      showsUserLocation
      showsMyLocationButton={Platform.OS === 'android'}
    >
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
      />
      <Marker coordinate={courier} title="Я" pinColor={colors.mapCourier} />
      <Marker
        coordinate={restaurant}
        title={restaurantTitle}
        description={restaurantSubtitle}
        pinColor={colors.mapRestaurant}
      />
      <Marker
        coordinate={client}
        title="Клиент"
        description={clientSubtitle}
        pinColor={colors.mapClient}
      />
      <Polyline
        coordinates={[courier, restaurant, client]}
        strokeColor={colors.primary}
        strokeWidth={4}
      />
    </MapView>
  );
};

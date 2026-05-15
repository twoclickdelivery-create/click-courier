import { Coordinates } from '../types';

export const MAKHACHKALA_CENTER: Coordinates = {
  latitude: 42.9849,
  longitude: 47.5047,
};

export const DEFAULT_DELTA = {
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

export const haversineKm = (a: Coordinates, b: Coordinates): number => {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

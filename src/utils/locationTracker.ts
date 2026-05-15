import * as Location from 'expo-location';
import { useLocationStore } from '../store/locationStore';

let subscription: Location.LocationSubscription | null = null;

export const startLocationTracking = async (): Promise<boolean> => {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return false;

  if (subscription) return true;

  try {
    const initial = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    useLocationStore.getState().setLocation({
      latitude: initial.coords.latitude,
      longitude: initial.coords.longitude,
    });
  } catch {
    // ignore — keep default Makhachkala center
  }

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,
      distanceInterval: 20,
    },
    (loc) => {
      useLocationStore.getState().setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    }
  );
  return true;
};

export const stopLocationTracking = () => {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
};

import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NavApp = '2gis' | 'yandex_navi' | 'yandex_maps';

const STORAGE_KEY = 'click-courier-nav-app';

interface AppLinks {
  id: NavApp;
  label: string;
  deepLink: (lat: number, lon: number) => string;
  webFallback: (lat: number, lon: number) => string;
}

const APPS: Record<NavApp, AppLinks> = {
  '2gis': {
    id: '2gis',
    label: '2ГИС',
    // 2GIS принимает универсальный https-URL: ОС автоматически открывает
    // приложение, если оно установлено, иначе — браузер.
    // Порядок координат у 2GIS: долгота,широта (lon,lat) — в отличие от Яндекса!
    deepLink: (lat, lon) => `https://2gis.ru/directions/points/${lon}%2C${lat}`,
    webFallback: (lat, lon) => `https://2gis.ru/directions/points/${lon}%2C${lat}`,
  },
  yandex_navi: {
    id: 'yandex_navi',
    label: 'Яндекс Навигатор',
    // Спец. deep-link для Яндекс Навигатора — у него нет web-эквивалента.
    deepLink: (lat, lon) => `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}`,
    webFallback: (lat, lon) => `https://yandex.ru/navi/?build_route_on_map=true&lat_to=${lat}&lon_to=${lon}`,
  },
  yandex_maps: {
    id: 'yandex_maps',
    label: 'Яндекс Карты',
    // Универсальный https-URL — ОС откроет приложение Яндекс Карт, если стоит.
    // `rtext` принимает пары через `~`: одна пара = точка назначения,
    // система сама подставит начальную как «откуда я».
    deepLink: (lat, lon) => `https://yandex.ru/maps/?rtext=~${lat}%2C${lon}&rtt=auto`,
    webFallback: (lat, lon) => `https://yandex.ru/maps/?rtext=~${lat}%2C${lon}&rtt=auto`,
  },
};

export const NAV_APP_LIST: NavApp[] = ['2gis', 'yandex_navi', 'yandex_maps'];

export const getNavAppLabel = (id: NavApp): string => APPS[id].label;

export const loadPreferredNavApp = async (): Promise<NavApp | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw && (NAV_APP_LIST as string[]).includes(raw)) return raw as NavApp;
  } catch {}
  return null;
};

export const savePreferredNavApp = async (app: NavApp): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, app);
  } catch {}
};

export const clearPreferredNavApp = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
};

const openInApp = async (app: NavApp, lat: number, lon: number): Promise<void> => {
  const { deepLink, webFallback, label } = APPS[app];
  const link = deepLink(lat, lon);
  const fallback = webFallback(lat, lon);
  // Лог поможет диагностике: вижу в Metro/Expo консоли какой URL отправляем.
  console.log('[nav]', app, 'coords=', { lat, lon }, 'url=', link);
  try {
    const can = await Linking.canOpenURL(link);
    if (can) {
      await Linking.openURL(link);
      return;
    }
    console.log('[nav]', app, 'canOpenURL=false, fallback=', fallback);
  } catch (e) {
    console.log('[nav]', app, 'error on canOpenURL, fallback=', fallback, e);
  }
  try {
    await Linking.openURL(fallback);
  } catch (e) {
    console.log('[nav]', app, 'fallback failed', e);
    Alert.alert(`Не удалось открыть ${label}`, 'Установите приложение или проверьте интернет');
  }
};

/**
 * Открывает маршрут в выбранном приложении.
 * Если предпочтение не задано — показывает диалог выбора и сохраняет ответ.
 * `forcePick = true` принудительно показывает диалог даже при сохранённом выборе.
 */
export const openRoute = async (
  lat: number,
  lon: number,
  options?: { forcePick?: boolean }
): Promise<void> => {
  if (Platform.OS === 'web') {
    // На вебе deep links бесполезны — сразу открываем Яндекс Карты в новой вкладке
    Linking.openURL(APPS.yandex_maps.webFallback(lat, lon)).catch(() => undefined);
    return;
  }

  const force = options?.forcePick === true;
  const saved = force ? null : await loadPreferredNavApp();

  if (saved) {
    await openInApp(saved, lat, lon);
    return;
  }

  showPicker(lat, lon);
};

const showPicker = (lat: number, lon: number): void => {
  Alert.alert(
    'Открыть маршрут в…',
    'Выберите приложение. Запомним выбор — следующий раз откроем сразу.',
    [
      ...NAV_APP_LIST.map((id) => ({
        text: APPS[id].label,
        onPress: async () => {
          await savePreferredNavApp(id);
          await openInApp(id, lat, lon);
        },
      })),
      { text: 'Отмена', style: 'cancel' as const },
    ]
  );
};

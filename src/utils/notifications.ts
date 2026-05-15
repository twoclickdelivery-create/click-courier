import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Guard: expo-notifications не поддерживается на web
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const setupNotifications = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Новые заказы',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 300, 150, 300],
      lightColor: '#FF6B35',
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;
  if (finalStatus !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }
  return finalStatus === 'granted';
};

export const notifyNewOrder = async (orderNumber: string, payment: number) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Новый заказ',
      body: `Заказ ${orderNumber} • ${payment} ₽`,
      sound: 'default',
      data: { kind: 'new_order' },
    },
    trigger: null,
  });
};

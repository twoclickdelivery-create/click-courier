import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { ActiveOrderScreen } from '../screens/ActiveOrderScreen';
import { DispatcherScreen } from '../screens/DispatcherScreen';
import { DispatcherOrderDetailScreen } from '../screens/DispatcherOrderDetailScreen';
import { ClientsScreen } from '../screens/ClientsScreen';
import { ClientDetailScreen } from '../screens/ClientDetailScreen';
import { CourierDetailScreen } from '../screens/CourierDetailScreen';
import { MainTabs } from './MainTabs';
import { useAuthStore } from '../store/authStore';

export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  ActiveOrder: { orderId: string };
  Dispatcher: undefined;
  DispatcherOrderDetail: { orderId: string };
  Clients: undefined;
  ClientDetail: { phone: string };
  CourierDetail: { courierId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : role === 'dispatcher' ? (
        <>
          <Stack.Screen name="Dispatcher" component={DispatcherScreen} />
          <Stack.Screen
            name="DispatcherOrderDetail"
            component={DispatcherOrderDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Clients"
            component={ClientsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ClientDetail"
            component={ClientDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="CourierDetail"
            component={CourierDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Tabs" component={MainTabs} />
          <Stack.Screen
            name="ActiveOrder"
            component={ActiveOrderScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

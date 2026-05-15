import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { OrdersScreen } from '../screens/OrdersScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import {
  HistoryIcon,
  OrdersIcon,
  ProfileIcon,
} from '../components/courier/TabIcons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const Tab = createBottomTabNavigator();

export const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.label,
      tabBarItemStyle: { paddingTop: 6 },
    }}
  >
    <Tab.Screen
      name="OrdersTab"
      component={OrdersScreen}
      options={{
        title: 'Заказ',
        tabBarIcon: ({ focused, color }) => (
          <OrdersIcon focused={focused} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="HistoryTab"
      component={HistoryScreen}
      options={{
        title: 'Заработок',
        tabBarIcon: ({ focused, color }) => (
          <HistoryIcon focused={focused} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        title: 'Профиль',
        tabBarIcon: ({ focused, color }) => (
          <ProfileIcon focused={focused} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    marginTop: 2,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ── Global web error overlay ─────────────────────────────────────────────────
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const show = (msg: string) => {
    const el = document.getElementById('root');
    if (!el) return;
    el.innerHTML = `<div style="background:#0c0c0c;color:#fff;padding:32px;font-family:monospace;min-height:100vh">
      <p style="color:#fc3f1d;font-size:18px;font-weight:bold;margin:0 0 16px">Ошибка запуска</p>
      <pre style="font-size:12px;white-space:pre-wrap;color:#aaa">${msg}</pre>
    </div>`;
  };
  window.addEventListener('error', (e) => show(e.message + '\n' + (e.error?.stack || '')));
  window.addEventListener('unhandledrejection', (e) =>
    show(String(e.reason?.message || e.reason) + '\n' + (e.reason?.stack || ''))
  );
}

// ── Error boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      const e = this.state.error as Error;
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0c0c0c', padding: 24 }}>
          <Text style={{ color: '#fc3f1d', fontSize: 18, fontWeight: 'bold', marginTop: 60 }}>
            Ошибка рендера
          </Text>
          <Text style={{ color: '#fff', fontSize: 13, marginTop: 12 }}>{e.message}</Text>
          <Text style={{ color: '#666', fontSize: 11, marginTop: 12 }}>{e.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import Constants from 'expo-constants';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SplashScreen as BrandedSplash } from './src/screens/SplashScreen';
import { useAuthStore } from './src/store/authStore';
import { supabase } from './src/lib/supabase';
import { useOrdersStore } from './src/store/ordersStore';
import {
  startLocationTracking,
  stopLocationTracking,
} from './src/utils/locationTracker';
import { setupNotifications } from './src/utils/notifications';
import { colors } from './src/theme/colors';

const isExpoGo = Constants.appOwnership === 'expo';
const isWeb = Platform.OS === 'web';

if (!isWeb) {
  SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

const navTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isOnShift      = useAuthStore((s) => s.isOnShift);
  const role           = useAuthStore((s) => s.role);
  const hydrate        = useOrdersStore((s) => s.hydrate);
  const addAutoOrder   = useOrdersStore((s) => s.addAutoOrder);

  const [fontsLoaded, fontError] = useFonts({
    // Click brand — Instrument Serif
    InstrumentSerif_Regular: require('./assets/fonts/InstrumentSerif_Regular.ttf'),
    InstrumentSerif_Italic:  require('./assets/fonts/InstrumentSerif_Italic.ttf'),
    // Interface — Inter
    Inter_400Regular:    require('./assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium:     require('./assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold:   require('./assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold:       require('./assets/fonts/Inter_700Bold.ttf'),
    Inter_800ExtraBold:  require('./assets/fonts/Inter_800ExtraBold.ttf'),
    // Data / codes — JetBrains Mono (аналог Courier WGL4)
    JetBrainsMono_400Regular: require('./assets/fonts/JetBrainsMono_400Regular.ttf'),
    JetBrainsMono_700Bold:    require('./assets/fonts/JetBrainsMono_700Bold.ttf'),
  });
  // fontError means fonts failed to load — still continue with system font
  const fontsReady = fontsLoaded || !!fontError;

  // Show Click branded splash on first load; web skips it (no Animated/reanimated)
  const [brandedSplashDone, setBrandedSplashDone] = useState(isWeb);

  useEffect(() => {
    hydrate();
    if (!isExpoGo && !isWeb) {
      setupNotifications().catch(() => undefined);
    }
  }, [hydrate]);

  useEffect(() => {
    if (isWeb) return;
    if (isAuthenticated && isOnShift) {
      startLocationTracking().catch(() => undefined);
    } else {
      stopLocationTracking();
    }
  }, [isAuthenticated, isOnShift]);

  // ── Supabase session sync ─────────────────────────────────────────────────────
  // Слушаем только SIGNED_OUT (явный логаут или отзыв сессии Supabase).
  // НЕ чистим стор по getSession()===null на старте: AsyncStorage/Supabase
  // подтягивают токен асинхронно, и при холодном старте на Android
  // getSession() часто отрабатывает раньше, чем хранилище отдаёт сессию —
  // это и вызывало «слетает каждый раз». Диспетчер вообще без Supabase-сессии,
  // его выкидывало гарантированно.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Дополнительная защита: диспетчер логинится локально, без Supabase —
        // его не трогаем, событие SIGNED_OUT для него не релевантно.
        if (useAuthStore.getState().role === 'dispatcher') return;
        useAuthStore.setState({
          isAuthenticated: false,
          role: 'courier',
          courier: null,
          isOnShift: false,
          shiftStartedAt: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Auto-dispatch: новый заказ каждые 30 секунд пока курьер на смене ────────
  useEffect(() => {
    if (!isAuthenticated || role !== 'courier' || !isOnShift) return;
    const id = setInterval(() => {
      addAutoOrder();
    }, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated, role, isOnShift, addAutoOrder]);

  const onLayoutRoot = useCallback(async () => {
    if (fontsReady && !isWeb) {
      await SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsReady]);

  // Fail-safe timer: if fonts hang for some reason, show app anyway after 4s
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!fontsReady && !forceReady) {
    return <View style={{ flex: 1, backgroundColor: colors.bgDark }} />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: colors.bgDark }}
        onLayout={onLayoutRoot}
      >
        <SafeAreaProvider>
          <StatusBar style="light" />
          {brandedSplashDone ? (
            <NavigationContainer theme={navTheme}>
              <RootNavigator />
            </NavigationContainer>
          ) : (
            <BrandedSplash onDone={() => setBrandedSplashDone(true)} />
          )}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

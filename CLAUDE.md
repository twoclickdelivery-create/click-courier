# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npx expo start          # запуск с QR-кодом для Expo Go
npx expo start --web    # запуск в браузере (Safari/Chrome) на http://localhost:8081
npx expo start --ios    # запуск в симуляторе iOS

# Build (EAS)
eas build --platform android --profile preview   # APK для тестирования
eas build --platform android --profile production
eas build --platform ios --profile production
```

**Авторизация:** Supabase Phone OTP (реальные SMS через Twilio).  
При разработке: добавь тестовые номера в Supabase → Authentication → Phone → Test OTP Numbers.  
Для входа как диспетчер — на экране логина переключить роль на «Диспетчер».

**Переменные окружения** (файл `.env` в корне проекта):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## Architecture

### Роли и навигация

Приложение поддерживает две роли: **courier** и **dispatcher**. После логина `RootNavigator` маршрутизирует по роли:
- **Курьер** → `MainTabs` (Заказы / История / Профиль) + стек `ActiveOrder`
- **Диспетчер** → `DispatcherScreen` + `DispatcherOrderDetailScreen`

Стек навигации (`RootStackParamList`) определён в `src/navigation/RootNavigator.tsx`.

### State management

Три Zustand-стора, все с `persist` в AsyncStorage:

| Стор | Файл | Что хранит |
|------|------|-----------|
| `useAuthStore` | `store/authStore.ts` | isAuthenticated, role, courier, isOnShift |
| `useOrdersStore` | `store/ordersStore.ts` | orders[], activeOrderId, todayEarnings |
| `useLocationStore` | `store/locationStore.ts` | текущие координаты курьера (не persist) |

`useOrdersStore.hydrate()` вызывается при старте в `App.tsx` — заполняет моками если стор пустой.

### Жизненный цикл заказа

```
new → going_to_restaurant → at_restaurant → picked_up → going_to_client → at_client → delivered
                                                                                     → cancelled
```

Методы стора: `acceptOrder` → `setOrderStatus` → `attachProofPhoto` → `completeOrder`.

### Web vs Native

Компоненты с картами имеют два варианта:
- `OrderMap.tsx` / `DispatcherMap.tsx` — нативный `react-native-maps` + OpenStreetMap
- `OrderMap.web.tsx` / `DispatcherMap.web.tsx` — заглушка с текстовыми данными (Metro выбирает `.web.tsx` автоматически)

В `App.tsx` есть несколько web-guard'ов: нет SplashScreen, нет location tracking, нет push-уведомлений.

### Theme

Вся дизайн-система в `src/theme/`:
- `colors.ts` — тёмная тема, акцент `#ff4d1a` (primary)
- `typography.ts` — шрифты Syne (заголовки) + JetBrains Mono (тело), spacing, radii

Всегда используй `colors.*`, `typography.*`, `spacing.*` вместо хардкода.

### Supabase

Клиент инициализирован в `src/lib/supabase.ts`. Используется для:
- **Auth**: Phone OTP (`signInWithOtp` → `verifyOtp`). Сессия персистится в AsyncStorage.
- **Profiles**: таблица `profiles` с колонками `id, phone, name, role, transport, created_at`.
- **Session sync**: `App.tsx` при старте проверяет `getSession()` и подписывается на `onAuthStateChange`. При `SIGNED_OUT` очищает Zustand-стор.

SQL для создания таблицы `profiles`:
```sql
create table public.profiles (
  id        uuid references auth.users on delete cascade primary key,
  phone     text,
  name      text,
  role      text default 'courier',
  transport text default 'bicycle',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "user sees own profile"
  on public.profiles for all
  using (auth.uid() = id);
-- Автосоздание профиля при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Данные

Всё работает на моках (`src/data/`). Города Махачкала — координаты ~42.98°N, 47.50°E (`MAKHACHKALA_CENTER`). Рестораны, курьеры и заказы генерируются в `mockOrders.ts` через `generateInitialOrders()`.

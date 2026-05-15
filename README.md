# CLICK Курьер

Мобильное приложение для курьеров и диспетчеров службы доставки **CLICK** в Махачкале.

**Стек:** Expo SDK 54 + React Native + TypeScript (strict) · React Navigation · Zustand (+AsyncStorage persist) · Supabase (Auth: Phone OTP) · react-native-maps + OpenStreetMap.

---

## Быстрый старт

```bash
cd click-courier
npm install
npx expo start          # iOS/Android через Expo Go
npx expo start --web    # быстрый просмотр в браузере
```

Нужен `.env` в корне (см. ниже).

### .env

```
EXPO_PUBLIC_SUPABASE_URL=https://ktxywbukntpuyzssgfks.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
```

Ключ — **publishable** (новый формат Supabase, начинается с `sb_publishable_`). Хранится в Supabase Dashboard → Project Settings → API.

### Тестовый вход

В Supabase Dashboard → Authentication → Phone → **Test OTP Numbers**:

```
+79285553508 = 123456
```

Эти номера обходят реальный SMS-провайдер (Twilio) — код приходит мгновенно без отправки.

В приложении на экране входа можно переключить **роль** (Курьер / Диспетчер) — разные дашборды после логина.

---

## Что внутри (текущая версия)

**Курьер:**
- Логин через Phone OTP (Supabase)
- Заказы: Новые / В работе / История (+ автодиспетчер каждые 30с во время смены)
- Карта (OSM) с маршрутом до ресторана и клиента
- Этапы: еду в ресторан → забираю → везу → передал (+ фото подтверждения)
- Профиль, статистика, переключатель смены, чат с диспетчером

**Диспетчер:**
- Список всех заказов + карта со всеми курьерами
- Назначение заказа курьеру
- Раздел **Клиенты** с тегами: VIP, Частые, Новые, Возвращающиеся, **Потерянные** (30+ дней без заказов)

**Технически:**
- Геолокация раз в 10с пока курьер на смене
- Локальные пуш-уведомления + хаптика
- Persist в AsyncStorage (оффлайн-режим для UI)
- Бизнес-логика в Zustand-сторах, бэк — Supabase (пока только auth, заказы на моках)

---

## Архитектура (коротко)

| Слой | Файлы |
|---|---|
| Точка входа | `App.tsx` — гидрация сторов, session sync, web-guards |
| Навигация | `src/navigation/` — `RootNavigator` (Login → роль → нужный стек), `MainTabs` |
| Экраны | `src/screens/` — по одному на маршрут |
| Стейт | `src/store/` — `authStore`, `ordersStore`, `locationStore`, `clientsStore` |
| Дизайн-система | `src/theme/` — `colors.ts` (бренд `#6E1222`), `typography.ts`, `spacing.ts` |
| Моки | `src/data/` — `mockRestaurants`, `mockOrders`, `mockCouriers` |
| Supabase | `src/lib/supabase.ts` — клиент + AsyncStorage |

Глубже — см. [`CLAUDE.md`](./CLAUDE.md) (архитектурный справочник) и [`docs/BUSINESS_LOGIC.md`](./docs/BUSINESS_LOGIC.md) (бизнес-правила).

---

## Сборка для публикации

Через **EAS Build**.

```bash
npm install -g eas-cli
eas login
eas init
```

В `app.json` уже заполнены:
- `expo.ios.bundleIdentifier`: `ru.clickdelivery.courier`
- `expo.android.package`: `ru.clickdelivery.courier`

Иконки и сплэш — в `assets/`.

```bash
eas build --platform android --profile preview      # APK для теста
eas build --platform android --profile production   # AAB для Google Play
eas build --platform ios --profile production       # для App Store

eas submit --platform android
eas submit --platform ios
```

---

## Куда расти (v2 — продакшен)

1. **Перенести заказы в Supabase** (таблицы `orders`, `restaurants`, `couriers`) + Realtime
2. **Push через Expo Push API** — бэк хранит `push_token`
3. **Background location** — `expo-task-manager` шлёт координаты курьера на сервер пока смена активна
4. **Веб-панель диспетчера** на Next.js (тот же Supabase бэк)
5. **Расширение бизнес-модели:** доставка не только из ресторанов, но и квартир/жилых домов (поле `orderType`, разные формы заказа)
6. **Платежи курьерам** — еженедельные выплаты через банковский API
7. **RLS-политики** для всех таблиц (сейчас RLS только на `profiles`)

---

Сделано для CLICK Delivery, Махачкала.

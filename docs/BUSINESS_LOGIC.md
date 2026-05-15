# Бизнес-логика CLICK Курьер

Этот документ — карта правил, которыми живёт приложение. Код может меняться, но смысл этих правил должен оставаться, либо документ обновляется вместе с кодом.

---

## 1. Роли пользователей

| Роль | Куда попадает после логина | Что делает |
|---|---|---|
| `courier` | `MainTabs` → Заказы / История / Профиль | принимает и доставляет заказы |
| `dispatcher` | `DispatcherScreen` | видит все заказы и курьеров, назначает заказы вручную |

Роль выбирается на экране логина и сохраняется в `authStore.role`.

---

## 2. Жизненный цикл заказа

Тип `OrderStatus` (`src/types/index.ts`):

```
new → going_to_restaurant → at_restaurant → picked_up → going_to_client → at_client → delivered
                                                                                       ↘ cancelled
```

**Переходы** (методы в `ordersStore`):

| Действие | Из | В |
|---|---|---|
| Курьер принимает заказ | `new` | `going_to_restaurant` |
| Прибыл в ресторан | `going_to_restaurant` | `at_restaurant` |
| Забрал заказ | `at_restaurant` | `picked_up` / `going_to_client` |
| Прибыл к клиенту | `going_to_client` | `at_client` |
| Завершил (фото) | `at_client` | `delivered` |
| Отмена в любой момент | * | `cancelled` (с `cancelReason`) |

**Таймстемпы** проставляются автоматически при смене статуса: `acceptedAt`, `pickedUpAt`, `deliveredAt`.

### Причины отмены (`CancelReason`)

- `client_not_answering` — клиент не отвечает
- `address_not_found` — не нашёл адрес
- `restaurant_closed` — ресторан закрыт
- `other` — другая причина

---

## 3. Автодиспетчер

Пока курьер **на смене** (`isOnShift = true`), фоновый таймер каждые **30 секунд** генерирует один новый заказ через `generateAutoOrder()` в `mockOrders.ts`.

Логика временная (моки) — в проде это будет Supabase Realtime-подписка на таблицу `orders` со статусом `new`.

Карточка нового заказа показывается с таймером **15 секунд** на принятие. Не принял — заказ остаётся в общем списке и достанется другому курьеру.

---

## 4. Профили клиентов и теги

Клиент — это **не отдельная сущность в БД**, а агрегация из истории заказов **по номеру телефона**. Логика в `src/store/clientsStore.ts`, типы — `ClientProfile` в `src/types/index.ts`.

### Метрики клиента

- `totalOrders` — всего заказов
- `totalSpent` — сумма по доставленным
- `avgOrderValue` — средний чек
- `firstOrderAt` / `lastOrderAt` — даты первого и последнего заказа
- `addresses[]` — все адреса с `useCount` и `lastUsedAt`
- `favoriteRestaurants[]` — рестораны с `orderCount`

### Правила тегов (`ClientTag`)

Проверяются в порядке ниже, `computeTags()` в `clientsStore.ts`:

| Тег | Условие |
|---|---|
| `lost` | Последний заказ **≥ 30 дней назад**. **Исключающий** — не получает другие теги. |
| `vip` | `totalOrders >= 10` **или** `totalSpent >= 5000 ₽` |
| `frequent` | `totalOrders >= 3` |
| `new` | Первый заказ **≤ 3 дня назад** и `totalOrders == 1` |
| `returning` | `totalOrders > 1` **и** первый заказ старше 10 дней **и** последний в последние 3 дня |

Теги пересчитываются каждый раз при `buildFromOrders(orders)` — это вызывается при гидрации стора и при изменении заказов.

### Сегментация в UI (`ClientsScreen.tsx`)

Фильтры на верхней панели:

- **Все**
- **🌟 VIP** — `tags.includes('vip')`
- **🔁 Частые** — `tags.includes('frequent')` без `lost`
- **🆕 Новые** — `tags.includes('new')`
- **↩️ Возвращающиеся** — `tags.includes('returning')`
- **💔 Потерянные** — `tags.includes('lost')`
- **Остальные** — без выраженных тегов и без `lost`

---

## 5. Оплата курьеру (`EarningsBreakdown`)

Тип в `src/types/index.ts`:

```ts
{
  base: number;          // фиксированная ставка за заказ
  distanceBonus: number; // надбавка за километры
  timeBonus: number;     // бонус за доставку вовремя
  total: number;
}
```

Сейчас используется в моках для красивого отображения в карточке. **Реальная формула пока не зафиксирована** — это решение бизнеса. До запуска в прод нужно:

1. Решить базовую ставку (например, 150₽ за заказ)
2. Решить тариф за км (например, 30₽/км сверх первых 2)
3. Решить порог «вовремя» (например, ≤ оценочного времени + 5 мин) и бонус
4. Заменить моки в `ordersStore` на расчёт по этой формуле

Дневной заработок — `todayEarnings` в `ordersStore`, считается по доставленным за сегодня.

---

## 6. Аутентификация

**Phone OTP через Supabase** (`src/lib/supabase.ts`).

### Поток входа

1. Пользователь вводит телефон (10 цифр после `+7`) и нажимает «Получить код»
2. `supabase.auth.signInWithOtp({ phone: '+7XXXXXXXXXX' })` — Supabase либо отправляет SMS через Twilio, либо (если номер в Test OTP Numbers) принимает фиксированный код
3. Пользователь вводит **6-значный** код, `supabase.auth.verifyOtp(...)`
4. Создаётся сессия, триггер `on_auth_user_created` создаёт строку в `profiles`
5. В `authStore` ставится `isAuthenticated = true`, кладётся `courier` объект

### Session sync (в `App.tsx`)

При старте приложения проверяется `supabase.auth.getSession()`. Если сессии нет, но `authStore.isAuthenticated === true` (после persist) — стор очищается. Подписка на `onAuthStateChange` ловит `SIGNED_OUT` и тоже чистит.

### Тестовые номера

В Supabase Dashboard → Authentication → Phone → **Test OTP Numbers** прописаны пары `номер = код` (например `+79285553508 = 123456`). Эти номера не идут в Twilio — код принимается без SMS.

---

## 7. Supabase: схема

### `profiles`

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
```

### Триггер автосоздания профиля

```sql
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

### Что ещё нужно для v2

- `orders` (со всеми полями `Order`) + RLS: курьер видит свои + новые в его городе, диспетчер видит всё
- `restaurants` (статичный каталог)
- `couriers` (можно отделить от `profiles` или хранить транспорт прямо там)
- Realtime-подписка на `orders.status = 'new'` для пушей курьерам

---

## 8. Что НЕ хранится в БД (намеренно)

- **Клиенты как сущность** — производятся из заказов. Если бизнес скажет «нужны лояльности/баллы» — заведём таблицу `clients` с тем же `phone` как primary key и поднимем туда `totalSpent`, `tags`, etc.
- **История координат курьера** — пока только текущая позиция в `locationStore`. Для аналитики маршрутов нужна отдельная таблица `courier_locations`.
- **Чат с диспетчером** — пока локально, без persist. Перед продом — таблица `messages` с RLS.

---

## 9. Где менять что

| Хочу поменять | Иду в |
|---|---|
| Порог VIP/частый/потерянный | `src/store/clientsStore.ts` → `computeTags()` |
| Цвета и шрифты | `src/theme/colors.ts`, `src/theme/typography.ts` |
| Список ресторанов / клиентов / заказов | `src/data/mockRestaurants.ts`, `mockOrders.ts` |
| Логику оплаты курьеру | `src/store/ordersStore.ts` (методы вокруг `todayEarnings`) |
| Частоту автодиспетчера | `App.tsx` (интервал `setInterval`, сейчас 30000) |
| Шаги жизненного цикла заказа | `src/types/index.ts` (`OrderStatus`) + соответствующие методы стора |
| Auth-провайдер | `src/lib/supabase.ts` |

-- ============================================================================
-- 0001_init_orders_and_iiko.sql
-- Базовая схема для заказов CLICK Courier + интеграция с iikoCloud API.
-- Таблицы: restaurants, iiko_tokens, orders, iiko_webhook_log.
-- ============================================================================

-- ── РЕСТОРАНЫ-ПАРТНЁРЫ ──────────────────────────────────────────────────────
create table public.restaurants (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  city                    text not null default 'Makhachkala',
  phone                   text,
  address                 text,
  -- Координаты ресторана (для маршрута курьеру)
  lat                     numeric(9, 6),
  lon                     numeric(9, 6),
  -- iiko credentials
  iiko_organization_id    text unique,   -- 16-символьный код организации в iiko
  iiko_api_login          text,          -- API login из iikoWeb (в проде — шифровать!)
  -- Статус интеграции
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index restaurants_iiko_org_idx on public.restaurants (iiko_organization_id);

-- ── КЭШ Bearer-ТОКЕНОВ iiko (живут 1 час) ───────────────────────────────────
create table public.iiko_tokens (
  restaurant_id   uuid primary key references public.restaurants(id) on delete cascade,
  token           text not null,
  expires_at      timestamptz not null
);

-- ── ЗАКАЗЫ ───────────────────────────────────────────────────────────────────
-- Один заказ может прийти из iiko (iiko_order_id != null) или быть создан
-- вручную (через диспетчер или Telegram-бота).
create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  number                  text not null,          -- человекочитаемый номер
  status                  text not null default 'new'
    check (status in (
      'new', 'going_to_restaurant', 'at_restaurant', 'picked_up',
      'going_to_client', 'at_client', 'delivered', 'cancelled'
    )),
  -- Привязки
  restaurant_id           uuid references public.restaurants(id) on delete set null,
  courier_id              uuid references auth.users(id) on delete set null,
  -- iiko backlink (null если ручной заказ)
  iiko_order_id           text unique,
  iiko_source_id          text,   -- id источника заказа в iiko (для статусов)
  -- Снимки данных ресторана/клиента (денормализация, чтобы не джойнить на каждый рендер)
  restaurant_name         text,
  restaurant_phone        text,
  restaurant_address      text,
  restaurant_lat          numeric(9, 6),
  restaurant_lon          numeric(9, 6),
  client_name             text,
  client_phone            text,
  client_address          text,
  client_apartment        text,
  client_comment          text,
  client_lat              numeric(9, 6),
  client_lon              numeric(9, 6),
  -- Состав, чек, экономика
  items                   jsonb not null default '[]'::jsonb,
  total                   numeric(10, 2),         -- чек клиента
  payment                 numeric(10, 2),         -- сколько получает курьер
  distance_km             numeric(6, 2),
  estimated_time_min      integer,
  -- Таймстемпы цикла
  created_at              timestamptz not null default now(),
  accepted_at             timestamptz,
  picked_up_at            timestamptz,
  delivered_at            timestamptz,
  -- Доп.
  cancel_reason           text,
  proof_photo_url         text,
  rating                  integer check (rating between 1 and 5)
);

create index orders_status_idx        on public.orders (status);
create index orders_courier_idx       on public.orders (courier_id);
create index orders_restaurant_idx    on public.orders (restaurant_id);
create index orders_created_at_idx    on public.orders (created_at desc);
create unique index orders_iiko_idx   on public.orders (iiko_order_id) where iiko_order_id is not null;

-- ── ЛОГ ВЕБХУКОВ iiko (для дебага и retry) ──────────────────────────────────
create table public.iiko_webhook_log (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid references public.restaurants(id) on delete set null,
  event_type      text,            -- DeliveryOrderUpdate, StopListUpdate, ...
  payload         jsonb not null,
  received_at     timestamptz not null default now(),
  processed       boolean not null default false,
  error           text
);

create index iiko_webhook_log_unprocessed_idx
  on public.iiko_webhook_log (received_at)
  where processed = false;

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table public.restaurants       enable row level security;
alter table public.iiko_tokens       enable row level security;
alter table public.orders            enable row level security;
alter table public.iiko_webhook_log  enable row level security;

-- restaurants: курьер/диспетчер видят активные рестораны (без iiko-кредов)
create policy "anyone authenticated reads restaurants"
  on public.restaurants for select
  to authenticated
  using (is_active = true);

-- iiko_tokens / iiko_webhook_log: только service_role (Edge Functions)
-- (по умолчанию RLS блокирует всё, service_role обходит RLS)

-- orders:
-- - курьер видит свои заказы + новые без курьера (для приёма)
-- - диспетчер видит все
-- Роль определяется по custom claim 'role' в JWT, проставляется в profiles
create policy "courier sees own and unassigned new orders"
  on public.orders for select
  to authenticated
  using (
    courier_id = auth.uid()
    or (status = 'new' and courier_id is null)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'dispatcher'
    )
  );

-- Курьер может взять (заклеймить) свободный новый заказ
create policy "courier accepts a new order"
  on public.orders for update
  to authenticated
  using (status = 'new' and courier_id is null)
  with check (courier_id = auth.uid());

-- Курьер обновляет свои заказы (смена статуса)
create policy "courier updates own order"
  on public.orders for update
  to authenticated
  using (courier_id = auth.uid())
  with check (courier_id = auth.uid());

-- Диспетчер делает всё
create policy "dispatcher full access to orders"
  on public.orders for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'dispatcher')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'dispatcher')
  );

-- ── REALTIME ───────────────────────────────────────────────────────────────
-- Включаем broadcast изменений orders для подписки из мобильного приложения
alter publication supabase_realtime add table public.orders;

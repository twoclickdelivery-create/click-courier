-- ============================================================================
-- 0000_init_profiles.sql
-- Идемпотентная инициализация таблицы profiles + RLS + триггера авторегистрации.
-- Создаёт всё с IF NOT EXISTS / OR REPLACE, чтобы безопасно прогонять
-- на БД, где profiles уже есть (она была заведена вручную через SQL editor).
-- 0001_init_orders_and_iiko.sql ссылается на profiles в RLS-политиках —
-- поэтому эта миграция должна выполниться первой.
-- ============================================================================

create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  phone       text,
  name        text,
  role        text default 'courier',
  transport   text default 'bicycle',
  created_at  timestamptz default now()
);

-- Включаем RLS (no-op если уже включён)
alter table public.profiles enable row level security;

-- Политика: пользователь видит/редактирует только свой профиль.
-- DROP+CREATE — потому что CREATE POLICY IF NOT EXISTS в PG не существует.
drop policy if exists "user sees own profile" on public.profiles;
create policy "user sees own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- Триггер: при создании юзера в auth.users автоматически заводим profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

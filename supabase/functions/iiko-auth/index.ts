// ============================================================================
// iiko-auth — получение и кэш Bearer-токена iikoCloud API.
// ----------------------------------------------------------------------------
// iikoCloud выдаёт токен на 1 час по API-логину.
// Чтобы не дёргать /access_token на каждый запрос — кэшируем в таблице
// iiko_tokens с TTL ~55 минут (с запасом 5 минут до истечения).
//
// Вызов:
//   POST /functions/v1/iiko-auth
//   Body: { "restaurant_id": "<uuid>" }
//   Response: { "token": "...", "expires_at": "2026-06-05T12:34:56Z" }
//
// Для внутреннего использования (вызывается из iiko-webhook и других функций).
// Заголовок Authorization не обязателен — функция сама ходит в БД через
// service_role и обходит RLS.
// ============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const IIKO_API = 'https://api-ru.iiko.services';
// За 5 минут до реального истечения считаем токен «протухшим» — успеем
// перевыпустить, прежде чем iiko его откажется принимать.
const TOKEN_TTL_SAFETY_MS = 5 * 60 * 1000;

interface IikoTokenRow {
  token: string;
  expires_at: string;
}

interface RestaurantRow {
  id: string;
  iiko_api_login: string | null;
  iiko_organization_id: string | null;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { restaurant_id } = await req.json();
    if (!restaurant_id) {
      return json({ error: 'restaurant_id required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Смотрим в кэш — может токен ещё живой
    const { data: cached } = await supabase
      .from('iiko_tokens')
      .select('token, expires_at')
      .eq('restaurant_id', restaurant_id)
      .maybeSingle<IikoTokenRow>();

    if (cached && new Date(cached.expires_at).getTime() > Date.now() + TOKEN_TTL_SAFETY_MS) {
      return json({ token: cached.token, expires_at: cached.expires_at, cached: true });
    }

    // 2. Берём API-логин ресторана
    const { data: rest } = await supabase
      .from('restaurants')
      .select('id, iiko_api_login, iiko_organization_id')
      .eq('id', restaurant_id)
      .maybeSingle<RestaurantRow>();

    if (!rest?.iiko_api_login) {
      return json({ error: 'restaurant has no iiko_api_login' }, 404);
    }

    // 3. Запрашиваем новый токен
    const resp = await fetch(`${IIKO_API}/api/1/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiLogin: rest.iiko_api_login }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      return json({ error: 'iiko auth failed', status: resp.status, body }, 502);
    }

    const { token } = await resp.json() as { token: string };
    // iiko токен живёт 1 час — сохраняем с TTL = 60 минут
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // 4. Кладём в кэш (upsert, т.к. restaurant_id = primary key)
    await supabase
      .from('iiko_tokens')
      .upsert({ restaurant_id, token, expires_at });

    return json({ token, expires_at, cached: false });
  } catch (e) {
    console.error('[iiko-auth] error', e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

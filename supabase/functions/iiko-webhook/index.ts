// ============================================================================
// iiko-webhook — приёмник вебхуков iikoCloud.
// ----------------------------------------------------------------------------
// iiko шлёт POST на наш публичный URL при изменениях заказов, стоп-листа и т.д.
// На этом этапе (Day 1) — только логируем сырой payload в iiko_webhook_log
// и сразу отвечаем 200, чтобы iiko не делал retry. Парсинг и запись в orders
// добавим на Day 3 (см. план релиза).
//
// URL (после деплоя):
//   https://<project>.functions.supabase.co/iiko-webhook
//
// Авторизация:
//   Подписи iiko не требует — защита через секретный path-токен (env IIKO_WEBHOOK_SECRET).
//   Передаём в query: ?secret=<random32>
// ============================================================================

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IikoWebhookEvent {
  eventType?: string;
  organizationId?: string;
  [k: string]: unknown;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  // Защита от случайных POST'ов: проверяем секретный токен в query.
  // (Любой, кто узнает URL без секрета, всё равно ничего не отправит.)
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const expected = Deno.env.get('IIKO_WEBHOOK_SECRET');
  if (expected && secret !== expected) {
    return new Response('forbidden', { status: 403, headers: cors });
  }

  let payload: IikoWebhookEvent | IikoWebhookEvent[] = {};
  try {
    payload = await req.json();
  } catch {
    // iiko может прислать пустое тело при проверке URL — отвечаем OK
    return new Response('ok', { headers: cors });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // iiko шлёт либо одиночное событие, либо массив — нормализуем
  const events = Array.isArray(payload) ? payload : [payload];

  // Маппим organizationId → restaurant_id один раз (большинство вебхуков — от одного ресторана)
  const orgIds = [...new Set(events.map((e) => e.organizationId).filter(Boolean))] as string[];
  const orgToRest = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: rests } = await supabase
      .from('restaurants')
      .select('id, iiko_organization_id')
      .in('iiko_organization_id', orgIds);
    rests?.forEach((r: { id: string; iiko_organization_id: string }) => {
      orgToRest.set(r.iiko_organization_id, r.id);
    });
  }

  // Пишем все события в лог (processed=false — позже обработчик их подберёт)
  const rows = events.map((e) => ({
    restaurant_id: e.organizationId ? orgToRest.get(e.organizationId) ?? null : null,
    event_type: e.eventType ?? null,
    payload: e,
    processed: false,
  }));

  const { error } = await supabase.from('iiko_webhook_log').insert(rows);
  if (error) {
    // Даже если запись не удалась — отдаём 200, чтобы iiko не ретраил бесконечно.
    // Ошибку увидим в логах функции.
    console.error('[iiko-webhook] insert failed', error);
  }

  return new Response(JSON.stringify({ ok: true, received: events.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
});

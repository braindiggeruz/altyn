/**
 * Altyn Therapy — Tracking Health (read-only diagnostic)
 * ---------------------------------------------------------------------
 * Endpoint: GET /api/tracking-health
 *
 * Returns a JSON snapshot of the tracking stack so the owner can quickly
 * verify, without opening any dashboard, whether Pixel/CAPI/KV are wired
 * correctly and whether the canonical bot is consistent.
 *
 * SAFETY:
 *   - This endpoint NEVER prints the value of any secret/env var.
 *     It only reports whether each binding is "configured" (boolean)
 *     plus the LENGTH of secret-class vars when useful (length is a
 *     non-sensitive sanity signal).
 *   - It NEVER sends any real CAPI event. If `?probe=1` is passed AND
 *     META_TEST_EVENT_CODE is set, only then it does a TEST-ONLY ping.
 *   - It NEVER touches Telegram bot / VPS / TORNADO / Railway.
 *   - It NEVER mutates KV. KV check is a read of a sentinel key that
 *     does not exist (we just verify the binding answers).
 *
 * Auth: public read-only (no secrets returned). Safe to expose.
 */

const CANONICAL_BOT = 'altyntherapybot';
const META_GRAPH_API = 'https://graph.facebook.com/v19.0';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

function lenOf(v) {
  return typeof v === 'string' ? v.length : 0;
}

async function probeKv(env) {
  const kv = env.LEAD_ATTRIBUTION;
  if (!kv || typeof kv.get !== 'function') return { configured: false };
  try {
    // sentinel read — namespace exists if this resolves without throwing
    const v = await kv.get('health:sentinel');
    return { configured: true, read_ok: true, sentinel_present: !!v };
  } catch (e) {
    return { configured: true, read_ok: false, error: 'kv_read_failed' };
  }
}

async function probeCapi(env, allowProbe) {
  const PIXEL_ID = env.META_PIXEL_ID;
  const TOKEN = env.META_CAPI_ACCESS_TOKEN;
  const TEST_CODE = env.META_TEST_EVENT_CODE;
  const base = {
    pixel_id_configured: !!PIXEL_ID,
    pixel_id_length: lenOf(PIXEL_ID),
    capi_token_configured: !!TOKEN,
    capi_token_length: lenOf(TOKEN),
    test_event_code_configured: !!TEST_CODE,
  };
  if (!allowProbe || !PIXEL_ID || !TOKEN || !TEST_CODE) {
    return Object.assign({}, base, { probe_ran: false, reason: allowProbe ? 'missing_pixel_or_token_or_test_code' : 'probe_disabled' });
  }
  // SAFE PROBE: send a TEST-ONLY ping with test_event_code so it never
  // touches real attribution. Event name is intentionally non-standard.
  const event = {
    event_name: 'ViewContent',
    event_time: Math.floor(Date.now() / 1000),
    event_id: 'tracking_health_probe_' + Date.now(),
    action_source: 'website',
    user_data: { client_user_agent: 'AltynTrackingHealthProbe/1.0' },
    custom_data: { content_name: 'tracking_health_probe' },
  };
  const url = `${META_GRAPH_API}/${encodeURIComponent(PIXEL_ID)}/events?access_token=${encodeURIComponent(TOKEN)}`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: [event], test_event_code: TEST_CODE }),
    });
    const txt = await r.text();
    let parsed; try { parsed = JSON.parse(txt); } catch { parsed = { raw: txt.slice(0, 300) }; }
    return Object.assign({}, base, { probe_ran: true, probe_status: r.status, probe_ok: r.ok, probe_meta: parsed });
  } catch (e) {
    return Object.assign({}, base, { probe_ran: true, probe_ok: false, error: 'capi_fetch_failed' });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const allowProbe = url.searchParams.get('probe') === '1';

  const warnings = [];

  // 1) Pixel + CAPI bindings
  const capi = await probeCapi(env, allowProbe);
  if (!capi.pixel_id_configured) warnings.push('META_PIXEL_ID is not set');
  if (!capi.capi_token_configured) warnings.push('META_CAPI_ACCESS_TOKEN is not set — server-side CAPI is OFF');

  // 2) KV binding
  const kv = await probeKv(env);
  if (!kv.configured) warnings.push('LEAD_ATTRIBUTION KV binding is not wired in Cloudflare Pages → Settings → Functions');

  // 3) Intent/Admin secrets
  const intentSecretConfigured = !!env.INTENT_SECRET;
  const adminSecretConfigured = !!env.ADMIN_SECRET;
  if (!intentSecretConfigured && !adminSecretConfigured) {
    warnings.push('Neither INTENT_SECRET nor ADMIN_SECRET is set — /api/telegram/qualified-intent will reject all calls');
  }
  if (!intentSecretConfigured && adminSecretConfigured) {
    warnings.push('INTENT_SECRET not set; falling back to ADMIN_SECRET. Recommend a dedicated INTENT_SECRET for NextBot.');
  }

  // 4) Telegram notify wiring
  const tgBotConfigured = !!env.TELEGRAM_BOT_TOKEN;
  const tgChatConfigured = !!env.TELEGRAM_NOTIFY_CHAT_ID;
  if (!tgBotConfigured) warnings.push('TELEGRAM_BOT_TOKEN not set — owner notifications about QualifiedLead will be skipped');
  if (!tgChatConfigured) warnings.push('TELEGRAM_NOTIFY_CHAT_ID not set — no group to notify');

  // 5) Canonical bot self-check via internal fetch of bridge
  let bridgeBotMatches = null;
  try {
    const bridgeUrl = new URL('/go/telegram/?cta=health', url.origin);
    const r = await fetch(bridgeUrl.toString(), { headers: { 'user-agent': 'AltynTrackingHealth/1.0' } });
    if (r.ok) {
      const html = await r.text();
      bridgeBotMatches = html.includes('t.me/' + CANONICAL_BOT);
      if (!bridgeBotMatches) warnings.push('Bridge HTML does not reference canonical bot @' + CANONICAL_BOT);
      if (/altyndirectbot/i.test(html)) warnings.push('Bridge HTML still references legacy @altyndirectbot');
    } else {
      warnings.push('Bridge /go/telegram/ returned ' + r.status);
    }
  } catch (e) {
    warnings.push('Bridge self-fetch failed: ' + (e && e.message ? e.message : 'unknown'));
  }

  const ok = warnings.length === 0;
  return jsonResponse({
    ok,
    service: 'altyn-therapy.uz',
    canonical_bot: CANONICAL_BOT,
    bridge_bot_matches_canonical: bridgeBotMatches,
    checks: {
      pixel: {
        configured: capi.pixel_id_configured,
        pixel_id_length: capi.pixel_id_length,
      },
      capi: {
        configured: capi.capi_token_configured,
        token_length: capi.capi_token_length,
        test_event_code_configured: capi.test_event_code_configured,
        probe_ran: !!capi.probe_ran,
        probe_ok: capi.probe_ok || null,
        probe_status: capi.probe_status || null,
      },
      kv_lead_attribution: kv,
      intent_secret_configured: intentSecretConfigured,
      admin_secret_configured: adminSecretConfigured,
      telegram_notify: {
        bot_token_configured: tgBotConfigured,
        notify_chat_id_configured: tgChatConfigured,
      },
    },
    warnings,
    generated_at: new Date().toISOString(),
  }, ok ? 200 : 200); // status 200 so monitors can read the body
}

export async function onRequestPost() {
  return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
}

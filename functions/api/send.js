// Cloudflare Pages Function — forwards form submissions to Evolution API as a WhatsApp message.
// Required secrets (set via `wrangler pages secret put <NAME> --project-name=programa-indicacao-gh`
// or the Pages dashboard env vars — never hardcode these in source):
//   EVOLUTION_BASE_URL    Evolution API base URL
//   EVOLUTION_INSTANCE    Evolution API instance name
//   EVOLUTION_APIKEY      Evolution API key
//   TARGET_NUMBER         destination WhatsApp number in international format

const REQUIRED_KEYS = ['EVOLUTION_BASE_URL', 'EVOLUTION_INSTANCE', 'EVOLUTION_APIKEY', 'TARGET_NUMBER'];

const buildMessage = (data) => {
  const lines = [
    '*🎯 Nova indicação recebida*',
    '',
    `*Indicador:* ${data.indicador || '—'}`,
    `*Nome:* ${data.nome || '—'}`,
    `*WhatsApp:* ${data.whatsapp || '—'}`,
    `*Segmento:* ${data.segmento || '—'}`,
    '',
    '*Necessidade:*',
    data.necessidade || '—',
    '',
    `_Recebido em ${new Date(data.data || Date.now()).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}_`,
  ];
  return lines.join('\n');
};

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const missing = REQUIRED_KEYS.filter((key) => !env || !env[key]);
  if (missing.length) {
    return new Response(JSON.stringify({ error: 'missing_config', missing }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const baseUrl = env.EVOLUTION_BASE_URL.replace(/\/+$/, '');
  const instance = env.EVOLUTION_INSTANCE;
  const apikey = env.EVOLUTION_APIKEY;
  const number = env.TARGET_NUMBER;

  const evoRes = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey,
    },
    body: JSON.stringify({
      number,
      text: buildMessage(payload),
    }),
  });

  const bodyText = await evoRes.text();
  return new Response(
    JSON.stringify({
      ok: evoRes.ok,
      status: evoRes.status,
      evolution: bodyText.slice(0, 500),
    }),
    {
      status: evoRes.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

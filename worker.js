const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const ALLOWED_ORIGINS = [
  'https://bilal8126.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o));

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!allowed) {
      return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/api/ai' || request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }

    try {
      const body = await request.json();
      const geminiRes = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const text = await geminiRes.text();
      return new Response(text, {
        status: geminiRes.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  },
};

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const DRIVE_BASE  = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPL   = 'https://www.googleapis.com/upload/drive/v3';

const ALLOWED_ORIGINS = [
  'https://bilal8126.github.io',
  'http://localhost',
  'http://127.0.0.1',
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ── Admin Drive token (refresh → access) ─────────────────────
async function getAdminToken(env) {
  if (!env.DRIVE_CLIENT_ID)     throw new Error('Secret DRIVE_CLIENT_ID not set');
  if (!env.DRIVE_CLIENT_SECRET) throw new Error('Secret DRIVE_CLIENT_SECRET not set');
  if (!env.DRIVE_REFRESH_TOKEN) throw new Error('Secret DRIVE_REFRESH_TOKEN not set');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     env.DRIVE_CLIENT_ID,
      client_secret: env.DRIVE_CLIENT_SECRET,
      refresh_token: env.DRIVE_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Token refresh: ' + JSON.stringify(d));
  return d.access_token;
}

// ── Find or create "Tanzeem Gallery" folder ───────────────────
async function getGalleryFolder(token) {
  const q = `name='Tanzeem Gallery' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await fetch(
    `${DRIVE_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  const data = await res.json();
  if (data.files && data.files.length > 0) return data.files[0].id;

  const cr = await fetch(`${DRIVE_BASE}/files`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Tanzeem Gallery', mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = await cr.json();
  return folder.id;
}

// ── Make a Drive file publicly readable ───────────────────────
async function makePublic(fileId, token) {
  await fetch(`${DRIVE_BASE}/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
}

// ── Route: GET /api/gallery/list ──────────────────────────────
async function handleGalleryList(env, origin) {
  const token    = await getAdminToken(env);
  const folderId = await getGalleryFolder(token);
  const q = `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`;
  const res = await fetch(
    `${DRIVE_BASE}/files?` + new URLSearchParams({
      q,
      fields:   'files(id,name,createdTime,description,mimeType)',
      orderBy:  'createdTime desc',
      pageSize: '500',
    }),
    { headers: { Authorization: 'Bearer ' + token } }
  );
  const data = await res.json();
  return json(data, res.status, origin);
}

// ── Route: POST /api/gallery/upload ───────────────────────────
async function handleGalleryUpload(request, env, origin) {
  const token    = await getAdminToken(env);
  const folderId = await getGalleryFolder(token);

  const form     = await request.formData();
  const file     = form.get('file');
  const metaStr  = form.get('metadata') || '{}';
  const meta     = JSON.parse(metaStr);

  const driveMeta = JSON.stringify({
    name:        file.name,
    parents:     [folderId],
    description: JSON.stringify({ occasion: meta.occasion || 'General', note: meta.note || '', date: meta.date || '' }),
  });

  const driveForm = new FormData();
  driveForm.append('metadata', new Blob([driveMeta], { type: 'application/json' }));
  driveForm.append('file', file);

  const res = await fetch(
    `${DRIVE_UPL}/files?uploadType=multipart&fields=id,name,createdTime,description`,
    { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: driveForm }
  );
  const uploaded = await res.json();

  // Make the uploaded photo publicly readable so thumbnails load for all users
  if (uploaded.id) await makePublic(uploaded.id, token);

  return json(uploaded, res.status, origin);
}

// ── Route: DELETE /api/gallery/delete?id=X ───────────────────
async function handleGalleryDelete(url, env, origin) {
  const fileId = url.searchParams.get('id');
  if (!fileId) return json({ error: 'Missing id' }, 400, origin);
  const token = await getAdminToken(env);
  const res = await fetch(`${DRIVE_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  });
  return new Response(null, { status: res.status === 204 ? 204 : res.status, headers: corsHeaders(origin) });
}

// ── Route: GET /api/gallery/download?id=X&name=Y ─────────────
async function handleGalleryDownload(url, env, origin) {
  const fileId = url.searchParams.get('id');
  const name   = url.searchParams.get('name') || 'tanzeem-photo.jpg';
  if (!fileId) return json({ error: 'Missing id' }, 400, origin);
  const token = await getAdminToken(env);
  const res = await fetch(`${DRIVE_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  return new Response(res.body, {
    status: res.status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type':        res.headers.get('Content-Type') || 'image/jpeg',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}

// ── Route: POST /api/ai ───────────────────────────────────────
async function handleAI(request, env, origin) {
  const body = await request.json();
  const res  = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ── Main handler ──────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin  = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o));

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (!allowed) {
      return new Response('Forbidden', { status: 403 });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/ai' && request.method === 'POST') {
        return await handleAI(request, env, origin);
      }
      if (url.pathname === '/api/gallery/list' && request.method === 'GET') {
        return await handleGalleryList(env, origin);
      }
      if (url.pathname === '/api/gallery/upload' && request.method === 'POST') {
        return await handleGalleryUpload(request, env, origin);
      }
      if (url.pathname === '/api/gallery/delete' && request.method === 'DELETE') {
        return await handleGalleryDelete(url, env, origin);
      }
      if (url.pathname === '/api/gallery/download' && request.method === 'GET') {
        return await handleGalleryDownload(url, env, origin);
      }
    } catch (e) {
      return json({ error: e.message }, 500, origin);
    }

    return new Response('Not found', { status: 404 });
  },
};

// Deploy via GitHub Actions (not wrangler deploy — that uploads static assets)
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
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

// ── Web Push helpers (VAPID + RFC 8291 aes128gcm encryption) ─

function b64url(data) {
  const bytes = data instanceof Uint8Array ? data :
                data instanceof ArrayBuffer ? new Uint8Array(data) :
                new TextEncoder().encode(typeof data === 'string' ? data : JSON.stringify(data));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function b64urlDecode(str) {
  const pad = '='.repeat((4 - str.length % 4) % 4);
  return Uint8Array.from(atob(str.replace(/-/g,'+').replace(/_/g,'/') + pad), c => c.charCodeAt(0));
}

async function hkdf(salt, ikm, info, len) {
  const saltKey = await crypto.subtle.importKey('raw', salt, {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const prk     = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));
  const prkKey  = await crypto.subtle.importKey('raw', prk,  {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  let t = new Uint8Array(0);
  const out = new Uint8Array(len);
  let pos = 0;
  for (let i = 1; pos < len; i++) {
    const msg = new Uint8Array(t.length + info.length + 1);
    msg.set(t); msg.set(info, t.length); msg[t.length + info.length] = i;
    t = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, msg));
    const take = Math.min(t.length, len - pos);
    out.set(t.subarray(0, take), pos); pos += take;
  }
  return out;
}

async function buildVapidJwt(env, audience) {
  const te      = s => new TextEncoder().encode(s);
  const header  = b64url(JSON.stringify({ typ:'JWT', alg:'ES256' }));
  const payload = b64url(JSON.stringify({ aud: audience, exp: Math.floor(Date.now()/1000)+43200, sub:`mailto:${env.VAPID_EMAIL}` }));
  const unsigned = `${header}.${payload}`;
  const jwk = JSON.parse(env.VAPID_PRIVATE_KEY_JWK);
  const key = await crypto.subtle.importKey('jwk', jwk, {name:'ECDSA',namedCurve:'P-256'}, false, ['sign']);
  const sig  = await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'}, key, te(unsigned));
  return `${unsigned}.${b64url(sig)}`;
}

async function encryptPushPayload(sub, plaintext) {
  const te = s => new TextEncoder().encode(s);
  const recipientPub = b64urlDecode(sub.keys.p256dh);
  const authSecret   = b64urlDecode(sub.keys.auth);
  const payload      = typeof plaintext === 'string' ? te(plaintext) : plaintext;

  const senderKP  = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'}, true, ['deriveBits']);
  const senderPub = new Uint8Array(await crypto.subtle.exportKey('raw', senderKP.publicKey));
  const recvKey   = await crypto.subtle.importKey('raw', recipientPub, {name:'ECDH',namedCurve:'P-256'}, false, []);
  const ecdhSec   = new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:recvKey}, senderKP.privateKey, 256));
  const salt      = crypto.getRandomValues(new Uint8Array(16));

  const authInfo = new Uint8Array([...te('WebPush: info\x00'), ...recipientPub, ...senderPub]);
  const ikm      = await hkdf(authSecret, ecdhSec, authInfo, 32);
  const cek      = await hkdf(salt, ikm, te('Content-Encoding: aes128gcm\x00'), 16);
  const nonce    = await hkdf(salt, ikm, te('Content-Encoding: nonce\x00'), 12);

  const padded = new Uint8Array([...payload, 0x02]);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce}, aesKey, padded));

  const rs  = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  const out = new Uint8Array(86 + cipher.length); // salt(16)+rs(4)+idlen(1)+pub(65)=86
  let p = 0;
  out.set(salt, p); p+=16; out.set(rs, p); p+=4; out[p++]=65; out.set(senderPub,p); p+=65; out.set(cipher,p);
  return out;
}

async function dispatchPush(env, sub, title, body) {
  const audience = new URL(sub.endpoint).origin;
  const jwt    = await buildVapidJwt(env, audience);
  const cipher = await encryptPushPayload(sub, JSON.stringify({ title, body }));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { 'Authorization':`vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`, 'Content-Type':'application/octet-stream', 'Content-Encoding':'aes128gcm', 'TTL':'86400' },
    body: cipher,
  });
  if (!res.ok && res.status !== 201 && res.status !== 202) throw new Error(`Push ${res.status}`);
  return res.status;
}

// ── Route: POST /api/push/subscribe ──────────────────────────
async function handlePushSubscribe(request, env, origin) {
  if (!env.PUSH_SUBS) return json({error:'PUSH_SUBS KV not bound'},500,origin);
  const { subscription, email } = await request.json();
  if (!subscription?.endpoint || !subscription?.keys) return json({error:'Invalid subscription'},400,origin);
  const raw  = await env.PUSH_SUBS.get('subscriptions');
  const subs = raw ? JSON.parse(raw) : [];
  const idx  = subs.findIndex(s => s.email === email || s.endpoint === subscription.endpoint);
  if (idx >= 0) subs[idx] = { ...subscription, email };
  else subs.push({ ...subscription, email });
  await env.PUSH_SUBS.put('subscriptions', JSON.stringify(subs));
  return json({ ok: true }, 200, origin);
}

// ── Route: POST /api/push/notify ─────────────────────────────
async function handlePushNotify(request, env, origin) {
  if (!env.PUSH_SUBS) return json({error:'PUSH_SUBS KV not bound'},500,origin);
  const { title, body } = await request.json();
  if (!title) return json({error:'title required'},400,origin);
  const raw  = await env.PUSH_SUBS.get('subscriptions');
  if (!raw)  return json({ sent:0, total:0 }, 200, origin);
  const subs = JSON.parse(raw);
  const results = await Promise.allSettled(subs.map(s => dispatchPush(env, s, title, body || '')));
  return json({ sent: results.filter(r=>r.status==='fulfilled').length, total: subs.length }, 200, origin);
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
      if (url.pathname === '/api/push/subscribe' && request.method === 'POST') {
        return await handlePushSubscribe(request, env, origin);
      }
      if (url.pathname === '/api/push/notify' && request.method === 'POST') {
        return await handlePushNotify(request, env, origin);
      }
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

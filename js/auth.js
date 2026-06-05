let _tokenClient  = null;
let _refreshTimer = null;
const _AUTH_FLAG  = 'tanzeem_signed_in';
const _SCOPES     = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

// ── GIS silent token refresh (no popup if Google session active) ──
function _scheduleRefresh() {
  clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(() => {
    if (_tokenClient) _tokenClient.requestAccessToken({ prompt: '' });
  }, 55 * 60 * 1000); // 55 min — before 1-hour expiry
}

function loadGoogleScript() {
  return new Promise(resolve => {
    if (window.google) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

// Called on page load — restores session from cache without needing a token
function checkAutoSignIn() {
  const hasFlag = !!localStorage.getItem(_AUTH_FLAG);
  if (!hasFlag) return;

  // Restore saved profile (name, photo, email)
  const savedName  = localStorage.getItem('tanzeem_user_display') || '';
  const savedPhoto = localStorage.getItem('tanzeem_user_photo') || '';
  if (savedName || savedPhoto) _setAvatar(savedName, savedPhoto);
  STATE.loggedInEmail = localStorage.getItem('tanzeem_logged_email') || '';

  // Restore sessions from localStorage cache (no token needed)
  if (typeof loadSessionsFromCache === 'function') loadSessionsFromCache();

  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  loadAllData(false); // serve from localStorage cache; no token required
}

function _setAvatar(name, photoUrl) {
  const el = document.getElementById('userAvatar');
  if (!el) return;
  if (photoUrl) {
    el.innerHTML = `<img src="${photoUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.parentElement.textContent='${(name||'').slice(0,2).toUpperCase()}'">`;
  } else if (name) {
    const word = name.trim().split(/[\s@._/]+/)[0].replace(/[^a-zA-Z؀-ۿ]/g, '');
    el.textContent = word.slice(0, 2).toUpperCase();
  }
}

async function _fetchAndStoreProfile(token) {
  try {
    const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => r.json());
    const name  = info.given_name || (info.name || '').split(' ')[0] || '';
    const photo = info.picture || '';
    const email = info.email || '';
    if (name)  localStorage.setItem('tanzeem_user_display', name);
    if (photo) localStorage.setItem('tanzeem_user_photo', photo);
    if (email) localStorage.setItem('tanzeem_logged_email', email);
    _setAvatar(name, photo);
  } catch(e) { /* keep default */ }
}

function showProfileMenu() {
  const name  = localStorage.getItem('tanzeem_user_display') || '';
  const email = localStorage.getItem('tanzeem_logged_email') || '';
  const photo = localStorage.getItem('tanzeem_user_photo') || '';

  let ov = document.getElementById('profileMenuOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'profileMenuOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:flex-start;justify-content:flex-end;padding:60px 12px 0';
    ov.addEventListener('click', e => { if (e.target === ov) closeProfileMenu(); });
    document.body.appendChild(ov);
  }

  ov.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:24px 20px;width:260px;box-shadow:0 8px 40px rgba(0,0,0,0.18)">
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:20px">
        ${photo
          ? `<img src="${photo}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #f0fdf4">`
          : `<div style="width:72px;height:72px;border-radius:50%;background:#0f4a29;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800">${name.slice(0,2).toUpperCase()}</div>`
        }
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:800;color:#0f172a">${name}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px">${email}</div>
        </div>
      </div>
      <button onclick="closeProfileMenu();signOut()" style="width:100%;padding:12px;background:#fff1f2;border:1.5px solid #fecdd3;border-radius:12px;color:#be123c;font-weight:700;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </button>
    </div>`;
  ov.style.display = 'flex';
  _histPush({ modal: 'profileMenu' });
}

function closeProfileMenu() {
  _histBack();
  const ov = document.getElementById('profileMenuOverlay');
  if (ov) ov.style.display = 'none';
}

const _VAPID_PUBLIC_KEY = 'BBGQBmrCTi6Ob49n5Jk1qV2BqqVpjPJ7llLu4qUbLUkSHDuB3zl8OznvjUmYGZgD7aacCYtcOE97_GkudaUns78';

function _vapidKey() {
  const pad = '='.repeat((4 - _VAPID_PUBLIC_KEY.length % 4) % 4);
  const str = atob((_VAPID_PUBLIC_KEY + pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(str, c => c.charCodeAt(0));
}

function _pushNotify(title, body) {
  fetch(CONFIG.WORKER_URL + '/api/push/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body })
  }).catch(() => {});
}

async function subscribePush() {
  if (!('PushManager' in window) || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub   = await reg.pushManager.getSubscription();
    if (!sub) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: _vapidKey() });
    }
    const email = STATE.loggedInEmail || localStorage.getItem('tanzeem_logged_email') || '';
    await fetch(CONFIG.WORKER_URL + '/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), email })
    });
  } catch(e) { /* silently ignore */ }
}

async function _checkAuthUser(token) {
  try {
    const [tokenInfo, sheetRes] = await Promise.all([
      fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`).then(r => r.json()),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Auth%20Users!A:A`, {
        headers: { Authorization: 'Bearer ' + token }
      }).then(r => r.json())
    ]);

    const email       = (tokenInfo.email || '').toLowerCase().trim();
    const name        = email.split('@')[0] || '';
    const allowedRows = sheetRes.values || [];
    const allowed     = allowedRows.flat().map(e => (e || '').toLowerCase().trim());

    const ADMIN_EMAILS = ['erhacker81@gmail.com', 'hello.iambilalansari@gmail.com'];
    if (!email) return { ok: false, email: '' };
    if (ADMIN_EMAILS.includes(email) || allowed.includes(email)) return { ok: true, email, name };
    return { ok: false, email };
  } catch(e) {
    return { ok: true, email: '' }; // if sheet unreachable, fail open
  }
}

async function signIn() {
  try {
    await loadGoogleScript();
    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: _SCOPES,
      callback: async (resp) => {
        if (resp.error) { showToast('Sign in failed: ' + resp.error, 'error'); return; }

        // Check if user is authorized
        const auth = await _checkAuthUser(resp.access_token);
        if (!auth.ok) {
          showToast(`Access denied — ${auth.email || 'this account'} is not authorized`, 'error');
          return;
        }

        STATE.accessToken = resp.access_token;
        STATE.loggedInEmail = auth.email;
        _scheduleRefresh();
        localStorage.setItem(_AUTH_FLAG, '1');
        _fetchAndStoreProfile(resp.access_token);
        subscribePush();
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        if (typeof loadSessionsConfig === 'function') await loadSessionsConfig();
        await loadAllData();
      }
    });
    _tokenClient.requestAccessToken();
  } catch (e) {
    showToast('Sign in error: ' + e.message, 'error');
  }
}

async function syncData() {
  try {
    await loadGoogleScript();
    const onToken = async (resp) => {
      if (resp.error) { showToast('Sync failed: ' + resp.error, 'error'); return; }

      // Verify same account as original login
      const savedEmail = STATE.loggedInEmail || localStorage.getItem('tanzeem_logged_email');
      if (savedEmail) {
        const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${resp.access_token}`).then(r => r.json()).catch(() => ({}));
        const newEmail = (info.email || '').toLowerCase().trim();
        if (newEmail && newEmail !== savedEmail) {
          showToast(`Wrong account — please sign in as ${savedEmail}`, 'error');
          return;
        }
      }

      STATE.accessToken = resp.access_token;
      _scheduleRefresh();
      if (typeof reloadSessionsConfig === 'function') await reloadSessionsConfig();
      await loadAllData(true);
    };
    if (!_tokenClient) {
      _tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: _SCOPES,
        callback: onToken
      });
    } else {
      _tokenClient.callback = onToken;
    }
    // prompt:'' tries silent token refresh; shows popup only if required
    _tokenClient.requestAccessToken({ prompt: '' });
  } catch (e) {
    showToast('Sync error: ' + e.message, 'error');
  }
}

function signOut() {
  showConfirm(
    'Sign Out',
    'Tanzeem Abd-e-Mustafa se sign out karna chahte hain?',
    () => {
      STATE.accessToken = null;
      STATE.loggedInEmail = '';
      localStorage.removeItem(_AUTH_FLAG);
      localStorage.removeItem('tanzeem_user_display');
      localStorage.removeItem('tanzeem_user_photo');
      localStorage.removeItem('tanzeem_logged_email');
      document.getElementById('mainApp').style.display = 'none';
      document.getElementById('setupScreen').style.display = 'flex';
      const av = document.getElementById('userAvatar');
      if (av) {
        av.innerHTML = '<svg id="avatarIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>';
      }
      showToast('Sign out ho gaye ✓');
    }
  );
}

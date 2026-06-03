let _tokenClient  = null;
let _refreshTimer = null;
const _AUTH_FLAG  = 'tanzeem_signed_in';

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
  // Also check sessions cache or any tanzeem data cache (covers users before flag was added)
  const hasSessionsCache  = !!localStorage.getItem('tanzeem_sessions_v1');
  const hasCachedData     = hasSessionsCache ||
    CONFIG.SESSIONS.some(s => !!localStorage.getItem('tanzeem_v1_' + s.label));

  if (!hasFlag && !hasCachedData) return;

  // Ensure flag is set for future loads
  localStorage.setItem(_AUTH_FLAG, '1');

  // Restore saved user display name
  const savedName = localStorage.getItem('tanzeem_user_display');
  if (savedName) _setAvatar(savedName);

  // Restore sessions from localStorage cache (no token needed)
  if (typeof loadSessionsFromCache === 'function') loadSessionsFromCache();

  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  loadAllData(false); // serve from localStorage cache; no token required
}

// Update avatar with first-name initials (max 2 chars, never URL-like)
function _setAvatar(name) {
  const el = document.getElementById('userAvatar');
  if (!el || !name) return;
  // Take only first word, strip special chars, max 2 letters → initials
  const word = name.trim().split(/[\s@._/]+/)[0].replace(/[^a-zA-Z؀-ۿ]/g, '');
  const initials = word.slice(0, 2).toUpperCase();
  if (initials) {
    el.textContent = initials;
    el.title = name.split(/[\s@._/]+/)[0] + ' — Sign Out';
  }
}

// Fetch Google user profile to show proper initials in avatar
async function _fetchUserInfo(token) {
  try {
    const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(r => r.json());
    const display = info.given_name || (info.name || '').split(' ')[0] || '';
    if (display) {
      localStorage.setItem('tanzeem_user_display', display);
      _setAvatar(display);
    }
  } catch(e) { /* keep default person icon */ }
}

async function signIn() {
  try {
    await loadGoogleScript();
    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: async (resp) => {
        if (resp.error) { showToast('Sign in failed: ' + resp.error, 'error'); return; }
        STATE.accessToken = resp.access_token;
        _scheduleRefresh(); // auto-refresh 55 min from now
        localStorage.setItem(_AUTH_FLAG, '1');
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        _fetchUserInfo(resp.access_token);
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
      STATE.accessToken = resp.access_token;
      _scheduleRefresh(); // auto-refresh 55 min from now
      if (typeof reloadSessionsConfig === 'function') await reloadSessionsConfig();
      await loadAllData(true);
    };
    if (!_tokenClient) {
      _tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.CLIENT_ID,
        scope: CONFIG.SCOPES,
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
      localStorage.removeItem(_AUTH_FLAG);
      localStorage.removeItem('tanzeem_user_display');
      document.getElementById('mainApp').style.display = 'none';
      document.getElementById('setupScreen').style.display = 'flex';
      // Reset avatar back to person icon
      const av = document.getElementById('userAvatar');
      if (av) {
        av.innerHTML = '<svg id="avatarIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>';
        av.title = 'Sign Out';
      }
      showToast('Sign out ho gaye ✓');
    }
  );
}

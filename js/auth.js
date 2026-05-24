let _tokenClient = null;
const _AUTH_FLAG = 'tanzeem_signed_in';

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
  // Also check for cached session data (covers users signed in before flag was added)
  const hasCachedData = CONFIG.SESSIONS.some(s => !!localStorage.getItem('tanzeem_v1_' + s.label));

  if (!hasFlag && !hasCachedData) return;

  // Ensure flag is set for future loads
  localStorage.setItem(_AUTH_FLAG, '1');

  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  loadAllData(false); // serve from localStorage cache; no token required
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
        localStorage.setItem(_AUTH_FLAG, '1');
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
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
  if (!confirm('Sign out of Tanzeem Abd-e-Mustafa?')) return;
  STATE.accessToken = null;
  localStorage.removeItem(_AUTH_FLAG);
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'flex';
  showToast('Signed out');
}

let _tokenClient = null;

function loadGoogleScript() {
  return new Promise(resolve => {
    if (window.google) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = resolve;
    document.head.appendChild(s);
  });
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
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        await loadAllData(); // uses localStorage cache if available
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
    // Reuse existing token client, updating callback for sync
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
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'flex';
  showToast('Signed out');
}

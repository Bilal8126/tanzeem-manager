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
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: CONFIG.SCOPES,
      callback: async (resp) => {
        if (resp.error) { showToast('Sign in failed: ' + resp.error, 'error'); return; }
        STATE.accessToken = resp.access_token;
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        await loadAllData();
      }
    });
    tokenClient.requestAccessToken();
  } catch (e) {
    showToast('Sign in error: ' + e.message, 'error');
  }
}

function signOut() {
  if (!confirm('Sign out of Tanzeem Manager?')) return;
  STATE.accessToken = null;
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'flex';
  showToast('Signed out');
}

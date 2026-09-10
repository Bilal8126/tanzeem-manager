const STATE = {
  accessToken:       null,
  currentScreen:     'dashboard',
  currentSessionIdx: 0,
  currentSession:    null,
  currentFinanceTab: 'donations',
  memberFilter:          'all',
  memberSessionFilter:   'all',
  memberSortMode:        'default', // 'default' | 'date' | 'alpha'
  memberSortDir:         'desc',    // 'asc' | 'desc' — applies to whichever mode is active
  selectedPaymentMonth:  null,
  dashChart:         null,
  allMembers:        [],
  allPayments:       [],
  allDonations:      [],
  allExpenses:       [],
  sessionSummary: {
    lastYearBalance: 0,
    currentTotal:    0,
    totalDonation:   0,
    grandTotal:      0,
    totalExpense:    0,
    balance:         0
  }
};

function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type === 'error' ? '#e53e3e' : '#1a6b3c';
  t.style.color = '#fff';
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

function showLoading(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '<div class="loading">Loading...</div>';
}

function formatCurrency(val) {
  return 'Rs.' + Math.round(parseFloat(val) || 0).toLocaleString();
}

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

function setSyncLoading(on) {
  const btn = document.getElementById('syncBtn');
  if (!btn) return;
  btn.disabled = on;
  btn.classList.toggle('spinning', on);
}

function updateSyncStatus(ts) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  if (!ts) { el.textContent = ''; return; }
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1)        el.textContent = 'just now';
  else if (mins < 60)  el.textContent = mins + 'm ago';
  else if (mins < 2880) el.textContent = Math.round(mins / 60) + 'h ago';
  else                 el.textContent = Math.round(mins / 1440) + 'd ago';
}

// ── Idle re-sync: app minimized/backgrounded for 30s+, then reopened ──
// (First-ever app open already force-syncs immediately via checkAutoSignIn().)
let _bgHiddenAt = null;
const IDLE_SYNC_MS = 30000;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    _bgHiddenAt = Date.now();
  } else if (document.visibilityState === 'visible') {
    const wasIdleLongEnough = _bgHiddenAt && (Date.now() - _bgHiddenAt) >= IDLE_SYNC_MS;
    _bgHiddenAt = null;
    if (wasIdleLongEnough && document.getElementById('mainApp').style.display !== 'none') {
      _showSyncPrompt();
    }
  }
});

function _showSyncPrompt() {
  const el = document.getElementById('syncPromptOverlay');
  if (el) el.style.display = 'flex';
}

function _hideSyncPrompt() {
  const el = document.getElementById('syncPromptOverlay');
  if (el) el.style.display = 'none';
}

async function _runIdleSync() {
  const icon = document.getElementById('syncPromptIcon');
  const text = document.getElementById('syncPromptText');
  const sub  = document.getElementById('syncPromptSub');
  const btn  = document.getElementById('syncPromptBtn');
  if (icon) icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .9s linear infinite"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;
  if (text) text.textContent = 'Syncing…';
  if (sub)  sub.textContent  = 'Thoda intezaar karein';
  if (btn)  { btn.disabled = true; btn.style.opacity = '0.6'; btn.textContent = 'Syncing…'; }

  await syncData();
  _hideSyncPrompt();

  // Reset back to the default prompt state for next time
  if (icon) icon.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`;
  if (text) text.textContent = 'Naya data ho sakta hai';
  if (sub)  sub.textContent  = 'Latest data ke liye sync karna zaroori hai';
  if (btn)  { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Sync Now'; }
}

// ── PWA Install Prompt ───────────────────────────────────
let _installPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _installPrompt = e;
  _showInstallBanner('android');
});

window.addEventListener('appinstalled', () => {
  _hideInstallBanner();
  _installPrompt = null;
});

function _showInstallBanner(type) {
  if (document.getElementById('installBanner')) return;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return; // already installed

  if (type === 'ios' && !isIOS) return;
  if (type === 'android' && isIOS) return;

  const msg = isIOS
    ? 'Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong> to install'
    : 'Install <strong>Tanzeem</strong> as an app for quick access';

  const banner = document.createElement('div');
  banner.id = 'installBanner';
  banner.style.cssText = [
    'position:fixed', 'bottom:88px', 'left:12px', 'right:12px', 'z-index:9999',
    'background:linear-gradient(135deg,#0f4a29,#1a6b3c)', 'color:#fff',
    'border-radius:16px', 'padding:12px 14px', 'display:flex', 'align-items:center',
    'gap:10px', 'box-shadow:0 4px 20px rgba(0,0,0,0.3)', 'font-size:14px',
    'animation:fadeUp 0.3s ease-out'
  ].join(';');

  banner.innerHTML = `
    <img src="icons/icon.svg?v=2" style="width:28px;height:28px;border-radius:8px;flex-shrink:0" alt="">
    <span style="flex:1;line-height:1.4">${msg}</span>
    ${isIOS ? '' : '<button onclick="installApp()" style="background:#22c55e;color:#fff;border:none;border-radius:10px;padding:7px 14px;font-weight:600;cursor:pointer;white-space:nowrap;font-size:13px">Install</button>'}
    <button onclick="_hideInstallBanner()" style="background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:16px;line-height:1">×</button>
  `;

  document.body.appendChild(banner);

  // Auto-hide after 12 seconds
  setTimeout(_hideInstallBanner, 12000);
}

function _hideInstallBanner() {
  const b = document.getElementById('installBanner');
  if (b) b.remove();
}

async function installApp() {
  if (!_installPrompt) return;
  _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  if (outcome === 'accepted') _hideInstallBanner();
  _installPrompt = null;
}

// ── Name matching (tolerates 1-char spelling differences) ─
function normName(n) { return (n || '').toLowerCase().replace(/\(.*?\)/g, '').trim().replace(/\s+/g, ' '); }

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({length: m + 1}, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function nameMatch(a, b) {
  a = normName(a);
  b = normName(b);
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  // Full names (with space): stricter — 1 edit only if 13+ chars (prevents Kamal/Jamal false match)
  if (a.includes(' ') || b.includes(' ')) {
    return levenshtein(a, b) <= Math.floor(maxLen / 13);
  }
  // Single words (surnames): allow 1 edit per 7 chars (handles Siddiqi/Siddiqui etc.)
  return levenshtein(a, b) <= Math.max(1, Math.floor(maxLen / 7));
}

// ── Auto-sync + wait for access token ────────────────────
// Instead of blocking with an error, auto-triggers syncData() and waits
// for the token to arrive (up to 8s). Returns true when ready.
async function _ensureWriteAccess() {
  if (STATE.accessToken) return true;
  showToast('Auto-sync ho raha hai... thoda wait karein 🔄');
  syncData(); // triggers silent OAuth token refresh (no popup if already logged in)
  for (let i = 0; i < 16; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (STATE.accessToken) return true;
  }
  showToast('Sync nahi ho paya — please manually sync karein', 'error');
  return false;
}

// ── Activity history tracker ──────────────────────────────
function _trackHistory(action, details, viaAI = false) {
  const admin   = (localStorage.getItem('tanzeem_user_display') || STATE.loggedInEmail || localStorage.getItem('tanzeem_logged_email') || 'Unknown') + (viaAI ? ' (via AI)' : '');
  const session = STATE.currentSession?.label || '';
  // Convert to IST manually for reliable AM/PM across all browsers
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const pad  = n => String(n).padStart(2, '0');
  const h    = ist.getHours();
  const ts   = `${pad(ist.getDate())}/${pad(ist.getMonth()+1)}/${ist.getFullYear()} ${pad(h%12||12)}:${pad(ist.getMinutes())} ${h>=12?'PM':'AM'}`;
  sheetsAppendRaw('TrackHistory', [[ts, action, details, session, admin]]).catch(() => {});
}

// ── Column letter helper (0-indexed) ─────────────────────
function colLetter(n) {
  let s = '';
  n++;
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

// ── Confirmation modal ────────────────────────────────────
function showConfirm(title, body, onYes) {
  let overlay = document.getElementById('confirmOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'confirmOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '300';
    overlay.innerHTML = `
      <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-handle"></div>
        <div id="confirmContent"></div>
      </div>`;
    overlay.addEventListener('click', closeConfirm);
    document.body.appendChild(overlay);
  }
  document.getElementById('confirmContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${title}</div>
      <button class="close-btn" id="confirmCloseBtn" onclick="closeConfirm()">×</button>
    </div>
    <p style="color:var(--muted);font-size:14px;margin-bottom:22px;line-height:1.6">${body}</p>
    <div style="display:flex;gap:10px">
      <button class="btn btn-secondary" style="flex:1" id="confirmNoBtn" onclick="closeConfirm()">Nahi, Cancel</button>
      <button class="btn btn-primary" style="flex:1" id="confirmYesBtn">Haan, Confirm</button>
    </div>`;
  const yesBtn   = document.getElementById('confirmYesBtn');
  const noBtn    = document.getElementById('confirmNoBtn');
  const closeBtn = document.getElementById('confirmCloseBtn');
  const yesLabel = yesBtn.innerHTML;
  yesBtn.onclick = async () => {
    if (yesBtn.disabled) return; // guard against double-tap
    yesBtn.disabled = closeBtn.disabled = noBtn.disabled = true;
    yesBtn.style.opacity = '0.7';
    yesBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite;margin-right:7px;vertical-align:-3px"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Processing...`;
    try {
      await onYes();
    } finally {
      yesBtn.disabled = closeBtn.disabled = noBtn.disabled = false;
      yesBtn.style.opacity = '1';
      yesBtn.innerHTML = yesLabel;
      closeConfirm();
    }
  };
  _histPush({ modal: 'confirm' });
  overlay.classList.add('open');
}

function closeConfirm() {
  _histBack();
  document.getElementById('confirmOverlay')?.classList.remove('open');
}

// ── Validation alert modal (centered, blurred backdrop) ───
// Shared message for every "this needs the active session" block — names both
// the actually-active session and whichever one the user currently has open,
// so it's obvious what to do (switch to the active one) instead of just "no".
function _sessionLockedMsg(action) {
  action = action || 'Edit karne';
  const activeSession   = CONFIG.SESSIONS.find(s => s.active)?.label || '—';
  const selectedSession = STATE.currentSession?.label || CONFIG.SESSIONS[STATE.currentSessionIdx]?.label || '—';
  return `Ye kaam sirf Active session mein ho sakta hai. ${action} ke liye pehle session ko active karein.\n\nActive Session: ${activeSession}\nSelected Session: ${selectedSession}`;
}

function showAlert(title, message) {
  const titleEl = document.getElementById('alertTitle');
  const msgEl   = document.getElementById('alertMsg');
  const overlay = document.getElementById('alertOverlay');
  if (!titleEl || !msgEl || !overlay) return;
  titleEl.textContent = title;
  msgEl.textContent   = message;
  overlay.style.display = 'flex';
}

function closeAlert() {
  const overlay = document.getElementById('alertOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ── App Init ─────────────────────────────────────────────
window.addEventListener('load', () => {
  STATE.currentSession = CONFIG.SESSIONS[STATE.currentSessionIdx];

  const sel = document.getElementById('sessionSelect');
  if (sel) sel.value = STATE.currentSessionIdx;

  if ('serviceWorker' in navigator) {
    // updateViaCache:'none' → browser always fetches sw.js fresh from network,
    // never from HTTP cache — this is the #1 reason mobile apps miss updates
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {

      // When a new SW takes control → reload once to serve fresh cached files
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) {
          reloading = true;
          showToast('Naya update mil gaya — reload ho raha hai...');
          setTimeout(() => window.location.reload(), 1200);
        }
      });

      // Check for SW update every 4 minutes while app is open
      setInterval(() => reg.update(), 4 * 60 * 1000);

      // Also check immediately when user brings app to foreground
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update();
      });

    }).catch(() => {});
  }

  // Restore session on refresh — shows cached data without re-login
  checkAutoSignIn();

  // Show iOS install hint after a short delay (no beforeinstallprompt on iOS)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !isStandalone) {
    setTimeout(() => _showInstallBanner('ios'), 3000);
  }

  // Handle shortcut deep links (?screen=members etc.)
  const screen = new URLSearchParams(location.search).get('screen');
  if (screen) STATE._deepLinkScreen = screen;
});
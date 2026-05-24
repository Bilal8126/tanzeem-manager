const STATE = {
  accessToken:       null,
  currentScreen:     'dashboard',
  currentSessionIdx: 0,
  currentSession:    null,
  currentFinanceTab: 'donations',
  memberFilter:          'all',
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
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2800);
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
  if (mins < 1)   el.textContent = 'just now';
  else if (mins < 60) el.textContent = mins + 'm ago';
  else            el.textContent = Math.round(mins / 60) + 'h ago';
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
    <span style="font-size:22px">🕌</span>
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

// ── App Init ─────────────────────────────────────────────
window.addEventListener('load', () => {
  STATE.currentSession = CONFIG.SESSIONS[STATE.currentSessionIdx];

  const sel = document.getElementById('sessionSelect');
  if (sel) sel.value = STATE.currentSessionIdx;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // When a new SW takes control, reload once so users get fresh UI automatically
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloading) {
          reloading = true;
          showToast('Naya update aa gaya — reload ho raha hai... 🔄');
          setTimeout(() => window.location.reload(), 1200);
        }
      });

      // Re-check for SW updates whenever the user brings the app back to foreground
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
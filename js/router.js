const _scrollPos = {};

// ── Android back-button navigation ────────────────────────
let _historyReady = false;
let _manualClose  = false; // set true when modal closes via its own button

function _histPush(extra) {
  if (_historyReady) history.pushState(extra || {}, '');
}

// Called by modal close-buttons to keep history balanced
function _histBack() {
  _manualClose = true;
  history.back();
}

// Sets the base history state — called immediately at DOM ready so back
// button always fires popstate even before data loads
function _historyInit() {
  if (_historyReady) return;
  history.replaceState({ screen: 'dashboard', base: true }, '');
  history.pushState({ screen: 'dashboard' }, ''); // buffer entry
  _historyReady = true;
}

document.addEventListener('DOMContentLoaded', _historyInit);

// Known modal overlays — checked top-to-bottom (highest priority first)
// useDisplay:true for modals that use style.display instead of .open class
const _MODALS = [
  { id: 'confirmOverlay',          fn: () => document.getElementById('confirmOverlay')?.classList.remove('open') },
  { id: 'galleryLightboxOverlay',  fn: () => typeof closeLightbox        !== 'undefined' && closeLightbox() },
  { id: 'qmpOverlay',              fn: () => typeof _closeQmp            !== 'undefined' && _closeQmp() },
  { id: 'waPaidPopupOverlay',      fn: () => document.getElementById('waPaidPopupOverlay')?.classList.remove('open') },
  { id: 'waPopupOverlay',          fn: () => typeof closeWhatsAppPopup   !== 'undefined' && closeWhatsAppPopup() },
  { id: 'shareFormatOverlay',      fn: () => document.getElementById('shareFormatOverlay')?.classList.remove('open') },
  { id: 'payReceiptOverlay',       fn: () => document.getElementById('payReceiptOverlay')?.classList.remove('open') },
  { id: 'donReceiptOverlay',       fn: () => document.getElementById('donReceiptOverlay')?.classList.remove('open') },
  { id: 'reportOverlay',           fn: () => document.getElementById('reportOverlay')?.classList.remove('open') },
  { id: 'galleryUploadOverlay',    fn: () => typeof closeGalleryUpload   !== 'undefined' && closeGalleryUpload() },
  { id: 'galleryOccasionOverlay',  fn: () => typeof closeOccasionPicker  !== 'undefined' && closeOccasionPicker() },
  { id: 'financeFormOverlay',      fn: () => typeof closeFinanceForm      !== 'undefined' && closeFinanceForm() },
  { id: 'memberProfileOverlay',    fn: () => typeof closeMemberProfile    !== 'undefined' && closeMemberProfile() },
  { id: 'newSessionOverlay',       fn: () => typeof closeNewSessionModal  !== 'undefined' && closeNewSessionModal(), useDisplay: true },
];

window.addEventListener('popstate', e => {
  if (_wantExit) { history.back(); return; }
  if (_manualClose) { _manualClose = false; return; }

  // 1. Close topmost open modal
  for (const m of _MODALS) {
    const el = document.getElementById(m.id);
    if (!el) continue;
    const isOpen = m.useDisplay ? el.style.display === 'flex' : el.classList.contains('open');
    if (isOpen) { m.fn(); return; }
  }

  // 2. No modal open — navigate back to previous screen stored in state
  const prev = e.state?.screen;
  if (prev && prev !== STATE.currentScreen) {
    const navEls = document.querySelectorAll('.nav-item');
    const screens = ['dashboard', 'members', 'payments', 'finance', 'gallery', 'settings', 'ai'];
    const navEl   = navEls[screens.indexOf(prev)] || navEls[0];
    showScreen(prev, navEl, true); // _skipHistory = true
    return;
  }

  // 3. Already on dashboard — show exit confirmation bar
  _showExitConfirm();
});

let _exitConfirmActive = false;
let _wantExit = false;

function _showExitConfirm() {
  if (_exitConfirmActive) { _doExit(); return; } // second back = exit immediately
  _exitConfirmActive = true;
  history.pushState({ screen: 'dashboard' }, ''); // buffer so next back fires popstate

  let bar = document.getElementById('_exitBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = '_exitBar';
    bar.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:32px 28px;width:80%;max-width:320px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,0.25)">
      <div style="width:56px;height:56px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0f4a29" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </div>
      <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:8px">Exit App?</div>
      <div style="font-size:14px;color:#64748b;margin-bottom:24px">Do you want to exit the application?</div>
      <div style="display:flex;gap:12px">
        <button onclick="_cancelExit()" style="flex:1;background:#f1f5f9;border:none;color:#334155;padding:13px;border-radius:12px;font-weight:600;cursor:pointer;font-size:15px">Cancel</button>
        <button onclick="_doExit()" style="flex:1;background:#0f4a29;border:none;color:#fff;padding:13px;border-radius:12px;font-weight:700;cursor:pointer;font-size:15px">Exit</button>
      </div>
    </div>`;
  bar.style.display = 'flex';
  setTimeout(() => { if (_exitConfirmActive) _cancelExit(); }, 3000);
}

function _cancelExit() {
  _exitConfirmActive = false;
  const bar = document.getElementById('_exitBar');
  if (bar) bar.style.display = 'none';
}

function _doExit() {
  _exitConfirmActive = false;
  _wantExit = true;
  const bar = document.getElementById('_exitBar');
  if (bar) bar.style.display = 'none';
  // Push extra entries so chained history.back() calls fully exhaust history → TWA closes
  history.pushState({exit:true}, '');
  history.pushState({exit:true}, '');
  history.pushState({exit:true}, '');
  history.back();
}

// Show AI nav only for the active session; redirect to dashboard if on AI screen
function syncAiNav() {
  const isActive = !!(CONFIG.SESSIONS[STATE.currentSessionIdx]?.active);
  const aiBtn    = document.getElementById('aiNavBtn');
  if (aiBtn) aiBtn.style.display = isActive ? '' : 'none';
  // If user is currently on AI screen and switches to a non-active session → go to dashboard
  if (!isActive && STATE.currentScreen === 'ai') {
    showScreen('dashboard', document.querySelector('.nav-item'));
  }
}

function showScreen(name, el, _skipHistory) {
  // Push history entry storing the screen we're leaving (so back restores it)
  if (!_skipHistory) _histPush({ screen: STATE.currentScreen });
  // Save scroll position for the screen we're leaving
  _scrollPos[STATE.currentScreen] = window.scrollY;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  if (el) el.classList.add('active');
  STATE.currentScreen = name;
  const fab = document.getElementById('financeFab');
  const isActiveSess = !!(CONFIG.SESSIONS[STATE.currentSessionIdx]?.active);
  if (fab) fab.style.display = (name === 'finance' && isActiveSess) ? 'flex' : 'none';
  const gFab = document.getElementById('galleryFab');
  if (gFab) gFab.style.display = name === 'gallery' ? 'flex' : 'none';
  const titles = { dashboard: 'Dashboard', members: 'Members', payments: 'Payments', finance: 'Finance', gallery: 'Gallery', settings: 'Settings', ai: 'AI Chat' };
  document.getElementById('screenTitle').textContent = titles[name] || name;
  // Show balance bar only on Dashboard
  const hb = document.getElementById('headerBalance');
  if (hb) hb.style.display = name === 'dashboard' ? 'flex' : 'none';
  renderCurrentScreen();

  // Restore saved scroll position for this screen (0 on first visit)
  requestAnimationFrame(() => {
    window.scrollTo({ top: _scrollPos[name] || 0, behavior: 'instant' });
  });
}

function renderCurrentScreen() {
  _historyInit(); // no-op after first call
  if (STATE.currentScreen === 'dashboard') renderDashboard();
  else if (STATE.currentScreen === 'members') renderMembers();
  else if (STATE.currentScreen === 'payments') renderPayments();
  else if (STATE.currentScreen === 'finance') renderFinance();
  else if (STATE.currentScreen === 'gallery') loadGalleryPhotos();
  else if (STATE.currentScreen === 'settings') renderSettings();
}

function onSessionChange() {
  const idx = parseInt(document.getElementById('sessionSelect').value);
  STATE.currentSessionIdx = idx;
  STATE.currentSession = CONFIG.SESSIONS[idx];
  STATE.selectedPaymentMonth = null; // reset so default month recalculates for new session
  syncAiNav();   // hide/show AI tab based on whether this session is active
  loadAllData();
}

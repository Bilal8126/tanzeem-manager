const _scrollPos = {};

// ── Android back-button navigation ────────────────────────
let _historyReady  = false;
let _manualClose   = false; // set true when modal closes via its own button
let _fromPopstate  = false; // set true while popstate handler is closing a modal

function _histPush(extra) {
  if (_historyReady) history.pushState(extra || {}, '');
}

// Called by modal close-buttons to keep history balanced
// Skipped when called from popstate (hardware back already popped the entry)
function _histBack() {
  if (_fromPopstate) return;
  _manualClose = true;
  history.back();
}

// Sets the base history state — called immediately at DOM ready so back
// button always fires popstate even before data loads
function _historyInit() {
  if (_historyReady) return;
  history.replaceState({ screen: 'dashboard' }, '');
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
  { id: 'profileMenuOverlay',      fn: () => typeof closeProfileMenu      !== 'undefined' && closeProfileMenu(), useDisplay: true },
];

window.addEventListener('popstate', e => {
  if (_manualClose) { _manualClose = false; return; }

  // 1. Close topmost open modal
  for (const m of _MODALS) {
    const el = document.getElementById(m.id);
    if (!el) continue;
    const isOpen = m.useDisplay ? el.style.display === 'flex' : el.classList.contains('open');
    if (isOpen) { _fromPopstate = true; m.fn(); _fromPopstate = false; return; }
  }

  // 2. No modal open — navigate back to previous screen stored in state
  const prev = e.state?.screen;
  if (prev && prev !== STATE.currentScreen) {
    const navEls = document.querySelectorAll('.nav-item');
    const screens = ['dashboard', 'members', 'payments', 'finance', 'gallery', 'settings', 'ai'];
    const navEl   = navEls[screens.indexOf(prev)] || navEls[0];
    showScreen(prev, navEl, true);
    return;
  }

  // 3. On dashboard — exit app directly (no confirmation)
});

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

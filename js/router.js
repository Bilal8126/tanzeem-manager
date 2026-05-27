const _scrollPos = {};

function showScreen(name, el) {
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
  renderCurrentScreen();

  // Restore saved scroll position for this screen (0 on first visit)
  requestAnimationFrame(() => {
    window.scrollTo({ top: _scrollPos[name] || 0, behavior: 'instant' });
  });
}

function renderCurrentScreen() {
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
  loadAllData();
}

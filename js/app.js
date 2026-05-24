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

window.addEventListener('load', () => {
  // Set correct session on first load from CONFIG
  STATE.currentSession = CONFIG.SESSIONS[STATE.currentSessionIdx];

  // Set dropdown to match
  const sel = document.getElementById('sessionSelect');
  if (sel) sel.value = STATE.currentSessionIdx;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
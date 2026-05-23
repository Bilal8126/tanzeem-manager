function showScreen(name, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  if (el) el.classList.add('active');
  STATE.currentScreen = name;
  const titles = { dashboard: 'Dashboard', members: 'Members', payments: 'Payments', finance: 'Finance', ai: 'AI Chat' };
  document.getElementById('screenTitle').textContent = titles[name] || name;
  renderCurrentScreen();
}

function renderCurrentScreen() {
  if (STATE.currentScreen === 'dashboard') renderDashboard();
  else if (STATE.currentScreen === 'members') renderMembers();
  else if (STATE.currentScreen === 'payments') renderPayments();
  else if (STATE.currentScreen === 'finance') renderFinance();
}

function onSessionChange() {
  const idx = parseInt(document.getElementById('sessionSelect').value);
  STATE.currentSessionIdx = idx;
  STATE.currentSession = CONFIG.SESSIONS[idx];
  loadAllData();
}

function renderFinance() {
  if (STATE.currentFinanceTab === 'donations') renderDonations();
  else renderExpenses();
}

function renderDonations() {
  const total = STATE.allDonations.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  document.getElementById('financeContent').innerHTML = `
    <div class="metrics">
      <div class="metric green">
        <div class="metric-label">Total Donations</div>
        <div class="metric-value sm">${formatCurrency(total)}</div>
        <div class="metric-bg-icon">🎁</div>
      </div>
      <div class="metric blue">
        <div class="metric-label">Count</div>
        <div class="metric-value">${STATE.allDonations.length}</div>
        <div class="metric-bg-icon">#</div>
      </div>
    </div>
    <div class="card">
      ${STATE.allDonations.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">🎁</div><p>No donations yet. Tap + to add.</p></div>'
        : STATE.allDonations.map(d => `
            <div class="finance-item">
              <div class="finance-left">
                <div class="finance-dot green"></div>
                <div>
                  <div class="finance-name">${d.donor}</div>
                  <div class="finance-sub">${d.date || ''}${d.note ? ' · ' + d.note : ''}</div>
                </div>
              </div>
              <div class="finance-amount green">${formatCurrency(d.amount)}</div>
            </div>`).join('')}
    </div>`;
}

function renderExpenses() {
  const total = STATE.allExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  document.getElementById('financeContent').innerHTML = `
    <div class="metrics">
      <div class="metric" style="background:linear-gradient(135deg,#b91c1c,#e53e3e)">
        <div class="metric-label">Total Expenses</div>
        <div class="metric-value sm">${formatCurrency(total)}</div>
        <div class="metric-bg-icon">📤</div>
      </div>
      <div class="metric blue">
        <div class="metric-label">Count</div>
        <div class="metric-value">${STATE.allExpenses.length}</div>
        <div class="metric-bg-icon">#</div>
      </div>
    </div>
    <div class="card">
      ${STATE.allExpenses.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">📤</div><p>No expenses yet. Tap + to add.</p></div>'
        : STATE.allExpenses.map(e => `
            <div class="finance-item">
              <div class="finance-left">
                <div class="finance-dot red"></div>
                <div>
                  <div class="finance-name">${e.desc}</div>
                  <div class="finance-sub">${e.date || ''}${e.category ? ' · ' + e.category : ''}</div>
                </div>
              </div>
              <div class="finance-amount red">${formatCurrency(e.amount)}</div>
            </div>`).join('')}
    </div>`;
}

function setFinanceTab(tab, el) {
  STATE.currentFinanceTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderFinance();
}


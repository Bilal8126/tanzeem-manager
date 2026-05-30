function renderDashboard() {
  const regular         = STATE.allMembers.filter(m => (m.type || 'Regular') === 'Regular');
  const donors          = STATE.allMembers.filter(m => m.type === 'Donor');
  const regularActive   = regular.filter(m => m.status === 'Active').length;
  const regularInactive = regular.length - regularActive;
  const active          = STATE.allMembers.filter(m => m.status === 'Active').length;
  const inactive        = STATE.allMembers.length - active;
  const s             = STATE.sessionSummary;
  const months        = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const regularPayments = STATE.allPayments.filter(p => {
    const mb = STATE.allMembers.find(mb => nameMatch(mb.name, p.name));
    return !mb || (mb.type || 'Regular') === 'Regular';
  });
  const monthlyTotals = months.map(m =>
    regularPayments.reduce((sum, p) =>
      sum + (p.months[m] === 'Paid' ? (parseInt(p.amount) || 150) : 0), 0)
  );

  const balanceColor = s.balance < 0 ? '#e53e3e' : '#fff';

  // Show + populate header balance bar
  const hb = document.getElementById('headerBalance');
  if (hb) hb.style.display = 'flex';
  const hbCollected     = document.getElementById('hbCollected');
  const hbDonation      = document.getElementById('hbDonation');
  const hbExpenses      = document.getElementById('hbExpenses');
  const hbCurMonth      = document.getElementById('hbCurMonth');
  const hbCurMonthLabel = document.getElementById('hbCurMonthLabel');
  if (hbCollected) hbCollected.textContent = formatCurrency(s.currentTotal);
  if (hbDonation)  hbDonation.textContent  = formatCurrency(s.totalDonation);
  if (hbExpenses)  hbExpenses.textContent  = formatCurrency(s.totalExpense);
  if (hbCurMonth) {
    const curMo      = months.length > 0 ? detectCurrentMonth(months) : null;
    const curMoTotal = curMo
      ? regularPayments.reduce((sum, p) =>
          sum + (p.months[curMo] === 'Paid' ? (parseInt(p.amount) || 150) : 0), 0)
      : 0;
    if (hbCurMonthLabel && curMo) hbCurMonthLabel.textContent = curMo;
    hbCurMonth.textContent = curMo ? formatCurrency(curMoTotal) : '—';
  }

  // Progress bar — this month's collection
  const currentMonth  = months.length > 0 ? detectCurrentMonth(months) : null;
  const regularStats  = STATE.allPayments.filter(p => {
    const m = STATE.allMembers.find(mb => nameMatch(mb.name, p.name));
    return (!m || (m.type || 'Regular') === 'Regular') && (m?.status === 'Active' || !m?.status);
  });
  const paidThisMonth = currentMonth
    ? regularStats.filter(p => p.months[currentMonth] === 'Paid').length
    : 0;
  const totalActive   = regularStats.length;
  const pct           = totalActive > 0 ? Math.round((paidThisMonth / totalActive) * 100) : 0;
  const progressCard  = currentMonth ? `
    <div class="card" style="padding:14px 16px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0">
        <div style="font-size:13px;font-weight:700;color:var(--text)">${currentMonth} Collection</div>
        <div style="font-size:13px;font-weight:800;color:#047857">${pct}%</div>
      </div>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div class="progress-bar-label">${paidThisMonth} of ${totalActive} active members paid</div>
    </div>` : '';

  const isActiveSess = !!(CONFIG.SESSIONS[STATE.currentSessionIdx]?.active);
  const qaMarkPay    = isActiveSess
    ? `onclick="showQuickMarkPayment()"`
    : `onclick="showToast('Sirf active session mein payment mark ho sakti hai','error')" style="opacity:.55"`;

  document.getElementById('dashboardContent').innerHTML = `
    <div class="metrics">
      <div class="metric green">
        <div class="metric-label">Total Members</div>
        <div class="metric-value">${STATE.allMembers.length}</div>
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/></svg></div>
      </div>
      <div class="metric blue">
        <div class="metric-label">Regular Active</div>
        <div class="metric-value">${regularActive}</div>
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></div>
      </div>
      <div class="metric orange">
        <div class="metric-label">Grand Total</div>
        <div class="metric-value sm">${formatCurrency(s.grandTotal)}</div>
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v2m0 8v2"/></svg></div>
      </div>
      <div class="metric purple">
        <div class="metric-label">Balance</div>
        <div class="metric-value sm" style="color:${balanceColor}">${formatCurrency(s.balance)}</div>
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
      </div>
    </div>

    ${progressCard}

    <div class="quick-actions">
      <div class="qa-btn" onclick="openAddMember()">
        <div class="qa-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg></div>
        <div class="qa-label">Add Member</div>
      </div>
      <div class="qa-btn" onclick="openFinanceForm('donation')">
        <div class="qa-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
        <div class="qa-label">Add Donation</div>
      </div>
      <div class="qa-btn" onclick="openFinanceForm('expense')">
        <div class="qa-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
        <div class="qa-label">Add Expense</div>
      </div>
      <div class="qa-btn" ${qaMarkPay}>
        <div class="qa-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><polyline points="8 15 10 17 14 13"/></svg></div>
        <div class="qa-label">Mark Payment</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Monthly Collection — ${STATE.currentSession.label}</div>
      <div style="position:relative;height:190px"><canvas id="dashChart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">Session Summary</div>
      <div class="stat-row"><span class="muted">Last year balance</span><span style="font-weight:600">${formatCurrency(s.lastYearBalance)}</span></div>
      <div class="stat-row"><span class="muted">Current collected</span><span style="font-weight:600">${formatCurrency(s.currentTotal)}</span></div>
      <div class="stat-row"><span class="muted">Total donations</span><span style="font-weight:600;color:#1a6b3c">${formatCurrency(s.totalDonation)}</span></div>
      <div class="stat-row"><span class="muted">Grand total</span><span style="font-weight:600">${formatCurrency(s.grandTotal)}</span></div>
      <div class="stat-row"><span class="muted">Total expenses</span><span style="font-weight:600;color:#e53e3e">${formatCurrency(s.totalExpense)}</span></div>
      <div class="stat-row total-row">
        <span>Balance</span>
        <span style="color:${s.balance < 0 ? '#e53e3e' : '#1a6b3c'}">${formatCurrency(s.balance)}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Member Overview</div>
      <div class="stat-row">
        <span style="display:flex;align-items:center;gap:7px;font-weight:600;color:var(--muted)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>Regular
        </span>
        <span style="font-weight:700">${regular.length}</span>
      </div>
      
      <div class="stat-row">
        <span style="display:flex;align-items:center;gap:7px;font-weight:600;color:var(--muted)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a6b3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>Active
        </span>
        <span style="color:#1a6b3c;font-weight:600">${regularActive}</span>
      </div>
      <div class="stat-row">
        <span style="display:flex;align-items:center;gap:7px;font-weight:600;color:var(--muted)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>In Active
        </span>
        <span style="color:#e53e3e;font-weight:600">${regularInactive}</span>
      </div>
      <div class="stat-row">
        <span style="display:flex;align-items:center;gap:7px;font-weight:600;color:var(--muted)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>Donors
        </span>
        <span style="color:#1d4ed8;font-weight:700">${donors.length}</span>
      </div>
      <div class="stat-row total-row"><span>Total Members</span><span>${STATE.allMembers.length}</span></div>
    </div>`;

  setTimeout(() => buildDashChart(months, monthlyTotals), 80);
}

function buildDashChart(months, data) {
  const ctx = document.getElementById('dashChart');
  if (!ctx) return;
  if (STATE.dashChart) { STATE.dashChart.destroy(); STATE.dashChart = null; }
  STATE.dashChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Rs.',
        data,
        backgroundColor: months.map((_, i) =>
          i === data.indexOf(Math.max(...data))
            ? '#0f4a29'
            : 'rgba(26,107,60,0.75)'
        ),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' Rs.' + ctx.parsed.y.toLocaleString()
          },
          backgroundColor: '#1a6b3c',
          titleColor: '#fff',
          bodyColor: '#fff',
          cornerRadius: 8,
          padding: 10,
        }
      },
      scales: {
        y: {
          ticks: { callback: v => 'Rs.' + (v/1000).toFixed(0) + 'k', font: { size: 10 }, color: '#9ca3af' },
          grid: { color: '#f3f4f6' },
          border: { display: false }
        },
        x: {
          ticks: { font: { size: 10 }, color: '#9ca3af' },
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });
}

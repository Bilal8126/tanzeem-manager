function renderDashboard() {
  const regular         = STATE.allMembers.filter(m => (m.type || 'Regular') === 'Regular');
  const donors          = STATE.allMembers.filter(m => m.type === 'Donor');
  const regularActive   = regular.filter(m => m.status === 'Active').length;
  const regularInactive = regular.length - regularActive;
  const active          = STATE.allMembers.filter(m => m.status === 'Active').length;
  const inactive        = STATE.allMembers.length - active;
  const addedThisSession = STATE.allMembers.filter(m => m.session === STATE.currentSession?.label).length;
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
  const _qaBlocked   = `showAlert('Edit Nahi Ho Sakta','Purane session mein yeh kaam nahi ho sakta — sirf current active session mein ho sakta hai.')`;
  const qaMarkPay    = isActiveSess
    ? `onclick="showQuickMarkPayment()"`
    : `onclick="${_qaBlocked}" style="opacity:.55"`;
  const qaAddMember  = isActiveSess ? `onclick="openAddMember()"` : `onclick="${_qaBlocked}" style="opacity:.55"`;
  const qaAddDonation = isActiveSess ? `onclick="openFinanceForm('donation')"` : `onclick="${_qaBlocked}" style="opacity:.55"`;
  const qaAddExpense  = isActiveSess ? `onclick="openFinanceForm('expense')"` : `onclick="${_qaBlocked}" style="opacity:.55"`;

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

    <div id="activitySection" style="display:none">
      <div class="stories-title">Last 10 Activity in Tanzeem</div>
      <div id="storiesRow" class="stories-row"></div>
    </div>

    ${progressCard}

    <div class="quick-actions">
      <div class="qa-btn" ${qaAddMember}>
        <div class="qa-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg></div>
        <div class="qa-label">Add Member</div>
      </div>
      <div class="qa-btn" ${qaAddDonation}>
        <div class="qa-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
        <div class="qa-label">Add Donation</div>
      </div>
      <div class="qa-btn" ${qaAddExpense}>
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
      <div class="stat-row" onclick="_goToMembersSession('${STATE.currentSession?.label || ''}')" style="cursor:pointer">
        <span style="display:flex;align-items:center;gap:7px;font-weight:600;color:var(--muted)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Is Session Mein Add
        </span>
        <span style="display:flex;align-items:center;gap:4px;color:#6d28d9;font-weight:700">${addedThisSession}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
      </div>
      <div class="stat-row total-row"><span>Total Members</span><span>${STATE.allMembers.length}</span></div>
    </div>`;

  setTimeout(() => buildDashChart(months, monthlyTotals), 80);
  if (isActiveSess) _loadRecentActivity();
}

function _goToMembersSession(label) {
  STATE.memberFilter = 'all';
  STATE.memberSessionFilter = label || 'all';
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.filter-tab[onclick*="setMemberFilter('all'"]`)?.classList.add('active');
  const navBtn = document.querySelector(`.nav-item[onclick*="showScreen('members'"]`);
  showScreen('members', navBtn);
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
          ticks: { stepSize: 1000, callback: v => 'Rs.' + (v/1000).toFixed(0) + 'k', font: { size: 10 }, color: '#9ca3af' },
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

// ── Recent Activity "stories" row (last 5, current active session only) ──
const _STORY_META = {
  'Member Added':     { grad: 'linear-gradient(145deg,#064e3b 0%,#047857 55%,#059669 85%,#2563eb 130%)', label: 'Naya Member',
    icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>' },
  'Member Updated':   { grad: 'linear-gradient(145deg,#92400e 0%,#d97706 60%,#f59e0b 120%)', label: 'Member Edit',
    icon: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
  'Member Deleted':   { grad: 'linear-gradient(145deg,#7f1d1d 0%,#b91c1c 55%,#ef4444 120%)', label: 'Member Delete',
    icon: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>' },
  'Mark Payment':     { grad: 'linear-gradient(145deg,#1e3a8a 0%,#1d4ed8 55%,#3b82f6 120%)', label: 'Payment',
    icon: '<circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>' },
  'Mark Unpayment':   { grad: 'linear-gradient(145deg,#881337 0%,#be123c 55%,#f43f5e 120%)', label: 'Unpaid',
    icon: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' },
  'Donation Added':   { grad: 'linear-gradient(145deg,#064e3b 0%,#059669 55%,#34d399 120%)', label: 'Donation',
    icon: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>' },
  'Donation Updated': { grad: 'linear-gradient(145deg,#92400e 0%,#d97706 60%,#f59e0b 120%)', label: 'Donation Edit',
    icon: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
  'Donation Deleted': { grad: 'linear-gradient(145deg,#7f1d1d 0%,#b91c1c 55%,#ef4444 120%)', label: 'Donation Del',
    icon: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>' },
  'Expense Added':    { grad: 'linear-gradient(145deg,#7f1d1d 0%,#b91c1c 55%,#ef4444 120%)', label: 'Expense',
    icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>' },
  'Expense Updated':  { grad: 'linear-gradient(145deg,#92400e 0%,#d97706 60%,#f59e0b 120%)', label: 'Expense Edit',
    icon: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
  'Expense Deleted':  { grad: 'linear-gradient(145deg,#831843 0%,#be185d 55%,#ec4899 120%)', label: 'Expense Del',
    icon: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>' },
  _default: { grad: 'linear-gradient(145deg,#334155 0%,#475569 60%,#64748b 120%)', label: 'Activity',
    icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
};

let _recentActivity = [];

async function _loadRecentActivity() {
  const section = document.getElementById('activitySection');
  const el = document.getElementById('storiesRow');
  if (!el || !section || !STATE.accessToken) return;
  try {
    const rows = (await sheetsGet('TrackHistory!A1:E1000')).filter(r => r.length >= 2);
    if (STATE.currentScreen !== 'dashboard') return; // user navigated away while fetching
    _recentActivity = rows.slice(-10).reverse(); // newest first, last 10
    if (!_recentActivity.length) { section.style.display = 'none'; el.innerHTML = ''; return; }
    section.style.display = 'block';
    el.innerHTML = _recentActivity.map(([, action], i) => {
      const meta = _STORY_META[action] || _STORY_META._default;
      return `
        <div class="story-item" onclick="_showActivityDetail(${i})">
          <div class="story-circle" style="background:${meta.grad}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${meta.icon}</svg>
          </div>
          <div class="story-label">${meta.label}</div>
        </div>`;
    }).join('');
  } catch (e) { /* non-critical widget — fail silently */ }
}

// Builds a natural Hinglish sentence from the raw TrackHistory row.
// `details` formats (set by _trackHistory callers): see js/features/{members,payments,finance}.js
function _activitySentence(action, details) {
  const d = details || '';
  const splitDash = s => s.split(' - ').map(x => x.trim());

  switch (action) {
    case 'Member Added':
      return `${d} ko Tanzeem mein add kiya`;
    case 'Member Deleted':
      return `${d} ko Tanzeem se remove kiya`;
    case 'Member Updated': {
      const [name, changes] = d.split(' — ').map(x => x.trim());
      return `${name || d} ki profile update ki${changes ? ' (' + changes + ')' : ''}`;
    }
    case 'Mark Payment':
    case 'Mark Unpayment': {
      const [name, months] = splitDash(d);
      const verb = action === 'Mark Payment' ? 'mark' : 'unmark';
      return `${name || d} ki ${months || ''} ki payment ${verb} ki`;
    }
    case 'Donation Added':
    case 'Donation Updated':
    case 'Donation Deleted': {
      const [name, amount, note] = splitDash(d);
      const verb = action === 'Donation Added' ? 'add ki' : action === 'Donation Updated' ? 'update ki' : 'delete ki';
      return `${name || d} ki ${amount || ''} ki donation ${verb}${note ? ' ' + note + ' ke liye' : ''}`;
    }
    case 'Expense Added':
    case 'Expense Updated':
    case 'Expense Deleted': {
      const [desc, amount] = splitDash(d);
      const verb = action === 'Expense Added' ? 'add kiya' : action === 'Expense Updated' ? 'update kiya' : 'delete kiya';
      return `${desc || d} ke liye ${amount || ''} ka kharcha ${verb}`;
    }
    default:
      return d;
  }
}

function _showActivityDetail(i) {
  const row = _recentActivity[i];
  if (!row) return;
  const [ts, action, details] = row;
  const admin = row[4];
  const meta = _STORY_META[action] || _STORY_META._default;
  const sentence = _activitySentence(action, details);
  showAlert(
    meta.label,
    `${sentence} ${admin || 'kisi'} ne, ${ts || '—'} ko.`
  );
}

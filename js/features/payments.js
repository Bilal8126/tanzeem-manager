const FEE = 150;
const C_GREEN  = '#15803d';
const C_RED    = '#b91c1c';
const C_MUTED  = '#9ca3af';
const C_ORANGE = '#b45309';

// Collapse state — persists across month switches
let _showOverdue = false;
let _showUnpaid  = false;

function getInitials(name) {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function isPaid(v)   { return v === 'Paid'; }
function isUnpaid(v) { return !isPaid(v); }

function detectCurrentMonth(months) {
  const abbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const cur  = abbr[new Date().getMonth()].toLowerCase();
  return months.find(m => m.toLowerCase().startsWith(cur)) || months[months.length - 1];
}

function buildMemberStats(payments) {
  return payments.map(p => {
    const all    = Object.keys(p.months);
    const paid   = all.filter(m => isPaid(p.months[m]));
    const unpaid = all.filter(m => isUnpaid(p.months[m]));
    return {
      ...p,
      paidList:     paid,
      unpaidList:   unpaid,
      totalPaid:    paid.length   * FEE,
      totalPending: unpaid.length * FEE,
      isOverdue:    unpaid.length >= 2,
    };
  });
}

function toggleOverdue() {
  _showOverdue = !_showOverdue;
  renderPayments();
}
function toggleUnpaid() {
  _showUnpaid = !_showUnpaid;
  renderPayments();
}
function toggleAll() {
  const anyOpen = _showOverdue || _showUnpaid;
  _showOverdue = _showUnpaid = !anyOpen;
  renderPayments();
}

function chevron(open) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    style="transition:transform .2s;transform:rotate(${open ? 180 : 0}deg);flex-shrink:0">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`;
}

function renderPayments() {
  if (STATE.allPayments.length === 0) {
    document.getElementById('paymentsContent').innerHTML =
      '<div class="empty-state"><div class="empty-state-icon">💳</div><p>No payment data for this session</p></div>';
    return;
  }

  const months = Object.keys(STATE.allPayments[0].months);

  if (!STATE.selectedPaymentMonth || !months.includes(STATE.selectedPaymentMonth)) {
    STATE.selectedPaymentMonth = detectCurrentMonth(months);
  }
  const sel = STATE.selectedPaymentMonth;

  const stats          = buildMemberStats(STATE.allPayments);
  const paidThisMon    = stats.filter(m => isPaid(m.months[sel]));
  const pendingThisMon = stats.filter(m => isUnpaid(m.months[sel]));
  const overdue        = stats.filter(m => m.isOverdue);
  const totalCollected = stats.reduce((s, m) => s + m.totalPaid,    0);
  const totalPending   = stats.reduce((s, m) => s + m.totalPending, 0);
  const allOpen        = _showOverdue && _showUnpaid;

  document.getElementById('paymentsContent').innerHTML = `

    <!-- Summary Cards -->
    <div class="metrics">
      <div class="metric green">
        <div class="metric-label">Paid · ${sel}</div>
        <div class="metric-value">${paidThisMon.length}</div>
        <div class="metric-bg-icon">✅</div>
      </div>
      <div class="metric" style="background:linear-gradient(135deg,#b91c1c,#e53e3e)">
        <div class="metric-label">Pending · ${sel}</div>
        <div class="metric-value">${pendingThisMon.length}</div>
        <div class="metric-bg-icon">⏳</div>
      </div>
      <div class="metric blue">
        <div class="metric-label">Total Collected</div>
        <div class="metric-value sm">${formatCurrency(totalCollected)}</div>
        <div class="metric-bg-icon">💰</div>
      </div>
      <div class="metric orange">
        <div class="metric-label">Total Pending</div>
        <div class="metric-value sm">${formatCurrency(totalPending)}</div>
        <div class="metric-bg-icon">📋</div>
      </div>
    </div>

    <!-- Month Selector -->
    <div class="card" style="padding:12px 14px">
      <div class="card-title">Select Month</div>
      <div class="month-pills">
        ${months.map(m => `
          <button class="month-pill ${m === sel ? 'active' : ''}" onclick="selectPaymentMonth('${m}')">${m}</button>
        `).join('')}
      </div>
    </div>

    <!-- Overdue (collapsed by default) -->
    ${overdue.length > 0 ? `
    <div class="card overdue-card">
      <div class="toggle-header" onclick="toggleOverdue()" style="cursor:pointer;display:flex;align-items:center;gap:8px;color:${C_RED}">
        <span style="font-size:13px;font-weight:600;flex:1">⚠️ Overdue — 2+ Months Unpaid</span>
        <span class="section-count" style="background:#fecaca;color:${C_RED}">${overdue.length}</span>
        ${chevron(_showOverdue)}
      </div>
      ${_showOverdue ? `
      <div style="margin-top:10px">
        ${overdue.map(m => `
          <div class="pay-row">
            <div class="pay-avatar pay-avatar--overdue">${getInitials(m.name)}</div>
            <div class="pay-info">
              <div class="pay-name">${m.name.replace(/\(.*?\)/g,'').trim()}</div>
              <div class="pay-sub">${m.unpaidList.length} months unpaid · ${m.unpaidList.join(', ')}</div>
            </div>
            <div class="pay-amount" style="color:${C_ORANGE}">${formatCurrency(m.totalPending)}</div>
          </div>`).join('')}
      </div>` : ''}
    </div>` : ''}

    <!-- Not Paid This Month (collapsed by default) -->
    <div class="card">
      <div class="toggle-header" onclick="toggleUnpaid()" style="cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:600;flex:1;color:${C_RED}">Not Paid — ${sel}</span>
        <span class="section-count" style="background:#fee2e2;color:${C_RED}">${pendingThisMon.length}</span>
        ${chevron(_showUnpaid)}
      </div>
      ${_showUnpaid ? `
      <div style="margin-top:10px">
        ${pendingThisMon.length === 0
          ? `<div style="padding:8px 0;color:${C_MUTED};font-size:13px;text-align:center">🎉 All members paid for ${sel}!</div>`
          : pendingThisMon.map(m => `
            <div class="pay-row">
              <div class="pay-avatar pay-avatar--unpaid">${getInitials(m.name)}</div>
              <div class="pay-info">
                <div class="pay-name">
                  ${m.name.replace(/\(.*?\)/g,'').trim()}
                  ${m.isOverdue ? `<span class="badge badge-inactive" style="font-size:10px">Overdue</span>` : ''}
                </div>
                <div class="pay-sub">Total pending: ${formatCurrency(m.totalPending)}</div>
              </div>
              <div class="pay-amount" style="color:${C_RED}">−${formatCurrency(FEE)}</div>
            </div>`).join('')}
      </div>` : ''}
    </div>

    <!-- Paid This Month (always visible) -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:${paidThisMon.length > 0 ? 10 : 0}px">
        <span style="font-size:13px;font-weight:600;flex:1;color:${C_GREEN}">Paid — ${sel}</span>
        <span class="section-count" style="background:#dcfce7;color:${C_GREEN}">${paidThisMon.length}</span>
        <button class="toggle-all-btn" onclick="toggleAll()">
          ${allOpen ? 'Hide All' : 'Show All'}
        </button>
      </div>
      ${paidThisMon.length === 0
        ? `<div style="padding:8px 0;color:${C_MUTED};font-size:13px;text-align:center">No payments recorded yet</div>`
        : paidThisMon.map(m => `
          <div class="pay-row">
            <div class="pay-avatar pay-avatar--paid">${getInitials(m.name)}</div>
            <div class="pay-info">
              <div class="pay-name">${m.name.replace(/\(.*?\)/g,'').trim()}</div>
              <div class="pay-sub">Paid ${m.paidList.length} of ${Object.keys(m.months).length} months</div>
            </div>
            <div class="pay-amount" style="color:${C_GREEN}">+${formatCurrency(FEE)}</div>
          </div>`).join('')}
    </div>

    <!-- Member-wise Summary -->
    <div class="card" style="padding:12px">
      <div class="card-title">Member-wise Summary</div>
      <div class="summary-scroll">
        <table class="summary-table">
          <thead>
            <tr>
              <th style="text-align:left">Member</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Collected</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            ${stats.map(m => `
              <tr style="${m.isOverdue ? 'background:#fff9f0' : ''}">
                <td style="text-align:left;font-weight:500;white-space:nowrap;font-size:12px">
                  ${m.name.replace(/\(.*?\)/g,'').trim()}
                  ${m.isOverdue ? `<span style="color:${C_RED};font-size:9px;margin-left:3px">●</span>` : ''}
                </td>
                <td style="color:${C_GREEN};font-weight:600">${m.paidList.length}</td>
                <td style="color:${m.unpaidList.length > 0 ? C_RED : C_MUTED};font-weight:600">${m.unpaidList.length}</td>
                <td style="color:${C_GREEN};font-weight:600;white-space:nowrap">${formatCurrency(m.totalPaid)}</td>
                <td style="color:${m.totalPending > 0 ? C_RED : C_MUTED};font-weight:600;white-space:nowrap">
                  ${m.totalPending > 0 ? formatCurrency(m.totalPending) : '—'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Full Payment Grid -->
    <div class="card" style="padding:12px">
      <div class="card-title">Full Payment Grid</div>
      <div class="payment-grid">
        <table class="payment-table">
          <thead>
            <tr>
              <th style="text-align:left;min-width:110px">Member</th>
              ${months.map(m => {
                const cnt = stats.filter(s => isPaid(s.months[m])).length;
                return `<th>${m}<br><span style="font-size:9px;font-weight:400;opacity:.8">${cnt}/${stats.length}</span></th>`;
              }).join('')}
              <th>Paid</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            ${stats.map(m => `
              <tr style="${m.isOverdue ? 'background:#fff9f0' : ''}">
                <td class="name-col">
                  ${m.name.replace(/\(.*?\)/g,'').trim()}
                  ${m.isOverdue ? `<span style="color:${C_RED};font-size:9px;margin-left:2px">●</span>` : ''}
                </td>
                ${months.map(mo => {
                  if (isPaid(m.months[mo])) return `<td class="cell-paid">✓</td>`;
                  return `<td class="cell-unpaid">✗</td>`;
                }).join('')}
                <td style="color:${C_GREEN};font-weight:600;white-space:nowrap">${formatCurrency(m.totalPaid)}</td>
                <td style="color:${m.totalPending > 0 ? C_RED : C_MUTED};font-weight:600;white-space:nowrap">
                  ${m.totalPending > 0 ? formatCurrency(m.totalPending) : '—'}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function selectPaymentMonth(month) {
  STATE.selectedPaymentMonth = month;
  renderPayments();
}

const FEE = 150;
const C_GREEN  = '#15803d';
const C_RED    = '#b91c1c';
const C_MUTED  = '#9ca3af';
const C_ORANGE = '#b45309';

let _showOverdue      = false;
let _showUnpaid       = false;
let _overdueThreshold = 2;   // default — user can change

// ── Helpers ──────────────────────────────────────────────

function getInitials(name) {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function isPaid(v) { return v === 'Paid'; }

function chevron(open) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    style="transition:transform .2s;transform:rotate(${open ? 180 : 0}deg);flex-shrink:0">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`;
}

function detectCurrentMonth(months) {
  const abbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const cur  = abbr[new Date().getMonth()].toLowerCase();
  return months.find(m => m.toLowerCase().startsWith(cur)) || months[months.length - 1];
}

/**
 * Returns true if the month label (e.g. "Oct", "Jan") falls on or before today.
 * Fiscal year is Oct–Sep: Oct/Nov/Dec belong to startYear, Jan–Sep to endYear.
 */
function isPastOrCurrent(monthLabel) {
  const abbr      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const label     = STATE.currentSession ? STATE.currentSession.label : '2025-26';
  const startYear = parseInt(label.split('-')[0]);
  const endYear   = startYear + 1;

  const key  = monthLabel.toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
  const mIdx = abbr.findIndex(a => a.toLowerCase() === key);
  if (mIdx === -1) return true; // unknown format — include

  const mYear = mIdx >= 9 ? startYear : endYear; // Oct(9)/Nov(10)/Dec(11) → startYear

  const now     = new Date();
  const curYear = now.getFullYear();
  const curMon  = now.getMonth(); // 0-indexed, Jan=0

  if (mYear < curYear) return true;
  if (mYear > curYear) return false;
  return mIdx <= curMon;
}

function buildMemberStats(payments) {
  return payments.map(p => {
    const allMonths  = Object.keys(p.months);
    const pastMonths = allMonths.filter(isPastOrCurrent);

    const paid   = pastMonths.filter(m => isPaid(p.months[m]));
    const unpaid = pastMonths.filter(m => !isPaid(p.months[m]));

    return {
      ...p,
      paidList:     paid,
      unpaidList:   unpaid,
      totalPaid:    paid.length   * FEE,
      totalPending: unpaid.length * FEE,
      isOverdue:    unpaid.length >= _overdueThreshold,
    };
  });
}

// ── Toggle handlers ───────────────────────────────────────

function toggleOverdue() { _showOverdue = !_showOverdue; renderPayments(); }
function toggleUnpaid()  { _showUnpaid  = !_showUnpaid;  renderPayments(); }
function toggleAll() {
  const anyOpen  = _showOverdue || _showUnpaid;
  _showOverdue   = _showUnpaid = !anyOpen;
  renderPayments();
}
function setOverdueThreshold(n) {
  _overdueThreshold = n;
  renderPayments();
}
function selectPaymentMonth(month) {
  STATE.selectedPaymentMonth = month;
  renderPayments();
}

// ── Main render ───────────────────────────────────────────

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
  const selIsPast = isPastOrCurrent(sel);

  const stats          = buildMemberStats(STATE.allPayments);
  const paidThisMon    = selIsPast ? stats.filter(m =>  isPaid(m.months[sel])) : [];
  const pendingThisMon = selIsPast ? stats.filter(m => !isPaid(m.months[sel])) : [];
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
        <div class="metric-value">${selIsPast ? pendingThisMon.length : '—'}</div>
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

    <!-- Overdue Threshold Picker -->
    <div class="card" style="padding:12px 14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:600;color:${C_ORANGE};white-space:nowrap">⚠️ Overdue if unpaid ≥</span>
        <div class="month-pills" style="flex:1">
          ${[1,2,3,4,5,6].map(n => `
            <button class="month-pill ${_overdueThreshold === n ? 'active' : ''}"
              onclick="setOverdueThreshold(${n})" style="${_overdueThreshold===n?'':'border-color:#f59e0b;color:#b45309'}">${n}+ months</button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Month Selector -->
    <div class="card" style="padding:12px 14px">
      <div class="card-title">Select Month</div>
      <div class="month-pills">
        ${months.map(m => {
          const past = isPastOrCurrent(m);
          return `<button class="month-pill ${m === sel ? 'active' : ''}"
            onclick="selectPaymentMonth('${m}')"
            style="${!past && m !== sel ? 'opacity:0.4;border-style:dashed' : ''}"
            title="${past ? '' : 'Future month'}">${m}</button>`;
        }).join('')}
      </div>
      ${!selIsPast ? `<div style="margin-top:8px;font-size:11px;color:${C_MUTED};text-align:center">
        Future month — overdue &amp; pending counts not applicable
      </div>` : ''}
    </div>

    <!-- Overdue (collapsed by default) -->
    ${overdue.length > 0 ? `
    <div class="card overdue-card">
      <div class="toggle-header" onclick="toggleOverdue()"
        style="cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:600;flex:1;color:${C_RED}">
          ⚠️ Overdue — ${_overdueThreshold}+ Months Unpaid
        </span>
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
    ${selIsPast ? `
    <div class="card">
      <div class="toggle-header" onclick="toggleUnpaid()"
        style="cursor:pointer;display:flex;align-items:center;gap:8px">
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
                  <div class="pay-sub">Past pending: ${formatCurrency(m.totalPending)}</div>
                </div>
                <div class="pay-amount" style="color:${C_RED}">−${formatCurrency(FEE)}</div>
              </div>`).join('')}
      </div>` : ''}
    </div>` : ''}

    <!-- Paid This Month (always visible) -->
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:${paidThisMon.length > 0 ? 10 : 0}px">
        <span style="font-size:13px;font-weight:600;flex:1;color:${C_GREEN}">Paid — ${sel}</span>
        <span class="section-count" style="background:#dcfce7;color:${C_GREEN}">${paidThisMon.length}</span>
        <button class="toggle-all-btn" onclick="toggleAll()">${allOpen ? 'Hide All' : 'Show All'}</button>
      </div>
      ${paidThisMon.length === 0
        ? `<div style="padding:8px 0;color:${C_MUTED};font-size:13px;text-align:center">
             ${selIsPast ? 'No payments recorded yet' : 'Future month — nothing to show'}
           </div>`
        : paidThisMon.map(m => `
            <div class="pay-row">
              <div class="pay-avatar pay-avatar--paid">${getInitials(m.name)}</div>
              <div class="pay-info">
                <div class="pay-name">${m.name.replace(/\(.*?\)/g,'').trim()}</div>
                <div class="pay-sub">Paid ${m.paidList.length} of ${months.filter(isPastOrCurrent).length} past months</div>
              </div>
              <div class="pay-amount" style="color:${C_GREEN}">+${formatCurrency(FEE)}</div>
            </div>`).join('')}
    </div>

    <!-- Member-wise Summary (past months only) -->
    <div class="card" style="padding:12px">
      <div class="card-title">Member-wise Summary
        <span style="font-size:10px;font-weight:400;color:${C_MUTED};margin-left:4px">(past months only)</span>
      </div>
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
                const past = isPastOrCurrent(m);
                const cnt  = past ? stats.filter(s => isPaid(s.months[m])).length : '—';
                return `<th style="${!past ? 'opacity:0.45' : ''}">${m}${!past ? '<br><span style="font-size:8px">future</span>' : `<br><span style="font-size:9px;font-weight:400;opacity:.8">${cnt}/${stats.length}</span>`}</th>`;
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
                  if (!isPastOrCurrent(mo)) return `<td class="cell-empty" style="opacity:0.4">—</td>`;
                  if (isPaid(m.months[mo]))  return `<td class="cell-paid">✓</td>`;
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

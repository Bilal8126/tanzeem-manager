const FEE = 150;
const C_GREEN  = '#15803d';
const C_RED    = '#b91c1c';
const C_MUTED  = '#9ca3af';
const C_ORANGE = '#b45309';
const WA_SVG   = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

let _showOverdue      = false;
let _showUnpaid       = false;
let _showInactive     = false;
let _showSummary      = false;
let _showGrid         = false;
let _showPaid         = false;
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
  const monthKeys = payments.length > 0 ? Object.keys(payments[0].months) : [];

  // Payment stats are for Regular members only — Donors are excluded
  const regularPayments = payments.filter(p => {
    const m = STATE.allMembers.find(mb => nameMatch(mb.name, p.name));
    return !m || (m.type || 'Regular') === 'Regular';
  });

  // Ghosts: Regular members in allMembers with no payment row
  const ghosts = STATE.allMembers
    .filter(m => (m.type || 'Regular') === 'Regular')
    .filter(m => !regularPayments.some(p => nameMatch(p.name, m.name)))
    .map(m => {
      const emptyMonths = {};
      monthKeys.forEach(k => { emptyMonths[k] = ''; });
      return { name: m.name, months: emptyMonths, total: '0' };
    });

  return [...regularPayments, ...ghosts].map(p => {
    const allMonths  = Object.keys(p.months);
    const pastMonths = allMonths.filter(isPastOrCurrent);

    const paid   = allMonths.filter(m => isPaid(p.months[m]));
    const unpaid = pastMonths.filter(m => !isPaid(p.months[m]));

    const member       = STATE.allMembers.find(m => nameMatch(m.name, p.name));
    const memberStatus = member ? member.status : 'Active';
    const isInactive   = memberStatus !== 'Active';

    return {
      ...p,
      memberStatus,
      isInactive,
      paidList:     paid,
      unpaidList:   unpaid,
      totalPaid:    paid.length   * FEE,
      totalPending: unpaid.length * FEE,
      isOverdue:    unpaid.length >= _overdueThreshold,
    };
  });
}

// ── Toggle handlers ───────────────────────────────────────

function toggleOverdue()  { _showOverdue  = !_showOverdue;  renderPayments(); }
function toggleUnpaid()   { _showUnpaid   = !_showUnpaid;   renderPayments(); }
function toggleInactive() { _showInactive = !_showInactive; renderPayments(); }
function toggleSummary()  { _showSummary  = !_showSummary;  renderPayments(); }
function toggleGrid()     { _showGrid     = !_showGrid;     renderPayments(); }
function togglePaid()     { _showPaid     = !_showPaid;     renderPayments(); }
function setOverdueThreshold(n) {
  _overdueThreshold = n;
  renderPayments();
}
function selectPaymentMonth(month) {
  STATE.selectedPaymentMonth = month;
  renderPayments(); // pill centering is handled inside renderPayments
}

// ── Main render ───────────────────────────────────────────

function renderPayments() {
  const _savedScroll = window.scrollY;

  if (STATE.allPayments.length === 0) {
    document.getElementById('paymentsContent').innerHTML =
      '<div class="empty-state"><div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/><path d="M6 15h4"/></svg></div><p>No payment data for this session</p></div>';
    return;
  }

  const months = Object.keys(STATE.allPayments[0].months);

  if (!STATE.selectedPaymentMonth || !months.includes(STATE.selectedPaymentMonth)) {
    STATE.selectedPaymentMonth = detectCurrentMonth(months);
  }
  const sel = STATE.selectedPaymentMonth;
  const selIsPast = isPastOrCurrent(sel);

  const stats          = buildMemberStats(STATE.allPayments);
  const activeStats    = stats.filter(m => !m.isInactive);
  const inactiveStats  = stats.filter(m =>  m.isInactive);
  const paidThisMon         = activeStats.filter(m =>  isPaid(m.months[sel]));
  const paidThisMonInactive = inactiveStats.filter(m =>  isPaid(m.months[sel]));
  const pendingThisMon      = selIsPast ? activeStats.filter(m => !isPaid(m.months[sel])) : [];
  const pendingThisMonInact = selIsPast ? inactiveStats.filter(m => !isPaid(m.months[sel])) : [];
  const overdue             = activeStats.filter(m => m.isOverdue);
  const collectedActive     = activeStats.reduce((s, m) => s + m.totalPaid,    0);
  const collectedInactive   = inactiveStats.reduce((s, m) => s + m.totalPaid,  0);
  const collectedTotal      = collectedActive + collectedInactive;
  const selIdx             = months.indexOf(sel);
  const monthsTillSel      = months.slice(0, selIdx + 1);
  const pendingActiveSel   = activeStats.reduce((s, m) =>
    s + monthsTillSel.filter(mo => !isPaid(m.months[mo])).length * FEE, 0);
  const pendingInactiveSel = inactiveStats.reduce((s, m) =>
    s + monthsTillSel.filter(mo => !isPaid(m.months[mo])).length * FEE, 0);
  const pendingTotalSel    = pendingActiveSel + pendingInactiveSel;
  const C_GREY           = '#64748b';
  const isCurrentSession = !!(CONFIG.SESSIONS[STATE.currentSessionIdx]?.active); // editable only for active session
  const curCalMonth      = isCurrentSession ? detectCurrentMonth(months) : null;

  document.getElementById('paymentsContent').innerHTML = `

    ${isCurrentSession ? `<!-- Month Selector -->
    <div class="card" style="padding:12px 14px">
      <div class="card-title">Select Month</div>
      <div class="month-pills" id="monthPillsRow" style="scroll-snap-type:x mandatory;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none">
        ${months.map(m => {
          const past  = isPastOrCurrent(m);
          const isSel = m === sel;
          const isCur = m === curCalMonth;
          let style = 'scroll-snap-align:center;';
          if (!past && !isSel)  style += 'opacity:0.4;border-style:dashed;';
          if (isCur  && !isSel) style += 'border-color:#f59e0b;color:#92400e;background:#fef3c7;font-weight:700;';
          return `<button class="month-pill ${isSel ? 'active' : ''}"
            id="mpill-${m}"
            onclick="selectPaymentMonth('${m}')"
            style="${style}"
            title="${isCur ? 'Current month' : past ? '' : 'Future month'}">${m}${isCur && !isSel ? '<span style="display:block;width:4px;height:4px;border-radius:50%;background:#f59e0b;margin:0 auto -2px"></span>' : ''}</button>`;
        }).join('')}
      </div>
      ${!selIsPast ? `<div style="margin-top:8px;font-size:11px;color:${C_MUTED};text-align:center">
        Future month — overdue &amp; pending counts not applicable
      </div>` : ''}
    </div>` : ''}

    ${isCurrentSession ? `<!-- Summary Cards -->
    <div class="metrics">
      <div class="metric green">
        <div class="metric-label">Paid · ${sel}</div>
        <div style="margin-top:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.88">
            <span>Active</span><span style="font-weight:700">${paidThisMon.length}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.88;margin-top:3px">
            <span>In Active</span><span style="font-weight:700">${paidThisMonInactive.length}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:5px;border-top:1px solid rgba(255,255,255,0.35);padding-top:5px">
            <span>Total</span><span>${paidThisMon.length + paidThisMonInactive.length}</span>
          </div>
        </div>
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg></div>
      </div>
      <div class="metric" style="background:linear-gradient(135deg,#b91c1c,#e53e3e)">
        <div class="metric-label">Pending · ${sel}</div>
        ${selIsPast ? `
        <div style="margin-top:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.88">
            <span>Active</span><span style="font-weight:700">${pendingThisMon.length}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.88;margin-top:3px">
            <span>In Active</span><span style="font-weight:700">${pendingThisMonInact.length}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-top:5px;border-top:1px solid rgba(255,255,255,0.35);padding-top:5px">
            <span>Total</span><span>${pendingThisMon.length + pendingThisMonInact.length}</span>
          </div>
        </div>` : `<div class="metric-value">—</div>`}
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      </div>
      <div class="metric blue">
        <div class="metric-label">Total Collected</div>
        <div style="margin-top:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.88">
            <span>Active</span><span style="font-weight:700">${formatCurrency(collectedActive)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.88;margin-top:3px">
            <span>In Active</span><span style="font-weight:700">${formatCurrency(collectedInactive)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:5px;border-top:1px solid rgba(255,255,255,0.35);padding-top:5px">
            <span>Total</span><span>${formatCurrency(collectedTotal)}</span>
          </div>
        </div>
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v2m0 8v2"/></svg></div>
      </div>
      <div class="metric orange">
        <div class="metric-label">Total Pending</div>
        <div style="font-size:10px;opacity:0.8;margin-top:1px">${months[0]} – ${sel} tak</div>
        <div style="margin-top:4px">
          <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.88">
            <span>Active</span><span style="font-weight:700">${formatCurrency(pendingActiveSel)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;opacity:0.88;margin-top:3px">
            <span>In Active</span><span style="font-weight:700">${formatCurrency(pendingInactiveSel)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:5px;border-top:1px solid rgba(255,255,255,0.35);padding-top:5px">
            <span>Total</span><span>${formatCurrency(pendingTotalSel)}</span>
          </div>
        </div>
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg></div>
      </div>
    </div>` : ''}

    <!-- Year Target Bar (current session only) -->
    ${isCurrentSession ? `
    <div style="background:linear-gradient(135deg,#0f4a29,#1a6b3c);border-radius:12px;padding:10px 14px;color:#fff;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;margin-bottom:2px;display:flex;align-items:center;gap:6px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Is Session Ka Expected Amount
      </div>
      <div style="font-size:10px;opacity:0.7;margin-bottom:8px">Agar tamam members pura saal dein — 12 mahine × Rs.${FEE}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;opacity:0.88;margin-bottom:4px">
        <span style="display:flex;align-items:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>Active (${activeStats.length} members)</span>
        <span style="font-weight:700">${formatCurrency(activeStats.length * 12 * FEE)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;opacity:0.88;margin-bottom:6px">
        <span style="display:flex;align-items:center;gap:5px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>In Active (${inactiveStats.length} members)</span>
        <span style="font-weight:700">${formatCurrency(inactiveStats.length * 12 * FEE)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;border-top:1px solid rgba(255,255,255,0.3);padding-top:6px">
        <span>Grand Total (${stats.length} members)</span>
        <span>${formatCurrency(stats.length * 12 * FEE)}</span>
      </div>
    </div>` : ''}

    <!-- WhatsApp Share (current session only) -->
    ${isCurrentSession ? `
    <button class="whatsapp-btn" onclick="showWhatsAppPopup()"
      style="justify-content:center;gap:10px;font-size:14px">
      ${WA_SVG} WhatsApp Share — ${sel}
    </button>` : ''}

    ${isCurrentSession ? `<!-- Overdue Threshold Picker -->
    <div class="card" style="padding:10px 14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:600;color:${C_ORANGE};white-space:nowrap;display:inline-flex;align-items:center;gap:5px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${C_ORANGE}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Overdue if unpaid ≥</span>
        <div class="month-pills" style="flex:1">
          ${[1,2,3,4,5,6].map(n => `
            <button class="month-pill ${_overdueThreshold === n ? 'active' : ''}"
              onclick="setOverdueThreshold(${n})" style="${_overdueThreshold===n?'':'border-color:#f59e0b;color:#b45309'}">${n}+</button>
          `).join('')}
        </div>
      </div>
    </div>` : ''}

    <!-- Overdue (collapsed by default) -->
    ${isCurrentSession && overdue.length > 0 ? `
    <div class="card overdue-card">
      <div class="toggle-header" onclick="toggleOverdue()"
        style="cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:600;flex:1;color:${C_RED};display:flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${C_RED}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Overdue — ${_overdueThreshold}+ Months Unpaid
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
              <div class="pay-name"><b>${m.name.replace(/\(.*?\)/g,'').trim()}</b>
                <span class="badge badge-active" style="font-size:10px;margin-left:4px">Active</span>
              </div>
              <div class="pay-sub">${m.unpaidList.length} months unpaid · ${m.unpaidList.join(', ')}</div>
            </div>
            <div class="pay-amount" style="color:${C_ORANGE}">${formatCurrency(m.totalPending)}</div>
            <button onclick="waMemberOverdue('${m.name.replace(/\(.*?\)/g,'').trim()}')" title="WhatsApp Reminder" style="background:none;border:none;cursor:pointer;color:#25d366;padding:2px 6px;flex-shrink:0;line-height:1">${WA_SVG}</button>
          </div>`).join('')}
      </div>` : ''}
    </div>` : ''}

    <!-- In Active Members (collapsed by default) -->
    ${inactiveStats.length > 0 ? `
    <div class="card" style="border-left:3px solid ${C_GREY}">
      <div class="toggle-header" onclick="toggleInactive()"
        style="cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:600;flex:1;color:${C_GREY};display:flex;align-items:center;gap:6px">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${C_GREY}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>In Active Members
        </span>
        <span class="section-count" style="background:#f1f5f9;color:${C_GREY}">${inactiveStats.length}</span>
        ${chevron(_showInactive)}
      </div>
      ${_showInactive ? `
      <div style="margin-top:10px">
        ${inactiveStats.map(m => `
          <div class="pay-row" style="opacity:0.8">
            <div class="pay-avatar" style="background:#e2e8f0;color:#64748b">${getInitials(m.name)}</div>
            <div class="pay-info">
              <div class="pay-name"><b>${m.name.replace(/\(.*?\)/g,'').trim()}</b>
                <span class="badge badge-inactive" style="font-size:10px;margin-left:4px">In Active</span>
              </div>
              <div class="pay-sub">Paid ${m.paidList.length} months · Due ${m.unpaidList.length} months</div>
            </div>
            <div class="pay-amount" style="color:${C_GREY}">${m.totalPaid > 0 ? formatCurrency(m.totalPaid) : '—'}</div>
            ${isCurrentSession ? `<button onclick="waMemberSummary('${m.name.replace(/\(.*?\)/g,'').trim()}')" title="Member Summary WhatsApp" style="background:none;border:none;cursor:pointer;color:#25d366;padding:2px 6px;flex-shrink:0;line-height:1">${WA_SVG}</button>` : ''}
          </div>`).join('')}
      </div>` : ''}
    </div>` : ''}

    <!-- Not Paid This Month (collapsed by default) -->
    ${isCurrentSession && selIsPast ? `
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
                    <b>${m.name.replace(/\(.*?\)/g,'').trim()}</b>
                    <span class="badge badge-active" style="font-size:10px;margin-left:4px">Active</span>
                    ${m.isOverdue ? `<span class="badge badge-inactive" style="font-size:10px;margin-left:2px">Overdue</span>` : ''}
                  </div>
                  <div class="pay-sub">Past pending: ${formatCurrency(m.totalPending)}</div>
                </div>
                <div class="pay-amount" style="color:${C_RED}">−${formatCurrency(FEE)}</div>
                <button onclick="waMemberUnpaid('${m.name.replace(/\(.*?\)/g,'').trim()}','${sel}')" title="Payment Reminder WhatsApp" style="background:none;border:none;cursor:pointer;color:#25d366;padding:2px 6px;flex-shrink:0;line-height:1">${WA_SVG}</button>
              </div>`).join('')}
      </div>` : ''}
    </div>` : ''}

    ${isCurrentSession ? `<!-- Paid This Month (active only) -->
    <div class="card">
      <div class="toggle-header" onclick="togglePaid()"
        style="cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:600;flex:1;color:${C_GREEN}">Paid — ${sel}</span>
        <span class="section-count" style="background:#dcfce7;color:${C_GREEN}">${paidThisMon.length}</span>
        ${chevron(_showPaid)}
      </div>
      ${_showPaid ? `
      <div style="margin-top:10px">
        ${paidThisMon.length === 0
          ? `<div style="padding:8px 0;color:${C_MUTED};font-size:13px;text-align:center">
               ${selIsPast ? 'No payments recorded yet' : 'Future month — nothing to show'}
             </div>`
          : paidThisMon.map(m => `
              <div class="pay-row">
                <div class="pay-avatar pay-avatar--paid">${getInitials(m.name)}</div>
                <div class="pay-info">
                  <div class="pay-name">
                    <b>${m.name.replace(/\(.*?\)/g,'').trim()}</b>
                    <span class="badge badge-active" style="font-size:10px;margin-left:4px">Active</span>
                  </div>
                  <div class="pay-sub">${(() => {
                    const pastCount = months.filter(isPastOrCurrent).length;
                    const pastPaid  = m.paidList.filter(isPastOrCurrent).length;
                    const advance   = m.paidList.length - pastPaid;
                    if (advance > 0) return `Paid ${pastPaid}/${pastCount} past months + ${advance} advance`;
                    return `Paid ${pastPaid} of ${pastCount} past months`;
                  })()}</div>
                </div>
                <div class="pay-amount" style="color:${C_GREEN}">+${formatCurrency(FEE)}</div>
                <button onclick="waMemberPaidPopup('${m.name.replace(/\(.*?\)/g,'').trim()}')" title="Receipt / WhatsApp" style="background:none;border:none;cursor:pointer;color:#0369a1;padding:2px 6px;flex-shrink:0;line-height:1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></button>
              </div>`).join('')}
      </div>` : ''}
    </div>` : ''}

    <!-- Member-wise Summary (past months, active only) -->
    <div class="card" style="padding:12px">
      <div class="toggle-header" onclick="toggleSummary()"
        style="cursor:pointer;display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:600;flex:1">Member-wise Summary
          <span style="font-size:10px;font-weight:400;color:${C_MUTED};margin-left:4px">(Active Only)</span>
        </span>
        <span class="section-count" style="background:#f0fdf4;color:${C_GREEN}">${activeStats.length}</span>
        ${chevron(_showSummary)}
      </div>
      ${_showSummary ? `
      <div class="summary-scroll" style="margin-top:10px">
        <table class="summary-table">
          <thead>
            <tr>
              <th style="text-align:left">Member</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Collected</th>
              <th>Pending</th>
              ${isCurrentSession ? '<th></th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${activeStats.map(m => `
              <tr style="${m.isOverdue ? 'background:#fff9f0' : ''}">
                <td style="text-align:left;font-weight:700;white-space:nowrap;font-size:12px">
                  ${m.name.replace(/\(.*?\)/g,'').trim()}
                  ${m.isOverdue ? `<span style="color:${C_RED};font-size:9px;margin-left:3px">●</span>` : ''}
                </td>
                <td style="color:${C_GREEN};font-weight:600">${m.paidList.length}</td>
                <td style="color:${m.unpaidList.length > 0 ? C_RED : C_MUTED};font-weight:600">${m.unpaidList.length}</td>
                <td style="color:${C_GREEN};font-weight:600;white-space:nowrap">${formatCurrency(m.totalPaid)}</td>
                <td style="color:${m.totalPending > 0 ? C_RED : C_MUTED};font-weight:600;white-space:nowrap">
                  ${m.totalPending > 0 ? formatCurrency(m.totalPending) : '—'}
                </td>
                <td style="padding:2px 4px">
                  <button onclick="showPaymentReceiptOptions('${m.name.replace(/\(.*?\)/g,'').trim()}')" title="Receipt" style="background:none;border:none;cursor:pointer;color:#0369a1;padding:2px 4px;line-height:1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>

    <!-- Full Payment Grid -->
    <div class="card" style="padding:12px">
      <div class="toggle-header" onclick="toggleGrid()"
        style="cursor:pointer;display:flex;align-items:center;gap:8px;margin-bottom:0">
        <span style="font-size:13px;font-weight:600;flex:1">Full Payment Grid
          <span style="font-size:10px;font-weight:400;color:${C_MUTED};margin-left:4px">(Regular Members)</span>
        </span>
        <span class="section-count" style="background:#f0f9ff;color:#0369a1">${stats.length}</span>
        ${chevron(_showGrid)}
      </div>
      ${_showGrid ? `<div class="payment-grid" style="margin-top:10px">
        <table class="payment-table">
          <thead>
            <tr>
              <th style="text-align:left;min-width:110px">Member</th>
              ${months.map(m => {
                const past    = isPastOrCurrent(m);
                const paidCnt = stats.filter(s => isPaid(s.months[m])).length;
                const sub     = past
                  ? `${paidCnt}/${stats.length}`
                  : (paidCnt > 0 ? `${paidCnt}↑adv` : 'future');
                return `<th style="${!past && paidCnt === 0 ? 'opacity:0.45' : ''}">${m}<br><span style="font-size:8px;font-weight:400;opacity:.8">${sub}</span></th>`;
              }).join('')}
              <th>Paid</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            ${stats.map(m => {
              const payIdx  = STATE.allPayments.findIndex(p => nameMatch(p.name, m.name));
              const canEdit = isCurrentSession && !m.isInactive && payIdx !== -1;
              return `
              <tr style="${m.isInactive ? 'opacity:0.6;background:#f8fafc' : m.isOverdue ? 'background:#fff9f0' : ''}">
                <td class="name-col" style="font-weight:700;color:${m.isInactive ? '#64748b' : 'inherit'}">
                  ${m.name.replace(/\(.*?\)/g,'').trim()}
                  ${m.isInactive ? `<span style="color:#94a3b8;font-size:9px;margin-left:2px">●</span>` : m.isOverdue ? `<span style="color:${C_RED};font-size:9px;margin-left:2px">●</span>` : ''}
                </td>
                ${months.map(mo => {
                  const oc = canEdit ? `onclick="togglePaymentCell(${payIdx},'${mo}')" style="cursor:pointer"` : '';
                  if (isPaid(m.months[mo]))  return `<td class="cell-paid" ${oc}>${isPastOrCurrent(mo) ? '✓' : '↑'}</td>`;
                  if (!isPastOrCurrent(mo))  return `<td class="cell-empty" style="opacity:0.4${canEdit ? ';cursor:pointer' : ''}" ${canEdit ? `onclick="togglePaymentCell(${payIdx},'${mo}')"` : ''}>—</td>`;
                  return `<td class="cell-unpaid" ${oc}>✗</td>`;
                }).join('')}
                <td style="color:${C_GREEN};font-weight:600;white-space:nowrap">${formatCurrency(m.totalPaid)}</td>
                <td style="color:${m.totalPending > 0 ? C_RED : C_MUTED};font-weight:600;white-space:nowrap">
                  ${m.totalPending > 0 ? formatCurrency(m.totalPending) : '—'}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>
  `;

  // Restore page scroll (prevents jump-to-top on toggle) and center selected month pill horizontally
  requestAnimationFrame(() => {
    window.scrollTo(0, _savedScroll);
    if (isCurrentSession) {
      const row  = document.getElementById('monthPillsRow');
      const pill = document.getElementById('mpill-' + sel);
      if (row && pill) {
        row.scrollLeft = pill.offsetLeft - row.offsetWidth / 2 + pill.offsetWidth / 2;
      }
    }
  });
}

// ── Share Format Picker (Text / PDF) ─────────────────────

function _genFileName(label) {
  const d  = new Date();
  const p  = n => String(n).padStart(2, '0');
  const ts = `${p(d.getDate())}${p(d.getMonth()+1)}${String(d.getFullYear()).slice(-2)}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const safe = label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  return `TanzeemAbdMustafa_${safe}_${ts}`;
}

let _pendingShare = { msg: '', waLink: '', pdfFn: null };

function _askShareFormat(msg, waLink, pdfFn = null) {
  _pendingShare = { msg, waLink, pdfFn };
  let overlay = document.getElementById('shareFormatOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'shareFormatOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '500';
    overlay.addEventListener('click', _closeShareFormat);
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title">Please Choose Format</div>
        <button class="close-btn" onclick="_closeShareFormat()">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;padding-top:4px">
        <button class="whatsapp-btn" style="margin:0;justify-content:center;gap:10px" onclick="_closeShareFormat();_sendAsText()">
          ${WA_SVG} Text Message (WhatsApp)
        </button>
        <button class="btn btn-primary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;padding:12px" onclick="_closeShareFormat();(_pendingShare.pdfFn||_sendAsPdf)()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          PDF Receipt
        </button>
      </div>
    </div>`;
  overlay.classList.add('open');
}

function _closeShareFormat() {
  document.getElementById('shareFormatOverlay')?.classList.remove('open');
}

function _sendAsText() {
  window.open(_pendingShare.waLink + encodeURIComponent(_pendingShare.msg), '_blank');
}

async function _sendAsPdf() {
  const session = STATE.currentSession ? STATE.currentSession.label : '';
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const logoUrl = new URL('icons/icon.svg', location.href).href;
  const content = _pendingShare.msg
    .replace(/━+/g, '<hr>')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${_genFileName('Receipt')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;padding:32px;max-width:620px;margin:0 auto}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1a6b3c;padding-bottom:14px;margin-bottom:22px}
  .hdr-left{display:flex;align-items:center;gap:12px}
  .logo{width:52px;height:52px;border-radius:10px}
  .org{font-size:16px;font-weight:700;color:#1a6b3c}
  .org-sub{font-size:12px;color:#64748b;margin-top:2px}
  .sess{display:inline-block;font-size:11px;font-weight:600;color:#0f4a29;background:#dcfce7;padding:2px 8px;border-radius:4px;margin-top:5px}
  .hdr-right{text-align:right;font-size:11px;color:#64748b}
  .hdr-right .date{font-weight:700;color:#1e293b;font-size:13px}
  .body{line-height:1.9}
  .body hr{border:none;border-top:1px solid #cbd5e1;margin:10px 0}
  .ftr{margin-top:30px;border-top:1px solid #e2e8f0;padding-top:12px;text-align:center;font-size:11px;color:#94a3b8;line-height:1.7}
  .ftr strong{color:#475569;font-size:12px}
  .ftr em{font-size:10px}
  @media print{#waBanner{display:none!important}body{padding:16px}@page{margin:.8cm}}
</style>
</head>
<body>
<div id="waBanner" style="position:fixed;top:0;left:0;right:0;z-index:9999;
     background:#25d366;color:#fff;padding:11px 16px;font-size:13px;font-weight:500;
     display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.2)">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
  <span style="flex:1">Tap browser <strong>Share ↑</strong> or <strong>⋮</strong> → WhatsApp to send</span>
  <button onclick="window.print()" style="background:rgba(0,0,0,.2);color:#fff;border:none;
    border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">
    Save PDF
  </button>
  <button onclick="document.getElementById('waBanner').remove()"
    style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:0 4px">×</button>
</div>
<div style="height:52px"></div>
<div class="hdr">
  <div class="hdr-left">
    <img src="${logoUrl}" class="logo" onerror="this.style.display='none'">
    <div>
      <div class="org">Tanzeem Abd-e-Mustafa — Bisauli</div>
      <div class="org-sub">تنظیم عبد مصطفیٰ — بسولی</div>
      <span class="sess">Session: ${session}</span>
    </div>
  </div>
  <div class="hdr-right">
    <div class="date">${dateStr}</div>
    <div style="margin-top:3px">Auto-Generated Receipt</div>
  </div>
</div>
<div class="body">${content}</div>
<div class="ftr">
  <strong>Tanzeem Abd-e-Mustafa — Bisauli</strong><br>
  <em>⚠ Yeh receipt automatically generate ki gayi hai — kisi dastakhat (signature) ki zaroorat nahi.</em>
</div>
</body>
</html>`;

  // Try Web Share API (native share sheet on mobile → pick WhatsApp)
  if (navigator.share) {
    const file = new File([html], `${_genFileName('Receipt')}.html`, { type: 'text/html' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Receipt — Tanzeem Abd-e-Mustafa' }); return; }
      catch(e) { if (e.name === 'AbortError') return; }
    }
  }

  // Fallback: open via Blob URL with WA share banner
  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (!win) { URL.revokeObjectURL(url); showToast('Popup block hai — browser mein allow karein', 'error'); return; }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ── WhatsApp Share ────────────────────────────────────────

function shareWhatsApp(filter) {
  // filter: 'active' | 'inactive' | 'all'
  if (STATE.allPayments.length === 0) {
    showToast('Pehle data sync karein', 'error');
    return;
  }

  const months   = Object.keys(STATE.allPayments[0].months);
  const sel      = STATE.selectedPaymentMonth || detectCurrentMonth(months);
  const allStats = buildMemberStats(STATE.allPayments);
  const session  = STATE.currentSession ? STATE.currentSession.label : '';
  const clean    = n => n.replace(/\(.*?\)/g, '').trim();

  // Overdue filter gets its own focused message
  if (filter === 'overdue') {
    const overdueList = allStats.filter(m => !m.isInactive && m.isOverdue)
      .sort((a, b) => b.unpaidList.length - a.unpaidList.length);
    if (overdueList.length === 0) { showToast('Abhi koi overdue member nahi hai', 'error'); return; }
    let msg = '';
    msg += `Assalamualkum wa Rahmatullahi wa Barakatuh! 🕌\n\n`;
    msg += `اسلام علیکم ورحمتہ وبرکاتہ\n\n`;
    msg += `*Tanzeem Abd-e-Mustafa — Bisauli*\n`;
    msg += `*تنظیم عبد مصطفیٰ — بسولی*\n`;
    msg += `*Session: ${session}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `⚠️ *Overdue Members — ${_overdueThreshold}+ Mahine Baqi (${overdueList.length} log):*\n\n`;
    overdueList.forEach((m, i) => {
      msg += `${i + 1}. *${clean(m.name)}*\n`;
      msg += `   Baqi: ${m.unpaidList.join(', ')} (${m.unpaidList.length} mahine)\n`;
      msg += `   Rakam: ${formatCurrency(m.totalPending)}\n\n`;
    });
    msg += `━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *Khulasa:*\n`;
    msg += `• Overdue members: ${overdueList.length} log\n`;
    //msg += `• Kul baqi: ${formatCurrency(overdueList.reduce((s, m) => s + m.totalPending, 0))}\n`;
    msg += `\nJazakallah Khair 🤲`;
    _askShareFormat(msg, 'https://wa.me/?text=');
    return;
  }

  const stats = filter === 'active'
    ? allStats.filter(m => !m.isInactive)
    : filter === 'inactive'
      ? allStats.filter(m =>  m.isInactive)
      : allStats;

  const sectionLabel = filter === 'active'
    ? 'Active Members'
    : filter === 'inactive'
      ? 'In Active Members'
      : 'Tamam Members (Active + In Active)';

  const paidNow    = stats.filter(m =>  isPaid(m.months[sel]));
  const unpaidNow  = isPastOrCurrent(sel) ? stats.filter(m => !isPaid(m.months[sel])) : [];
  const withUnpaid = stats
    .filter(m => m.unpaidList.length > 0)
    .sort((a, b) => b.unpaidList.length - a.unpaidList.length);

  let msg = '';
  msg += `Assalamualkum wa Rahmatullahi wa Barakatuh! 🕌\n\n`;
  msg += `اسلام علیکم ورحمتہ وبرکاتہ\n\n`;
  msg += `*Tanzeem Abd-e-Mustafa — Bisauli*\n`;
  msg += `*تنظیم عبد مصطفیٰ — بسولی*\n`;
  msg += `*Session: ${session}*\n`;
  msg += `*[${sectionLabel}]*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `✅ *${sel} Mahine Mein Jama Kiya (${paidNow.length} log):*\n`;
  msg += paidNow.length > 0
    ? paidNow.map((m, i) => `${i + 1}. ${clean(m.name)}`).join('\n')
    : '_Abhi kisi ne jama nahi kiya_';
  msg += '\n\n';

  if (isPastOrCurrent(sel)) {
    msg += `❌ *${sel} Mahine Mein Jama Nahi Kiya (${unpaidNow.length} log):*\n`;
    msg += unpaidNow.length > 0
      ? unpaidNow.map((m, i) => `${i + 1}. ${clean(m.name)}`).join('\n')
      : '_Shukriya! Sab ne jama kar diya_ ✅';
    msg += '\n\n';
  }

  if (withUnpaid.length > 0) {
    msg += `📋 *Har Member Ke Baqi Mahine:*\n`;
    withUnpaid.forEach((m, i) => {
      msg += `${i + 1}.) ${clean(m.name)} — ${m.unpaidList.join(', ')}\n`;
    });
    msg += '\n';
  }

  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *${sel} Ka Khulasa:*\n`;
  msg += `• Jama kiya: ${paidNow.length} log\n`;
  if (isPastOrCurrent(sel)) msg += `• Baqi hai: ${unpaidNow.length} log\n`;
  // msg += `• Kul ikattha hua: ${formatCurrency(totalCollected)}\n`;
  // msg += `• Kul baqi hai: ${formatCurrency(totalPending)}\n`;
  msg += `\nJazakallah Khair 🤲`;

  _askShareFormat(msg, 'https://wa.me/?text=');
}

// ── Toggle payment cell ───────────────────────────────────

async function togglePaymentCell(payIdx, mo) {
  if (!await _ensureWriteAccess()) return;
  if (STATE.currentSessionIdx !== 0) { showToast('Purane session mein edit nahi ho sakta', 'error'); return; }
  const p = STATE.allPayments[payIdx];
  if (!p) return;
  const memberRec = STATE.allMembers.find(m => nameMatch(m.name, p.name));
  if (memberRec && memberRec.status !== 'Active') {
    showToast('In Active member ko pehle Active karein', 'error'); return;
  }
  const months = Object.keys(p.months);
  const mIdx   = months.indexOf(mo);
  if (mIdx === -1) return;
  const col      = colLetter(3 + mIdx);
  const newVal   = isPaid(p.months[mo]) ? '' : 'Paid';
  const action   = newVal === 'Paid' ? 'Paid mark karein' : 'Unpaid mark karein';
  const cleanName = p.name.replace(/\(.*?\)/g, '').trim();
  showConfirm(
    `${action}?`,
    `<b>${cleanName}</b> — ${mo}<br><span style="color:var(--muted);font-size:12px">${isPaid(p.months[mo]) ? 'Abhi Paid ✓ hai → Unpaid karna chahte hain?' : 'Abhi Unpaid ✗ hai → Paid karna chahte hain?'}</span>`,
    async () => {
      try {
        const session = STATE.currentSession;
        await sheetsPut(`${session.sheet}!${col}${p.row}`, [[newVal]]);
        STATE.allPayments[payIdx].months[mo] = newVal;
        const paidCount = Object.values(STATE.allPayments[payIdx].months).filter(v => isPaid(v)).length;
        STATE.allPayments[payIdx].total = String(paidCount * FEE);
        saveCache(session.label);
        showToast(newVal === 'Paid' ? '✅ Paid ho gaya!' : '✗ Unpaid ho gaya!');
        renderPayments();
      } catch(e) {
        showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
      }
    }
  );
}

// ── WhatsApp Share Popup ──────────────────────────────────

function showWhatsAppPopup() {
  let overlay = document.getElementById('waPopupOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'waPopupOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '300';
    overlay.addEventListener('click', closeWhatsAppPopup);
    document.body.appendChild(overlay);
  }
  const sel = STATE.selectedPaymentMonth || '';
  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title">WhatsApp Share — ${sel}</div>
        <button class="close-btn" onclick="closeWhatsAppPopup()">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;padding-top:4px">
        <button class="whatsapp-btn" style="margin:0" onclick="closeWhatsAppPopup();shareWhatsApp('active')">
          ${WA_SVG} Active Members
        </button>
        <button class="whatsapp-btn" style="margin:0;background:linear-gradient(135deg,#b45309,#d97706)" onclick="closeWhatsAppPopup();shareWhatsApp('overdue')">
          ${WA_SVG} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Overdue Members
        </button>
        <button class="whatsapp-btn" style="margin:0;background:linear-gradient(135deg,#1d4ed8,#2563eb)" onclick="closeWhatsAppPopup();shareWhatsApp('all')">
          ${WA_SVG} All Members (Active + In Active)
        </button>
      </div>
    </div>`;
  overlay.classList.add('open');
}

function closeWhatsAppPopup() {
  document.getElementById('waPopupOverlay')?.classList.remove('open');
}

// ── Per-member WhatsApp helpers ───────────────────────────

function _memberWaLink(name) {
  const member = STATE.allMembers.find(m => nameMatch(m.name, name));
  const raw    = (member?.mobile || '').replace(/\D/g, '').replace(/^0+/, '');
  const mobile = raw.length === 10 ? '91' + raw : raw;
  return mobile ? `https://wa.me/${mobile}?text=` : `https://wa.me/?text=`;
}

function _waHeader() {
  const session = STATE.currentSession ? STATE.currentSession.label : '';
  return `Assalamualkum wa Rahmatullahi wa Barakatuh! 🕌\n\nاسلام علیکم ورحمتہ وبرکاتہ\n\n*Tanzeem Abd-e-Mustafa — Bisauli*\n*تنظیم عبد مصطفیٰ — بسولی*\n*Session: ${session}*\n━━━━━━━━━━━━━━━━━━━\n\n`;
}

function waMemberOverdue(name) {
  const allStats = buildMemberStats(STATE.allPayments);
  const m = allStats.find(s => nameMatch(s.name, name));
  if (!m) return;
  const clean = n => n.replace(/\(.*?\)/g, '').trim();
  let msg = _waHeader();
  msg += `*${clean(m.name)}*,\n\n`;
  msg += `Tanzeem Abd-e-Mustafa ki taraf se yaad dahani:\n\n`;
  msg += `⚠️ *Aapki Baqi Mahine (${m.unpaidList.length} mahine):*\n`;
  msg += m.unpaidList.join(', ') + '\n\n';
  msg += `💰 *Kul Baqi Rakam:* ${formatCurrency(m.totalPending)}\n`;
  msg += `(${m.unpaidList.length} mahine × Rs.${FEE})\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Meherbani karke jald se jald ada kar dein.\n`;
  msg += `Jazakallah Khair 🤲`;
  _askShareFormat(msg, _memberWaLink(name));
}

function waMemberUnpaid(name, month) {
  const clean = n => n.replace(/\(.*?\)/g, '').trim();
  let msg = _waHeader();
  msg += `*${clean(name)}*,\n\n`;
  msg += `❌ *${month} Ki Payment Abhi Baqi Hai*\n\n`;
  msg += `Meherbani karke Rs.${FEE} jama kar dein.\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Jazakallah Khair 🤲`;
  _askShareFormat(msg, _memberWaLink(name));
}

// Paid: show month picker popup
let _waPaidName     = '';
let _waPaidMonths   = [];
let _waPaidSelected = new Set();
let _waAdvanceNote  = '';
let _preCapMonths   = null;   // pre-captured before closeWaPaidPopup clears state
let _preCapAdvNote  = null;
let _preCapMember   = null;

function waMemberPaidPopup(name) {
  const allStats = buildMemberStats(STATE.allPayments);
  const m = allStats.find(s => nameMatch(s.name, name));
  if (!m || m.paidList.length === 0) { showToast('Is member ki koi paid entry nahi', 'error'); return; }
  _waPaidName     = name;
  _waPaidMonths   = m.paidList;
  _waAdvanceNote  = '';
  const defMonth  = STATE.selectedPaymentMonth && m.paidList.includes(STATE.selectedPaymentMonth)
    ? STATE.selectedPaymentMonth
    : m.paidList[m.paidList.length - 1];
  _waPaidSelected = new Set([defMonth]);
  _renderWaPaidPopup();
}

function _renderWaPaidPopup() {
  let overlay = document.getElementById('waPaidPopupOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'waPaidPopupOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '400';
    overlay.addEventListener('click', closeWaPaidPopup);
    document.body.appendChild(overlay);
  }
  const clean = n => n.replace(/\(.*?\)/g, '').trim();
  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title">Payment Confirm — ${clean(_waPaidName)}</div>
        <button class="close-btn" onclick="closeWaPaidPopup()">×</button>
      </div>
      <div style="font-size:12px;color:#64748b;margin-bottom:12px">Kis mahine ki payment confirm karni hai? (multiple select ho sakta hai)</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
        ${(() => {
          const lastPaid = _waPaidMonths[_waPaidMonths.length - 1];
          return _waPaidMonths.map(mo => {
            const isSel  = _waPaidSelected.has(mo);
            const isLast = mo === lastPaid;
            let style = 'scroll-snap-align:none;';
            if (isLast && !isSel) style += 'border-color:#f59e0b;color:#92400e;background:#fef3c7;font-weight:700;';
            const badge = isLast
              ? `<span style="display:block;font-size:9px;font-weight:700;color:${isSel ? 'rgba(255,255,255,0.85)' : '#b45309'};margin-top:-2px;letter-spacing:0.3px">last</span>`
              : '';
            return `<button onclick="toggleWaPaidMonth('${mo}')" id="wpm-${mo}"
              class="month-pill ${isSel ? 'active' : ''}"
              style="${style}">${mo}${badge}</button>`;
          }).join('');
        })()}
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:#64748b;margin-bottom:6px;font-weight:500">Advance Note <span style="font-weight:400;opacity:0.7">(optional — next session ke mahine ya extra amount)</span></div>
        <input id="waAdvanceNoteInput" type="text"
          placeholder="e.g. Agle session ka advance — Rs.450 mila"
          value="${_waAdvanceNote.replace(/"/g,'&quot;')}"
          oninput="_waAdvanceNote=this.value"
          style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:13px;box-sizing:border-box;color:#1e293b">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
        <button onclick="openPaymentReceiptFromPopup('view')"
          style="display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;font-size:13px;font-weight:600;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:10px;cursor:pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View
        </button>
        <button onclick="openPaymentReceiptFromPopup('export')"
          style="display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;font-size:13px;font-weight:600;background:#1a6b3c;color:#fff;border:none;border-radius:10px;cursor:pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export PDF
        </button>
      </div>
      <button class="whatsapp-btn" style="margin:0;justify-content:center;gap:10px" onclick="sendWaMemberPaid()">
        ${WA_SVG} WhatsApp Send
      </button>
    </div>`;
  overlay.classList.add('open');
}

function toggleWaPaidMonth(mo) {
  if (_waPaidSelected.has(mo)) {
    if (_waPaidSelected.size > 1) _waPaidSelected.delete(mo);
  } else {
    _waPaidSelected.add(mo);
  }
  _renderWaPaidPopup();
}

function closeWaPaidPopup() {
  document.getElementById('waPaidPopupOverlay')?.classList.remove('open');
  _waAdvanceNote = '';
}

function sendWaMemberPaid() {
  // Capture BEFORE closeWaPaidPopup clears _waAdvanceNote
  const allMonths_   = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const months       = [..._waPaidSelected].sort((a, b) => allMonths_.indexOf(a) - allMonths_.indexOf(b));
  const capturedNote = _waAdvanceNote.trim();
  const capturedName = _waPaidName;

  // Store for openPaymentReceiptFromPopup when called via PDF option
  _preCapMonths  = months;
  _preCapAdvNote = capturedNote;
  _preCapMember  = capturedName;

  closeWaPaidPopup();

  // Separate selected months: past-paid vs future-paid (advance)
  const pastMonths = months.filter(mo =>  isPastOrCurrent(mo));
  const advMonths  = months.filter(mo => !isPastOrCurrent(mo));

  const clean = n => n.replace(/\(.*?\)/g, '').trim();
  let msg = _waHeader();
  msg += `*${clean(capturedName)}*,\n\n`;
  msg += `✅ *Aapki Payment Haasil Ho Gayi!*\n\n`;

  if (pastMonths.length > 0) {
    msg += `✅ *Jama Kiya (${pastMonths.length} mahine):*\n`;
    msg += pastMonths.join(', ');
    msg += `\n💰 Rakam: Rs.${pastMonths.length * FEE}\n\n`;
  }

  if (advMonths.length > 0) {
    msg += `⬆️ *Pehle Se Jama Kar Diya — Advance (${advMonths.length} mahine):*\n`;
    msg += advMonths.join(', ');
    msg += `\n💰 Rakam: Rs.${advMonths.length * FEE}\n\n`;
  }

  if (capturedNote) {
    msg += `📌 *Advance Note:* ${capturedNote}\n\n`;
  }

  msg += `Allah aapki kamai mein barkat farmaaye. 🤲\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Jazakallah Khair 🤲`;
  _askShareFormat(msg, _memberWaLink(capturedName), () => openPaymentReceiptFromPopup('share'));
}

// ── Transaction Receipt from WA paid popup ────────────────────
async function openPaymentReceiptFromPopup(mode) {
  let advNote, memberName, selMonths;

  if (_preCapMonths !== null) {
    // Called after popup already closed (via _askShareFormat PDF button)
    advNote    = _preCapAdvNote;
    memberName = _preCapMember;
    selMonths  = _preCapMonths;
    _preCapMonths  = null;
    _preCapAdvNote = null;
    _preCapMember  = null;
  } else {
    // Called directly from View/Export buttons inside the popup
    advNote    = _waAdvanceNote.trim();
    memberName = _waPaidName;
    const allMonths = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
    selMonths  = [..._waPaidSelected].sort((a, b) => allMonths.indexOf(a) - allMonths.indexOf(b));
    closeWaPaidPopup();
  }
  const member     = STATE.allMembers.find(m => nameMatch(m.name, memberName) || m.name.replace(/\(.*?\)/g,'').trim() === memberName);
  const session    = STATE.currentSession?.label || '';
  const dateStr    = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const logoUrl    = new URL('icons/icon.svg', location.href).href;
  const cleanName  = memberName.replace(/\(.*?\)/g,'').trim();
  const status     = member?.status || 'Active';
  const mobile     = member?.mobile || '';
  const receiptNo  = `PAY-${getInitials(cleanName)}-${session.replace(/[^a-zA-Z0-9]/g,'')}`;
  const total      = selMonths.length * FEE;

  const monthRows = selMonths.map(mo => {
    const isAdv    = !isPastOrCurrent(mo);
    const color    = isAdv ? '#1d4ed8' : '#15803d';
    const advBadge = isAdv
      ? `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;margin-left:5px">ADVANCE</span>`
      : '';
    return `<tr style="${isAdv ? 'background:#f0f7ff' : ''}">
      <td style="font-weight:600;color:#1e293b">${mo}</td>
      <td style="color:${color};font-weight:600">&#10003; ${isAdv ? 'Advance' : 'Paid'}${advBadge}</td>
      <td style="color:${color};font-weight:700;text-align:right">Rs.${FEE}</td>
    </tr>`;
  }).join('');

  const waBannerHtml = `
<div id="waBanner" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#25d366;color:#fff;
  padding:11px 16px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.2)">
  ${WA_SVG}
  <span style="flex:1">Tap <strong>Share &#8593;</strong> or <strong>&#8942;</strong> &rarr; WhatsApp</span>
  <button onclick="window.print()" style="background:rgba(0,0,0,.2);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer">Save PDF</button>
  <button onclick="document.getElementById('waBanner').remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:0 4px">&times;</button>
</div><div style="height:52px"></div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${receiptNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#f1f5f9;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px}
  .receipt{background:#fff;width:100%;max-width:420px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.10);overflow:hidden}
  .hdr{background:linear-gradient(135deg,#1a6b3c,#15803d);padding:22px 20px;text-align:center;color:#fff}
  .hdr img{width:48px;height:48px;border-radius:10px;margin-bottom:8px}
  .hdr .org{font-size:15px;font-weight:700}
  .hdr .org-sub{font-size:10px;opacity:.8;margin-top:2px}
  .hdr .tag{display:inline-block;background:rgba(255,255,255,.2);border-radius:10px;padding:3px 13px;font-size:11px;font-weight:700;letter-spacing:1.2px;margin-top:10px}
  .member-box{background:#f0fdf4;border-bottom:1px solid #dcfce7;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
  .member-name{font-size:16px;font-weight:700;color:#1e293b}
  .member-meta{font-size:11px;color:#64748b;margin-top:3px}
  .amt-box{background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:20px;text-align:center}
  .amt-lbl{font-size:10px;font-weight:700;color:#64748b;letter-spacing:.8px;text-transform:uppercase}
  .amt-val{font-size:36px;font-weight:800;color:#15803d;margin-top:6px;letter-spacing:-1px}
  .month-section{padding:14px 18px}
  .month-title{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.6px;margin-bottom:10px;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;font-size:12px}
  td{padding:8px;border-bottom:1px solid #f1f5f9}
  tr:last-child td{border-bottom:none}
  .adv-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 14px;margin:0 18px 14px;font-size:11px;color:#1d4ed8;font-weight:500}
  .rec-no{font-size:10px;color:#94a3b8;text-align:center;padding:6px 18px 14px;letter-spacing:.3px}
  .thankyou{background:#fefce8;padding:14px 20px;text-align:center;border-top:1px solid #fef08a}
  .ty-main{font-size:14px;font-weight:700;color:#854d0e}
  .ty-sub{font-size:11px;color:#92400e;margin-top:3px}
  .footer{padding:14px 20px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px dashed #e2e8f0}
  .sig-line{width:90px;border-bottom:1.5px solid #cbd5e1;margin-bottom:5px}
  .sig-lbl{font-size:10px;color:#94a3b8;line-height:1.5}
  .gen{font-size:9px;color:#cbd5e1;text-align:right;line-height:1.6}
  @media print{body{background:#fff;padding:0;display:block}.receipt{box-shadow:none;border-radius:0;max-width:100%}#waBanner{display:none!important}@page{margin:.3cm;size:A5 portrait}}
</style>
</head>
<body>
<div class="receipt">
  <div class="hdr">
    <img src="${logoUrl}" onerror="this.style.display='none'">
    <div class="org">Tanzeem Abd-e-Mustafa &mdash; Bisauli</div>
    <div class="org-sub">&#x062A;&#x0646;&#x0638;&#x06CC;&#x0645; &#x0639;&#x0628;&#x062F; &#x0645;&#x0635;&#x0637;&#x0641;&#x06CC; &mdash; &#x0628;&#x0633;&#x0648;&#x0644;&#x06CC;</div>
    <div class="tag">PAYMENT RECEIPT</div>
  </div>
  <div class="member-box">
    <div>
      <div class="member-name">${cleanName}</div>
      <div class="member-meta">Session: ${session}${mobile ? ' &nbsp;|&nbsp; &#128222; ' + mobile : ''}</div>
    </div>
    <span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:${status === 'Active' ? '#dcfce7' : '#fee2e2'};color:${status === 'Active' ? '#15803d' : '#b91c1c'}">${status}</span>
  </div>
  <div class="amt-box">
    <div class="amt-lbl">Total Amount Received</div>
    <div class="amt-val">Rs.${total}</div>
    <div style="font-size:11px;color:#64748b;margin-top:4px">${selMonths.length} month${selMonths.length > 1 ? 's' : ''} &times; Rs.${FEE}</div>
  </div>
  <div class="month-section">
    <div class="month-title">Payment Details</div>
    <table><tbody>${monthRows}</tbody></table>
  </div>
  ${advNote ? `<div class="adv-note">&#128204; <strong>Advance Note:</strong> ${advNote}</div>` : ''}
  <div class="rec-no">Receipt No: ${receiptNo} &nbsp;&bull;&nbsp; ${dateStr}</div>
  <div class="thankyou">
    <div class="ty-main">JazakAllah Khair!</div>
    <div class="ty-sub">Aapki madad Tanzeem ko mazboot karti hai</div>
  </div>
  <div class="footer">
    <div><div class="sig-line"></div><div class="sig-lbl">Authorized Signatory</div><div class="sig-lbl">Tanzeem Abd-e-Mustafa</div></div>
    <div class="gen">Tanzeem Manager<br>Auto-Generated Receipt</div>
  </div>
</div>
${mode === 'export' ? '<scr\x69pt>window.addEventListener("load",function(){setTimeout(window.print,900)})</scr\x69pt>' : ''}
</body>
</html>`;

  if (mode === 'share') {
    const cleanBlob = new Blob([html], { type: 'text/html' });
    if (navigator.share) {
      const file = new File([cleanBlob], `${receiptNo}.html`, { type: 'text/html' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: `Payment Receipt — ${cleanName}` }); return; }
        catch(e) { if (e.name === 'AbortError') return; }
      }
    }
    const bannerHtml = html.replace('<body>', '<body>' + waBannerHtml);
    const blob = new Blob([bannerHtml], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) { URL.revokeObjectURL(url); showToast('Popup blocked', 'error'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) { URL.revokeObjectURL(url); showToast('Popup blocked', 'error'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }
}

function waMemberSummary(name) {
  const idx = STATE.allMembers.findIndex(m => nameMatch(m.name, name));
  if (idx === -1) { showToast('Member nahi mila', 'error'); return; }
  shareWhatsAppMember(idx);
}

// ── Payment Receipt options modal ─────────────────────────────
let _receiptMember = '';   // avoids quoting issues in onclick attributes

function showPaymentReceiptOptions(name) {
  _receiptMember = name;
  let ov = document.getElementById('payReceiptOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'payReceiptOverlay';
    ov.className = 'modal-overlay';
    ov.style.zIndex = '500';
    ov.addEventListener('click', () => ov.classList.remove('open'));
    document.body.appendChild(ov);
  }
  const close = `document.getElementById('payReceiptOverlay').classList.remove('open')`;
  ov.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title">Payment Receipt</div>
        <button class="close-btn" onclick="${close}">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;padding-top:4px">
        <button class="btn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;padding:12px;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:12px"
          onclick="${close};openPaymentReceipt(_receiptMember,'view')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View Receipt
        </button>
        <button class="btn btn-primary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;padding:12px"
          onclick="${close};openPaymentReceipt(_receiptMember,'export')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export / Save PDF
        </button>
        <button class="whatsapp-btn" style="margin:0;justify-content:center;gap:10px"
          onclick="${close};openPaymentReceipt(_receiptMember,'share')">
          ${WA_SVG} Share via WhatsApp
        </button>
      </div>
    </div>`;
  ov.classList.add('open');
}

// ── Payment Receipt (View / Export PDF / WhatsApp Share) ──────
async function openPaymentReceipt(memberName, mode) {
  const payRec = STATE.allPayments.find(p =>
    nameMatch(p.name, memberName) || p.name.replace(/\(.*?\)/g,'').trim() === memberName
  );
  const member = STATE.allMembers.find(m =>
    nameMatch(m.name, memberName) || m.name.replace(/\(.*?\)/g,'').trim() === memberName
  );
  if (!payRec) { showToast('Payment record nahi mila', 'error'); return; }

  const months     = Object.keys(payRec.months);
  const session    = STATE.currentSession?.label || '';
  const dateStr    = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const logoUrl    = new URL('icons/icon.svg', location.href).href;
  const cleanName  = memberName.replace(/\(.*?\)/g,'').trim();
  const initials   = getInitials(cleanName);
  const receiptNo  = `PAY-${initials}-${session.replace(/[^a-zA-Z0-9]/g,'')}`;
  const status     = member?.status || 'Active';
  const mobile     = member?.mobile || '';

  // Classify every month
  const paidPast = months.filter(mo =>  isPaid(payRec.months[mo]) &&  isPastOrCurrent(mo));
  const advance  = months.filter(mo =>  isPaid(payRec.months[mo]) && !isPastOrCurrent(mo));
  const unpaid   = months.filter(mo => !isPaid(payRec.months[mo]) &&  isPastOrCurrent(mo));
  const allPaid  = paidPast.length + advance.length;

  const totalCollected = allPaid  * FEE;
  const totalPending   = unpaid.length * FEE;
  const totalAdvance   = advance.length * FEE;

  // Month-wise rows: show past (paid/unpaid) + future paid (advance); skip future unpaid
  const monthRows = months.map(mo => {
    const paid = isPaid(payRec.months[mo]);
    const past = isPastOrCurrent(mo);
    if (!paid && !past) return ''; // not yet due — skip
    const isAdv  = paid && !past;
    const color  = isAdv ? '#1d4ed8' : paid ? '#15803d' : '#b91c1c';
    const rowBg  = isAdv ? '#f0f7ff' : !paid ? '#fff9f9' : '';
    const advBadge = isAdv
      ? `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;margin-left:5px">ADVANCE</span>`
      : '';
    const mark = isAdv ? '↑' : paid ? '✓' : '✗';
    const label = isAdv ? 'Advance' : paid ? 'Paid' : 'Unpaid';
    return `<tr style="background:${rowBg}">
      <td style="font-weight:600;color:#1e293b;white-space:nowrap">${mo}</td>
      <td style="color:${color};font-weight:600">${mark} ${label}${advBadge}</td>
      <td style="color:${color};font-weight:700;text-align:right">${paid ? 'Rs.' + FEE : '&mdash;'}</td>
    </tr>`;
  }).filter(Boolean).join('');

  const waBannerHtml = mode === 'share' ? `
<div id="waBanner" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#25d366;color:#fff;
  padding:11px 16px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.2)">
  ${WA_SVG}
  <span style="flex:1">Tap browser <strong>Share ↑</strong> or <strong>⋮ menu</strong> &rarr; WhatsApp to send this receipt</span>
  <button onclick="window.print()" style="background:rgba(0,0,0,.2);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">Save PDF</button>
  <button onclick="document.getElementById('waBanner').remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:0 4px">&times;</button>
</div>
<div style="height:52px"></div>` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${receiptNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#f1f5f9;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px}
  .receipt{background:#fff;width:100%;max-width:440px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.10);overflow:hidden}
  .hdr{background:linear-gradient(135deg,#1a6b3c,#15803d);padding:22px 20px;text-align:center;color:#fff}
  .hdr img{width:48px;height:48px;border-radius:10px;margin-bottom:8px}
  .hdr .org{font-size:15px;font-weight:700}
  .hdr .org-sub{font-size:10px;opacity:.8;margin-top:2px}
  .hdr .tag{display:inline-block;background:rgba(255,255,255,.2);border-radius:10px;padding:3px 13px;font-size:11px;font-weight:700;letter-spacing:1.2px;margin-top:10px}
  .member-box{background:#f0fdf4;border-bottom:1px solid #dcfce7;padding:16px 20px;display:flex;justify-content:space-between;align-items:center}
  .member-name{font-size:16px;font-weight:700;color:#1e293b}
  .member-meta{font-size:11px;color:#64748b;margin-top:3px}
  .status-badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700}
  .status-active{background:#dcfce7;color:#15803d}
  .status-inactive{background:#fee2e2;color:#b91c1c}
  .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid #e2e8f0}
  .sg-cell{padding:12px 8px;text-align:center;border-right:1px solid #e2e8f0}
  .sg-cell:last-child{border-right:none}
  .sg-val{font-size:18px;font-weight:800;margin-bottom:2px}
  .sg-lbl{font-size:9px;font-weight:600;color:#94a3b8;letter-spacing:.4px;text-transform:uppercase}
  .sg-sub{font-size:10px;font-weight:600;margin-top:1px}
  .month-section{padding:14px 18px}
  .month-title{font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:.6px;margin-bottom:10px;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;font-size:12px}
  td{padding:7px 8px;border-bottom:1px solid #f1f5f9}
  tr:last-child td{border-bottom:none}
  .totals{padding:14px 18px;background:#f8fafc;border-top:1px solid #e2e8f0}
  .total-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0}
  .total-lbl{font-size:12px;color:#475569;font-weight:600}
  .total-val{font-size:13px;font-weight:800}
  .rec-no{font-size:10px;color:#94a3b8;text-align:center;padding:8px 18px;letter-spacing:.3px}
  .thankyou{background:#fefce8;padding:14px 20px;text-align:center;border-top:1px solid #fef08a}
  .ty-main{font-size:14px;font-weight:700;color:#854d0e}
  .ty-sub{font-size:11px;color:#92400e;margin-top:3px}
  .footer{padding:14px 20px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px dashed #e2e8f0}
  .sig-line{width:90px;border-bottom:1.5px solid #cbd5e1;margin-bottom:5px}
  .sig-lbl{font-size:10px;color:#94a3b8;line-height:1.5}
  .gen{font-size:9px;color:#cbd5e1;text-align:right;line-height:1.6}
  .adv-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin:0 18px 14px;font-size:11px;color:#1d4ed8}
  @media print{
    body{background:#fff;padding:0;display:block}
    .receipt{box-shadow:none;border-radius:0;max-width:100%}
    #waBanner{display:none!important}
    @page{margin:.3cm;size:A5 portrait}
  }
</style>
</head>
<body>
${waBannerHtml}
<div class="receipt">
  <div class="hdr">
    <img src="${logoUrl}" onerror="this.style.display='none'">
    <div class="org">Tanzeem Abd-e-Mustafa &mdash; Bisauli</div>
    <div class="org-sub">&#x062A;&#x0646;&#x0638;&#x06CC;&#x0645; &#x0639;&#x0628;&#x062F; &#x0645;&#x0635;&#x0637;&#x0641;&#x06CC; &mdash; &#x0628;&#x0633;&#x0648;&#x0644;&#x06CC;</div>
    <div class="tag">PAYMENT RECEIPT</div>
  </div>

  <div class="member-box">
    <div>
      <div class="member-name">${cleanName}</div>
      <div class="member-meta">Session: ${session}${mobile ? ' &nbsp;|&nbsp; &#128222; ' + mobile : ''}</div>
    </div>
    <span class="status-badge ${status === 'Active' ? 'status-active' : 'status-inactive'}">${status}</span>
  </div>

  <div class="summary-grid">
    <div class="sg-cell">
      <div class="sg-val" style="color:#15803d">${paidPast.length}</div>
      <div class="sg-lbl">Paid</div>
      <div class="sg-sub" style="color:#15803d">Rs.${paidPast.length * FEE}</div>
    </div>
    <div class="sg-cell">
      <div class="sg-val" style="color:#1d4ed8">${advance.length}</div>
      <div class="sg-lbl">Advance</div>
      <div class="sg-sub" style="color:#1d4ed8">Rs.${totalAdvance}</div>
    </div>
    <div class="sg-cell">
      <div class="sg-val" style="color:${unpaid.length > 0 ? '#b91c1c' : '#94a3b8'}">${unpaid.length}</div>
      <div class="sg-lbl">Pending</div>
      <div class="sg-sub" style="color:${unpaid.length > 0 ? '#b91c1c' : '#94a3b8'}">${totalPending > 0 ? 'Rs.' + totalPending : '&mdash;'}</div>
    </div>
  </div>

  <div class="month-section">
    <div class="month-title">Month-wise Details</div>
    <table>
      <tbody>${monthRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:12px">No data</td></tr>'}</tbody>
    </table>
  </div>

  ${advance.length > 0 ? `<div class="adv-note">&#8593; <strong>Advance Payments:</strong> ${advance.join(', ')} &mdash; paid ahead within this session. JazakAllah Khair!</div>` : ''}

  <div class="totals">
    <div class="total-row">
      <div class="total-lbl">Total Collected</div>
      <div class="total-val" style="color:#15803d">Rs.${totalCollected}</div>
    </div>
    ${totalPending > 0 ? `<div class="total-row">
      <div class="total-lbl">Total Pending</div>
      <div class="total-val" style="color:#b91c1c">Rs.${totalPending}</div>
    </div>` : ''}
  </div>

  <div class="rec-no">Receipt No: ${receiptNo} &nbsp;&bull;&nbsp; Generated: ${dateStr}</div>

  <div class="thankyou">
    <div class="ty-main">JazakAllah Khair!</div>
    <div class="ty-sub">Aapki madad Tanzeem ko mazboot karti hai</div>
  </div>

  <div class="footer">
    <div>
      <div class="sig-line"></div>
      <div class="sig-lbl">Authorized Signatory</div>
      <div class="sig-lbl">Tanzeem Abd-e-Mustafa</div>
    </div>
    <div class="gen">Tanzeem Manager<br>Auto-Generated Receipt</div>
  </div>
</div>
${mode === 'export' ? '<scr\x69pt>window.addEventListener("load",function(){setTimeout(window.print,900)})</scr\x69pt>' : ''}
</body>
</html>`;

  if (mode === 'share') {
    // Try native file share (system share sheet → user picks WhatsApp)
    const cleanBlob = new Blob([html], { type: 'text/html' });
    if (navigator.share) {
      const file = new File([cleanBlob], `${receiptNo}.html`, { type: 'text/html' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: `Payment Receipt — ${cleanName}` }); return; }
        catch(e) { if (e.name === 'AbortError') return; }
      }
    }
    // Fallback: open in browser with WA share banner
    const bannerHtml = html.replace('<body>', '<body>' + waBannerHtml);
    const bannerBlob = new Blob([bannerHtml], { type: 'text/html' });
    const url = URL.createObjectURL(bannerBlob);
    const win = window.open(url, '_blank');
    if (!win) { URL.revokeObjectURL(url); showToast('Popup blocked — allow popups in browser settings', 'error'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) { URL.revokeObjectURL(url); showToast('Popup blocked — allow popups in browser settings', 'error'); return; }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }
}

// ── Quick Mark Payment (Dashboard shortcut) ───────────────────
const _qmpSel = new Map(); // memberName → Set of selected months

async function showQuickMarkPayment() {
  if (!await _ensureWriteAccess()) return;
  _qmpSel.clear();
  _renderQmpModal();
}

function _renderQmpModal() {
  let ov = document.getElementById('qmpOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'qmpOverlay';
    ov.className = 'modal-overlay';
    ov.style.zIndex = '400';
    ov.addEventListener('click', _closeQmp);
    document.body.appendChild(ov);
  }

  const allMonths   = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const stats       = buildMemberStats(STATE.allPayments);
  const activeStats = stats.filter(s => !s.isInactive);

  // Build member rows — show only members with at least one unpaid past/current month
  const memberRows = activeStats.map(s => {
    const unpaidMonths = allMonths.filter(mo => isPastOrCurrent(mo) && !isPaid(s.months[mo]));
    if (unpaidMonths.length === 0) return ''; // all paid — skip

    const initials = getInitials(s.name.replace(/\(.*?\)/g, '').trim());
    const selSet   = _qmpSel.get(s.name) || new Set();

    const pills = unpaidMonths.map(mo => {
      const sel = selSet.has(mo);
      return `<span class="qmp-pill${sel ? ' selected' : ''}"
        onclick="_qmpToggle(this,'${s.name.replace(/'/g,"\\'")}','${mo}')">${mo}</span>`;
    }).join('');

    return `<div class="qmp-member">
      <div class="qmp-member-header">
        <div class="qmp-avatar">${initials}</div>
        <div class="qmp-name">${s.name.replace(/\(.*?\)/g, '').trim()}</div>
      </div>
      <div class="qmp-pills">${pills}</div>
    </div>`;
  }).filter(Boolean).join('');

  const totalSel = [..._qmpSel.values()].reduce((n, set) => n + set.size, 0);

  ov.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()" style="max-height:80vh;display:flex;flex-direction:column">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title">Mark Payment</div>
        <button class="close-btn" onclick="_closeQmp()">×</button>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Months ko tap karein select karne ke liye</div>
      <div style="overflow-y:auto;flex:1">
        ${memberRows || '<div class="qmp-empty">✅ Sab active members ne is session ke sab past months pay kar diye!</div>'}
      </div>
      ${memberRows ? `
      <div style="padding-top:12px;border-top:1px solid #f1f5f9;margin-top:4px">
        <button class="btn btn-primary qmp-save-btn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;padding:13px;opacity:${totalSel === 0 ? '.5' : '1'};cursor:${totalSel === 0 ? 'not-allowed' : 'pointer'}"
          onclick="_qmpSave()" ${totalSel === 0 ? 'disabled' : ''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="qmp-btn-lbl">Mark Paid${totalSel > 0 ? ` (${totalSel})` : ''}</span>
        </button>
      </div>` : ''}
    </div>`;
  ov.classList.add('open');
}

function _qmpToggle(el, memberName, month) {
  if (!_qmpSel.has(memberName)) _qmpSel.set(memberName, new Set());
  const set = _qmpSel.get(memberName);
  if (set.has(month)) { set.delete(month); el.classList.remove('selected'); }
  else                { set.add(month);    el.classList.add('selected');    }
  if (set.size === 0) _qmpSel.delete(memberName);
  // Update button only — no full re-render (prevents scroll jump)
  const totalSel = [..._qmpSel.values()].reduce((n, s) => n + s.size, 0);
  const btn = document.querySelector('#qmpOverlay .qmp-save-btn');
  if (btn) {
    btn.disabled      = totalSel === 0;
    btn.style.opacity = totalSel === 0 ? '.5' : '1';
    btn.style.cursor  = totalSel === 0 ? 'not-allowed' : 'pointer';
    const lbl = btn.querySelector('.qmp-btn-lbl');
    if (lbl) lbl.textContent = `Mark Paid${totalSel > 0 ? ` (${totalSel})` : ''}`;
  }
}

function _closeQmp() {
  document.getElementById('qmpOverlay')?.classList.remove('open');
  _qmpSel.clear();
}

async function _qmpSave() {
  if (!await _ensureWriteAccess()) return;

  const session  = STATE.currentSession;
  const allMonths = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const batchData = [];

  for (const [memberName, monthSet] of _qmpSel) {
    const payIdx = STATE.allPayments.findIndex(p =>
      nameMatch(p.name, memberName) || p.name.replace(/\(.*?\)/g, '').trim() === memberName
    );
    if (payIdx === -1) continue;
    const p = STATE.allPayments[payIdx];

    for (const mo of monthSet) {
      if (isPaid(p.months[mo])) continue; // already paid — skip
      const mIdx = allMonths.indexOf(mo);
      if (mIdx === -1) continue;
      const col = colLetter(3 + mIdx);
      batchData.push({ range: `${session.sheet}!${col}${p.row}`, values: [['Paid']] });
    }
  }

  if (batchData.length === 0) { _closeQmp(); return; }

  const btn = document.querySelector('#qmpOverlay .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    await sheetsBatchPut(batchData);

    // Update STATE in memory
    for (const [memberName, monthSet] of _qmpSel) {
      const payIdx = STATE.allPayments.findIndex(p =>
        nameMatch(p.name, memberName) || p.name.replace(/\(.*?\)/g, '').trim() === memberName
      );
      if (payIdx === -1) continue;
      for (const mo of monthSet) {
        STATE.allPayments[payIdx].months[mo] = 'Paid';
      }
      const paidCount = Object.values(STATE.allPayments[payIdx].months).filter(v => isPaid(v)).length;
      STATE.allPayments[payIdx].total = String(paidCount * FEE);
    }

    saveCache(session.label);
    _closeQmp();
    showToast(`✅ ${batchData.length} payment${batchData.length > 1 ? 's' : ''} mark ho gayi!`);
    renderDashboard();
  } catch(e) {
    showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Mark Paid'; }
  }
}

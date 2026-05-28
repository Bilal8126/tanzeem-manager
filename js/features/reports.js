// ── Reports Module ────────────────────────────────────────

const _RSVG = {
  member:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  monthwise: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  session:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  unpaid:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  paid:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  overdue:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  donation:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  expense:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  summary:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  pdf:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  search:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
};

const _RPT_TYPES = [
  { id:'member',    label:'Member Report',    color:'#1d4ed8', bg:'#eff6ff' },
  { id:'monthwise', label:'Month Wise',       color:'#7c3aed', bg:'#f5f3ff' },
  { id:'session',   label:'Session Report',   color:'#0f4a29', bg:'#f0fdf4' },
  { id:'unpaid',    label:'Unpaid Report',    color:'#b91c1c', bg:'#fef2f2' },
  { id:'paid',      label:'Paid Report',      color:'#15803d', bg:'#f0fdf4' },
  { id:'overdue',   label:'Overdue Report',   color:'#b45309', bg:'#fffbeb' },
  { id:'donation',  label:'Donation Report',  color:'#0369a1', bg:'#f0f9ff' },
  { id:'expense',   label:'Expense Report',   color:'#dc2626', bg:'#fef2f2' },
  { id:'summary',   label:'Summary Report',   color:'#374151', bg:'#f8fafc' },
];

// ── Report state ──────────────────────────────────────────

let _rpt = {
  type:         null,
  months:       new Set(),
  members:      new Set(),   // empty = All members
  statusFilter: 'active',
  overdueTh:    2,
  memberSearch: '',
};

// ── Settings section HTML ─────────────────────────────────

function renderReportsSection() {
  return `
  <div class="card" style="margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
      <div style="font-size:11px;font-weight:700;color:var(--muted);
                  text-transform:uppercase;letter-spacing:.6px">Reports</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_RPT_TYPES.map(r => `
        <button onclick="openReport('${r.id}')"
          style="background:${r.bg};border:1.5px solid ${r.color}22;border-radius:12px;
                 padding:12px 10px;cursor:pointer;text-align:left;
                 display:flex;flex-direction:column;gap:6px">
          <div style="color:${r.color}">${_RSVG[r.id]}</div>
          <div style="font-size:12px;font-weight:600;color:#1e293b;line-height:1.3">${r.label}</div>
        </button>`).join('')}
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--muted);text-align:center">
      Uses selected session data · Export PDF or Share via WhatsApp
    </div>
  </div>`;
}

// ── Open / render report modal ────────────────────────────

function openReport(type) {
  _rpt.type         = type;
  _rpt.months       = new Set();
  _rpt.members      = new Set();
  _rpt.statusFilter = 'active';
  _rpt.overdueTh    = 2;
  _rpt.memberSearch = '';
  _renderReportModal();
}

function _rptMonths() {
  return STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
}

function _rptAllStats() {
  return STATE.allPayments.length > 0 ? buildMemberStats(STATE.allPayments) : [];
}

function _rptDisplayStats() {
  return _rptAllStats().filter(m => {
    if (_rpt.statusFilter === 'active')   return !m.isInactive;
    if (_rpt.statusFilter === 'inactive') return  m.isInactive;
    return true;
  });
}

// ── Member list HTML (partial update target) ──────────────

function _rptMemberListHtml(displayStats) {
  const q = (_rpt.memberSearch || '').toLowerCase().trim();
  const filtered = q
    ? displayStats.filter(m => _rptClean(m.name).toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
    : displayStats;

  const allSelected = _rpt.members.size === 0;
  return `
    <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;
                  border-bottom:1px solid #e2e8f0;
                  ${allSelected ? 'background:#f0fdf4;' : ''}"
           onclick="_rptToggleAllMembers()">
      <input type="checkbox" ${allSelected ? 'checked' : ''} readonly
             style="accent-color:#1a6b3c;flex-shrink:0;width:16px;height:16px;pointer-events:none">
      <span style="font-size:13px;font-weight:${allSelected ? '600' : '400'};
                   color:${allSelected ? '#15803d' : '#1e293b'}">All Members</span>
    </label>
    ${filtered.length === 0
      ? `<div style="padding:12px;text-align:center;font-size:12px;color:#94a3b8">No members found</div>`
      : filtered.map(m => {
          const cleanName = _rptClean(m.name);
          const isSel = _rpt.members.has(m.name);
          return `<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;
                               border-bottom:1px solid #f8fafc;min-width:0;
                               ${isSel ? 'background:#f0fdf4;' : ''}"
                         onclick="_rptToggleMember('${encodeURIComponent(m.name)}')">
            <input type="checkbox" ${isSel ? 'checked' : ''} readonly
                   style="accent-color:#1a6b3c;flex-shrink:0;width:16px;height:16px;pointer-events:none">
            <span style="font-size:13px;flex:1;min-width:0;overflow:hidden;
                         text-overflow:ellipsis;white-space:nowrap">${cleanName}</span>
            ${m.isInactive ? '<span style="font-size:10px;color:#94a3b8;flex-shrink:0;margin-left:4px">Inactive</span>' : ''}
          </label>`;
        }).join('')}`;
}

function _rptRefreshMemberList() {
  const list = document.getElementById('rptMemberList');
  if (list) list.innerHTML = _rptMemberListHtml(_rptDisplayStats());
  // Update selection count label
  const info = document.getElementById('rptMemberCount');
  if (info) info.textContent = _rpt.members.size === 0 ? 'All' : `${_rpt.members.size} selected`;
  // Show/hide reset button
  const resetBtn = document.getElementById('rptMemberReset');
  if (resetBtn) resetBtn.style.display = _rpt.members.size > 0 ? '' : 'none';
}

function _rptToggleMember(encoded) {
  const name = decodeURIComponent(encoded);
  if (_rpt.members.has(name)) _rpt.members.delete(name);
  else _rpt.members.add(name);
  _rptRefreshMemberList();
}

function _rptToggleAllMembers() {
  _rpt.members = new Set();
  _rptRefreshMemberList();
}

function _rptFilterMembers(val) {
  _rpt.memberSearch = val;
  const list = document.getElementById('rptMemberList');
  if (list) list.innerHTML = _rptMemberListHtml(_rptDisplayStats());
}

function _renderReportModal() {
  let overlay = document.getElementById('reportOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'reportOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '600';
    overlay.addEventListener('click', _closeReport);
    document.body.appendChild(overlay);
  }

  const rtype  = _RPT_TYPES.find(r => r.id === _rpt.type);
  const months = _rptMonths();

  const needsMonths  = ['monthwise','unpaid','paid'].includes(_rpt.type);
  const needsMembers = ['monthwise','unpaid','paid','overdue'].includes(_rpt.type);
  const needsStatus  = ['member','monthwise','unpaid','paid'].includes(_rpt.type);
  const needsOverdue = _rpt.type === 'overdue';

  // ── Month picker ──────────────────────────────────────
  const monthPicker = needsMonths ? `
    <div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;
                  display:flex;justify-content:space-between;align-items:center">
        <span>Select Months
          <span style="font-weight:400;color:#94a3b8;margin-left:4px">(${_rpt.months.size === 0 ? 'none' : _rpt.months.size + ' selected'})</span>
        </span>
        <div style="display:flex;gap:12px">
          <button onclick="_rptSelectAllMonths()" style="font-size:11px;color:#1a6b3c;background:none;border:none;cursor:pointer;font-weight:600">All</button>
          <button onclick="_rptClearMonths()" style="font-size:11px;color:#b91c1c;background:none;border:none;cursor:pointer;font-weight:600">Clear</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${months.map(mo => {
          const isSel = _rpt.months.has(mo);
          const isFut = !isPastOrCurrent(mo);
          return `<button onclick="_rptToggleMonth('${mo}')"
            class="month-pill ${isSel ? 'active' : ''}"
            style="scroll-snap-align:none;${isFut && !isSel ? 'opacity:.45;border-style:dashed;' : ''}">${mo}</button>`;
        }).join('')}
      </div>
    </div>` : '';

  // ── Status filter ─────────────────────────────────────
  const statusPicker = needsStatus ? `
    <div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:6px">Members Filter</div>
      <div style="display:flex;gap:6px">
        ${[['active','Active Only'],['inactive','Inactive Only'],['all','All']].map(([v,l]) => `
          <button onclick="_rpt.statusFilter='${v}';_rpt.members=new Set();_rpt.memberSearch='';_renderReportModal()"
            class="month-pill ${_rpt.statusFilter === v ? 'active' : ''}"
            style="scroll-snap-align:none;flex:1;text-align:center;font-size:11px">${l}</button>
        `).join('')}
      </div>
    </div>` : '';

  // ── Member picker ─────────────────────────────────────
  const memberPicker = needsMembers ? `
    <div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;
                  display:flex;justify-content:space-between;align-items:center">
        <span>Select Users
          <span id="rptMemberCount" style="font-weight:400;color:#94a3b8;margin-left:4px">${_rpt.members.size === 0 ? 'All' : _rpt.members.size + ' selected'}</span>
        </span>
        <button id="rptMemberReset" onclick="_rptToggleAllMembers()"
          style="font-size:11px;color:#b91c1c;background:none;border:none;cursor:pointer;font-weight:600;
                 display:${_rpt.members.size > 0 ? '' : 'none'}">Reset to All</button>
      </div>
      <div style="position:relative;margin-bottom:6px">
        <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);
                     pointer-events:none;color:#94a3b8;display:flex">${_RSVG.search}</span>
        <input type="text" id="rptMemberSearch"
          placeholder="Search members..."
          value="${(_rpt.memberSearch || '').replace(/"/g, '&quot;')}"
          oninput="_rptFilterMembers(this.value)"
          style="width:100%;border:1px solid #e2e8f0;border-radius:8px;
                 padding:7px 10px 7px 30px;font-size:13px;box-sizing:border-box;
                 color:#1e293b;outline:none">
      </div>
      <div id="rptMemberList"
           style="max-height:170px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:8px;overflow-x:hidden">
        ${_rptMemberListHtml(_rptDisplayStats())}
      </div>
    </div>` : '';

  // ── Overdue threshold ─────────────────────────────────
  const overduePicker = needsOverdue ? `
    <div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:6px">Overdue Threshold (months)</div>
      <div style="display:flex;gap:6px">
        ${[1,2,3,4,5,6].map(n => `
          <button onclick="_rpt.overdueTh=${n};_renderReportModal()"
            class="month-pill ${_rpt.overdueTh === n ? 'active' : ''}"
            style="scroll-snap-align:none">${n}+</button>
        `).join('')}
      </div>
    </div>` : '';

  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()"
         style="max-height:88vh;overflow-y:auto;display:flex;flex-direction:column">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title" style="color:${rtype.color};display:flex;align-items:center;gap:8px">
          ${_RSVG[rtype.id]} ${rtype.label}
        </div>
        <button class="close-btn" onclick="_closeReport()">×</button>
      </div>
      <div style="font-size:11px;color:#64748b;margin-bottom:14px;
                  background:#f8fafc;border-radius:8px;padding:7px 10px">
        Session: <strong>${STATE.currentSession?.label || '—'}</strong>
        ${STATE.allPayments.length === 0 && !['donation','expense','member'].includes(_rpt.type)
          ? '<span style="color:#b91c1c;margin-left:8px">⚠ Data not loaded — sync first</span>' : ''}
      </div>
      ${monthPicker}${statusPicker}${memberPicker}${overduePicker}
      <div style="display:flex;flex-direction:column;gap:8px;padding-top:4px;margin-top:auto">
        <button class="btn btn-primary"
          style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;padding:13px"
          onclick="_exportReport()">
          ${_RSVG.pdf} Export PDF
        </button>
        <button class="whatsapp-btn" style="margin:0;justify-content:center;gap:8px"
                onclick="_shareReportWA()">
          ${typeof WA_SVG !== 'undefined' ? WA_SVG : ''} WhatsApp Share (PDF)
        </button>
      </div>
    </div>`;
  overlay.classList.add('open');
}

function _closeReport() {
  document.getElementById('reportOverlay')?.classList.remove('open');
}

function _rptToggleMonth(mo) {
  if (_rpt.months.has(mo)) _rpt.months.delete(mo);
  else _rpt.months.add(mo);
  _renderReportModal();
}

function _rptSelectAllMonths() {
  _rpt.months = new Set(_rptMonths());
  _renderReportModal();
}

function _rptClearMonths() {
  _rpt.months = new Set();
  _renderReportModal();
}

// ── Export helpers ────────────────────────────────────────

function _exportReport() {
  if (STATE.allPayments.length === 0 && !['donation','expense','member'].includes(_rpt.type)) {
    showToast('Data not loaded — sync first', 'error'); return;
  }
  const result = _buildReport();
  if (!result) return;
  _openReportPdf(result.title, result.html);
}

function _shareReportWA() {
  _exportReport();
  showToast('Save the PDF, then attach in WhatsApp');
}

function _openReportPdf(title, bodyHtml) {
  const session = STATE.currentSession ? STATE.currentSession.label : '';
  const dateStr = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  const logoUrl = new URL('icons/icon.svg', location.href).href;

  const win = window.open('', '_blank');
  if (!win) { showToast('Popup blocked — allow popups in browser', 'error'); return; }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${title} — Tanzeem Abd-e-Mustafa</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:12px;color:#1e293b;padding:24px;max-width:800px;margin:0 auto}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1a6b3c;padding-bottom:12px;margin-bottom:18px}
  .hdr-left{display:flex;align-items:center;gap:10px}
  .logo{width:46px;height:46px;border-radius:8px}
  .org{font-size:15px;font-weight:700;color:#1a6b3c}
  .org-sub{font-size:11px;color:#64748b;margin-top:2px}
  .sess{display:inline-block;font-size:10px;font-weight:600;color:#0f4a29;background:#dcfce7;padding:2px 7px;border-radius:4px;margin-top:4px}
  .hdr-right{text-align:right;font-size:11px;color:#64748b}
  .hdr-right .date{font-weight:700;color:#1e293b;font-size:12px;margin-bottom:2px}
  h2{font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e2e8f0}
  .section-title{font-size:12px;font-weight:700;color:#1a6b3c;margin:16px 0 8px;padding-left:8px;border-left:3px solid #1a6b3c}
  table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px}
  th{background:#f1f5f9;padding:7px 8px;text-align:left;font-weight:600;color:#475569;border:1px solid #e2e8f0}
  td{padding:6px 8px;border:1px solid #e2e8f0;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  .green{color:#15803d;font-weight:600}
  .red{color:#b91c1c;font-weight:600}
  .orange{color:#b45309;font-weight:600}
  .blue{color:#0369a1;font-weight:600}
  .grey{color:#64748b}
  .badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600}
  .bg{background:#f0fdf4;color:#15803d}
  .br{background:#fee2e2;color:#b91c1c}
  .bo{background:#fef3c7;color:#92400e}
  .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
  .summary-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;text-align:center}
  .summary-card .val{font-size:17px;font-weight:700;margin-top:4px}
  .summary-card .lbl{font-size:10px;color:#64748b}
  .ftr{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;text-align:center;color:#94a3b8;line-height:1.7}
  .ftr strong{color:#475569;font-size:11px}
  .ftr em{font-size:10px}
  @media print{body{padding:12px}@page{margin:.5cm;size:A4}}
</style>
</head>
<body>
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
    <div>Auto-Generated Report</div>
  </div>
</div>
${bodyHtml}
<div class="ftr">
  <strong>Tanzeem Abd-e-Mustafa — Bisauli</strong><br>
  <em>⚠ This report is auto-generated — for reference only.</em>
</div>
<script>setTimeout(()=>window.print(),600)<\/script>
</body>
</html>`);
  win.document.close();
}

// ── Report builders ───────────────────────────────────────

function _buildReport() {
  switch (_rpt.type) {
    case 'member':    return _rptMember();
    case 'monthwise': return _rptMonthWise();
    case 'session':   return _rptSession();
    case 'unpaid':    return _rptUnpaid();
    case 'paid':      return _rptPaid();
    case 'overdue':   return _rptOverdue();
    case 'donation':  return _rptDonation();
    case 'expense':   return _rptExpense();
    case 'summary':   return _rptSummary();
    default: return null;
  }
}

function _rptClean(n) { return (n || '').replace(/\(.*?\)/g, '').trim(); }

function _rptFilteredStats() {
  let list = _rptAllStats();
  if (_rpt.statusFilter === 'active')   list = list.filter(m => !m.isInactive);
  if (_rpt.statusFilter === 'inactive') list = list.filter(m =>  m.isInactive);
  if (_rpt.members.size > 0) list = list.filter(m => _rpt.members.has(m.name));
  return list;
}

function _rptOrderedMonths() {
  const all = _rptMonths();
  if (_rpt.months.size === 0) return all.filter(isPastOrCurrent);
  return all.filter(m => _rpt.months.has(m));
}

// ── 1. Member Report ──────────────────────────────────────
function _rptMember() {
  const members = STATE.allMembers.filter(m => {
    if (_rpt.statusFilter === 'active')   return m.status === 'Active' || !m.status;
    if (_rpt.statusFilter === 'inactive') return m.status && m.status !== 'Active';
    return true;
  });
  const label = _rpt.statusFilter === 'active' ? 'Active Members'
              : _rpt.statusFilter === 'inactive' ? 'Inactive Members' : 'All Members';
  const html = `
    <h2>Member Report — ${label} (${members.length})</h2>
    <table>
      <thead><tr><th>#</th><th>Name</th><th>Mobile</th><th>Type</th><th>Status</th></tr></thead>
      <tbody>
        ${members.length === 0
          ? '<tr><td colspan="5" style="text-align:center;color:#94a3b8">No members found</td></tr>'
          : members.map((m,i) => `
              <tr>
                <td class="grey">${i+1}</td>
                <td><strong>${_rptClean(m.name)}</strong></td>
                <td>${m.mobile || '—'}</td>
                <td>${m.type || 'Regular'}</td>
                <td><span class="badge ${m.status === 'Active' || !m.status ? 'bg' : 'br'}">${m.status || 'Active'}</span></td>
              </tr>`).join('')}
      </tbody>
    </table>`;
  return { title: 'Member Report', html };
}

// ── 2. Month Wise Report ──────────────────────────────────
function _rptMonthWise() {
  const orderedMonths = _rptOrderedMonths();
  const allStats = _rptFilteredStats();
  if (orderedMonths.length === 0) return { title:'Month Wise Report',
    html:'<p class="grey">No months selected.</p>' };

  let html = `<h2>Month Wise Report</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:14px">
      Months: <strong>${orderedMonths.join(', ')}</strong>
    </p>`;

  orderedMonths.forEach(mo => {
    const isFut  = !isPastOrCurrent(mo);
    const paid   = allStats.filter(m =>  isPaid(m.months[mo]));
    const unpaid = isFut ? [] : allStats.filter(m => !isPaid(m.months[mo]));
    html += `
      <div class="section-title">${mo}${isFut ? ' <span style="font-size:10px;font-weight:400;color:#94a3b8">(Future)</span>' : ''}</div>
      <table>
        <thead><tr><th>Member</th><th>Status</th><th>Payment</th></tr></thead>
        <tbody>
          ${allStats.map(m => {
            const p = isPaid(m.months[mo]);
            return `<tr>
              <td><strong>${_rptClean(m.name)}</strong></td>
              <td><span class="badge ${m.isInactive ? 'br' : 'bg'}">${m.isInactive ? 'Inactive' : 'Active'}</span></td>
              <td>${isFut ? '<span class="grey">—</span>' : p ? '<span class="green">✓ Paid</span>' : '<span class="red">✗ Unpaid</span>'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <p style="font-size:11px;margin-bottom:6px">
        Paid: <span class="green">${paid.length}</span> &nbsp;|&nbsp;
        Unpaid: <span class="red">${unpaid.length}</span> &nbsp;|&nbsp;
        Total: ${allStats.length}
      </p>`;
  });
  return { title: 'Month Wise Report', html };
}

// ── 3. Session Report ─────────────────────────────────────
function _rptSession() {
  const months   = _rptMonths();
  const stats    = _rptAllStats();
  const active   = stats.filter(m => !m.isInactive);
  const inactive = stats.filter(m =>  m.isInactive);
  const totalCollected = stats.reduce((s,m) => s+m.totalPaid, 0);
  const totalDonations = STATE.allDonations.reduce((s,d) => s+(parseFloat(d.amount)||0), 0);
  const totalExpenses  = STATE.allExpenses.reduce((s,e)  => s+(parseFloat(e.amount)||0), 0);
  const totalPending   = active.reduce((s,m) => s+m.totalPending, 0);
  const balance        = totalCollected + totalDonations - totalExpenses;
  const session        = STATE.currentSession || {};

  const html = `
    <h2>Session Report — ${session.label || ''}</h2>
    <div class="summary-grid">
      <div class="summary-card"><div class="lbl">Total Members</div><div class="val">${stats.length}</div></div>
      <div class="summary-card"><div class="lbl">Active</div><div class="val green">${active.length}</div></div>
      <div class="summary-card"><div class="lbl">Inactive</div><div class="val grey">${inactive.length}</div></div>
      <div class="summary-card"><div class="lbl">Payment Collected</div><div class="val green">${formatCurrency(totalCollected)}</div></div>
      <div class="summary-card"><div class="lbl">Donations</div><div class="val blue">${formatCurrency(totalDonations)}</div></div>
      <div class="summary-card"><div class="lbl">Expenses</div><div class="val red">${formatCurrency(totalExpenses)}</div></div>
      <div class="summary-card"><div class="lbl">Balance</div><div class="val ${balance>=0?'green':'red'}">${formatCurrency(balance)}</div></div>
      <div class="summary-card"><div class="lbl">Pending (Active)</div><div class="val orange">${formatCurrency(totalPending)}</div></div>
      <div class="summary-card"><div class="lbl">Months</div><div class="val">${months.length}</div></div>
    </div>
    <div class="section-title">Month-wise Collection</div>
    <table>
      <thead><tr><th>Month</th><th>Paid</th><th>Unpaid</th><th>Collected</th><th>Status</th></tr></thead>
      <tbody>
        ${months.map(mo => {
          const past    = isPastOrCurrent(mo);
          const paidCnt = stats.filter(m => isPaid(m.months[mo])).length;
          const unpaidCnt = past ? stats.length - paidCnt : 0;
          return `<tr>
            <td><strong>${mo}</strong></td>
            <td class="green">${paidCnt}</td>
            <td class="${unpaidCnt > 0 ? 'red' : 'grey'}">${past ? unpaidCnt : '—'}</td>
            <td>${past ? formatCurrency(paidCnt * FEE) : '—'}</td>
            <td>${!past ? '<span class="grey">Future</span>' : paidCnt === stats.length ? '<span class="green">✓ Complete</span>' : '<span class="orange">Partial</span>'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  return { title: 'Session Report', html };
}

// ── 4. Unpaid Report ──────────────────────────────────────
function _rptUnpaid() {
  const selMonths = _rptOrderedMonths().filter(isPastOrCurrent);
  const stats = _rptFilteredStats();
  const label = _rpt.statusFilter === 'active' ? 'Active' : _rpt.statusFilter === 'inactive' ? 'Inactive' : 'All';

  const results = stats.map(m => ({
    ...m, unpaidInSel: selMonths.filter(mo => !isPaid(m.months[mo])),
  })).filter(m => m.unpaidInSel.length > 0)
     .sort((a,b) => b.unpaidInSel.length - a.unpaidInSel.length);

  const html = `
    <h2>Unpaid Report — ${label}</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:12px">
      Months: <strong>${selMonths.length > 0 ? selMonths.join(', ') : 'No past months'}</strong>
    </p>
    ${results.length === 0
      ? '<p class="green" style="font-size:13px;padding:12px 0">✓ No unpaid members in selected months!</p>'
      : `<table>
          <thead><tr><th>#</th><th>Member</th><th>Unpaid Months</th><th>Count</th><th>Pending</th></tr></thead>
          <tbody>
            ${results.map((m,i) => `
              <tr>
                <td class="grey">${i+1}</td>
                <td><strong>${_rptClean(m.name)}</strong>
                  <br><span class="grey" style="font-size:10px">${m.isInactive ? 'Inactive' : 'Active'}</span></td>
                <td class="orange">${m.unpaidInSel.join(', ')}</td>
                <td class="red">${m.unpaidInSel.length}</td>
                <td class="red">${formatCurrency(m.unpaidInSel.length * FEE)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size:11px;margin-top:4px">
          Total unpaid: <span class="red">${results.length} members</span> &nbsp;|&nbsp;
          Total pending: <span class="red">${formatCurrency(results.reduce((s,m)=>s+m.unpaidInSel.length*FEE,0))}</span>
        </p>`}`;
  return { title: 'Unpaid Report', html };
}

// ── 5. Paid Report ────────────────────────────────────────
function _rptPaid() {
  const selMonths = _rptOrderedMonths();
  const stats = _rptFilteredStats();
  const label = _rpt.statusFilter === 'active' ? 'Active' : _rpt.statusFilter === 'inactive' ? 'Inactive' : 'All';

  const results = stats.map(m => ({
    ...m, paidInSel: selMonths.filter(mo => isPaid(m.months[mo])),
  })).filter(m => m.paidInSel.length > 0)
     .sort((a,b) => b.paidInSel.length - a.paidInSel.length);

  const html = `
    <h2>Paid Report — ${label}</h2>
    <p style="font-size:11px;color:#64748b;margin-bottom:12px">
      Months: <strong>${selMonths.length > 0 ? selMonths.join(', ') : 'All Months'}</strong>
    </p>
    ${results.length === 0
      ? '<p class="grey" style="font-size:13px;padding:12px 0">No payments in selected months.</p>'
      : `<table>
          <thead><tr><th>#</th><th>Member</th><th>Paid Months</th><th>Count</th><th>Amount</th></tr></thead>
          <tbody>
            ${results.map((m,i) => `
              <tr>
                <td class="grey">${i+1}</td>
                <td><strong>${_rptClean(m.name)}</strong>
                  <br><span class="grey" style="font-size:10px">${m.isInactive ? 'Inactive' : 'Active'}</span></td>
                <td class="green">${m.paidInSel.join(', ')}</td>
                <td class="green">${m.paidInSel.length}</td>
                <td class="green">${formatCurrency(m.paidInSel.length * FEE)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size:11px;margin-top:4px">
          Total paid: <span class="green">${results.length} members</span> &nbsp;|&nbsp;
          Total collected: <span class="green">${formatCurrency(results.reduce((s,m)=>s+m.paidInSel.length*FEE,0))}</span>
        </p>`}`;
  return { title: 'Paid Report', html };
}

// ── 6. Overdue Report ─────────────────────────────────────
function _rptOverdue() {
  const stats = _rptAllStats().filter(m => !m.isInactive && m.unpaidList.length >= _rpt.overdueTh);
  const list  = _rpt.members.size > 0 ? stats.filter(m => _rpt.members.has(m.name)) : stats;
  list.sort((a,b) => b.unpaidList.length - a.unpaidList.length);

  const html = `
    <h2>Overdue Report — ${_rpt.overdueTh}+ Months Unpaid</h2>
    ${list.length === 0
      ? `<p class="green" style="font-size:13px;padding:12px 0">✓ No overdue members (threshold: ${_rpt.overdueTh}+ months)</p>`
      : `<table>
          <thead><tr><th>#</th><th>Member</th><th>Unpaid Months</th><th>Count</th><th>Pending</th></tr></thead>
          <tbody>
            ${list.map((m,i) => `
              <tr style="${m.unpaidList.length >= 4 ? 'background:#fff9f0' : ''}">
                <td class="grey">${i+1}</td>
                <td><strong>${_rptClean(m.name)}</strong></td>
                <td class="orange">${m.unpaidList.join(', ')}</td>
                <td class="red">${m.unpaidList.length}</td>
                <td class="red">${formatCurrency(m.totalPending)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size:11px;margin-top:4px">
          Overdue members: <span class="orange">${list.length}</span> &nbsp;|&nbsp;
          Total pending: <span class="red">${formatCurrency(list.reduce((s,m)=>s+m.totalPending,0))}</span>
        </p>`}`;
  return { title: 'Overdue Report', html };
}

// ── 7. Donation Report ────────────────────────────────────
function _rptDonation() {
  const total = STATE.allDonations.reduce((s,d) => s+(parseFloat(d.amount)||0), 0);
  const html = `
    <h2>Donation Report (${STATE.allDonations.length} entries)</h2>
    <table>
      <thead><tr><th>#</th><th>Donor</th><th>Amount</th><th>Date</th><th>Note</th></tr></thead>
      <tbody>
        ${STATE.allDonations.length === 0
          ? '<tr><td colspan="5" style="text-align:center;color:#94a3b8">No donations found</td></tr>'
          : STATE.allDonations.map((d,i) => `
              <tr>
                <td class="grey">${i+1}</td>
                <td><strong>${d.donor || '—'}</strong></td>
                <td class="green">${formatCurrency(d.amount)}</td>
                <td>${d.date || '—'}</td>
                <td class="grey">${d.note || '—'}</td>
              </tr>`).join('')}
      </tbody>
    </table>
    <p style="font-size:11px;margin-top:4px">Total Donations: <span class="green">${formatCurrency(total)}</span></p>`;
  return { title: 'Donation Report', html };
}

// ── 8. Expense Report ─────────────────────────────────────
function _rptExpense() {
  const total = STATE.allExpenses.reduce((s,e) => s+(parseFloat(e.amount)||0), 0);
  const html = `
    <h2>Expense Report (${STATE.allExpenses.length} entries)</h2>
    <table>
      <thead><tr><th>#</th><th>Description</th><th>Amount</th><th>Date</th></tr></thead>
      <tbody>
        ${STATE.allExpenses.length === 0
          ? '<tr><td colspan="4" style="text-align:center;color:#94a3b8">No expenses found</td></tr>'
          : STATE.allExpenses.map((e,i) => `
              <tr>
                <td class="grey">${i+1}</td>
                <td>${e.desc || '—'}</td>
                <td class="red">${formatCurrency(e.amount)}</td>
                <td>${e.date || '—'}</td>
              </tr>`).join('')}
      </tbody>
    </table>
    <p style="font-size:11px;margin-top:4px">Total Expenses: <span class="red">${formatCurrency(total)}</span></p>`;
  return { title: 'Expense Report', html };
}

// ── 9. Summary Report ─────────────────────────────────────
function _rptSummary() {
  const months   = _rptMonths();
  const stats    = _rptAllStats();
  const active   = stats.filter(m => !m.isInactive);
  const inactive = stats.filter(m =>  m.isInactive);
  const overdue  = active.filter(m => m.unpaidList.length >= 2);
  const totalCollected = stats.reduce((s,m) => s+m.totalPaid, 0);
  const totalPending   = active.reduce((s,m) => s+m.totalPending, 0);
  const totalDonations = STATE.allDonations.reduce((s,d) => s+(parseFloat(d.amount)||0), 0);
  const totalExpenses  = STATE.allExpenses.reduce((s,e)  => s+(parseFloat(e.amount)||0), 0);
  const totalIncome    = totalCollected + totalDonations;
  const balance        = totalIncome - totalExpenses;
  const session        = STATE.currentSession || {};
  const curMon         = months.length > 0 ? detectCurrentMonth(months) : '—';

  const html = `
    <h2>Summary Report — ${session.label || ''}</h2>
    <div class="section-title">Financial Overview</div>
    <div class="summary-grid">
      <div class="summary-card"><div class="lbl">Payment Collected</div><div class="val green">${formatCurrency(totalCollected)}</div></div>
      <div class="summary-card"><div class="lbl">Donations</div><div class="val blue">${formatCurrency(totalDonations)}</div></div>
      <div class="summary-card"><div class="lbl">Total Income</div><div class="val green">${formatCurrency(totalIncome)}</div></div>
      <div class="summary-card"><div class="lbl">Expenses</div><div class="val red">${formatCurrency(totalExpenses)}</div></div>
      <div class="summary-card"><div class="lbl">Balance</div><div class="val ${balance>=0?'green':'red'}">${formatCurrency(balance)}</div></div>
      <div class="summary-card"><div class="lbl">Pending (Active)</div><div class="val orange">${formatCurrency(totalPending)}</div></div>
    </div>
    <div class="section-title">Members Overview</div>
    <div class="summary-grid">
      <div class="summary-card"><div class="lbl">Total Members</div><div class="val">${stats.length}</div></div>
      <div class="summary-card"><div class="lbl">Active</div><div class="val green">${active.length}</div></div>
      <div class="summary-card"><div class="lbl">Inactive</div><div class="val grey">${inactive.length}</div></div>
      <div class="summary-card"><div class="lbl">Overdue (2+)</div><div class="val orange">${overdue.length}</div></div>
      <div class="summary-card"><div class="lbl">Current Month</div><div class="val" style="font-size:13px">${curMon}</div></div>
      <div class="summary-card"><div class="lbl">Total Months</div><div class="val">${months.length}</div></div>
    </div>
    <div class="section-title">Member-wise Summary (Active)</div>
    <table>
      <thead><tr><th>Member</th><th>Paid</th><th>Unpaid</th><th>Collected</th><th>Pending</th></tr></thead>
      <tbody>
        ${active.map(m => `
          <tr style="${m.unpaidList.length >= 2 ? 'background:#fff9f0' : ''}">
            <td><strong>${_rptClean(m.name)}</strong></td>
            <td class="green">${m.paidList.length}</td>
            <td class="${m.unpaidList.length > 0 ? 'red' : 'grey'}">${m.unpaidList.length || '—'}</td>
            <td class="green">${formatCurrency(m.totalPaid)}</td>
            <td class="${m.totalPending > 0 ? 'orange' : 'grey'}">${m.totalPending > 0 ? formatCurrency(m.totalPending) : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  return { title: 'Summary Report', html };
}

// ── Sessions Manager ──────────────────────────────────────────
// Sessions stored in '_Sessions' Google Sheet — no code edits ever.

const _SESSIONS_TAB   = '_Sessions';
const _SESSIONS_CACHE = 'tanzeem_sessions_v1';
const _SESSION_PWD    = 'Bilal@123';
let   _sessionsLoaded = false;
let   _createState    = { month: 3, year: 2026 }; // default: Apr 2026

// ── SVG helpers (no emoji anywhere) ──────────────────────────
const _SVG = {
  close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,

  xCircle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,

  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">
    <polyline points="20 6 9 17 4 12"/></svg>`,

  checkCircleLg: `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#16a34a"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="9 12 11 14 15 10"/></svg>`,

  checkSm: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0">
    <polyline points="20 6 9 17 4 12"/></svg>`,

  chevLeft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15 18 9 12 15 6"/></svg>`,

  chevRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="9 18 15 12 9 6"/></svg>`,

  warning: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;flex-shrink:0">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

  calendar: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/></svg>`,

  wallet: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">
    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    <path d="M16 3h-2a2 2 0 0 0-2 2v2h6V5a2 2 0 0 0-2-2z"/>
    <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/></svg>`,

  info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;flex-shrink:0">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,

  play: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></svg>`,

  spinner: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
    style="animation:spin .8s linear infinite;vertical-align:middle;margin-right:5px">
    <path d="M21 12a9 9 0 1 1-9-9"/></svg>`,

  plus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,

  session: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/></svg>`,
};

// ── Offline cache ─────────────────────────────────────────────
function loadSessionsFromCache() {
  try {
    const raw = localStorage.getItem(_SESSIONS_CACHE);
    if (!raw) return false;
    const sessions = JSON.parse(raw);
    if (!Array.isArray(sessions) || sessions.length === 0) return false;
    CONFIG.SESSIONS = sessions;
    const ai = sessions.findIndex(s => s.active);
    STATE.currentSessionIdx = ai >= 0 ? ai : 0;
    STATE.currentSession    = CONFIG.SESSIONS[STATE.currentSessionIdx];
    _rebuildSessionDropdown();
    return true;
  } catch(e) { return false; }
}

// ── Online: read _Sessions sheet after sign-in ────────────────
async function loadSessionsConfig() {
  if (_sessionsLoaded || !STATE.accessToken) return;
  try {
    const rows = await sheetsGet(`${_SESSIONS_TAB}!A2:E200`);
    if (rows && rows.length > 0) {
      const parsed = rows
        .filter(r => r[0] && r[1])
        .map(r => ({
          label:     String(r[0]).trim(),
          sheet:     String(r[1]).trim(),
          donations: String(r[2] || '').trim(),
          expenses:  String(r[3] || '').trim(),
          active:    r[4] === '1' || r[4] === 1,
        }));
      if (parsed.length > 0) {
        parsed.sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          return b.label.localeCompare(a.label);
        });
        CONFIG.SESSIONS = parsed;
        const ai = parsed.findIndex(s => s.active);
        STATE.currentSessionIdx = ai >= 0 ? ai : 0;
        STATE.currentSession    = CONFIG.SESSIONS[STATE.currentSessionIdx];
        _sessionsLoaded = true;
        _saveSessionsToCache();
        _rebuildSessionDropdown();
        return;
      }
    }
  } catch(e) {
    if (e.message === 'AUTH_EXPIRED') { _sessionsLoaded = true; return; }
    await _bootstrapSessionsSheet();
  }
  _sessionsLoaded = true;
  _rebuildSessionDropdown();
}

async function reloadSessionsConfig() {
  _sessionsLoaded = false;
  await loadSessionsConfig();
}

async function _bootstrapSessionsSheet() {
  try {
    const r = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}:batchUpdate`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + STATE.accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: _SESSIONS_TAB } } }] })
      }
    );
    const d = await r.json();
    if (d.error && !d.error.message.toLowerCase().includes('already exists')) return;
    const header = ['label', 'sheet', 'donations', 'expenses', 'active'];
    const rows   = CONFIG.SESSIONS.map((s, i) => [s.label, s.sheet, s.donations, s.expenses, i === 0 ? '1' : '0']);
    await sheetsPut(`${_SESSIONS_TAB}!A1`, [header, ...rows]);
    CONFIG.SESSIONS.forEach((s, i) => s.active = i === 0);
    _saveSessionsToCache();
  } catch(e) { console.warn('_bootstrapSessionsSheet:', e.message); }
}

function _saveSessionsToCache() {
  try { localStorage.setItem(_SESSIONS_CACHE, JSON.stringify(CONFIG.SESSIONS)); } catch(e) {}
}

function _rebuildSessionDropdown() {
  const sel = document.getElementById('sessionSelect');
  if (!sel) return;
  sel.innerHTML = CONFIG.SESSIONS.map((s, i) =>
    `<option value="${i}"${i === STATE.currentSessionIdx ? ' selected' : ''}>
      ${s.label}${s.active ? ' ●' : ''}
    </option>`
  ).join('');
  // Sync AI nav visibility whenever dropdown rebuilds (on load / session change)
  if (typeof syncAiNav === 'function') syncAiNav();
}

async function _persistSessions() {
  const rows  = CONFIG.SESSIONS.map(s => [s.label, s.sheet, s.donations, s.expenses, s.active ? '1' : '0']);
  const blank = Array(10).fill(['', '', '', '', '']);
  await sheetsPut(`${_SESSIONS_TAB}!A2`, [...rows, ...blank]);
}

// ── Session month/year computation ────────────────────────────
const _MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function _computeSessionInfo(startMonth, startYear) {
  const months = [];
  for (let i = 0; i < 12; i++) {
    const mIdx = (startMonth + i) % 12;
    const yr   = startYear + Math.floor((startMonth + i) / 12);
    months.push(`${_MONTH_NAMES[mIdx]}-${String(yr).slice(-2)}`);
  }
  const endYear  = startYear + Math.floor((startMonth + 11) / 12);
  const startY2  = String(startYear).slice(-2);
  const endY2    = String(endYear).slice(-2);
  const label    = startYear === endYear ? String(startYear) : `${startYear}-${endY2}`;
  return {
    label,
    sheet:     `Session (${label})`,
    donations: `Donation (${startY2}-${endY2})`,
    expenses:  `Expense List (${startY2}-${endY2})`,
    months,
  };
}

// ── Set Active (password modal) ───────────────────────────────
function _promptSetActive(idx) {
  const s = CONFIG.SESSIONS[idx];
  _histPush({ modal: 'newSession' });
  document.getElementById('newSessionOverlay').style.display = 'flex';
  document.getElementById('newSessionContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Set Active Session</div>
      <button class="close-btn" onclick="closeNewSessionModal()">${_SVG.close}</button>
    </div>

    <div style="background:#fefce8;border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#854d0e;margin-bottom:4px">
        Change active session to:
      </div>
      <div style="font-size:22px;font-weight:800;color:#854d0e">${s.label}</div>
      <div style="font-size:11px;color:#78716c;margin-top:3px">
        Ye session "current running" ban jayegi
      </div>
    </div>

    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:600;color:var(--muted);
                    display:flex;align-items:center;margin-bottom:6px">
        ${_SVG.lock} Admin Password
      </label>
      <input id="sessionPwdInput" type="password" placeholder="Enter password"
        style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:10px;
               font-size:15px;box-sizing:border-box;outline:none;font-family:inherit"
        onfocus="this.style.borderColor='var(--green-dark)'"
        onblur="this.style.borderColor='#e2e8f0'"
        onkeydown="if(event.key==='Enter')_doSetActive(${idx})">
      <div id="pwdError"
        style="color:#ef4444;font-size:12px;margin-top:5px;display:none;
               display:none;align-items:center">
        ${_SVG.xCircle} Wrong password
      </div>
    </div>

    <div style="display:flex;gap:10px">
      <button class="btn" onclick="closeNewSessionModal()"
        style="flex:1;background:#f1f5f9;color:#475569;border:none;font-weight:600">
        Cancel
      </button>
      <button class="btn btn-primary" style="flex:2;display:flex;align-items:center;
                justify-content:center;gap:5px" onclick="_doSetActive(${idx})">
        ${_SVG.check} Confirm
      </button>
    </div>
  `;
  setTimeout(() => document.getElementById('sessionPwdInput')?.focus(), 80);
}

async function _doSetActive(idx) {
  if (!_checkPwd()) return;
  CONFIG.SESSIONS.forEach((s, i) => s.active = i === idx);
  STATE.currentSessionIdx = idx;
  STATE.currentSession    = CONFIG.SESSIONS[idx];
  _rebuildSessionDropdown();
  _saveSessionsToCache();
  try {
    await _persistSessions();
    showToast('Active: ' + CONFIG.SESSIONS[idx].label, 'success');
    loadAllData(true);
  } catch(e) { showToast('Set locally. Sync to persist.', 'error'); }
  closeNewSessionModal();
  if (typeof syncAiNav === 'function') syncAiNav();
  if (STATE.currentScreen === 'settings') renderSettings();
}

// ── Create Session Modal (with month picker) ──────────────────
function showCreateSessionModal() {
  // Suggest next year from the latest session label
  const latestLabel = [...CONFIG.SESSIONS]
    .sort((a, b) => b.label.localeCompare(a.label))[0]?.label || '2025-26';
  const suggestedYear = parseInt(latestLabel.split('-')[0]) + 1;
  _createState = { month: 3, year: suggestedYear }; // default: April

  _histPush({ modal: 'newSession' });
  document.getElementById('newSessionOverlay').style.display = 'flex';
  document.getElementById('newSessionContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title" style="display:flex;align-items:center;gap:7px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <line x1="8" y1="14" x2="8" y2="14" stroke-width="3"/><line x1="12" y1="14" x2="16" y2="14" stroke-width="3"/>
        </svg>
        Create New Session
      </div>
      <button class="close-btn" onclick="closeNewSessionModal()">${_SVG.close}</button>
    </div>

    <!-- Month picker: always 12 months -->
    <div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;
                  letter-spacing:.5px;margin-bottom:8px">
        Start Month <span style="font-weight:400;text-transform:none">(12 months auto-selected)</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px">
        ${_MONTH_NAMES.map((m, i) => `
          <button id="mb-${i}" onclick="_selectMonth(${i})"
            style="padding:7px 2px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;
                   border:1.5px solid ${i === 3 ? 'var(--green-dark)' : '#e2e8f0'};
                   background:${i === 3 ? '#f0fdf4' : '#f8fafc'};
                   color:${i === 3 ? 'var(--green-dark)' : '#374151'}">
            ${m}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Year picker -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:var(--muted);flex:1">Start Year</div>
      <div style="display:flex;align-items:center;gap:8px">
        <button onclick="_adjustYear(-1)"
          style="width:32px;height:32px;border:1.5px solid #e2e8f0;border-radius:8px;
                 background:#f8fafc;cursor:pointer;display:flex;align-items:center;
                 justify-content:center">
          ${_SVG.chevLeft}
        </button>
        <span id="yearDisplay"
          style="font-size:18px;font-weight:800;min-width:56px;text-align:center">
          ${suggestedYear}
        </span>
        <button onclick="_adjustYear(1)"
          style="width:32px;height:32px;border:1.5px solid #e2e8f0;border-radius:8px;
                 background:#f8fafc;cursor:pointer;display:flex;align-items:center;
                 justify-content:center">
          ${_SVG.chevRight}
        </button>
      </div>
    </div>

    <!-- 12-month preview -->
    <div id="createPreview" style="margin-bottom:12px"></div>

    <!-- Password -->
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:600;color:var(--muted);
                    display:flex;align-items:center;margin-bottom:6px">
        ${_SVG.lock} Admin Password
      </label>
      <input id="sessionPwdInput" type="password" placeholder="Enter password"
        style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;
               font-size:14px;box-sizing:border-box;outline:none;font-family:inherit"
        onfocus="this.style.borderColor='var(--green-dark)'"
        onblur="this.style.borderColor='#e2e8f0'"
        onkeydown="if(event.key==='Enter')_doCreateSession()">
      <div id="pwdError"
        style="color:#ef4444;font-size:12px;margin-top:4px;display:none;align-items:center">
        ${_SVG.xCircle} Wrong password
      </div>
    </div>

    <div style="display:flex;gap:10px">
      <button class="btn" onclick="closeNewSessionModal()"
        style="flex:1;background:#f1f5f9;color:#475569;border:none;font-weight:600">
        Cancel
      </button>
      <button id="createSessionBtn" class="btn btn-primary"
        style="flex:2;display:flex;align-items:center;justify-content:center;gap:5px"
        onclick="_doCreateSession()">
        ${_SVG.play} Create Session
      </button>
    </div>
  `;
  _updateCreatePreview();
}

function _selectMonth(monthIdx) {
  _createState.month = monthIdx;
  for (let i = 0; i < 12; i++) {
    const btn = document.getElementById(`mb-${i}`);
    if (!btn) continue;
    const on = i === monthIdx;
    btn.style.background  = on ? '#f0fdf4' : '#f8fafc';
    btn.style.borderColor = on ? 'var(--green-dark)' : '#e2e8f0';
    btn.style.color       = on ? 'var(--green-dark)' : '#374151';
  }
  _updateCreatePreview();
}

function _adjustYear(delta) {
  _createState.year += delta;
  const el = document.getElementById('yearDisplay');
  if (el) el.textContent = _createState.year;
  _updateCreatePreview();
}

function _updateCreatePreview() {
  const info   = _computeSessionInfo(_createState.month, _createState.year);
  const exists = CONFIG.SESSIONS.some(s => s.label === info.label);
  const bal    = STATE.sessionSummary.balance || 0;
  const btn    = document.getElementById('createSessionBtn');
  const el     = document.getElementById('createPreview');
  if (!el) return;

  if (exists) {
    el.innerHTML = `
      <div style="background:#fef2f2;border-radius:10px;padding:10px;
                  font-size:12px;color:#b91c1c;font-weight:600;
                  display:flex;align-items:center;gap:4px">
        ${_SVG.warning} Session <b style="margin:0 2px">${info.label}</b> already exists
      </div>`;
    if (btn) btn.disabled = true;
  } else {
    el.innerHTML = `
      <div style="background:#f0fdf4;border-radius:10px;padding:12px;font-size:12px">
        <div style="font-weight:700;color:var(--green-dark);margin-bottom:6px;
                    display:flex;align-items:center">
          ${_SVG.calendar} Session <b style="margin:0 4px">${info.label}</b> — 12 months:
        </div>
        <div style="color:#374151;line-height:1.8;word-spacing:2px">
          ${info.months.join(' · ')}
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #dcfce7;
                    color:#854d0e;font-weight:600;font-size:11px;
                    display:flex;align-items:center">
          ${_SVG.wallet} Opening Balance: ${formatCurrency(bal)}
        </div>
      </div>`;
    if (btn) btn.disabled = false;
  }
}

function closeNewSessionModal() {
  _histBack();
  document.getElementById('newSessionOverlay').style.display = 'none';
}

// ── Do the actual creation ────────────────────────────────────
async function _doCreateSession() {
  if (!_checkPwd()) return;

  const info = _computeSessionInfo(_createState.month, _createState.year);
  if (CONFIG.SESSIONS.some(s => s.label === info.label)) {
    showToast('Session ' + info.label + ' already exists', 'error'); return;
  }

  const bal           = STATE.sessionSummary.balance || 0;
  const activeMembers = STATE.allMembers.filter(m => m.status !== 'Inactive');
  const nM            = activeMembers.length;
  const btn           = document.getElementById('createSessionBtn');
  btn.innerHTML       = `${_SVG.spinner} Creating sheets...`;
  btn.disabled        = true;

  try {
    // ── Create 3 sheet tabs ───────────────────────────────
    const bRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}:batchUpdate`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + STATE.accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            { addSheet: { properties: { title: info.sheet,     index: 0 } } },
            { addSheet: { properties: { title: info.donations           } } },
            { addSheet: { properties: { title: info.expenses            } } },
          ]
        })
      }
    );
    if (bRes.status === 401) throw new Error('AUTH_EXPIRED');
    const bd = await bRes.json();
    if (bd.error) throw new Error(bd.error.message);

    btn.innerHTML = `${_SVG.spinner} Writing formulas...`;

    // ── Session sheet: members + formulas ─────────────────
    // Col: A=Sr, B=Name, C=Amount, D..O=12 months, P=Total
    const R0   = 2,      Rn   = 1 + nM;
    const lybR = 3 + nM, ctR  = 4 + nM;
    const donR = 5 + nM, gtR  = 6 + nM, expR = 7 + nM;
    const e12  = () => info.months.map(() => '');
    const sRow = (lbl, val) => ['', lbl, '', ...e12(), val];

    await sheetsPut(`${info.sheet}!A1`, [
      ['Sr', 'Name', 'Amount', ...info.months, 'Total'],
      ...activeMembers.map((m, i) => {
        const rn = R0 + i;
        // "Paid" = paid; blank / "Un Paid" / null = unpaid
        // Total = count of months marked "Paid" × monthly Amount
        return [i + 1, m.name, m.amount || '150', ...e12(), `=COUNTIF(D${rn}:O${rn},"Paid")*C${rn}`];
      }),
      sRow('---', '---'),
      sRow('Last Year Balance', bal),
      sRow('Current Total',  `=SUM(P${R0}:P${Rn})`),
      sRow('Total Donation', `=SUM('${info.donations}'!C2:C10000)`),
      sRow('Grand Total',    `=P${ctR}+P${donR}+P${lybR}`),
      sRow('Total Expense',  `=SUM('${info.expenses}'!C2:C10000)`),
      sRow('Balance',        `=P${gtR}-P${expR}`),
    ]);

    await sheetsPut(`${info.donations}!A1`, [['Sr','Name','Amount','Description','Date','Session']]);
    await sheetsPut(`${info.expenses}!A1`,  [['Sr','Description','Amount','Date','Session']]);

    btn.innerHTML = `${_SVG.spinner} Saving config...`;

    // ── Add to sessions list (NOT auto-set active) ────────
    const newEntry = { ...info, active: false };
    delete newEntry.months; // don't store months array
    CONFIG.SESSIONS.push(newEntry);
    CONFIG.SESSIONS.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return b.label.localeCompare(a.label);
    });
    await _persistSessions();
    _saveSessionsToCache();
    _rebuildSessionDropdown();

    // ── Success ───────────────────────────────────────────
    document.getElementById('newSessionContent').innerHTML = `
      <div style="text-align:center;padding:16px 0 14px">
        <div style="display:flex;justify-content:center;margin-bottom:10px">
          ${_SVG.checkCircleLg}
        </div>
        <div style="font-weight:800;font-size:18px;color:var(--green-dark)">
          Session ${info.label} Created!
        </div>
        <div style="color:#6b7280;font-size:13px;margin-top:6px">
          Sheets ready &middot; Dropdown updated
        </div>
      </div>

      <div style="background:#f0fdf4;border-radius:12px;padding:14px;margin-bottom:14px;
                  font-size:13px;line-height:2">
        <div style="display:flex;align-items:center">${_SVG.checkSm} ${info.sheet}</div>
        <div style="display:flex;align-items:center">${_SVG.checkSm} ${info.donations}</div>
        <div style="display:flex;align-items:center">${_SVG.checkSm} ${info.expenses}</div>
        <div style="display:flex;align-items:center">${_SVG.checkSm} Added to dropdown</div>
      </div>

      <div style="background:#fefce8;border-radius:12px;padding:12px;margin-bottom:16px;
                  font-size:12px;color:#854d0e;display:flex;align-items:flex-start;gap:5px">
        ${_SVG.info}
        <span>To switch to this session: Settings &rarr; Set Active (password required)</span>
      </div>

      <button class="btn btn-primary"
        style="width:100%;display:flex;align-items:center;justify-content:center;gap:6px"
        onclick="closeNewSessionModal();if(STATE.currentScreen==='settings')renderSettings()">
        ${_SVG.check} Done
      </button>
    `;

  } catch(e) {
    showToast(e.message === 'AUTH_EXPIRED' ? 'Session expire — sign in again' : e.message, 'error');
    btn.innerHTML = `${_SVG.play} Create Session`;
    btn.disabled  = false;
  }
}

// ── Password validator ────────────────────────────────────────
function _checkPwd() {
  const inp   = document.getElementById('sessionPwdInput');
  const errEl = document.getElementById('pwdError');
  if (!inp) return false;
  if (inp.value.trim() !== _SESSION_PWD) {
    if (errEl) errEl.style.display = 'flex';
    inp.style.borderColor = '#ef4444';
    inp.focus();
    return false;
  }
  if (errEl) errEl.style.display = 'none';
  return true;
}

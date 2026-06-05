// Helper: only the active/running session is editable; others are view-only
function _isActiveSession() {
  return !!(CONFIG.SESSIONS[STATE.currentSessionIdx]?.active);
}

function renderFinance() {
  const fab = document.getElementById('financeFab');
  if (fab) fab.style.display = _isActiveSession() ? 'flex' : 'none';
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
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div>
      </div>
      <div class="metric blue">
        <div class="metric-label">Count</div>
        <div class="metric-value">${STATE.allDonations.length}</div>
        <div class="metric-bg-icon">#</div>
      </div>
    </div>
    <div class="card">
      ${STATE.allDonations.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg></div><p>Koi donation nahi. + dabayein add karne ke liye.</p></div>'
        : STATE.allDonations.map((d, i) => `
            <div class="finance-item">
              <div class="finance-left">
                <div class="finance-dot green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/></svg></div>
                <div style="min-width:0">
                  <div class="finance-name">${d.donor}</div>
                  <div class="finance-sub">${d.date || ''}${d.note ? ' · ' + d.note : ''}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                <div class="finance-amount green">${formatCurrency(d.amount)}</div>
                <button onclick="showDonationReceiptOptions(${i})" title="Receipt" style="background:none;border:none;cursor:pointer;padding:5px 6px;color:#0369a1;border-radius:8px;transition:background .15s;display:flex;align-items:center" onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='none'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></button>
                ${_isActiveSession() ? `
                <button onclick="openFinanceForm('donation',${i})" style="background:none;border:none;cursor:pointer;padding:5px 6px;color:#94a3b8;border-radius:8px;transition:background .15s;display:flex;align-items:center" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button onclick="deleteFinanceItem('donation',${i})" style="background:none;border:none;cursor:pointer;padding:5px 6px;color:#fca5a5;border-radius:8px;transition:background .15s;display:flex;align-items:center" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>` : ''}
              </div>
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
        <div class="metric-bg-icon"><svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
      </div>
      <div class="metric blue">
        <div class="metric-label">Count</div>
        <div class="metric-value">${STATE.allExpenses.length}</div>
        <div class="metric-bg-icon">#</div>
      </div>
    </div>
    <div class="card">
      ${STATE.allExpenses.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><p>Koi kharcha nahi. + dabayein add karne ke liye.</p></div>'
        : STATE.allExpenses.map((e, i) => `
            <div class="finance-item">
              <div class="finance-left">
                <div class="finance-dot red"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
                <div>
                  <div class="finance-name">${e.desc}</div>
                  <div class="finance-sub">${e.date || ''}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="finance-amount red">${formatCurrency(e.amount)}</div>
                ${_isActiveSession() ? `
                <button onclick="openFinanceForm('expense',${i})" style="background:none;border:none;cursor:pointer;padding:5px 6px;color:#94a3b8;border-radius:8px;transition:background .15s;display:flex;align-items:center" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button onclick="deleteFinanceItem('expense',${i})" style="background:none;border:none;cursor:pointer;padding:5px 6px;color:#fca5a5;border-radius:8px;transition:background .15s;display:flex;align-items:center" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>` : ''}
              </div>
            </div>`).join('')}
    </div>`;
}

function setFinanceTab(tab, el) {
  STATE.currentFinanceTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderFinance();
}

// ── Finance Add / Edit Form ───────────────────────────────

let _ffType = null;
let _ffIdx  = null;

function openFinanceForm(type, idx) {
  _ffType = type;
  _ffIdx  = (idx === undefined || idx === null) ? null : idx;
  const isEdit     = _ffIdx !== null;
  const isDonation = type === 'donation';
  const item       = isEdit ? (isDonation ? STATE.allDonations[idx] : STATE.allExpenses[idx]) : null;
  const title      = (isEdit ? 'Edit ' : 'Add ') + (isDonation ? 'Donation' : 'Expense');

  const _memberOptions = isDonation
    ? STATE.allMembers.map(m => `<option value="${m.name.replace(/"/g,'&quot;')}">`).join('')
    : '';

  document.getElementById('financeFormContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${title}</div>
      <button class="close-btn" onclick="closeFinanceForm()">×</button>
    </div>
    ${isDonation ? `
      <datalist id="ff_memberList">${_memberOptions}</datalist>
      <div class="form-group">
        <label>Donor Ka Naam *</label>
        <input id="ff_name" list="ff_memberList"
          value="${(item?.donor || '').replace(/"/g,'&quot;')}"
          placeholder="Naam likhein ya list se chunein…"
          autocomplete="off">
        <div style="font-size:11px;color:var(--muted);margin-top:4px">
          Member chunein ya koi bhi naam likhein
        </div>
      </div>
      <div class="form-group">
        <label>Amount (Rs.) *</label>
        <input id="ff_amount" type="number" value="${item?.amount || ''}" placeholder="0">
      </div>
      <div class="form-group">
        <label>Tarikh</label>
        <input id="ff_date" type="date" value="${item?.date || ''}">
      </div>
      <div class="form-group">
        <label>Note</label>
        <input id="ff_note" value="${(item?.note || '').replace(/"/g,'&quot;')}" placeholder="Optional...">
      </div>
    ` : `
      <div class="form-group">
        <label>Kharcha Ki Wajah *</label>
        <input id="ff_name"
          value="${(item?.desc || '').replace(/"/g,'&quot;')}"
          placeholder="Kya kharcha hua ya kisko diya…"
          autocomplete="off">
      </div>
      <div class="form-group">
        <label>Amount (Rs.) *</label>
        <input id="ff_amount" type="number" value="${item?.amount || ''}" placeholder="0">
      </div>
      <div class="form-group">
        <label>Tarikh</label>
        <input id="ff_date" type="date" value="${item?.date || ''}">
      </div>
    `}
    <button class="btn btn-primary" style="width:100%;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="saveFinanceForm()">
      ${isEdit
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Update Karein'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Karein'}
    </button>
  `;

  _histPush({ modal: 'financeForm' });
  document.getElementById('financeFormOverlay').classList.add('open');
}

function closeFinanceForm() {
  _histBack();
  document.getElementById('financeFormOverlay').classList.remove('open');
}

async function saveFinanceForm() {
  if (!await _ensureWriteAccess()) return;
  if (STATE.currentSessionIdx !== 0) { showToast('Purane session mein edit nahi ho sakta', 'error'); return; }

  const isDonation = _ffType === 'donation';
  const isEdit     = _ffIdx !== null;
  const session    = STATE.currentSession;
  const sheetName  = isDonation ? session.donations : session.expenses;

  const name   = (document.getElementById('ff_name').value   || '').trim();
  const amount = (document.getElementById('ff_amount').value || '').trim();
  const date   = (document.getElementById('ff_date').value   || '').trim();
  const extra  = isDonation
    ? (document.getElementById('ff_note').value || '').trim()
    : '';

  if (!name)   { showToast('Naam/Wajah likhein', 'error'); return; }
  if (!amount || isNaN(parseFloat(amount))) { showToast('Sahi amount likhein', 'error'); return; }

  const confirmBody = `<b>${name}</b><br>Rs.${amount}${date ? ' — ' + date : ''}${extra ? '<br>Note: ' + extra : ''}`;

  showConfirm(
    isEdit ? (isDonation ? 'Donation update karein?' : 'Kharcha update karein?')
           : (isDonation ? 'Donation add karein?'    : 'Kharcha add karein?'),
    confirmBody,
    async () => {
      try {
        if (isDonation) {
          // Sheet columns: B=Name, C=Amount, D=Description, E=Date
          if (isEdit) {
            const d = STATE.allDonations[_ffIdx];
            await sheetsPut(`${sheetName}!B${d.row}:E${d.row}`, [[name, amount, extra, date]]);
            STATE.allDonations[_ffIdx] = { ...d, donor: name, amount, note: extra, date };
          } else {
            const sr     = STATE.allDonations.length + 1;
            const newRow = STATE.allDonations.length > 0
              ? STATE.allDonations[STATE.allDonations.length - 1].row + 1 : 3;
            // Sheet columns: A=Sr, B=Name, C=Amount, D=Description, E=Date, F=Session
            await sheetsAppend(sheetName, [[sr, name, amount, extra, date, session.label]]);
            STATE.allDonations.push({ row: newRow, sr: String(sr), donor: name, amount, note: extra, date });
          }
        } else {
          // Sheet columns: B=Description, C=Amount, D=Month(Date), E=Session
          if (isEdit) {
            const e = STATE.allExpenses[_ffIdx];
            await sheetsPut(`${sheetName}!B${e.row}:E${e.row}`, [[name, amount, date, session.label]]);
            STATE.allExpenses[_ffIdx] = { ...e, desc: name, amount, date };
          } else {
            const sr     = STATE.allExpenses.length + 1;
            const newRow = STATE.allExpenses.length > 0
              ? STATE.allExpenses[STATE.allExpenses.length - 1].row + 1 : 3;
            await sheetsAppend(sheetName, [[sr, name, amount, date, session.label]]);
            STATE.allExpenses.push({ row: newRow, sr: String(sr), desc: name, amount, date, session: session.label });
          }
        }
        saveCache(session.label);
        showToast(isEdit ? 'Update ho gaya! ✅' : 'Add ho gaya! ✅');
        if (!isEdit) {
          if (isDonation) _pushNotify('Naya Donation! 💚', `${name} ne Rs.${amount} jama kiya`);
          else            _pushNotify('Naya Kharcha! 💸',  `${name} — Rs.${amount}`);
        }
        closeFinanceForm();
        renderFinance();
      } catch(e) {
        showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
      }
    }
  );
}

// ── Delete Finance Item ───────────────────────────────────

async function deleteFinanceItem(type, idx) {
  if (!await _ensureWriteAccess()) return;
  if (STATE.currentSessionIdx !== 0) { showToast('Purane session mein edit nahi ho sakta', 'error'); return; }
  const isDonation = type === 'donation';
  const item    = isDonation ? STATE.allDonations[idx] : STATE.allExpenses[idx];
  if (!item) return;
  const session  = STATE.currentSession;
  const sheetName = isDonation ? session.donations : session.expenses;
  const label     = isDonation ? item.donor : item.desc;
  showConfirm(
    isDonation ? 'Donation delete karein?' : 'Kharcha delete karein?',
    `<b>${label}</b> — Rs.${item.amount}<br><span style="color:var(--red);font-size:12px">Yeh action wapas nahi ho sakta!</span>`,
    async () => {
      try {
        await sheetsDeleteRow(sheetName, item.row);
        const deletedRow = item.row;
        if (isDonation) {
          STATE.allDonations.splice(idx, 1);
          STATE.allDonations.forEach(d => { if (d.row > deletedRow) d.row--; });
        } else {
          STATE.allExpenses.splice(idx, 1);
          STATE.allExpenses.forEach(e => { if (e.row > deletedRow) e.row--; });
        }
        saveCache(session.label);
        showToast('Delete ho gaya! 🗑');
        renderFinance();
      } catch(e) {
        showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
      }
    }
  );
}

// ── Donation Receipt options modal ────────────────────────────
function showDonationReceiptOptions(i) {
  const WA_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;
  let ov = document.getElementById('donReceiptOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'donReceiptOverlay';
    ov.className = 'modal-overlay';
    ov.style.zIndex = '500';
    ov.addEventListener('click', () => { _histBack(); ov.classList.remove('open'); });
    document.body.appendChild(ov);
  }
  const close = `_histBack();document.getElementById('donReceiptOverlay').classList.remove('open')`;
  ov.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title">Donation Receipt</div>
        <button class="close-btn" onclick="${close}">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;padding-top:4px">
        <button class="btn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;padding:12px;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;border-radius:12px"
          onclick="${close};openDonationReceipt(${i},'view')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View Receipt
        </button>
        <button class="btn btn-primary" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;padding:12px"
          onclick="${close};openDonationReceipt(${i},'export')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export / Save PDF
        </button>
        <button class="whatsapp-btn" style="margin:0;justify-content:center;gap:10px"
          onclick="${close};openDonationReceipt(${i},'share')">
          ${WA_SVG} Share via WhatsApp
        </button>
      </div>
    </div>`;
  _histPush({ modal: 'donReceipt' });
  ov.classList.add('open');
}

// ── Donation Receipt ──────────────────────────────────────────
async function openDonationReceipt(i, mode) {
  const d        = STATE.allDonations[i];
  if (!d) return;
  const session  = STATE.currentSession?.label || '';
  const dateStr  = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const logoUrl  = new URL('icons/icon.svg', location.href).href;
  const _ts       = (() => { const n = new Date(); const p = v => String(v).padStart(2,'0'); return `${p(n.getDate())}${p(n.getMonth()+1)}${String(n.getFullYear()).slice(-2)}`; })();
  const receiptNo = `TanzeemAbdMustafa_Receipt_Donation_${String(d.sr || (i + 1)).padStart(3, '0')}_${session.replace(/[^a-zA-Z0-9]/g, '')}_${_ts}`;
  const amount   = formatCurrency(d.amount);

  // WA fallback banner (used when navigator.share not available)
  const waBanner = `
<div id="waBanner" style="position:fixed;top:0;left:0;right:0;z-index:9999;background:#25d366;color:#fff;
  padding:11px 16px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(0,0,0,.2)">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  <span style="flex:1">Tap browser <strong>Share ↑</strong> or <strong>⋮ menu</strong> → WhatsApp to send this receipt</span>
  <button onclick="window.print()" style="background:rgba(0,0,0,.2);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">Save PDF</button>
  <button onclick="document.getElementById('waBanner').remove()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:0 4px">×</button>
</div>
<div style="height:52px"></div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${receiptNo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#f1f5f9;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:20px}
  .receipt{background:#fff;width:100%;max-width:400px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.10);overflow:hidden}
  .hdr{background:linear-gradient(135deg,#1a6b3c,#15803d);padding:24px 20px;text-align:center;color:#fff}
  .hdr img{width:52px;height:52px;border-radius:12px;margin-bottom:10px}
  .hdr .org{font-size:16px;font-weight:700}
  .hdr .org-sub{font-size:11px;opacity:.8;margin-top:2px}
  .hdr .tag{display:inline-block;background:rgba(255,255,255,.2);border-radius:12px;padding:3px 14px;font-size:11px;font-weight:700;letter-spacing:1.2px;margin-top:12px}
  .amt-box{background:#f0fdf4;border-bottom:1px solid #dcfce7;padding:24px;text-align:center}
  .amt-lbl{font-size:10px;font-weight:700;color:#64748b;letter-spacing:.8px;text-transform:uppercase}
  .amt-val{font-size:38px;font-weight:800;color:#15803d;margin-top:6px;letter-spacing:-1px}
  .details{padding:6px 24px 4px}
  .row{display:flex;justify-content:space-between;align-items:flex-start;padding:11px 0;border-bottom:1px solid #f1f5f9}
  .row:last-child{border-bottom:none}
  .lbl{font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:.3px;padding-top:1px}
  .val{font-size:13px;color:#1e293b;font-weight:600;text-align:right;max-width:58%}
  .rec-no{font-size:10px;color:#94a3b8;text-align:center;padding:6px 24px 14px;letter-spacing:.3px}
  .thankyou{background:#fefce8;padding:16px 24px;text-align:center;border-top:1px solid #fef08a}
  .ty-main{font-size:15px;font-weight:700;color:#854d0e}
  .ty-sub{font-size:12px;color:#92400e;margin-top:3px}
  .footer{padding:16px 24px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px dashed #e2e8f0;margin-top:2px}
  .sig-line{width:90px;border-bottom:1.5px solid #cbd5e1;margin-bottom:5px}
  .sig-lbl{font-size:10px;color:#94a3b8;line-height:1.5}
  .gen{font-size:9px;color:#cbd5e1;text-align:right;line-height:1.6}
  @media print{
    body{background:#fff;padding:0;display:block}
    .receipt{box-shadow:none;border-radius:0;max-width:100%}
    #waBanner{display:none!important}
    @page{margin:.3cm;size:A5 portrait}
  }
</style>
</head>
<body>
${waBanner}
<div class="receipt">
  <div class="hdr">
    <img src="${logoUrl}" onerror="this.style.display='none'">
    <div class="org">Tanzeem Abd-e-Mustafa — Bisauli</div>
    <div class="org-sub">تنظیم عبد مصطفیٰ — بسولی</div>
    <div class="tag">DONATION RECEIPT</div>
  </div>
  <div class="amt-box">
    <div class="amt-lbl">Amount Received</div>
    <div class="amt-val">${amount}</div>
  </div>
  <div class="details">
    <div class="row"><div class="lbl">Received From</div><div class="val">${d.donor || '—'}</div></div>
    ${d.note ? `<div class="row"><div class="lbl">Purpose</div><div class="val">${d.note}</div></div>` : ''}
    <div class="row"><div class="lbl">Date</div><div class="val">${d.date || dateStr}</div></div>
    <div class="row"><div class="lbl">Session</div><div class="val">${session}</div></div>
  </div>
  <div class="rec-no">Receipt No: ${receiptNo}</div>
  <div class="thankyou">
    <div class="ty-main">JazakAllah Khair! 🤲</div>
    <div class="ty-sub">Aapki madad Allah qubool farmaye</div>
  </div>
  <div class="footer">
    <div>
      <div class="sig-line"></div>
      <div class="sig-lbl">Authorized Signatory</div>
      <div class="sig-lbl">Tanzeem Abd-e-Mustafa</div>
    </div>
    <div class="gen">Generated: ${dateStr}<br>Tanzeem Manager</div>
  </div>
</div>
${mode === 'export' ? '<scr\x69pt>window.addEventListener("load",function(){setTimeout(window.print,900)})</scr\x69pt>' : ''}
</body>
</html>`;

  if (mode === 'share') {
    // Try native file share → system share sheet → user picks WhatsApp
    const cleanBlob = new Blob([html], { type: 'text/html' });
    if (navigator.share) {
      const file = new File([cleanBlob], `${receiptNo}.html`, { type: 'text/html' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: `Donation Receipt — ${d.donor}` }); return; }
        catch(e) { if (e.name === 'AbortError') return; }
      }
    }
    // Fallback: open in browser with WA share banner
    const bannerHtml = html.replace('<body>', '<body>' + waBanner);
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

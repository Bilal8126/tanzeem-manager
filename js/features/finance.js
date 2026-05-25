function renderFinance() {
  const fab = document.getElementById('financeFab');
  if (fab) fab.style.display = STATE.currentSessionIdx === 0 ? 'flex' : 'none';
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
                <div class="finance-dot green"></div>
                <div>
                  <div class="finance-name">${d.donor}</div>
                  <div class="finance-sub">${d.date || ''}${d.note ? ' · ' + d.note : ''}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="finance-amount green">${formatCurrency(d.amount)}</div>
                ${STATE.currentSessionIdx === 0 ? `
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
                <div class="finance-dot red"></div>
                <div>
                  <div class="finance-name">${e.desc}</div>
                  <div class="finance-sub">${e.date || ''}</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <div class="finance-amount red">${formatCurrency(e.amount)}</div>
                ${STATE.currentSessionIdx === 0 ? `
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

  document.getElementById('financeFormContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${title}</div>
      <button class="close-btn" onclick="closeFinanceForm()">×</button>
    </div>
    ${isDonation ? `
      <div class="form-group">
        <label>Donor Ka Naam *</label>
        <input id="ff_name" value="${(item?.donor || '').replace(/"/g,'&quot;')}" placeholder="Naam likhein...">
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
        <input id="ff_name" value="${(item?.desc || '').replace(/"/g,'&quot;')}" placeholder="Kya kharcha hua...">
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

  document.getElementById('financeFormOverlay').classList.add('open');
}

function closeFinanceForm() {
  document.getElementById('financeFormOverlay').classList.remove('open');
}

function saveFinanceForm() {
  if (!STATE.accessToken) { showToast('Write ke liye pehle Sync karein 🔄', 'error'); return; }
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
        closeFinanceForm();
        renderFinance();
      } catch(e) {
        showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
      }
    }
  );
}

// ── Delete Finance Item ───────────────────────────────────

function deleteFinanceItem(type, idx) {
  if (!STATE.accessToken) { showToast('Write ke liye pehle Sync karein 🔄', 'error'); return; }
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

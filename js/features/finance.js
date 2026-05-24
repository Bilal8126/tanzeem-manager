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
        ? '<div class="empty-state"><div class="empty-state-icon">🎁</div><p>Koi donation nahi. + dabayein add karne ke liye.</p></div>'
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
                <button onclick="openFinanceForm('donation',${i})" style="background:none;border:none;cursor:pointer;font-size:15px;padding:4px 6px;color:#94a3b8;border-radius:8px;transition:background .15s" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">✏</button>
                <button onclick="deleteFinanceItem('donation',${i})" style="background:none;border:none;cursor:pointer;font-size:15px;padding:4px 6px;color:#fca5a5;border-radius:8px;transition:background .15s" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'">🗑</button>
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
        ? '<div class="empty-state"><div class="empty-state-icon">📤</div><p>Koi kharcha nahi. + dabayein add karne ke liye.</p></div>'
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
                <button onclick="openFinanceForm('expense',${i})" style="background:none;border:none;cursor:pointer;font-size:15px;padding:4px 6px;color:#94a3b8;border-radius:8px;transition:background .15s" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">✏</button>
                <button onclick="deleteFinanceItem('expense',${i})" style="background:none;border:none;cursor:pointer;font-size:15px;padding:4px 6px;color:#fca5a5;border-radius:8px;transition:background .15s" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'">🗑</button>
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
    <button class="btn btn-primary" style="width:100%;margin-top:6px" onclick="saveFinanceForm()">
      ${isEdit ? '💾 Update Karein' : '➕ Add Karein'}
    </button>
  `;

  document.getElementById('financeFormOverlay').classList.add('open');
}

function closeFinanceForm() {
  document.getElementById('financeFormOverlay').classList.remove('open');
}

function saveFinanceForm() {
  if (!STATE.accessToken) { showToast('Write ke liye pehle Sync karein 🔄', 'error'); return; }

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
            const newRow = STATE.allDonations.length + 2;
            await sheetsAppend(sheetName, [[sr, name, amount, extra, date]]);
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
            const newRow = STATE.allExpenses.length + 2;
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

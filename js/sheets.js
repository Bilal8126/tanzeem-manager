async function sheetsGet(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}`;
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + STATE.accessToken } });
  if (r.status === 401) throw new Error('AUTH_EXPIRED');
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.values || [];
}

async function sheetsPut(range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + STATE.accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (r.status === 401) throw new Error('AUTH_EXPIRED');
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

const _sheetIdCache = {};

async function sheetsGetSheetId(sheetName) {
  if (_sheetIdCache[sheetName] !== undefined) return _sheetIdCache[sheetName];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}?fields=sheets.properties`;
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + STATE.accessToken } });
  if (r.status === 401) throw new Error('AUTH_EXPIRED');
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  for (const s of (d.sheets || [])) _sheetIdCache[s.properties.title] = s.properties.sheetId;
  if (_sheetIdCache[sheetName] === undefined) throw new Error('Sheet not found: ' + sheetName);
  return _sheetIdCache[sheetName];
}

async function sheetsDeleteRow(sheetName, rowNumber) {
  const sheetId = await sheetsGetSheetId(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}:batchUpdate`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + STATE.accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber }
      }}]
    })
  });
  if (r.status === 401) throw new Error('AUTH_EXPIRED');
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

async function sheetsAppend(sheetTab, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${encodeURIComponent(sheetTab + '!A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + STATE.accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values })
  });
  if (r.status === 401) throw new Error('AUTH_EXPIRED');
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

// ── Local cache (per session) ─────────────────────────
function _cacheKey(label) { return 'tanzeem_v1_' + label; }

function saveCache(label) {
  try {
    localStorage.setItem(_cacheKey(label), JSON.stringify({
      ts:      Date.now(),
      members:  STATE.allMembers,
      payments: STATE.allPayments,
      donations:STATE.allDonations,
      expenses: STATE.allExpenses,
      summary:  { ...STATE.sessionSummary }
    }));
  } catch(e) {}
}

function loadFromCache(label) {
  try {
    const raw = localStorage.getItem(_cacheKey(label));
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

async function loadAllData(forceRefresh = false) {
  STATE.currentSession = CONFIG.SESSIONS[STATE.currentSessionIdx];
  document.getElementById('sessionSelect').value = STATE.currentSessionIdx;

  const session = STATE.currentSession;

  if (!forceRefresh) {
    const cached = loadFromCache(session.label);
    if (cached) {
      STATE.allMembers      = cached.members;
      STATE.allPayments     = cached.payments;
      STATE.allDonations    = cached.donations;
      STATE.allExpenses     = cached.expenses;
      STATE.sessionSummary  = cached.summary;
      STATE.selectedPaymentMonth = null;
      renderCurrentScreen();
      updateSyncStatus(cached.ts);
      return;
    }
  }

  // Fetch from Google Sheets
  setSyncLoading(true);
  try {
    const [membersRaw, sessionRaw, donationsRaw, expensesRaw] = await Promise.all([
      sheetsGet('Members List!A:I'),
      sheetsGet(session.sheet + '!A:P'),
      sheetsGet(session.donations + '!A:F').catch(() => []),
      sheetsGet(session.expenses  + '!A:F').catch(() => [])
    ]);
    parseMembers(membersRaw);
    parsePayments(sessionRaw);
    parseDonations(donationsRaw);
    parseExpenses(expensesRaw);
    STATE.selectedPaymentMonth = null;
    saveCache(session.label);
    updateSyncStatus(Date.now());
    renderCurrentScreen();
  } catch (e) {
    if (e.message === 'AUTH_EXPIRED') {
      showToast('Session expired — please sign out and sign in again', 'error');
    } else {
      showToast('Error loading data: ' + e.message, 'error');
    }
  } finally {
    setSyncLoading(false);
  }
}

function parseMembers(rows) {
  STATE.allMembers = [];
  if (rows.length < 2) return;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1]) continue;
    STATE.allMembers.push({
      row: i + 1,
      id: r[0] || '',
      name: r[1] || '',
      mobile: r[2] || '',
      doj: r[3] || '',
      address: r[4] || '',
      aadhar: r[5] || '',
      status: r[6] || 'Active',
      doe:    r[7] || '',
      type:   r[8] || 'Regular'
    });
  }
}

function parsePayments(rows) {
  STATE.allPayments = [];
  STATE.sessionSummary = {
    lastYearBalance: 0,
    currentTotal: 0,
    totalDonation: 0,
    grandTotal: 0,
    totalExpense: 0,
    balance: 0
  };
  if (rows.length < 2) return;

  // Find the actual header row first (contains 'Name' in col B or 'Amount' in col C)
  let headers = null;
  let headerRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (r[1] === 'Name' || r[2] === 'Amount') {
      headers = r;
      headerRowIdx = i;
      break;
    }
  }
  const totalColIdx = headers ? headers.length - 1 : 0;

  // Return the last parseable number in a row (robust to trailing empty cells being stripped)
  function rowValue(r) {
    for (let j = r.length - 1; j >= 0; j--) {
      const v = parseFloat((r[j] || '').toString().replace(/,/g, ''));
      if (!isNaN(v)) return v;
    }
    return 0;
  }

  const FOOTER = ['Total', 'Donation', 'Expense', 'Grand', 'Misc', 'Adjust', '---'];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1]) continue;
    const cell = r[1].toString().trim();
    if (cell.includes('---')) continue;

    // Summary rows — checked first so FOOTER skip never blocks them
    if (cell.includes('Last Year Balance')) { STATE.sessionSummary.lastYearBalance = rowValue(r); continue; }
    if (cell.includes('Current Total'))     { STATE.sessionSummary.currentTotal    = rowValue(r); continue; }
    if (cell.includes('Total Donation'))    { STATE.sessionSummary.totalDonation   = rowValue(r); continue; }
    if (cell.includes('Grand Total'))       { STATE.sessionSummary.grandTotal      = rowValue(r); continue; }
    if (cell.includes('Total Expense'))     { STATE.sessionSummary.totalExpense    = rowValue(r); continue; }
    if (cell.includes('Balance'))           { STATE.sessionSummary.balance         = rowValue(r); continue; }

    // Skip the header row itself
    if (i === headerRowIdx) continue;

    // Need header before we can parse member rows
    if (!headers) continue;

    // Skip non-member footer rows
    if (FOOTER.some(w => cell.includes(w))) continue;

    // Parse member payment row
    const monthCols = headers.slice(3, headers.length - 1);
    const months = {};
    monthCols.forEach((m, idx) => { if (m) months[m] = r[3 + idx] || ''; });

    STATE.allPayments.push({
      row: i + 1,
      name: r[1],
      amount: r[2] || '150',
      months,
      total: r[totalColIdx] || '0'
    });
  }
}

const _FOOTER = ['total', 'grand', '---', 'subtotal', 'sum'];

function parseDonations(rows) {
  STATE.allDonations = [];
  if (rows.length < 2) return;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1]) continue;
    if (_FOOTER.some(w => r[1].toString().toLowerCase().includes(w))) continue;
    // Sheet columns: A=Sr, B=Name, C=Amount, D=Description, E=Date, F=Session
    STATE.allDonations.push({ row: i+1, sr: r[0], donor: r[1], amount: r[2], note: r[3], date: r[4] });
  }
}

function parseExpenses(rows) {
  STATE.allExpenses = [];
  if (rows.length < 2) return;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1]) continue;
    if (_FOOTER.some(w => r[1].toString().toLowerCase().includes(w))) continue;
    // Sheet columns: A=Sr, B=Description, C=Amount, D=Month(Date), E=Session
    STATE.allExpenses.push({ row: i+1, sr: r[0], desc: r[1], amount: r[2], date: r[3], session: r[4] });
  }
}
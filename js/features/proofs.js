// ── Payment Proofs ──────────────────────────────────────────────
// WhatsApp screenshots (payment/advance/donation/expense proof) uploaded
// into a dedicated Drive folder via the worker ("Tanzeem Payment Proofs"),
// tagged with member/type/month/session in the PaymentProofs sheet.
// Sheet columns: ID | Session | Type | Name | Months | DriveFileID | UploadedBy | Date | Note

let _proofRows   = [];
let _proofLoaded = false;
let _pfAdvance   = false;
let _pfSelectedMonths = new Set();
let _qpContext      = null; // { type, name } — set right before triggering the hidden quick-upload file input
let _proofBrowseCtx = null; // { type, name } — set when a browse grid was opened with an "add more" option

function _thumbUrlProof(id, size = 400) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}

async function _loadProofs(force = false) {
  if (_proofLoaded && !force) return;
  if (!STATE.accessToken) return;
  try {
    const rows = await sheetsGet('PaymentProofs!A2:I2000');
    _proofRows = rows
      .map((r, i) => ({
        row: i + 2, id: r?.[0] || '', session: r?.[1] || '', type: r?.[2] || '', name: r?.[3] || '',
        months: r?.[4] || '', driveId: r?.[5] || '', uploadedBy: r?.[6] || '', date: r?.[7] || '', note: r?.[8] || '',
      }))
      .filter(p => p.id);
    _proofLoaded = true;
  } catch (e) { /* PaymentProofs sheet missing or no access — feature just shows empty */ }
}

function _proofGridHtml(list) {
  if (!list.length) return `<div style="font-size:12px;color:var(--muted);text-align:center;padding:14px">Koi proof nahi hai.</div>`;
  return `<div class="gallery-grid">
    ${list.map(p => `
      <div class="gallery-item" onclick="_openProofLightbox('${p.driveId}')">
        <img src="${_thumbUrlProof(p.driveId, 400)}" alt="" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="gallery-placeholder" style="display:none">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
        <div class="gallery-badge">${p.type}${p.months ? ' · ' + p.months : ''}</div>
      </div>`).join('')}
  </div>`;
}

function closeProofOverlay() {
  _histBack();
  document.getElementById('proofOverlay')?.classList.remove('open');
}

// ── Entry point 1: Payments screen — member + month(s) + advance ────

async function openProofUpload() {
  document.getElementById('proofOverlayContent').innerHTML = '<div class="loading">Loading...</div>';
  _histPush({ modal: 'proofOverlay' });
  document.getElementById('proofOverlay').classList.add('open');
  await _loadProofs();
  _renderProofEntry();
}

function _renderProofEntry() {
  const active  = _isActiveSession();
  const months  = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const memberOptions = STATE.allMembers.map(m => `<option value="${m.name.replace(/"/g, '&quot;')}">`).join('');

  document.getElementById('proofOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Payment Proofs — ${STATE.currentSession?.label || ''}</div>
      <button class="close-btn" onclick="closeProofOverlay()">×</button>
    </div>
    <datalist id="pf_memberList">${memberOptions}</datalist>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>Member Ka Naam</label>
      <input id="pf_member" list="pf_memberList" placeholder="Naam likhein ya list se chunein…" autocomplete="off" oninput="_pfMemberChanged()">
    </div>
    ${active ? `
    <div class="form-group">
      <label>Advance Payment?</label>
      <div style="display:flex;gap:8px">
        <button id="pfAdvNo"  class="btn btn-primary"   style="flex:1;padding:10px" onclick="_setPfAdvance(false)">Nahi</button>
        <button id="pfAdvYes" class="btn btn-secondary" style="flex:1;padding:10px" onclick="_setPfAdvance(true)">Haan, Advance</button>
      </div>
    </div>
    <div class="form-group">
      <label>Month(s)</label>
      <div class="month-pills" id="pf_months">
        ${months.map(m => `<button type="button" class="month-pill" data-month="${m}" onclick="_togglePfMonth(this)">${m}</button>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Screenshot</label>
      <input type="file" id="pf_file" accept="image/*">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:6px" onclick="_submitProofUpload(this)">Upload Karein</button>
    ` : `<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Ye purana session hai — sirf existing proofs dekh sakte hain, naya upload nahi ho sakta.</div>`}
    <div id="pf_existing" style="margin-top:18px"></div>
  `;
  _pfAdvance = false;
  _pfSelectedMonths = new Set();
}

function _pfMemberChanged() {
  const name = (document.getElementById('pf_member')?.value || '').trim();
  const box  = document.getElementById('pf_existing');
  if (!box) return;
  if (!name) { box.innerHTML = ''; return; }
  const sessionLabel = STATE.currentSession?.label || '';
  const list = _proofRows.filter(p => p.session === sessionLabel && nameMatch(p.name, name));
  box.innerHTML = `<div class="card-title" style="margin-bottom:8px">Existing Proofs (${list.length})</div>${_proofGridHtml(list)}`;
}

function _setPfAdvance(v) {
  _pfAdvance = v;
  document.getElementById('pfAdvNo').className  = 'btn ' + (!v ? 'btn-primary' : 'btn-secondary');
  document.getElementById('pfAdvYes').className = 'btn ' + (v  ? 'btn-primary' : 'btn-secondary');
}

function _togglePfMonth(el) {
  const m = el.dataset.month;
  if (_pfSelectedMonths.has(m)) { _pfSelectedMonths.delete(m); el.classList.remove('active'); }
  else { _pfSelectedMonths.add(m); el.classList.add('active'); }
}

async function _submitProofUpload(btn) {
  if (btn?.disabled) return;
  if (!_isActiveSession()) { showAlert('Edit Nahi Ho Sakta', _sessionLockedMsg('Proof upload karne')); return; }
  const name = (document.getElementById('pf_member')?.value || '').trim();
  const file = document.getElementById('pf_file')?.files?.[0];
  if (!name) { showAlert('Naam Zaroori Hai', 'Member ka naam likhein.'); return; }
  if (!file) { showAlert('Screenshot Zaroori Hai', 'Payment screenshot chunein.'); return; }
  if (!_pfSelectedMonths.size) { showAlert('Month Chunein', 'Kam se kam ek month select karein.'); return; }

  const months = [..._pfSelectedMonths].join(', ');
  const type   = _pfAdvance ? 'Advance' : 'Payment';

  let orig;
  if (btn) { orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Upload ho raha hai...'; }
  const result = await _uploadProofFile(file, { type, name, months });
  if (btn) { btn.disabled = false; btn.innerHTML = orig; }

  if (!result.ok) { showAlert('Upload Error', result.error); return; }
  showAlert('Proof Upload Ho Gaya', `${name} — ${type} (${months}) ka proof upload ho gaya! ✅`);
  document.getElementById('pf_file').value = '';
  _pfMemberChanged();
}

// ── Entry point 2 & 3: Donation/Expense row icon — direct attach ────

async function _quickProofUpload(type, idx) {
  const rec = type === 'Donation' ? STATE.allDonations[idx] : STATE.allExpenses[idx];
  if (!rec) return;
  const name = type === 'Donation' ? rec.donor : rec.desc;
  await _loadProofs();
  const sessionLabel = STATE.currentSession?.label || '';
  const list = _proofRows.filter(p => p.session === sessionLabel && p.type === type && p.name === name);
  if (list.length) {
    _openProofBrowseModal(list, `${name} — ${type} Proofs`, { type, name });
  } else if (_isActiveSession()) {
    _qpContext = { type, name };
    document.getElementById('proofQuickFileInput').click();
  } else {
    showAlert('Koi Proof Nahi Hai', `${name} ke liye is session mein koi proof nahi hai.`);
  }
}

async function _quickProofFileChosen(input) {
  const file = input.files?.[0];
  input.value = '';
  if (!file || !_qpContext) return;
  const { type, name } = _qpContext;
  showToast('Screenshot upload ho raha hai...');
  const result = await _uploadProofFile(file, { type, name, months: '' });
  _qpContext = null;
  if (!result.ok) { showAlert('Upload Error', result.error); return; }
  showAlert('Proof Upload Ho Gaya', `${name} ka ${type.toLowerCase()} proof upload ho gaya! ✅`);
}

function _openProofBrowseModal(list, title, context) {
  _proofBrowseCtx = context || null;
  document.getElementById('proofOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${title}</div>
      <button class="close-btn" onclick="closeProofOverlay()">×</button>
    </div>
    ${_isActiveSession() && context ? `
    <button class="btn btn-secondary" style="width:100%;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="_qpAddMoreFromBrowse()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Aur Add Karein
    </button>` : ''}
    ${_proofGridHtml(list)}
  `;
  _histPush({ modal: 'proofOverlay' });
  document.getElementById('proofOverlay').classList.add('open');
}

function _qpAddMoreFromBrowse() {
  if (!_proofBrowseCtx) return;
  _qpContext = _proofBrowseCtx;
  document.getElementById('proofQuickFileInput').click();
}

// ── Lightbox (view / download / delete one proof) ────────────────

function _openProofLightbox(driveId) {
  const p = _proofRows.find(x => x.driveId === driveId);
  if (!p) return;
  document.getElementById('proofOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${p.name}</div>
      <button class="close-btn" onclick="closeProofOverlay()">×</button>
    </div>
    <div style="text-align:center;margin-bottom:12px">
      <img src="${_thumbUrlProof(p.driveId, 1200)}" style="max-width:100%;border-radius:12px" alt="">
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px;text-align:center">
      ${p.type}${p.months ? ' · ' + p.months : ''} · ${p.date || ''} · by ${p.uploadedBy || 'Unknown'}
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-secondary" style="flex:1" onclick="_downloadProof('${p.driveId}','${(p.name || 'proof').replace(/'/g, '')}')">Download</button>
      ${_isActiveSession() ? `<button class="btn btn-danger" style="flex:1" onclick="_deleteProofPrompt('${p.driveId}')">Delete</button>` : ''}
    </div>
  `;
}

async function _downloadProof(driveId, name) {
  try {
    showToast('Download ho raha hai...');
    const url = `${CONFIG.WORKER_URL}/api/proofs/download?id=${driveId}&name=${encodeURIComponent(name + '.jpg')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = name + '.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
  } catch (e) { showToast('Download error: ' + e.message, 'error'); }
}

function _deleteProofPrompt(driveId) {
  const p = _proofRows.find(x => x.driveId === driveId);
  if (!p) return;
  showConfirm('Proof Delete Karein?', `<b>${p.name}</b> ka yeh screenshot permanently delete ho jayega.<br><span style="color:var(--red);font-size:12px">Yeh action wapas nahi ho sakta!</span>`, async () => {
    const ok = await _deleteProof(p);
    if (ok) { showAlert('Proof Delete Ho Gaya', 'Screenshot delete ho gaya. 🗑'); closeProofOverlay(); }
    else showAlert('Delete Error', 'Delete nahi ho paya — dobara try karein.');
  });
}

// ── Shared upload/delete core ─────────────────────────────────────

async function _uploadProofFile(file, { type, name, months, note }) {
  if (!_isActiveSession()) return { ok: false, error: _sessionLockedMsg('Proof upload karne') };
  if (!await _ensureWriteAccess()) return { ok: false, error: 'Google sign-in/sync zaroori hai.' };
  try {
    const compressed = await _compressImage(file);
    const form = new FormData();
    form.append('file', compressed);
    const res = await fetch(CONFIG.WORKER_URL + '/api/proofs/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)));
    const uploaded = await res.json();
    if (!uploaded.id) throw new Error('Upload response invalid');

    const session   = STATE.currentSession?.label || '';
    const admin     = localStorage.getItem('tanzeem_user_display') || STATE.loggedInEmail || localStorage.getItem('tanzeem_logged_email') || 'Unknown';
    const dateStr   = todayDate();
    const nextId    = _proofRows.length > 0 ? Math.max(...(_proofRows.map(p => parseInt(p.id) || 0))) + 1 : 1;
    const newRowNum = _proofRows.length > 0 ? Math.max(..._proofRows.map(p => p.row)) + 1 : 2;
    await sheetsAppend('PaymentProofs', [[nextId, session, type, name, months || '', uploaded.id, admin, dateStr, note || '']]);
    const newRow = { row: newRowNum, id: String(nextId), session, type, name, months: months || '', driveId: uploaded.id, uploadedBy: admin, date: dateStr, note: note || '' };
    _proofRows.push(newRow);
    _trackHistory('Proof Uploaded', `${name} - ${type}${months ? ' - ' + months : ''}`, false);
    return { ok: true, row: newRow };
  } catch (e) {
    return { ok: false, error: e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein.' : 'Upload error: ' + e.message };
  }
}

async function _deleteProof(p) {
  if (!_isActiveSession()) return false;
  if (!await _ensureWriteAccess()) return false;
  try {
    await fetch(CONFIG.WORKER_URL + '/api/proofs/delete?id=' + p.driveId, { method: 'DELETE' });
    await sheetsDeleteRow('PaymentProofs', p.row);
    const deletedRow = p.row;
    _proofRows = _proofRows.filter(x => x !== p);
    _proofRows.forEach(x => { if (x.row > deletedRow) x.row--; });
    _trackHistory('Proof Deleted', `${p.name} - ${p.type}${p.months ? ' - ' + p.months : ''}`, false);
    return true;
  } catch (e) { return false; }
}

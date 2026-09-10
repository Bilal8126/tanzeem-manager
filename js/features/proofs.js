// ── Payment Proofs ──────────────────────────────────────────────
// WhatsApp screenshots (payment/advance/donation/expense proof) uploaded
// into a dedicated Drive folder via the worker ("Tanzeem Payment Proofs"),
// tagged with member/type/month/session in the PaymentProofs sheet.
// Sheet columns: SrNo | Session | Member Name | Month(s) | Type | Drive File ID | Uploaded By | Date

let _proofRows   = [];
let _proofLoaded = false;
let _pfAdvance   = false;
let _pfSelectedMonths = new Set();
let _pfPickedFiles  = []; // files chosen via Gallery/Camera for the main upload form (gallery allows multi-select)
let _qpContext      = null; // { type, name } — set right before opening the Gallery/Camera picker for quick-upload
let _proofBrowseCtx = null; // { type, name } — set when a browse grid was opened with an "add more" option
let _proofBusy      = false; // true while an upload/download/delete network op is in flight
let _proofListRender = null; // re-renders whatever list/grid is currently under the lightbox — set by every
// grid-producing function right as it renders, so a successful delete can return to that same list
// (refreshed) instead of always closing the entire overlay back out to whatever screen opened it.

// Blocks the ENTIRE proof overlay (like the app's sync loader) for the
// duration of an upload/download/delete — swaps the content for a spinner
// so nothing (member picker, month pills, close button, backdrop) is
// clickable until the operation settles.
function _setProofBusy(on, label) {
  _proofBusy = on;
  if (on) {
    document.getElementById('proofOverlayContent').innerHTML = _proofLoadingHtml('Please Wait', label || 'Processing...');
  }
}

// Shared Gallery/Camera source-picker buttons (same UX as the Gallery feature's own upload picker)
function _proofSourceButtonsHtml() {
  return `<div style="display:flex;gap:10px">
    <button type="button" class="btn btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px" onclick="document.getElementById('proofGalleryInput').click()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Gallery
    </button>
    <button type="button" class="btn btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px" onclick="document.getElementById('proofCameraInput').click()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Camera
    </button>
  </div>`;
}

function _thumbUrlProof(id, size = 400) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}

async function _loadProofs(force = false) {
  if (_proofLoaded && !force) return;
  if (!STATE.accessToken) return;
  try {
    const rows = await sheetsGet('PaymentProofs!A2:H2000');
    _proofRows = rows
      .map((r, i) => ({
        row: i + 2, id: r?.[0] || '', session: r?.[1] || '', name: r?.[2] || '', months: r?.[3] || '',
        type: r?.[4] || '', driveId: r?.[5] || '', uploadedBy: r?.[6] || '', date: r?.[7] || '',
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
  if (_proofBusy) return; // upload/download/delete in progress — block header X and backdrop-tap close
  _proofListRender = null;
  _histBack();
  document.getElementById('proofOverlay')?.classList.remove('open');
}

// Opens the shared overlay only if it isn't already open — every function
// that swaps #proofOverlayContent while staying within the same modal
// session (browse → picker → lightbox, etc.) calls this instead of
// unconditionally re-pushing history, which would break the back button.
function _openProofOverlay() {
  const overlay = document.getElementById('proofOverlay');
  if (!overlay.classList.contains('open')) {
    _histPush({ modal: 'proofOverlay' });
    overlay.classList.add('open');
  }
}

function _proofLoadingHtml(title, sub) {
  return `
    <div class="modal-header"><div class="modal-title">${title}</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:34px 0">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-9-9"/></svg>
      <div style="font-size:13px;color:var(--muted)">${sub || 'Please wait...'}</div>
    </div>`;
}

// ── Entry point 1: Payments screen — member + month(s) + advance ────

async function openProofUpload(prefillName) {
  _openProofOverlay();
  document.getElementById('proofOverlayContent').innerHTML = '<div class="loading">Loading...</div>';
  await _loadProofs();
  _renderProofEntry(prefillName);
}

function _renderProofEntry(prefillName) {
  const active  = _isActiveSession();
  const sortedNames = [...STATE.allMembers].map(m => m.name).sort((a, b) => a.localeCompare(b));
  const memberOptions = sortedNames.map(n =>
    `<option value="${n.replace(/"/g, '&quot;')}"${n === prefillName ? ' selected' : ''}>${n}</option>`
  ).join('');

  document.getElementById('proofOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Payment Proofs — ${STATE.currentSession?.label || ''}</div>
      <button class="close-btn" onclick="closeProofOverlay()">×</button>
    </div>
    <button type="button" onclick="openAllProofsBrowse()" style="width:100%;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px;background:#f5f3ff;color:#6d28d9;border:none;border-radius:12px;font-weight:700;font-size:12.5px;cursor:pointer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      All Proofs Dekhein — Session/Member/Month Wise
    </button>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>Member Ka Naam</label>
      <select id="pf_member" onchange="_pfMemberChanged()">
        <option value="">-- Member chunein --</option>
        ${memberOptions}
      </select>
    </div>
    ${active ? `
    <div class="form-group">
      <label>Month(s)</label>
      <div class="month-pills" id="pf_months"></div>
      <div id="pf_monthsNote" style="font-size:11px;color:var(--muted);margin-top:6px"></div>
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Screenshot (Gallery se multiple select kar sakte hain)</label>
      ${_proofSourceButtonsHtml()}
      <div id="pf_fileName" style="font-size:11px;color:var(--muted);margin-top:6px"></div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:6px" onclick="_submitProofUpload(this)">Upload Karein</button>
    ` : `<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Ye purana session hai — sirf existing proofs dekh sakte hain, naya upload nahi ho sakta.</div>`}
    <div id="pf_existing" style="margin-top:18px"></div>
  `;
  _pfAdvance = false;
  _pfSelectedMonths = new Set();
  _pfPickedFiles = [];
  _qpContext = null; // main-form mode — quick-upload's shared file inputs must route back here, not to a quick target
  _pfMemberChanged(); // populates existing-proofs box + month pills (prefilled member or the "select member" placeholder)
}

function _pfMemberChanged() {
  const name = (document.getElementById('pf_member')?.value || '').trim();
  const box  = document.getElementById('pf_existing');
  if (box) {
    if (!name) box.innerHTML = '';
    else {
      const sessionLabel = STATE.currentSession?.label || '';
      const list = _proofRows.filter(p => p.session === sessionLabel && nameMatch(p.name, name));
      box.innerHTML = `<div class="card-title" style="margin-bottom:8px">Existing Proofs (${list.length})</div>${_proofGridHtml(list)}`;
      _proofListRender = () => _pfMemberChanged(); // so Delete from this grid's lightbox returns here, not out of the whole form
    }
  }
  _pfRenderMonths(name);
}

// Only months where THIS member's payment is already marked "Paid" get a pill —
// a proof can never be uploaded for a month before the payment itself is marked.
function _paidMonthsOf(name) {
  if (!name) return [];
  const rec = STATE.allPayments.find(p => nameMatch(p.name, name));
  if (!rec) return [];
  return Object.keys(rec.months).filter(m => isPaid(rec.months[m]));
}

function _pfRenderMonths(name) {
  const wrap = document.getElementById('pf_months');
  if (!wrap) return; // old-session view has no upload form / month picker at all
  const note = document.getElementById('pf_monthsNote');
  _pfSelectedMonths = new Set(); // month selection doesn't carry over between members
  if (!name) {
    wrap.innerHTML = '';
    if (note) note.textContent = 'Pehle member select karein.';
    return;
  }
  const paidMonths = _paidMonthsOf(name);
  if (!paidMonths.length) {
    wrap.innerHTML = '';
    if (note) note.textContent = `${name} ka is session mein koi payment "Paid" mark nahi hai — pehle payment mark karein, uske baad hi proof upload ho sakta hai.`;
    return;
  }
  if (note) note.textContent = '';
  wrap.innerHTML = paidMonths.map(m => `<button type="button" class="month-pill" data-month="${m}" onclick="_togglePfMonth(this)">${m}</button>`).join('');
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
  if (_proofBusy) return;
  if (!_isActiveSession()) { showAlert('Edit Nahi Ho Sakta', _sessionLockedMsg('Proof upload karne')); return; }
  const name  = (document.getElementById('pf_member')?.value || '').trim();
  const files = _pfPickedFiles;
  if (!name) { showAlert('Naam Zaroori Hai', 'Member ka naam likhein.'); return; }
  if (!files.length) { showAlert('Screenshot Zaroori Hai', 'Gallery ya Camera se payment screenshot chunein.'); return; }
  if (!_paidMonthsOf(name).length) { showAlert('Payment Pehle Mark Karein', `${name} ka is session mein koi payment "Paid" mark nahi hai. Proof upload karne se pehle payment mark karein.`); return; }
  if (!_pfSelectedMonths.size) { showAlert('Month Chunein', 'Kam se kam ek month select karein.'); return; }

  const months = [..._pfSelectedMonths].join(', ');
  const type   = _pfAdvance ? 'Advance' : 'Payment';

  let uploaded = 0;
  for (const file of files) {
    _setProofBusy(true, files.length > 1 ? `Photo ${uploaded + 1}/${files.length} upload ho raha hai...` : 'Screenshot upload ho raha hai...');
    const result = await _uploadProofFile(file, { type, name, months });
    if (!result.ok) {
      _setProofBusy(false);
      showAlert('Upload Error', uploaded > 0 ? `${uploaded} photo(s) upload ho gaye. Phir error aaya: ${result.error}` : result.error);
      _renderProofEntry(name);
      return;
    }
    uploaded++;
  }
  _setProofBusy(false);
  showAlert('Proof Upload Ho Gaya', `${name} — ${type} (${months}) ke ${uploaded > 1 ? uploaded + ' proofs' : 'proof'} upload ho gaye! ✅`);
  _renderProofEntry(name); // rebuild form fresh — new proofs show immediately in Existing Proofs, no resync needed
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
    _openQuickSourcePicker(`${name} — Proof Add Karein`);
  } else {
    showAlert('Koi Proof Nahi Hai', `${name} ke liye is session mein koi proof nahi hai.`);
  }
}

function _recordHasProof(type, name) {
  const sessionLabel = STATE.currentSession?.label || '';
  return _proofRows.some(p => p.session === sessionLabel && p.type === type && p.name === name);
}

// Same green/red camera icon as the member+month one, but for a Donation/Expense
// row — green if that record already has an attached proof, red if missing.
function _proofRecordIconHtml(type, idx, name) {
  const hasProof = _proofLoaded && _recordHasProof(type, name);
  const color    = !_proofLoaded ? '#cbd5e1' : (hasProof ? '#16a34a' : '#dc2626');
  return `<button class="proof-status-icon" data-proof-record-type="${type}" data-proof-record-name="${name.replace(/"/g, '&quot;')}" onclick="_quickProofUpload('${type}',${idx})" title="${hasProof ? 'Proof uploaded' : 'Proof missing'}" style="background:none;border:none;cursor:pointer;padding:5px 6px;border-radius:8px;display:flex;align-items:center">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
  </button>`;
}

// ── Entry point 4: green/red per-member-per-month status icon ───────
// Shown next to a paid member (Members/Payments/Member Profile screens).
// Green = a Payment/Advance proof already covers this exact month; red = missing.

function _monthsListOf(p) {
  return (p.months || '').split(',').map(x => x.trim()).filter(Boolean);
}

function _memberHasProofForMonth(name, month) {
  const sessionLabel = STATE.currentSession?.label || '';
  return _proofRows.some(p =>
    p.session === sessionLabel && (p.type === 'Payment' || p.type === 'Advance') &&
    nameMatch(p.name, name) && _monthsListOf(p).includes(month)
  );
}

// Small clickable camera icon — green (proof exists) or red (missing) — for one member+month.
function _proofStatusIconHtml(memberName, month) {
  const clean    = memberName.replace(/\(.*?\)/g, '').trim();
  const hasProof = _proofLoaded && _memberHasProofForMonth(clean, month);
  const color    = !_proofLoaded ? '#cbd5e1' : (hasProof ? '#16a34a' : '#dc2626');
  const safeName = clean.replace(/'/g, "\\'");
  const safeMon  = month.replace(/'/g, "\\'");
  return `<button class="proof-status-icon" data-proof-name="${clean.replace(/"/g, '&quot;')}" data-proof-month="${month.replace(/"/g, '&quot;')}" onclick="event.stopPropagation();_openMonthProof('${safeName}','${safeMon}')" title="${hasProof ? 'Payment proof uploaded' : 'Payment proof missing'}" style="background:none;border:none;cursor:pointer;padding:3px;display:flex;align-items:center;flex-shrink:0">
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
  </button>`;
}

// Re-colors every already-rendered status icon in place (Members/Payments/Member
// Profile screens sit *behind* the proof overlay, so their DOM isn't rebuilt when
// an upload/delete happens on top of them — this keeps them in sync without a resync).
function _refreshProofStatusIcons() {
  document.querySelectorAll('.proof-status-icon').forEach(btn => {
    let hasProof, onLabel, offLabel;
    if (btn.dataset.proofName) {
      const name = btn.dataset.proofName, month = btn.dataset.proofMonth;
      if (!name || !month) return;
      hasProof = _proofLoaded && _memberHasProofForMonth(name, month);
      onLabel = 'Payment proof uploaded'; offLabel = 'Payment proof missing';
    } else if (btn.dataset.proofRecordType) {
      const type = btn.dataset.proofRecordType, name = btn.dataset.proofRecordName;
      if (!name) return;
      hasProof = _proofLoaded && _recordHasProof(type, name);
      onLabel = 'Proof uploaded'; offLabel = 'Proof missing';
    } else return;
    const color = !_proofLoaded ? '#cbd5e1' : (hasProof ? '#16a34a' : '#dc2626');
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('stroke', color);
    btn.title = hasProof ? onLabel : offLabel;
  });
}

// Call once per screen render (before building status icons) — kicks off a
// background load and triggers `onLoaded` (a re-render) once it's ready, so
// icons that first render grey (unknown) turn green/red without user action.
function _ensureProofsForIcons(onLoaded) {
  if (_proofLoaded) return;
  _loadProofs().then(() => { if (typeof onLoaded === 'function') onLoaded(); });
}

async function _openMonthProof(memberName, month) {
  await _loadProofs();
  const sessionLabel = STATE.currentSession?.label || '';
  const list = _proofRows.filter(p =>
    p.session === sessionLabel && (p.type === 'Payment' || p.type === 'Advance') &&
    nameMatch(p.name, memberName) && _monthsListOf(p).includes(month)
  );
  if (list.length) {
    _openProofBrowseModal(list, `${memberName} — ${month}`, { type: list[0].type, name: memberName, month });
  } else if (_isActiveSession()) {
    _qpContext = { type: 'Payment', name: memberName, month };
    _openQuickSourcePicker(`${memberName} — ${month} Proof Add Karein`);
  } else {
    showAlert('Koi Proof Nahi Hai', `${memberName} ke ${month} ka koi proof is session mein nahi hai.`);
  }
}

// Shared onchange for both #proofGalleryInput and #proofCameraInput — used by
// the quick-upload flow (when _qpContext is set) and by the main form (stores
// the file for _submitProofUpload to pick up).
async function _proofFileChosen(input) {
  const files = Array.from(input.files || []);
  input.value = '';
  if (!files.length) return;
  if (_qpContext) {
    const { type, name, month } = _qpContext;
    _qpContext = null;
    const label = month ? `${name} — ${month}` : `${name} — Proof`;
    let uploaded = 0;
    for (const file of files) {
      // Persistent in-overlay loader (not just a toast) until the upload settles
      _setProofBusy(true, files.length > 1 ? `Photo ${uploaded + 1}/${files.length} upload ho raha hai...` : 'Screenshot upload ho raha hai...');
      const result = await _uploadProofFile(file, { type, name, months: month || '' });
      if (!result.ok) {
        _setProofBusy(false);
        showAlert('Upload Error', uploaded > 0 ? `${uploaded} photo(s) upload ho gaye. Phir error aaya: ${result.error}` : result.error);
        closeProofOverlay();
        return;
      }
      uploaded++;
    }
    _setProofBusy(false);
    // Show the result immediately — no need to close and reopen to see it
    const sessionLabel = STATE.currentSession?.label || '';
    const list = _proofRows.filter(p =>
      p.session === sessionLabel && p.type === type && p.name === name &&
      (month ? _monthsListOf(p).includes(month) : true)
    );
    _openProofBrowseModal(list, label, { type, name, month });
    showToast(uploaded > 1 ? `${uploaded} proofs upload ho gaye! ✅` : 'Proof upload ho gaya! ✅');
  } else {
    _pfPickedFiles = files;
    const el = document.getElementById('pf_fileName');
    if (el) el.textContent = files.length > 1 ? `${files.length} files selected` : files[0].name;
  }
}

function _openQuickSourcePicker(title) {
  _openProofOverlay();
  document.getElementById('proofOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${title}</div>
      <button class="close-btn" onclick="closeProofOverlay()">×</button>
    </div>
    ${_proofSourceButtonsHtml()}
  `;
}

// Rebuilds the exact filtered list a browse-modal context represents, straight
// from the live _proofRows — used to refresh after a delete (a captured `list`
// array snapshot would still contain the just-removed item by reference).
function _proofsMatchingContext(context) {
  const sessionLabel = STATE.currentSession?.label || '';
  return _proofRows.filter(p =>
    p.session === sessionLabel && p.type === context.type && p.name === context.name &&
    (context.month ? _monthsListOf(p).includes(context.month) : true)
  );
}

function _openProofBrowseModal(list, title, context) {
  _proofBrowseCtx = context || null;
  _openProofOverlay();
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
  // Delete from this grid's lightbox returns to this same grid (freshly refiltered), not out of the whole overlay
  _proofListRender = context
    ? () => _openProofBrowseModal(_proofsMatchingContext(context), title, context)
    : () => _openProofBrowseModal(list, title, context);
}

function _qpAddMoreFromBrowse() {
  if (!_proofBrowseCtx) return;
  _qpContext = _proofBrowseCtx;
  const label = _proofBrowseCtx.month ? `${_proofBrowseCtx.name} — ${_proofBrowseCtx.month}` : _proofBrowseCtx.name;
  _openQuickSourcePicker(`${label} Proof Add Karein`);
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
    <div style="text-align:center;margin-bottom:12px;min-height:160px;position:relative">
      <div id="proofLightboxLoader" style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 0">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-9-9"/></svg>
        <div style="font-size:12px;color:var(--muted)">Image load ho raha hai...</div>
      </div>
      <img src="${_thumbUrlProof(p.driveId, 1200)}" style="max-width:100%;border-radius:12px;display:none" alt=""
           onload="this.style.display='block';var l=document.getElementById('proofLightboxLoader');if(l)l.style.display='none';"
           onerror="var l=document.getElementById('proofLightboxLoader');if(l)l.innerHTML='<div style=color:var(--red);font-size:12px>Image load nahi ho payi.</div>';">
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
  if (_proofBusy) return; // guard against double-tap firing two downloads
  _setProofBusy(true, 'Download ho raha hai...');
  try {
    const url = `${CONFIG.WORKER_URL}/api/proofs/download?id=${driveId}&name=${encodeURIComponent(name + '.jpg')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = name + '.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
    showToast('Download ho gaya! ✅');
  } catch (e) { showToast('Download error: ' + e.message, 'error'); }
  finally { _setProofBusy(false); _openProofLightbox(driveId); }
}

function _deleteProofPrompt(driveId) {
  const p = _proofRows.find(x => x.driveId === driveId);
  if (!p) return;
  showConfirm('Proof Delete Karein?', `<b>${p.name}</b> ka yeh screenshot permanently delete ho jayega.<br><span style="color:var(--red);font-size:12px">Yeh action wapas nahi ho sakta!</span>`, async () => {
    const ok = await _deleteProof(p);
    if (ok) {
      showAlert('Proof Delete Ho Gaya', 'Screenshot delete ho gaya. 🗑');
      // Return to whatever list this photo was opened from (refreshed) instead of
      // closing the whole overlay — keeps the user browsing where they were.
      if (typeof _proofListRender === 'function') _proofListRender();
      else closeProofOverlay();
    }
    else showAlert('Delete Error', 'Delete nahi ho paya — dobara try karein.');
  });
}

// ── Shared upload/delete core ─────────────────────────────────────
// Callers wrap every entry point with _setProofBusy(true/false), which both
// blocks the overlay UI and swaps the busy flag — so by the time this runs
// there's no interactive element left in the DOM to double-tap.

async function _uploadProofFile(file, { type, name, months }) {
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
    // Column order: SrNo | Session | Member Name | Month(s) | Type | Drive File ID | Uploaded By | Date
    await sheetsAppend('PaymentProofs', [[nextId, session, name, months || '', type, uploaded.id, admin, dateStr]]);
    const newRow = { row: newRowNum, id: String(nextId), session, name, months: months || '', type, driveId: uploaded.id, uploadedBy: admin, date: dateStr };
    _proofRows.push(newRow);
    _refreshProofStatusIcons(); // turn the relevant member+month icon green immediately, no resync needed
    _trackHistory('Proof Uploaded', `${name} - ${type}${months ? ' - ' + months : ''}`, false);
    return { ok: true, row: newRow };
  } catch (e) {
    return { ok: false, error: e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein.' : 'Upload error: ' + e.message };
  }
}

async function _deleteProof(p) {
  if (_proofBusy) return false; // guard against double-tap firing two deletes
  if (!_isActiveSession()) return false;
  if (!await _ensureWriteAccess()) return false;
  _proofBusy = true; // block the overlay for the duration, same as upload/download
  try {
    await fetch(CONFIG.WORKER_URL + '/api/proofs/delete?id=' + p.driveId, { method: 'DELETE' });
    await sheetsDeleteRow('PaymentProofs', p.row);
    const deletedRow = p.row;
    _proofRows = _proofRows.filter(x => x !== p);
    _proofRows.forEach(x => { if (x.row > deletedRow) x.row--; });
    _refreshProofStatusIcons(); // turn the relevant member+month icon red immediately, no resync needed
    _trackHistory('Proof Deleted', `${p.name} - ${p.type}${p.months ? ' - ' + p.months : ''}`, false);
    return true;
  } catch (e) {
    return false;
  } finally {
    _proofBusy = false;
  }
}

// ── "All Proofs" — one master list of every uploaded proof, filterable
// by Session / Member / Month / Type all in one place (photo + name + months).

let _apFilters = { session: '', member: '', month: '', type: '' };

async function openAllProofsBrowse() {
  _openProofOverlay();
  document.getElementById('proofOverlayContent').innerHTML = '<div class="loading">Loading...</div>';
  await _loadProofs();
  _apFilters = { session: STATE.currentSession?.label || '', member: '', month: '', type: '' };
  _renderAllProofsBrowse();
}

function _apMembersFor(sessionLabel) {
  const names = new Set();
  _proofRows.forEach(p => { if (p.session === sessionLabel) names.add(p.name); });
  return [...names].sort((a, b) => a.localeCompare(b));
}

function _apMonthsFor(sessionLabel, memberName) {
  const set = new Set();
  _proofRows.forEach(p => {
    if (p.session !== sessionLabel) return;
    if (memberName && p.name !== memberName) return;
    _monthsListOf(p).forEach(m => set.add(m));
  });
  // Prefer the app's canonical Jan..Dec-style order when possible, fall back to A-Z for the rest
  const canonical = STATE.allPayments.length ? Object.keys(STATE.allPayments[0].months) : [];
  const ordered = canonical.filter(m => set.has(m));
  const extra   = [...set].filter(m => !canonical.includes(m)).sort();
  return [...ordered, ...extra];
}

function _apFilteredRows() {
  return _proofRows.filter(p =>
    (!_apFilters.session || p.session === _apFilters.session) &&
    (!_apFilters.member  || p.name === _apFilters.member) &&
    (!_apFilters.type    || p.type === _apFilters.type) &&
    (!_apFilters.month   || _monthsListOf(p).includes(_apFilters.month))
  ).sort((a, b) => (b.date || '').localeCompare(a.date || '')); // newest first
}

// Same grid as everywhere else, but the badge also carries the member name —
// this view spans multiple members at once, unlike every other proof grid.
function _apGridHtml(list) {
  if (!list.length) return `<div style="font-size:12px;color:var(--muted);text-align:center;padding:24px 0">Is filter ke liye koi proof nahi mila.</div>`;
  return `<div class="gallery-grid">
    ${list.map(p => `
      <div class="gallery-item" onclick="_openProofLightbox('${p.driveId}')">
        <img src="${_thumbUrlProof(p.driveId, 400)}" alt="" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="gallery-placeholder" style="display:none">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
        <div class="gallery-badge">${p.name} · ${p.type}${p.months ? ' · ' + p.months : ''}</div>
      </div>`).join('')}
  </div>`;
}

function _renderAllProofsBrowse() {
  const sessionOptions = (CONFIG.SESSIONS || []).map(s =>
    `<option value="${s.label.replace(/"/g, '&quot;')}"${s.label === _apFilters.session ? ' selected' : ''}>${s.label}${s.active ? ' (Active)' : ''}</option>`
  ).join('');
  const members = _apMembersFor(_apFilters.session);
  const memberOptions = members.map(n =>
    `<option value="${n.replace(/"/g, '&quot;')}"${n === _apFilters.member ? ' selected' : ''}>${n}</option>`
  ).join('');
  const months = _apMonthsFor(_apFilters.session, _apFilters.member);
  const monthOptions = months.map(m =>
    `<option value="${m}"${m === _apFilters.month ? ' selected' : ''}>${m}</option>`
  ).join('');
  const typeOptions = ['Payment', 'Donation', 'Expense'].map(t =>
    `<option value="${t}"${t === _apFilters.type ? ' selected' : ''}>${t}</option>`
  ).join('');
  const list = _apFilteredRows();

  document.getElementById('proofOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">All Proofs</div>
      <button class="close-btn" onclick="closeProofOverlay()">×</button>
    </div>
    <div class="form-group">
      <label>Session</label>
      <select onchange="_apSetFilter('session', this.value)">${sessionOptions}</select>
    </div>
    <div class="form-group">
      <label>Member</label>
      <select onchange="_apSetFilter('member', this.value)">
        <option value="">All Members${members.length ? ' (' + members.length + ')' : ''}</option>
        ${memberOptions}
      </select>
    </div>
    <div style="display:flex;gap:10px">
      <div class="form-group" style="flex:1">
        <label>Month</label>
        <select onchange="_apSetFilter('month', this.value)">
          <option value="">All Months</option>
          ${monthOptions}
        </select>
      </div>
      <div class="form-group" style="flex:1">
        <label>Type</label>
        <select onchange="_apSetFilter('type', this.value)">
          <option value="">All Types</option>
          ${typeOptions}
        </select>
      </div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin:4px 0 12px">${list.length} proof${list.length === 1 ? '' : 's'} mile</div>
    ${_apGridHtml(list)}
  `;
  // Re-filters live from _proofRows each call, so this is always safe to call again after a delete
  _proofListRender = () => _renderAllProofsBrowse();
}

function _apSetFilter(key, value) {
  _apFilters[key] = value;
  if (key === 'session') { _apFilters.member = ''; _apFilters.month = ''; } // stale member/month from old session don't carry over
  if (key === 'member')  { _apFilters.month  = ''; }
  _renderAllProofsBrowse();
}

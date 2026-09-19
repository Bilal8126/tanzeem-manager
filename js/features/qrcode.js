// ── UPI QR Codes ────────────────────────────────────────────────
// A saved library of UPI payment QR codes — either generated from a UPI ID
// (client-side, via the QRCode library) or uploaded as an existing bank QR
// image. Exactly one is "Active" at a time (same idea as Active Session);
// that's the one attached when a message is sent "with QR". Deletes are
// SOFT so old QR history stays on record.
// Sheet "QRCodes" columns: A=SrNo | B=Label | C=UPIID | D=DriveFileId | E=IsActive |
// F=CreatedDate | G=IsDeleted | H=Source | I=CreatedBy | J=LastUpdatedDate | K=UpdatedBy | L=WhatUpdate
// Source is "Generate" or "Upload" — set once at creation, tells the Edit
// button which editor to reopen (regenerate vs re-pick a photo) instead of
// guessing from whether a UPI ID happens to be filled in.
// I-L are an audit trail: I/CreatedDate are written once at creation and
// never touched again; J/K/L are overwritten by every edit/activate/delete.
// Images live in Drive (worker's /api/qr/upload + /api/qr/download), same
// mechanics as Payment Proofs — just a different Drive folder.

let _qrRows       = [];
let _qrRawCount   = 0;
let _qrLoaded     = false;
let _qrBusy       = false;
let _qrListRender = null;
let _qrInSubview  = false;
let _qrPickedFile = null; // file chosen via Gallery/Camera in the upload editor

function _qrEsc(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _truthyFlag(v) {
  return /^(yes|true|1|y)$/i.test((v || '').toString().trim());
}

// Format-only check — confirms the string LOOKS like a UPI ID/VPA
// (name@bankhandle). There's no way to confirm a VPA is actually real/live
// from a plain web app — that needs an NPCI-certified PSP "verify VPA" API,
// which requires merchant/PSP registration we don't have; this just catches
// typos and garbage input before a QR gets generated from it.
function _isValidUpiId(v) {
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test((v || '').trim());
}

function _qrAdminName() {
  return localStorage.getItem('tanzeem_user_display') || STATE.loggedInEmail || localStorage.getItem('tanzeem_logged_email') || 'Unknown';
}

function _thumbUrlQr(id, size = 400) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}

function _qrLoadingHtml(sub) {
  return `
    <div class="modal-header"><div class="modal-title">Please Wait</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:34px 0">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-9-9"/></svg>
      <div style="font-size:13px;color:var(--muted)">${sub || 'Processing...'}</div>
    </div>`;
}

function _setQrBusy(on, label) {
  _qrBusy = on;
  if (on) document.getElementById('qrOverlayContent').innerHTML = _qrLoadingHtml(label);
}

function _openQrOverlayShell() {
  const overlay = document.getElementById('qrOverlay');
  if (!overlay.classList.contains('open')) {
    _histPush({ modal: 'qrOverlay' });
    overlay.classList.add('open');
  }
}

function closeQrOverlay() {
  if (_qrBusy) return;
  if (_qrInSubview && typeof _qrListRender === 'function') {
    _qrInSubview = false;
    _qrListRender();
    return;
  }
  _qrListRender = null;
  // Settings' Tools tile only sets its thumbnail/subtitle once when the
  // screen first renders — refresh it now in case anything changed
  // (edit/activate/delete) while this overlay was open.
  if (typeof _renderToolsSummary === 'function') _renderToolsSummary();
  _histBack();
  document.getElementById('qrOverlay')?.classList.remove('open');
}

async function openQrLibrary() {
  _openQrOverlayShell();
  document.getElementById('qrOverlayContent').innerHTML = '<div class="loading">Loading...</div>';
  await _loadQrCodes();
  _renderQrList();
}

async function _loadQrCodes(force = false) {
  if (_qrLoaded && !force) return;
  if (!STATE.accessToken) { _qrRows = []; _qrRawCount = 0; return; }
  try {
    const rows = await sheetsGet('QRCodes!A2:L2000');
    _qrRawCount = rows.length;
    _qrRows = rows
      .map((r, i) => ({
        row: i + 2, sr: r?.[0] || '', label: r?.[1] || '', upi: r?.[2] || '', driveId: r?.[3] || '',
        active: _truthyFlag(r?.[4]), createdDate: r?.[5] || '', deleted: _truthyFlag(r?.[6]),
        source: r?.[7] || '', createdBy: r?.[8] || '', lastUpdated: r?.[9] || '', updatedBy: r?.[10] || '', whatUpdate: r?.[11] || '',
      }))
      .filter(m => m.label && m.driveId && !m.deleted);
    _qrLoaded = true;
  } catch (e) {
    _qrRows = []; _qrRawCount = 0; // QRCodes sheet missing or no access — feature just shows empty
  }
}

function _qrActiveEntry() {
  return _qrRows.find(x => x.active) || null;
}

// ── List view ────────────────────────────────────────────────────
function _renderQrList() {
  _qrInSubview  = false;
  _qrListRender = _renderQrList;
  const rows = _qrRows;
  document.getElementById('qrOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">UPI QR Codes</div>
      <button class="close-btn" onclick="closeQrOverlay()">×</button>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="_openQrChooser()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      New QR
    </button>
    ${!rows.length
      ? `<div style="text-align:center;color:var(--muted);padding:30px 0;font-size:13px">Koi QR save nahi hai. Upar "New QR" se shuru karein.</div>`
      : rows.map((m, i) => `
        <div style="padding:12px 0;${i < rows.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}display:flex;align-items:center;gap:12px;cursor:pointer" onclick="_openQrViewer(${m.row})">
          <img src="${_thumbUrlQr(m.driveId, 120)}" style="width:46px;height:46px;border-radius:10px;object-fit:cover;border:1px solid var(--border);flex-shrink:0" alt="">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_qrEsc(m.label)}</div>
            ${m.active
              ? `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:#dcfce7;color:#15803d">Active</span>`
              : `<span style="font-size:12px;color:var(--muted)">${_qrEsc(m.upi) || 'Uploaded Image'}</span>`}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`).join('')
    }`;
}

// ── Chooser: generate vs upload ────────────────────────────────
function _openQrChooser() {
  _qrInSubview  = true;
  _qrListRender = _renderQrList;
  document.getElementById('qrOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">New QR</div>
      <button class="close-btn" onclick="closeQrOverlay()">×</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn btn-primary" style="width:100%;padding:16px" onclick="_openQrEditorGenerate(null)">UPI ID Se QR Banayein</button>
      <button class="btn btn-secondary" style="width:100%;padding:16px" onclick="_openQrEditorUpload(null)">Gallery/Camera Se Upload Karein</button>
    </div>`;
}

function _qrSourceButtonsHtml() {
  return `<div style="display:flex;gap:10px">
    <button type="button" class="btn btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px" onclick="document.getElementById('qrGalleryInput').click()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Gallery
    </button>
    <button type="button" class="btn btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px" onclick="document.getElementById('qrCameraInput').click()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>Camera
    </button>
  </div>`;
}

// ── Generate editor (UPI ID → live QR preview) ─────────────────
// Uses the qrcodejs (davidshimjs) library — it renders a <canvas> INSIDE the
// container element you give it (it doesn't draw onto a canvas you already
// have). That raw QR is generated off-screen into _qrGenRawWrap (a detached
// div, reused across keystrokes via .clear()/.makeCode()), then composed
// onto a branded card — Tanzeem logo + name header, QR with a small logo
// overlaid center (correctLevel H gives enough error-correction budget for
// that), and the Label/UPI ID printed below — matching a real bank UPI QR
// layout (e.g. Federal Bank's), and THAT composed card is what gets saved
// and shared, not the bare QR.
let _qrGenInstance   = null;
let _qrGenRawWrap    = null;
let _qrPreviewToken  = 0;
let _qrLogoImgPromise = null;

// The card is drawn at 3x the logical layout size (raw QR generated at 3x
// too) then scaled back down via CSS — a plain 1x canvas looked blurry once
// saved/shared and viewed full-size on a phone.
const _QR_HQ_SCALE = 3;

function _getQrLogoImg() {
  if (!_qrLogoImgPromise) {
    _qrLogoImgPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('logo load failed'));
      img.src = new URL('icons/icon.svg?v=2', location.href).href;
    });
  }
  return _qrLogoImgPromise;
}

// Draws the branded card (white bg, header name, QR with center logo,
// footer UPI ID) onto a fresh canvas and returns it. Label is deliberately
// left off the printed card — it's only for our own list/history, not
// something a recipient scanning the QR needs to see.
async function _composeQrCard(qrCanvas, upi) {
  // All drawing below uses these LOGICAL (1x) units — ctx.scale() maps them
  // onto a physically higher-resolution backing store for crisp output.
  // qrGap is the white quiet-zone margin above/below the QR box itself —
  // real scanners (Paytm's especially) need this blank margin on every
  // side; the previous layout had the header divider line sitting AT the
  // QR's exact top edge (zero gap, line touching the first module row),
  // which is a well-known cause of "invalid QR" on stricter scanners.
  const W = 300, PAD = 22, qrSize = 220, qrGap = 16;
  const headerH = 54, footerH = 74;
  const qrTop = headerH + qrGap;
  const H = qrTop + qrSize + qrGap + footerH;
  let logo = null;
  try { logo = await _getQrLogoImg(); } catch (e) { /* card still works without the logo */ }

  const canvas = document.createElement('canvas');
  canvas.width  = W * _QR_HQ_SCALE;
  canvas.height = H * _QR_HQ_SCALE;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(_QR_HQ_SCALE, _QR_HQ_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Rounded-corner white card — clipped fill instead of a plain fillRect so
  // the corners OUTSIDE the rounded shape stay transparent (matches the
  // rounded gradient border frame drawn at the very end).
  const cardR = 16;
  _qrRoundRectPath(ctx, 0, 0, W, H, cardR);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Header: Tanzeem name only (the logo already appears center-on-QR
  // below), solid brand green instead of plain black.
  // Shrink the font a touch if needed so the full name fits in one line.
  const headerCenterY = headerH / 2 + 2;
  const headerText = 'Tanzeem Abd-e-Mustafa (Bisauli)';
  const maxTextW = W - PAD * 2;
  let headerFontSize = 16;
  ctx.fillStyle = '#047857';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  do {
    ctx.font = `700 ${headerFontSize}px Arial, sans-serif`;
    headerFontSize--;
  } while (ctx.measureText(headerText).width > maxTextW && headerFontSize >= 11);
  ctx.fillText(headerText, W / 2, headerCenterY);

  // QR
  const qrX = (W - qrSize) / 2;
  ctx.drawImage(qrCanvas, qrX, qrTop, qrSize, qrSize);

  // Small logo overlaid dead-center on the QR, white-ringed so the modules
  // around it stay scannable (correctLevel H below gives ~30% recovery
  // budget; this circle covers well under that). Kept modest on purpose —
  // going bigger risks the QR's own center alignment marker on larger
  // (longer-URI) codes, which some scanners rely on geometrically and
  // won't recover via error-correction alone.
  if (logo) {
    const cx = W / 2, cy = qrTop + qrSize / 2, r = 22;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(logo, cx - (r - 4), cy - (r - 4), (r - 4) * 2, (r - 4) * 2);
    ctx.restore();
  }

  // Footer: UPI ID only — Label is for our own list/history, not meant to
  // print on the QR image itself.
  let fy = qrTop + qrSize + qrGap + 14;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 14px Arial, sans-serif';
  ctx.fillText(upi, W / 2, fy);
  fy += 22;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 11px Arial, sans-serif';
  ctx.fillText('Scan & Pay using any UPI App', W / 2, fy);

  // Outer border frame, baked into the image itself (not just a CSS wrapper
  // around the <img> in the viewer) so it's actually present when the QR
  // gets downloaded or shared, not only when viewed inside the app. Made
  // thicker with fewer/more saturated gradient stops — a thin border with a
  // pale mid-tone stop read as "missing" in spots once WhatsApp recompresses
  // the image, so this keeps it visibly solid all the way around.
  const borderW = 11;
  const frameGrad = ctx.createLinearGradient(0, 0, W, H);
  frameGrad.addColorStop(0,   '#065f46');
  frameGrad.addColorStop(0.5, '#059669');
  frameGrad.addColorStop(1,   '#1d4ed8');
  ctx.strokeStyle = frameGrad;
  ctx.lineWidth = borderW;
  ctx.lineJoin = 'round';
  _qrRoundRectPath(ctx, borderW / 2, borderW / 2, W - borderW, H - borderW, cardR);
  ctx.stroke();

  return canvas;
}

function _qrRoundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function _openQrEditorGenerate(row) {
  const m = row ? _qrRows.find(x => x.row === row) : null;
  _qrInSubview   = true;
  _qrListRender  = row ? (() => _openQrViewer(row)) : _renderQrList;
  _qrGenInstance = null; // fresh preview instance for this editor session
  document.getElementById('qrOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${m ? 'QR Edit Karein' : 'UPI ID Se QR Banayein'}</div>
      <button class="close-btn" onclick="closeQrOverlay()">×</button>
    </div>
    <div class="form-group">
      <label>Label</label>
      <input type="text" id="qr_label" placeholder="jaise: Hasnain Bhai - Federal Bank" value="${_qrEsc(m?.label || '')}" oninput="_qrRefreshPreview()">
    </div>
    <div class="form-group">
      <label>UPI ID (VPA)</label>
      <input type="text" id="qr_upi" placeholder="example@bank" value="${_qrEsc(m?.upi || '')}" oninput="_qrRefreshPreview()">
      <div id="qr_upi_err" style="display:none;font-size:11.5px;color:var(--red);margin-top:5px">Sahi UPI ID daalein — jaise <b>name@bank</b> (e.g. 9876543210@okaxis)</div>
    </div>
    <div style="display:flex;justify-content:center;margin:16px 0">
      <div id="qr_canvas_wrap" style="max-width:100%"></div>
    </div>
    <button class="btn btn-primary" id="qr_gen_save_btn" style="width:100%" onclick="_saveQrGenerate(${row || 'null'})" disabled>Save</button>`;
  _qrRefreshPreview();
}

async function _qrRefreshPreview() {
  const label   = document.getElementById('qr_label')?.value.trim() || '';
  const upi     = document.getElementById('qr_upi')?.value.trim()   || '';
  const wrap    = document.getElementById('qr_canvas_wrap');
  const errEl   = document.getElementById('qr_upi_err');
  const saveBtn = document.getElementById('qr_gen_save_btn');
  if (!wrap) return;
  const valid = _isValidUpiId(upi);
  if (errEl)   errEl.style.display = (upi && !valid) ? 'block' : 'none';
  if (saveBtn) saveBtn.disabled = !valid;
  if (!valid || typeof QRCode === 'undefined') { wrap.innerHTML = ''; _qrGenInstance = null; return; }
  const uri = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(label || 'Tanzeem Abd-e-Mustafa')}&cu=INR`;
  if (!_qrGenRawWrap) _qrGenRawWrap = document.createElement('div');
  if (_qrGenInstance) {
    _qrGenInstance.clear();
    _qrGenInstance.makeCode(uri);
  } else {
    _qrGenRawWrap.innerHTML = '';
    // Rendered at _QR_HQ_SCALE resolution up front — drawing this straight
    // onto the (also scaled) card canvas is then 1:1, not an upscale.
    _qrGenInstance = new QRCode(_qrGenRawWrap, { text: uri, width: 220 * _QR_HQ_SCALE, height: 220 * _QR_HQ_SCALE, correctLevel: QRCode.CorrectLevel.H });
  }
  const raw = _qrGenRawWrap.querySelector('canvas');
  if (!raw) return;
  const token = ++_qrPreviewToken; // guard against out-of-order async renders while typing fast
  const card = await _composeQrCard(raw, upi);
  if (token !== _qrPreviewToken) return; // a newer refresh already started — drop this stale one
  wrap.innerHTML = '';
  wrap.appendChild(card);
}

async function _saveQrGenerate(row) {
  const label  = document.getElementById('qr_label').value.trim();
  const upi    = document.getElementById('qr_upi').value.trim();
  const canvas = document.getElementById('qr_canvas_wrap')?.querySelector('canvas');
  if (!label || !upi) { showToast('Label aur UPI ID dono zaroori hain', 'error'); return; }
  if (!_isValidUpiId(upi)) { showToast('UPI ID sahi format mein nahi hai (jaise name@bank)', 'error'); return; }
  if (!canvas) { showToast('QR generate nahi ho paya — dobara try karein', 'error'); return; }
  if (!await _ensureWriteAccess()) return;
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
  if (!blob) { showToast('QR generate nahi ho paya', 'error'); return; }
  const file = new File([blob], 'qr-' + Date.now() + '.png', { type: 'image/png' });
  await _saveQrCommon(row, label, upi, file, 'Generate');
}

// ── Upload editor (existing QR image) ───────────────────────────
function _openQrEditorUpload(row) {
  const m = row ? _qrRows.find(x => x.row === row) : null;
  _qrPickedFile = null;
  _qrInSubview  = true;
  _qrListRender = row ? (() => _openQrViewer(row)) : _renderQrList;
  document.getElementById('qrOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${m ? 'QR Edit Karein' : 'QR Upload Karein'}</div>
      <button class="close-btn" onclick="closeQrOverlay()">×</button>
    </div>
    <div class="form-group"><label>Label</label><input type="text" id="qr_label" placeholder="jaise: Hasnain Bhai - Federal Bank" value="${_qrEsc(m?.label || '')}"></div>
    <div class="form-group">
      <label>UPI ID (Optional, reference ke liye)</label>
      <input type="text" id="qr_upi" placeholder="example@bank" value="${_qrEsc(m?.upi || '')}" oninput="_qrCheckUploadUpi()">
      <div id="qr_upi_err" style="display:none;font-size:11.5px;color:var(--red);margin-top:5px">Sahi UPI ID daalein — jaise <b>name@bank</b> (e.g. 9876543210@okaxis)</div>
    </div>
    <div class="form-group">
      <label>QR Image ${m ? '(badalne ke liye naya chunein, warna purani rahegi)' : ''}</label>
      ${_qrSourceButtonsHtml()}
      <div id="qr_preview_wrap" style="margin-top:10px;text-align:center">
        ${m?.driveId ? `<img src="${_thumbUrlQr(m.driveId, 300)}" style="max-width:180px;border-radius:10px;border:1px solid var(--border)">` : ''}
      </div>
    </div>
    <button class="btn btn-primary" id="qr_upload_save_btn" style="width:100%" ${row ? '' : 'disabled'} onclick="_saveQrUpload(${row || 'null'})">${row ? 'Save' : 'Pehle Photo Chunein'}</button>`;
}

function _qrFileChosen(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  _qrPickedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const wrap = document.getElementById('qr_preview_wrap');
    if (wrap) wrap.innerHTML = `<img src="${e.target.result}" style="max-width:180px;border-radius:10px;border:1px solid var(--border)">`;
    const btn = document.getElementById('qr_upload_save_btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Save'; }
  };
  reader.readAsDataURL(file);
}

// UPI ID is optional here (a purely-uploaded QR photo doesn't need one),
// but if something's typed it must look like a real VPA — errors on blur/
// input rather than blocking Save outright since the field is optional.
function _qrCheckUploadUpi() {
  const upi   = document.getElementById('qr_upi')?.value.trim() || '';
  const errEl = document.getElementById('qr_upi_err');
  if (errEl) errEl.style.display = (upi && !_isValidUpiId(upi)) ? 'block' : 'none';
}

async function _saveQrUpload(row) {
  const label = document.getElementById('qr_label').value.trim();
  const upi   = document.getElementById('qr_upi').value.trim();
  if (!label) { showToast('Label zaroori hai', 'error'); return; }
  if (upi && !_isValidUpiId(upi)) { showToast('UPI ID sahi format mein nahi hai (jaise name@bank)', 'error'); return; }
  if (!row && !_qrPickedFile) { showToast('Pehle QR image chunein', 'error'); return; }
  if (!await _ensureWriteAccess()) return;
  if (_qrPickedFile) {
    const compressed = await _compressImage(_qrPickedFile);
    await _saveQrCommon(row, label, upi, compressed, 'Upload');
    _qrPickedFile = null;
  } else {
    // Editing an existing entry without changing the image — just update label/UPI text
    _setQrBusy(true, 'Update ho raha hai...');
    try {
      const admin   = _qrAdminName();
      const dateStr = todayDate();
      await sheetsBatchPut([
        { range: `QRCodes!B${row}:C${row}`, values: [[label, upi]] },
        { range: `QRCodes!J${row}:L${row}`, values: [[dateStr, admin, 'Label/UPI Updated']] },
      ]);
      const m = _qrRows.find(x => x.row === row);
      if (m) { m.label = label; m.upi = upi; m.lastUpdated = dateStr; m.updatedBy = admin; m.whatUpdate = 'Label/UPI Updated'; }
      _trackHistory('QR Update Hua', `${label}${upi ? ' - ' + upi : ''} - Label/UPI Updated`, false);
      showToast('Update ho gaya!');
      _qrBusy = false;
      _openQrViewer(row);
    } catch (e) {
      _qrBusy = false;
      showToast('Error: ' + e.message, 'error');
      _qrInSubview = false;
      _renderQrList();
    }
  }
}

// ── Shared save (upload file to Drive, then write the sheet row) ───
// `source` ('Generate' or 'Upload') is only used on a brand-new entry — an
// edit never changes how the QR was originally created.
async function _saveQrCommon(row, label, upi, file, source) {
  _setQrBusy(true, row ? 'Update ho raha hai...' : 'Save ho raha hai...');
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(CONFIG.WORKER_URL + '/api/qr/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)));
    const uploaded = await res.json();
    if (!uploaded.id) throw new Error('Upload response invalid');

    const admin = _qrAdminName();
    if (row) {
      const dateStr = todayDate();
      await sheetsBatchPut([
        { range: `QRCodes!B${row}:D${row}`, values: [[label, upi, uploaded.id]] },
        { range: `QRCodes!J${row}:L${row}`, values: [[dateStr, admin, 'Label/UPI/QR Image Updated']] },
      ]);
      const m = _qrRows.find(x => x.row === row);
      if (m) { m.label = label; m.upi = upi; m.driveId = uploaded.id; m.lastUpdated = dateStr; m.updatedBy = admin; m.whatUpdate = 'Label/UPI/QR Image Updated'; }
      _trackHistory('QR Update Hua', `${label}${upi ? ' - ' + upi : ''} - Label/UPI/QR Image Updated`, false);
      showToast('QR update ho gaya!');
      _qrBusy = false;
      _openQrViewer(row);
    } else {
      const sr      = _qrRawCount + 1;
      const newRow  = _qrRawCount + 2; // header is row 1, data starts row 2
      const isFirst = _qrRows.length === 0; // first-ever QR becomes Active automatically
      const dateStr = todayDate();
      await sheetsAppend('QRCodes', [[sr, label, upi, uploaded.id, isFirst ? 'Yes' : '', dateStr, '', source, admin, dateStr, admin, 'Created']]);
      _qrRawCount++;
      _qrRows.push({ row: newRow, sr: String(sr), label, upi, driveId: uploaded.id, active: isFirst, createdDate: dateStr, source, createdBy: admin, lastUpdated: dateStr, updatedBy: admin, whatUpdate: 'Created' });
      _trackHistory('QR Add Hua', `${label}${upi ? ' - ' + upi : ''} (${source})${isFirst ? ' - Active' : ''}`, false);
      showToast('QR save ho gaya!' + (isFirst ? ' Active QR set ho gaya.' : ''));
      _qrBusy = false;
      _qrInSubview = false;
      _renderQrList();
    }
  } catch (e) {
    _qrBusy = false;
    showToast('Error: ' + e.message, 'error');
    _qrInSubview = false;
    _renderQrList();
  }
}

// ── Viewer ───────────────────────────────────────────────────────
function _openQrViewer(row) {
  const m = _qrRows.find(x => x.row === row);
  if (!m) return;
  _qrInSubview  = true;
  _qrListRender = _renderQrList;
  document.getElementById('qrOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_qrEsc(m.label)}</div>
      <button class="close-btn" onclick="closeQrOverlay()">×</button>
    </div>
    ${m.active ? `<div style="margin-bottom:12px"><span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:#dcfce7;color:#15803d">Active</span></div>` : ''}
    <div style="display:flex;justify-content:center;margin-bottom:14px">
      <img src="${_thumbUrlQr(m.driveId, 500)}" style="display:block;max-width:100%;max-height:320px;border-radius:15px;box-shadow:0 4px 14px rgba(5,150,105,.22);box-sizing:border-box" alt="">
    </div>
    ${m.upi ? `<div style="text-align:center;font-size:13px;color:var(--muted);margin-bottom:10px">UPI ID: <b style="color:var(--text)">${_qrEsc(m.upi)}</b></div>` : ''}
    <div style="text-align:center;font-size:11px;color:var(--muted);margin-bottom:16px">
      ${m.createdBy ? `Add kiya: <b>${_qrEsc(m.createdBy)}</b>${m.createdDate ? ' · ' + _qrEsc(m.createdDate) : ''}` : ''}
      ${m.updatedBy && m.whatUpdate && m.whatUpdate !== 'Created' ? `<br>Last update: <b>${_qrEsc(m.whatUpdate)}</b> by ${_qrEsc(m.updatedBy)}${m.lastUpdated ? ' · ' + _qrEsc(m.lastUpdated) : ''}` : ''}
    </div>
    ${!m.active ? `<button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="_setQrActive(${m.row})">Active Karein</button>` : ''}
    <div style="display:flex;gap:10px;margin-bottom:10px">
      <button class="btn btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px" onclick="_qrEditRouter(${m.row})">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        Edit
      </button>
      <button class="btn btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px" onclick="_downloadQr(${m.row})">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
      <button class="btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;background:#25D366;color:#fff" onclick="_sendQrOnly(${m.row})">
        ${_msgWaIconSvg()}
        Send
      </button>
    </div>
    <button class="btn btn-danger" style="width:100%" onclick="_deleteQrPrompt(${m.row})">Delete</button>`;
}

async function _downloadQr(row) {
  if (_qrBusy) return; // guard against double-tap firing two downloads
  const m = _qrRows.find(x => x.row === row);
  if (!m) return;
  _qrBusy = true;
  try {
    const blob = await _fetchQrBlob(m.driveId, _QR_SHARE_FILENAME);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = _QR_SHARE_FILENAME;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
    showToast('Download ho gaya! ✅');
  } catch (e) {
    showToast('Download error: ' + e.message, 'error');
  } finally {
    _qrBusy = false;
  }
}

function _qrEditRouter(row) {
  const m = _qrRows.find(x => x.row === row);
  if (!m) return;
  // Source is set once at creation and never guessed — falls back to the old
  // "has a UPI ID" heuristic only for rows saved before the Source column existed.
  const isUpload = m.source ? m.source === 'Upload' : !m.upi;
  if (isUpload) _openQrEditorUpload(row); else _openQrEditorGenerate(row);
}

// ── Set Active ───────────────────────────────────────────────────
async function _setQrActive(row) {
  if (_qrBusy) return;
  const current = _qrRows.find(x => x.row === row);
  if (!current || current.active) return;
  if (!await _ensureWriteAccess()) return;
  _qrBusy = true;
  try {
    const admin   = _qrAdminName();
    const dateStr = todayDate();
    const prevActive = _qrRows.find(x => x.active);
    const data = [
      { range: `QRCodes!E${row}`, values: [['Yes']] },
      { range: `QRCodes!J${row}:L${row}`, values: [[dateStr, admin, 'Active Hua']] },
    ];
    if (prevActive) {
      data.push({ range: `QRCodes!E${prevActive.row}`, values: [['']] });
      data.push({ range: `QRCodes!J${prevActive.row}:L${prevActive.row}`, values: [[dateStr, admin, 'InActive Hua']] });
    }
    await sheetsBatchPut(data);
    _qrRows.forEach(x => { x.active = x.row === row; });
    current.lastUpdated = dateStr; current.updatedBy = admin; current.whatUpdate = 'Active Hua';
    _trackHistory('QR Active Hua', `${current.label}${current.upi ? ' - ' + current.upi : ''}`, false);
    if (prevActive) {
      prevActive.lastUpdated = dateStr; prevActive.updatedBy = admin; prevActive.whatUpdate = 'InActive Hua';
      _trackHistory('QR InActive Hua', `${prevActive.label}${prevActive.upi ? ' - ' + prevActive.upi : ''}`, false);
    }
    showToast('QR Active ho gaya!');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    _qrBusy = false;
    _openQrViewer(row);
  }
}

// ── Delete ───────────────────────────────────────────────────────
async function _deleteQrCode(m) {
  if (_qrBusy) return false;
  if (!await _ensureWriteAccess()) return false;
  _qrBusy = true;
  try {
    const admin   = _qrAdminName();
    const dateStr = todayDate();
    // Soft delete — row stays in the sheet as a record, only IsDeleted + the audit columns change
    await sheetsBatchPut([
      { range: `QRCodes!G${m.row}`, values: [['Yes']] },
      { range: `QRCodes!J${m.row}:L${m.row}`, values: [[dateStr, admin, 'Deleted']] },
    ]);
    _qrRows = _qrRows.filter(x => x !== m);
    _trackHistory('QR Delete Hua', `${m.label}${m.upi ? ' - ' + m.upi : ''}`, false);
    return true;
  } catch (e) {
    return false;
  } finally {
    _qrBusy = false;
  }
}

function _deleteQrPrompt(row) {
  const m = _qrRows.find(x => x.row === row);
  if (!m) return;
  if (m.active) { showAlert('Active QR', 'Yeh QR abhi Active hai — pehle koi aur QR Active karein, fir isse delete karein.'); return; }
  showConfirm('QR Delete Karein?', `<b>${_qrEsc(m.label)}</b> ko delete karna chahte hain?<br><span style="color:var(--red);font-size:12px">Yeh action wapas nahi ho sakta!</span>`, async () => {
    const ok = await _deleteQrCode(m);
    if (ok) { showToast('QR delete ho gaya'); _qrInSubview = false; _renderQrList(); }
    else showAlert('Delete Error', 'Delete nahi ho paya — dobara try karein.');
  });
}

// ── Sending (image, with or without caption text) ───────────────
async function _fetchQrBlob(driveId, name) {
  const url = `${CONFIG.WORKER_URL}/api/qr/download?id=${driveId}&name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('QR load nahi ho paya');
  return await res.blob();
}

// Every QR shared to a member uses this exact file name, regardless of the
// entry's own Label — keeps what a member sees/saves consistent no matter
// which saved QR (or which admin) sent it.
const _QR_SHARE_FILENAME = 'TanzeemAbdEMustafaQR.png';

// Shares a QR image (optionally with caption text) via the phone's native
// Share sheet so WhatsApp receives the image+caption TOGETHER — a plain
// wa.me link can only pre-fill text, never attach an image. Desktop/browsers
// without file-sharing support fall back to a two-step flow: download the
// QR, then open WhatsApp Web with the text separately (manual attach).
// Every message sent WITH the QR attached gets this line tacked on at the
// end, so the recipient knows what the image is for — added once here
// rather than in each caller since every "send with QR" flow goes through
// this one function.
const _QR_PAYMENT_LINE = 'Diye gaye QR par payment kar sakte hain.';

async function _shareQrImage(driveId, text) {
  try {
    const caption = text ? `${text}\n\n${_QR_PAYMENT_LINE}` : _QR_PAYMENT_LINE;
    const blob = await _fetchQrBlob(driveId, _QR_SHARE_FILENAME);
    const file = new File([blob], _QR_SHARE_FILENAME, { type: blob.type || 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: caption, title: 'Tanzeem Abd-e-Mustafa' });
      return;
    }
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = _QR_SHARE_FILENAME;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
    showToast('QR image download ho gayi — WhatsApp mein manually attach karein');
    setTimeout(() => window.open('https://wa.me/?text=' + encodeURIComponent(caption), '_blank'), 500);
  } catch (e) {
    if (e.name === 'AbortError') return; // user cancelled the native share sheet
    showToast('QR bhejne mein error: ' + e.message, 'error');
  }
}

function _sendQrOnly(row) {
  const m = _qrRows.find(x => x.row === row);
  if (!m) return;
  _shareQrImage(m.driveId, '');
}

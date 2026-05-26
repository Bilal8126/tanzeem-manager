// ── Gallery Feature ───────────────────────────────────────────
// All Drive operations go through the Cloudflare Worker using admin credentials.
// Photos are always stored in the admin's Google Drive "Tanzeem Gallery" folder.
// Users don't need drive.file scope — Worker handles Drive authentication.

const OCCASIONS = ['General', 'Eid-ul-Fitr', 'Eid-ul-Adha', 'Moharram', 'Ramazan', 'Meeting', 'Celebrations', 'Others'];
let _gPhotos   = [];
let _gFilter   = 'All';
let _gSort     = 'latest'; // latest | date | occasion | description
let _gSelected = new Set();
let _gMulti    = false;
let _gLoaded   = false;

// Public Drive thumbnail URL (works for files made public on upload)
function _thumbUrl(id, size = 400) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
}

// Worker uses admin credentials — only need to know user is signed in, not have their token
function _gallerySgnedIn() {
  return !!STATE.accessToken || !!localStorage.getItem('tanzeem_signed_in');
}

// ── Sort ──────────────────────────────────────────────────────

function _sortPhotos(photos) {
  const arr = [...photos];
  switch (_gSort) {
    case 'latest':
      return arr.sort((a, b) => new Date(b.createdTime || 0) - new Date(a.createdTime || 0));
    case 'date':
      return arr.sort((a, b) => new Date(a.createdTime || 0) - new Date(b.createdTime || 0));
    case 'occasion':
      return arr.sort((a, b) => (a.occasion || '').localeCompare(b.occasion || ''));
    case 'description':
      return arr.sort((a, b) => (a.note || '').localeCompare(b.note || ''));
    default:
      return arr;
  }
}

function setGallerySort(val) {
  _gSort = val;
  renderGallery();
}

// ── Worker API helpers ────────────────────────────────────────

async function _wGet(path) {
  const res = await fetch(CONFIG.WORKER_URL + path);
  if (!res.ok) throw new Error(await res.text().catch(() => res.status));
  return res.json();
}

async function _wDelete(path) {
  const res = await fetch(CONFIG.WORKER_URL + path, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(res.status);
}

async function _wUpload(formData) {
  const res = await fetch(CONFIG.WORKER_URL + '/api/gallery/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.status));
  return res.json();
}

// ── Load photos (cached — only hits API once per session) ─────

async function loadGalleryPhotos() {
  if (_gLoaded) { renderGallery(); return; }

  const el = document.getElementById('galleryContent');
  if (el) el.innerHTML = '<div class="loading">Loading...</div>';

  if (!_gallerySgnedIn()) { renderGallery(); return; }

  try {
    const res = await _wGet('/api/gallery/list');
    _gPhotos = (res.files || []).map(f => {
      let meta = { occasion: 'General', note: '' };
      try { if (f.description) meta = { ...meta, ...JSON.parse(f.description) }; } catch (e) { /* keep defaults */ }
      return { ...f, occasion: meta.occasion, note: meta.note };
    });
    _gLoaded = true;
  } catch (e) {
    showToast('Gallery error: ' + e.message, 'error');
  }
  renderGallery();
}

async function refreshGallery() {
  _gLoaded = false;
  showToast('Refresh ho raha hai...');
  await loadGalleryPhotos();
}

// ── Render ────────────────────────────────────────────────────

function renderGallery() {
  const el = document.getElementById('galleryContent');
  if (!el) return;

  const all = ['All', ...OCCASIONS];
  const filterBar = `
    <div class="month-pills" style="margin-bottom:14px">
      ${all.map(o => `
        <button class="month-pill${_gFilter === o ? ' active' : ''}" onclick="setGalleryFilter('${o}')">
          ${o}
        </button>`).join('')}
    </div>`;

  if (!_gallerySgnedIn()) {
    el.innerHTML = filterBar + `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>Photos dekhne ke liye Sign in karein</p>
      </div>`;
    return;
  }

  const filtered = _gFilter === 'All' ? _gPhotos : _gPhotos.filter(p => p.occasion === _gFilter);
  const photos   = _sortPhotos(filtered);

  if (_gPhotos.length === 0 && _gLoaded) {
    el.innerHTML = filterBar + `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>Abhi koi Photo nahi — pehli photo upload karein!</p>
      </div>`;
    return;
  }

  if (photos.length === 0 && _gLoaded) {
    el.innerHTML = filterBar + `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>${_gFilter} mein koi photo nahi</p>
      </div>`;
    return;
  }

  const multiBar = _gMulti ? `
    <div class="gallery-multi-bar">
      <span>${_gSelected.size} photo${_gSelected.size !== 1 ? 'ein' : ''} select ki hain</span>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-secondary" onclick="cancelGalleryMultiSelect()">Cancel</button>
        ${_gSelected.size > 0 ? `
          <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b;font-weight:700;border-radius:10px;padding:7px 14px;font-size:12px;border:none;cursor:pointer" onclick="deleteSelectedPhotos()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline;vertical-align:middle;margin-right:4px"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Delete
          </button>` : ''}
      </div>
    </div>` : '';

  const header = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px">
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <span style="font-size:12px;color:var(--muted);font-weight:600">${_gPhotos.length} photo${_gPhotos.length !== 1 ? 'ein' : ''}</span>
        <button onclick="refreshGallery()" title="Refresh / Resync"
          style="background:none;border:none;cursor:pointer;padding:4px;color:var(--muted);display:flex;align-items:center" >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <select onchange="setGallerySort(this.value)"
          style="font-size:11px;font-weight:600;color:var(--green-dark);background:rgba(22,163,74,.08);border:none;border-radius:20px;padding:5px 10px;cursor:pointer;outline:none">
          <option value="latest"${_gSort==='latest'?' selected':''}>Latest First</option>
          <option value="date"${_gSort==='date'?' selected':''}>Oldest First</option>
          <option value="occasion"${_gSort==='occasion'?' selected':''}>By Occasion</option>
          <option value="description"${_gSort==='description'?' selected':''}>By Description</option>
        </select>
        ${_gPhotos.length > 0 ? `
          <button onclick="enterGalleryMultiSelect()"
            style="background:rgba(22,163,74,.1);color:var(--green-dark);border:none;border-radius:20px;padding:5px 13px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Select
          </button>` : ''}
      </div>
    </div>`;

  const grid = `
    <div class="gallery-grid">
      ${photos.map(p => {
        const thumb = _thumbUrl(p.id, 400);
        const badge = `<div class="gallery-footer">${p.occasion || 'General'}</div>`;
        const check = _gMulti ? `
          <div class="gallery-check${_gSelected.has(p.id) ? ' checked' : ''}">
            ${_gSelected.has(p.id) ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>` : '';
        return `
          <div class="gallery-item${_gMulti && _gSelected.has(p.id) ? ' selected' : ''}"
               onclick="${_gMulti ? `togglePhotoSelect('${p.id}')` : `openPhotoDetail('${p.id}')`}">
            <img src="${thumb}" alt="" loading="lazy"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="gallery-placeholder" style="display:none">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            ${badge}${check}
          </div>`;
      }).join('')}
    </div>`;

  el.innerHTML = filterBar + header + multiBar + grid;
}

function setGalleryFilter(f) {
  _gFilter = f;
  renderGallery();
}

function enterGalleryMultiSelect() {
  _gMulti = true;
  renderGallery();
}

function togglePhotoSelect(id) {
  if (_gSelected.has(id)) _gSelected.delete(id);
  else _gSelected.add(id);
  renderGallery();
}

function cancelGalleryMultiSelect() {
  _gMulti = false;
  _gSelected.clear();
  renderGallery();
}

// ── Upload ────────────────────────────────────────────────────

function openGalleryUpload() {
  if (!_gallerySgnedIn()) { showToast('Upload ke liye pehle Sign in karein', 'error'); return; }
  document.getElementById('galleryUploadOverlay').classList.add('open');
}

function closeGalleryUpload() {
  document.getElementById('galleryUploadOverlay').classList.remove('open');
  document.getElementById('galleryFileInput').value = '';
  document.getElementById('galleryCameraInput').value = '';
}

let _pendingUploadFile = null;

function _galleryFileChanged(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Sirf images upload kar sakte hain', 'error'); return; }
  if (file.size > 30 * 1024 * 1024) { showToast('Photo 30MB se choti honi chahiye', 'error'); return; }
  _pendingUploadFile = file;
  closeGalleryUpload();

  document.getElementById('galleryOccasionContent').innerHTML = _occasionPickerHTML(file);
  document.getElementById('galleryOccasionOverlay').classList.add('open');

  const reader = new FileReader();
  reader.onload = e => { const img = document.getElementById('previewImg'); if (img) img.src = e.target.result; };
  reader.readAsDataURL(file);
}

function _occasionPickerHTML(file) {
  const opts = OCCASIONS.map(o => `<option value="${o}">${o}</option>`).join('');
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  return `
    <div class="modal-header">
      <div class="modal-title">Photo Details</div>
      <button class="close-btn" onclick="closeOccasionPicker()">×</button>
    </div>
    <div class="gallery-preview-wrap">
      <img id="previewImg" style="max-height:160px;border-radius:12px;object-fit:cover;width:100%" alt="">
    </div>
    <p style="font-size:11px;color:var(--muted);margin-bottom:14px;text-align:center">${file.name} &middot; ${sizeMB} MB</p>
    <div class="form-group">
      <label>Occasion</label>
      <select id="pickerOccasion">${opts}</select>
    </div>
    <div class="form-group">
      <label>Note (optional)</label>
      <input type="text" id="pickerNote" placeholder="e.g. Eid Milan 2025" maxlength="100">
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="confirmUpload()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Upload Karein
    </button>`;
}

function closeOccasionPicker() {
  document.getElementById('galleryOccasionOverlay').classList.remove('open');
  _pendingUploadFile = null;
}

async function confirmUpload() {
  const file     = _pendingUploadFile;
  const occasion = document.getElementById('pickerOccasion')?.value || 'General';
  const note     = (document.getElementById('pickerNote')?.value || '').trim();
  closeOccasionPicker();
  if (!file) return;
  await _doUpload(file, occasion, note);
}

function _compressImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => {
      img.onload = () => {
        const maxDim = 1920;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width  = Math.round(width  * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function _doUpload(file, occasion, note) {
  showToast('Upload ho raha hai...');
  try {
    const compressed = await _compressImage(file);
    const form = new FormData();
    form.append('file', compressed);
    form.append('metadata', JSON.stringify({ occasion, note, date: todayDate() }));

    const uploaded = await _wUpload(form);
    let m = { occasion: 'General', note: '' };
    try { if (uploaded.description) m = { ...m, ...JSON.parse(uploaded.description) }; } catch (e) { /* keep defaults */ }

    _gPhotos.unshift({ ...uploaded, occasion: m.occasion, note: m.note });
    _gLoaded = true;
    showToast('Photo upload ho gayi!');
    renderGallery();
  } catch (e) {
    showToast('Upload error: ' + e.message, 'error');
  }
}

// ── Lightbox ──────────────────────────────────────────────────

function openPhotoDetail(id) {
  const photo = _gPhotos.find(p => p.id === id);
  if (!photo) return;

  const imgSrc = _thumbUrl(id, 1600);
  const date   = photo.createdTime
    ? new Date(photo.createdTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  document.getElementById('galleryLightboxContent').innerHTML = `
    <div class="lightbox-header">
      <button class="lightbox-close" onclick="closeLightbox()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="lightbox-meta">
        <span class="lightbox-occasion">${photo.occasion || 'General'}</span>
        ${photo.note ? `<span class="lightbox-note">${photo.note}</span>` : ''}
        ${date ? `<span class="lightbox-date">${date}</span>` : ''}
      </div>
    </div>
    <div class="lightbox-img-wrap">
      <div class="lightbox-spinner" id="lbSpinner">
        <div style="color:rgba(255,255,255,.5);font-size:13px">Loading...</div>
      </div>
      <img src="${imgSrc}" alt=""
           style="display:none"
           onload="this.style.display='block';document.getElementById('lbSpinner').style.display='none'"
           onerror="this.src='${_thumbUrl(id, 800)}'">
    </div>
    <div class="lightbox-actions">
      <button class="lightbox-btn" onclick="downloadPhoto('${photo.id}','${photo.name}')">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
      <button class="lightbox-btn" onclick="sharePhoto('${photo.id}','${photo.name}')">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share
      </button>
      <button class="lightbox-btn lightbox-btn-danger" onclick="deletePhoto('${photo.id}')">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        Delete
      </button>
    </div>`;

  document.getElementById('galleryLightboxOverlay').classList.add('open');
}

function closeLightbox() {
  document.getElementById('galleryLightboxOverlay')?.classList.remove('open');
}

// ── Download ──────────────────────────────────────────────────

async function downloadPhoto(id, name) {
  try {
    showToast('Download ho raha hai...');
    const url = `${CONFIG.WORKER_URL}/api/gallery/download?id=${id}&name=${encodeURIComponent(name || 'photo.jpg')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Download failed ' + res.status);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = name || 'tanzeem-photo.jpg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
    showToast('Download ho gayi!');
  } catch (e) {
    showToast('Download error: ' + e.message, 'error');
  }
}

// ── Share ─────────────────────────────────────────────────────

async function sharePhoto(id, name) {
  try {
    showToast('Prepare ho rahi hai...');
    const url = `${CONFIG.WORKER_URL}/api/gallery/download?id=${id}&name=${encodeURIComponent(name || 'photo.jpg')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    const blob = await res.blob();
    const file = new File([blob], name || 'tanzeem-photo.jpg', { type: blob.type });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name || 'Tanzeem Photo' });
    } else {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = file.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
      showToast('Photo save ho gayi device mein');
    }
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Share error: ' + e.message, 'error');
  }
}

// ── Delete ────────────────────────────────────────────────────

function deletePhoto(id) {
  closeLightbox();
  showConfirm(
    'Photo Delete',
    'Yeh photo permanently delete ho jayegi. Kya aap sure hain?',
    async () => {
      try {
        await _wDelete('/api/gallery/delete?id=' + id);
        _gPhotos = _gPhotos.filter(p => p.id !== id);
        _gSelected.delete(id);
        showToast('Photo delete ho gayi');
        renderGallery();
      } catch (e) {
        showToast('Delete error: ' + e.message, 'error');
      }
    }
  );
}

function deleteSelectedPhotos() {
  const ids = [..._gSelected];
  if (!ids.length) return;
  showConfirm(
    'Photos Delete',
    `${ids.length} photo${ids.length !== 1 ? 'ein' : ''} permanently delete ho jayengi. Sure hain?`,
    async () => {
      try {
        await Promise.all(ids.map(id => _wDelete('/api/gallery/delete?id=' + id)));
        _gPhotos = _gPhotos.filter(p => !ids.includes(p.id));
        _gSelected.clear();
        _gMulti = false;
        showToast(`${ids.length} photos delete ho gayi`);
        renderGallery();
      } catch (e) {
        showToast('Delete error: ' + e.message, 'error');
      }
    }
  );
}

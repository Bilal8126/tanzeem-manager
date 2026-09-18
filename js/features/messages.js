// ── Tanzeem Messages ──────────────────────────────────────────────
// A saved library of reusable WhatsApp announcement templates (naya member
// dawat, session shuru/khatam, event, etc.) — created once, edited anytime,
// and sent via WhatsApp with one tap. Global (not per-session) so it's
// available no matter which session is currently selected.
// Sheet "MessageTemplates" columns: A=SrNo | B=ID | C=Title | D=Type | E=Body | F=IsDeleted
// Body may contain {{session}} (swapped for the ACTIVE session's label) and/or
// {{member}} (swapped for whichever member is chosen at send time — only
// asked for when the template's Type is "Members") at view/send time, so a
// template keeps working every year / for whoever it's being sent about.
// Deletes are SOFT (IsDeleted=Yes) — the row is never physically removed, so
// row numbers never shift and deleted templates stay in the sheet as a record.

const _MSG_TYPES = ['Members', 'Session Shuru', 'Session Khatam', 'Event', 'Custom'];
const _MSG_TYPE_COLORS = {
  'Members':           { bg: '#dbeafe', color: '#1d4ed8' },
  'Session Shuru':     { bg: '#dcfce7', color: '#15803d' },
  'Session Khatam':    { bg: '#fee2e2', color: '#991b1b' },
  'Event':             { bg: '#fef9c3', color: '#854d0e' },
  'Custom':            { bg: '#f1f5f9', color: '#475569' },
};

let _msgRows       = [];
let _msgRawCount   = 0;      // total physical data rows in the sheet (deleted + visible) — used
                              // to compute the next SrNo/row for a new append, since soft-deleted
                              // rows stay in place and can't be counted via _msgRows.length
let _msgLoaded     = false;
let _msgBusy       = false;  // true while a save/delete network op is in flight
let _msgListRender = null;   // re-renders whichever view (list, or viewer if opened
                              // from there) should be shown when stepping back one level
let _msgInSubview  = false;  // true while viewer/editor is the current overlay content —
                              // lets closeMessagesOverlay() (× / backdrop / Android back)
                              // step back one level instead of exiting the whole overlay

function _msgEsc(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _msgLoadingHtml(sub) {
  return `
    <div class="modal-header"><div class="modal-title">Please Wait</div></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;padding:34px 0">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .8s linear infinite"><path d="M21 12a9 9 0 1 1-9-9"/></svg>
      <div style="font-size:13px;color:var(--muted)">${sub || 'Processing...'}</div>
    </div>`;
}

function _setMsgBusy(on, label) {
  _msgBusy = on;
  if (on) document.getElementById('messagesOverlayContent').innerHTML = _msgLoadingHtml(label);
}

function _openMsgOverlay() {
  const overlay = document.getElementById('messagesOverlay');
  if (!overlay.classList.contains('open')) {
    _histPush({ modal: 'messagesOverlay' });
    overlay.classList.add('open');
  }
}

function closeMessagesOverlay() {
  if (_msgBusy) return;
  if (_msgInSubview && typeof _msgListRender === 'function') {
    _msgInSubview = false;
    _msgListRender();
    return;
  }
  _msgListRender = null;
  _histBack();
  document.getElementById('messagesOverlay')?.classList.remove('open');
}

async function openMessagesLibrary() {
  _openMsgOverlay();
  document.getElementById('messagesOverlayContent').innerHTML = '<div class="loading">Loading...</div>';
  await _loadMsgTemplates();
  _renderMsgList();
}

function _msgIsDeleted(v) {
  return /^(yes|true|1|y)$/i.test((v || '').toString().trim());
}

async function _loadMsgTemplates(force = false) {
  if (_msgLoaded && !force) return;
  if (!STATE.accessToken) { _msgRows = []; _msgRawCount = 0; return; }
  try {
    const rows = await sheetsGet('MessageTemplates!A2:F2000');
    _msgRawCount = rows.length;
    _msgRows = rows
      .map((r, i) => ({ row: i + 2, sr: r?.[0] || '', id: r?.[1] || '', title: r?.[2] || '', type: r?.[3] || 'Custom', body: r?.[4] || '', deleted: _msgIsDeleted(r?.[5]) }))
      .filter(m => m.title && !m.deleted);
    _msgLoaded = true;
  } catch (e) {
    _msgRows = []; _msgRawCount = 0; // MessageTemplates sheet missing or no access — feature just shows empty
  }
}

// Replaces {{session}} with the currently ACTIVE session's label (not
// necessarily the one the user has selected in the dropdown), so a template
// written once keeps naming the right session automatically every year.
// {{member}} is only replaced when a memberName is passed in (at send time,
// once the user has picked one) — left untouched otherwise, e.g. in previews.
function _msgRenderBody(body, memberName) {
  const activeLabel = CONFIG.SESSIONS.find(s => s.active)?.label || STATE.currentSession?.label || '';
  let out = (body || '').replace(/\{\{\s*session\s*\}\}/gi, activeLabel);
  if (memberName !== undefined) out = out.replace(/\{\{\s*member\s*\}\}/gi, memberName || '');
  return out;
}

function _msgTypeBadge(type) {
  const c = _MSG_TYPE_COLORS[type] || _MSG_TYPE_COLORS['Custom'];
  return `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;background:${c.bg};color:${c.color}">${_msgEsc(type)}</span>`;
}

function _msgWaIconSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.48 1.32 5l-1.4 5.09 5.24-1.37a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.4 5.82c0 4.54-3.7 8.23-8.24 8.23a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23m-4.52 4.15c-.15 0-.4.06-.61.3-.21.24-.8.78-.8 1.9 0 1.12.82 2.2.93 2.35.11.15 1.6 2.55 3.95 3.48 1.95.77 2.35.62 2.77.58.42-.04 1.36-.55 1.55-1.09.19-.53.19-.98.13-1.08-.06-.09-.21-.15-.44-.27-.23-.11-1.36-.67-1.57-.75-.21-.08-.36-.11-.52.11-.15.23-.6.75-.73.9-.13.15-.27.17-.5.06-.23-.11-.96-.35-1.83-1.13-.68-.6-1.13-1.35-1.27-1.58-.13-.23-.01-.35.1-.47.11-.11.23-.27.35-.4.11-.14.15-.23.23-.38.08-.15.04-.29-.02-.4-.06-.11-.52-1.26-.72-1.72-.19-.46-.38-.4-.52-.4z"/></svg>`;
}

// ── List view ────────────────────────────────────────────────────
function _renderMsgList() {
  _msgInSubview  = false;
  _msgListRender = _renderMsgList;
  const rows = _msgRows;
  document.getElementById('messagesOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Tanzeem Messages</div>
      <button class="close-btn" onclick="closeMessagesOverlay()">×</button>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-bottom:14px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="_openMsgEditor(null)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Naya Message
    </button>
    ${!rows.length
      ? `<div style="text-align:center;color:var(--muted);padding:30px 0;font-size:13px">Koi message save nahi hai. Upar "Naya Message" se shuru karein.</div>`
      : rows.map((m, i) => `
        <div style="padding:13px 0;${i < rows.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}display:flex;align-items:center;gap:10px;cursor:pointer" onclick="_openMsgViewer(${m.row})">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_msgEsc(m.title)}</div>
            ${_msgTypeBadge(m.type)}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`).join('')
    }`;
}

// ── Viewer (full message, read-only) ───────────────────────────────
function _openMsgViewer(row) {
  const m = _msgRows.find(x => x.row === row);
  if (!m) return;
  _msgInSubview  = true;
  _msgListRender = _renderMsgList;
  const rendered = _msgRenderBody(m.body);
  document.getElementById('messagesOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_msgEsc(m.title)}</div>
      <button class="close-btn" onclick="closeMessagesOverlay()">×</button>
    </div>
    <div style="margin-bottom:12px">${_msgTypeBadge(m.type)}</div>
    <div style="white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:1.7;color:var(--text);background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:14px;max-height:50vh;overflow-y:auto;margin-bottom:16px">${_msgEsc(rendered)}</div>
    <div style="display:flex;gap:10px;margin-bottom:10px">
      <button class="btn btn-secondary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px" onclick="_openMsgEditor(${m.row})">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        Edit
      </button>
      <button class="btn" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;background:#25D366;color:#fff" onclick="_confirmSendMsg(${m.row})">
        ${_msgWaIconSvg()}
        Bhejein
      </button>
    </div>
    <button class="btn btn-danger" style="width:100%;display:flex;align-items:center;justify-content:center;gap:7px" onclick="_deleteMsgTemplatePrompt(${m.row})">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
      Delete
    </button>`;
}

// Confirm step shown before EVERY message send. For a "Members" type
// template it also shows a member picker (pre-selected to the first member,
// so there's always a valid choice) whose name fills {{member}} in the body.
// It also lets the user tick "attach QR" (defaults to ticked if an Active QR
// exists). Text-only goes through the plain wa.me link; text+QR goes through
// the native Share sheet (see _shareQrImage in qrcode.js) since a wa.me link
// can't pre-fill an image.
function _confirmSendMsg(row) {
  const m = _msgRows.find(x => x.row === row);
  if (!m) return;
  const active = typeof _qrActiveEntry === 'function' ? _qrActiveEntry() : null;
  const needsMember  = m.type === 'Members';
  const sortedMembers = needsMember ? [...STATE.allMembers].sort((a, b) => a.name.localeCompare(b.name)) : [];
  showConfirm('Message Bhejein?', `
    ${needsMember ? (sortedMembers.length ? `
      <div class="form-group" style="margin-bottom:16px">
        <label>Member Chunein</label>
        <select id="waMember">
          ${sortedMembers.map(mm => `<option value="${_msgEsc(mm.name)}">${_msgEsc(mm.name)}</option>`).join('')}
        </select>
      </div>` : `
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Koi member nahi mila.</div>`
    ) : ''}
    <div style="margin-bottom:14px;font-size:14px;color:var(--text-2)">Yeh message WhatsApp par bhejenge.</div>
    <label style="display:flex;align-items:center;gap:9px;font-size:14px;font-weight:600;color:var(--text);cursor:${active ? 'pointer' : 'not-allowed'};${active ? '' : 'opacity:.5'}">
      <input type="checkbox" id="waWithQr" ${active ? 'checked' : 'disabled'} style="width:18px;height:18px;flex-shrink:0">
      QR Code bhi saath attach karein
    </label>
    ${!active ? `<div style="font-size:11px;color:var(--muted);margin-top:6px">Koi Active QR set nahi hai — Settings mein QR add karein.</div>` : ''}
  `, async () => {
    const memberName = needsMember ? (document.getElementById('waMember')?.value || '') : undefined;
    const withQr = !!active && !!document.getElementById('waWithQr')?.checked;
    const text   = _msgRenderBody(m.body, memberName);
    if (withQr) {
      await _shareQrImage(active.driveId, text, `${(m.title || 'QR').replace(/[^a-z0-9]+/gi, '-')}.png`);
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    }
  });
}

// ── Editor (create / edit) ─────────────────────────────────────────
function _openMsgEditor(row) {
  const m = row ? _msgRows.find(x => x.row === row) : null;
  _msgInSubview  = true;
  _msgListRender = row ? (() => _openMsgViewer(row)) : _renderMsgList;
  document.getElementById('messagesOverlayContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${m ? 'Message Edit Karein' : 'Naya Message'}</div>
      <button class="close-btn" onclick="closeMessagesOverlay()">×</button>
    </div>
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="msg_title" placeholder="jaise: Naya Member Dawat" value="${_msgEsc(m?.title || '')}">
    </div>
    <div class="form-group">
      <label>Type</label>
      <select id="msg_type">
        ${_MSG_TYPES.map(t => `<option value="${t}" ${m && m.type === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <label style="margin:0">Message</label>
        <div style="display:flex;gap:6px">
          <button type="button" onclick="_msgInsertPlaceholder('session')" style="background:none;border:1px solid var(--border);border-radius:8px;padding:3px 9px;font-size:11px;color:var(--green-dark);cursor:pointer">+ Session Tag</button>
          <button type="button" onclick="_msgInsertPlaceholder('member')" style="background:none;border:1px solid var(--border);border-radius:8px;padding:3px 9px;font-size:11px;color:var(--green-dark);cursor:pointer">+ Member Tag</button>
        </div>
      </div>
      <textarea id="msg_body" rows="10" placeholder="Poora message yahan likhein...">${_msgEsc(m?.body || '')}</textarea>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">{{session}} apne aap ACTIVE session ke naam se badal jayega. {{member}} bhejte waqt aapke chune hue member ke naam se badlega (Type "Members" par).</div>
    </div>
    <button class="btn btn-primary" style="width:100%" onclick="_saveMsgEditor(${row || 'null'})">Save</button>`;
}

function _msgInsertPlaceholder(tag) {
  const ta = document.getElementById('msg_body');
  if (!ta) return;
  const token = `{{${tag}}}`;
  const start = ta.selectionStart ?? ta.value.length;
  const end   = ta.selectionEnd   ?? ta.value.length;
  ta.value = ta.value.slice(0, start) + token + ta.value.slice(end);
  ta.focus();
  const pos = start + token.length;
  ta.setSelectionRange(pos, pos);
}

async function _saveMsgEditor(row) {
  const title = document.getElementById('msg_title').value.trim();
  const type  = document.getElementById('msg_type').value;
  const body  = document.getElementById('msg_body').value.trim();
  if (!title || !body) { showToast('Title aur Message dono zaroori hain', 'error'); return; }
  if (!await _ensureWriteAccess()) return;
  _setMsgBusy(true, row ? 'Update ho raha hai...' : 'Save ho raha hai...');
  try {
    if (row) {
      const m = _msgRows.find(x => x.row === row);
      await sheetsPut(`MessageTemplates!C${row}:E${row}`, [[title, type, body]]);
      if (m) { m.title = title; m.type = type; m.body = body; }
      _trackHistory('Message Template Updated', title, false);
      _msgBusy = false;
      showToast('Message update ho gaya!');
      _openMsgViewer(row);
    } else {
      const sr     = _msgRawCount + 1;
      const id     = String(Date.now());
      const newRow = _msgRawCount + 2; // header is row 1, data starts row 2
      await sheetsAppend('MessageTemplates', [[sr, id, title, type, body, '']]);
      _msgRawCount++;
      _msgRows.push({ row: newRow, sr: String(sr), id, title, type, body });
      _trackHistory('Message Template Added', title, false);
      _msgBusy = false;
      showToast('Message save ho gaya!');
      _msgInSubview = false;
      _renderMsgList();
    }
  } catch (e) {
    _msgBusy = false;
    showToast('Error: ' + e.message, 'error');
    _openMsgEditor(row);
  }
}

// ── Delete ───────────────────────────────────────────────────────
async function _deleteMessageTemplate(m) {
  if (_msgBusy) return false; // guard against double-tap firing two deletes
  if (!await _ensureWriteAccess()) return false;
  _msgBusy = true;
  try {
    await sheetsPut(`MessageTemplates!F${m.row}`, [['Yes']]); // soft delete — row stays in the sheet as a record
    _msgRows = _msgRows.filter(x => x !== m);
    _trackHistory('Message Template Deleted', m.title, false);
    return true;
  } catch (e) {
    return false;
  } finally {
    _msgBusy = false;
  }
}

function _deleteMsgTemplatePrompt(row) {
  const m = _msgRows.find(x => x.row === row);
  if (!m) return;
  showConfirm('Message Delete Karein?', `<b>${_msgEsc(m.title)}</b> ko delete karna chahte hain?<br><span style="color:var(--red);font-size:12px">Yeh action wapas nahi ho sakta!</span>`, async () => {
    const ok = await _deleteMessageTemplate(m);
    if (ok) {
      showToast('Message delete ho gaya');
      _msgInSubview = false;
      _renderMsgList();
    } else {
      showAlert('Delete Error', 'Delete nahi ho paya — dobara try karein.');
    }
  });
}

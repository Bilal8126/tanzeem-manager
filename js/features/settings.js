// ── Settings Screen ───────────────────────────────────────────

function renderSettings() {
  const el = document.getElementById('settingsContent');
  if (!el) return;

  const sessions    = CONFIG.SESSIONS || [];
  const activeLabel = sessions.find(s => s.active)?.label || 'None';

  el.innerHTML = `
    <!-- Sessions Section -->
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="var(--green-dark)" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06
                   a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09
                   A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83
                   l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
                   A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83
                   l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09
                   a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83
                   l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
                   a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <div style="font-size:11px;font-weight:700;color:var(--muted);
                    text-transform:uppercase;letter-spacing:.6px">Session Management</div>
      </div>

      ${sessions.length === 0
        ? `<div style="text-align:center;color:var(--muted);padding:20px 0;font-size:14px">
             No sessions found. Create one below.
           </div>`
        : sessions.map((s, i) => {
            const isActive = !!s.active;
            return `
              <div style="padding:13px 0;${i < sessions.length - 1
                ? 'border-bottom:1px solid var(--border);'
                : ''}display:flex;align-items:center;gap:10px">

                <!-- Session icon -->
                <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;
                            background:${isActive ? '#dcfce7' : '#f1f5f9'};
                            display:flex;align-items:center;justify-content:center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                       stroke="${isActive ? 'var(--green-dark)' : '#94a3b8'}" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                    <line x1="3"  y1="10" x2="21" y2="10"/>
                  </svg>
                </div>

                <div style="flex:1;min-width:0">
                  <div style="font-size:15px;font-weight:700;color:var(--text);
                              margin-bottom:2px;display:flex;align-items:center;gap:6px">
                    ${s.label}
                    ${isActive
                      ? `<span style="font-size:10px;font-weight:700;color:#16a34a;
                                     background:#dcfce7;padding:2px 8px;border-radius:20px;
                                     line-height:1.5">Active</span>`
                      : ''}
                  </div>
                  <div style="font-size:11px;color:var(--muted)">${s.sheet}</div>
                </div>

                ${isActive
                  ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"
                          stroke-linejoin="round">
                       <polyline points="20 6 9 17 4 12"/>
                     </svg>`
                  : `<button class="btn btn-secondary btn-sm"
                       style="white-space:nowrap;font-size:12px;padding:6px 12px;
                              display:flex;align-items:center;gap:5px"
                       onclick="_promptSetActive(${i})">
                       <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round">
                         <circle cx="12" cy="12" r="10"/>
                         <polyline points="12 8 12 12 14 14"/>
                       </svg>
                       Set Active
                     </button>`
                }
              </div>
            `;
          }).join('')
      }

      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
        <button class="btn btn-primary"
          style="width:100%;font-size:14px;padding:13px;
                 display:flex;align-items:center;justify-content:center;gap:8px"
          onclick="showCreateSessionModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create New Session
        </button>
      </div>
    </div>

    ${renderReportsSection()}

    <!-- Tools: Proofs / Messages / QR -->
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px">Tanzeem Tools</div>
      </div>
      <div class="tools-grid">
        <div class="tool-tile" onclick="openAllProofsBrowse()">
          <div class="tool-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
          <div class="tool-title">All Proofs</div>
          <div class="tool-sub" id="toolProofsSub">&nbsp;</div>
        </div>
        <div class="tool-tile" onclick="openMessagesLibrary()">
          <div class="tool-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
          <div class="tool-title">Messages</div>
          <div class="tool-sub" id="toolMsgSub">&nbsp;</div>
        </div>
        <div class="tool-tile" onclick="openQrLibrary()">
          <div class="tool-icon green" style="position:relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="14" y1="14" x2="14" y2="21"/><line x1="21" y1="14" x2="21" y2="21"/><line x1="17.5" y1="14" x2="17.5" y2="17.5"/><line x1="14" y1="17.5" x2="21" y2="17.5"/></svg>
            <img id="toolQrThumb" class="tool-thumb" style="display:none" alt="">
          </div>
          <div class="tool-title">QR Code</div>
          <div class="tool-sub" id="toolQrSub">&nbsp;</div>
        </div>
      </div>
    </div>

    <!-- Activity History -->
    <div class="card" id="historyCard" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:8px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.6px">Activity History</div>
        </div>
        <button onclick="loadTrackHistory()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:12px;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:5px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>
      <div id="historyContent"><div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">Loading...</div></div>
    </div>

    <!-- App Info -->
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="var(--green-dark)" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div style="font-size:11px;font-weight:700;color:var(--muted);
                    text-transform:uppercase;letter-spacing:.6px">App Info</div>
      </div>
      <div style="font-size:13px;color:var(--text-2);line-height:2.2">
        <div style="display:flex;justify-content:space-between;
                    border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px">
          <span style="color:var(--muted)">App Name</span>
          <span style="font-weight:600">Tanzeem Abd-e-Mustafa (Bisauli)</span>
        </div>
        <div style="display:flex;justify-content:space-between;
                    border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px">
          <span style="color:var(--muted)">Total Sessions</span>
          <span style="font-weight:600">${sessions.length}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--muted)">Active Session</span>
          <span style="font-weight:700;color:var(--green)">${activeLabel}</span>
        </div>
      </div>
    </div>
  `;
  loadTrackHistory();
  _renderToolsSummary();
}

// ── Tools grid dynamic subtitles (Proofs count / Messages count / Active QR) ──
async function _renderToolsSummary() {
  if (!STATE.accessToken) return;
  await Promise.all([
    (async () => {
      if (typeof _loadProofs !== 'function') return;
      await _loadProofs();
      const el = document.getElementById('toolProofsSub');
      if (el) el.textContent = _proofRows.length ? `${_proofRows.length} Photos` : 'Khaali';
    })(),
    (async () => {
      if (typeof _loadMsgTemplates !== 'function') return;
      await _loadMsgTemplates();
      const el = document.getElementById('toolMsgSub');
      if (el) el.textContent = _msgRows.length ? `${_msgRows.length} Saved` : 'Khaali';
    })(),
    (async () => {
      if (typeof _loadQrCodes !== 'function') return;
      await _loadQrCodes();
      const active = typeof _qrActiveEntry === 'function' ? _qrActiveEntry() : null;
      const sub   = document.getElementById('toolQrSub');
      const thumb = document.getElementById('toolQrThumb');
      if (sub) sub.textContent = active ? 'Active' : 'Set Karein';
      if (thumb) {
        if (active) { thumb.src = _thumbUrlQr(active.driveId, 80); thumb.style.display = 'block'; }
        else thumb.style.display = 'none';
      }
    })(),
  ]);
}

// ── Activity History ───────────────────────────────────────────

const _HISTORY_COLORS = {
  'Member Added':     { bg:'#dcfce7', color:'#15803d' },
  'Member Updated':   { bg:'#fef9c3', color:'#854d0e' },
  'Member Deleted':   { bg:'#fee2e2', color:'#991b1b' },
  'Mark Payment':     { bg:'#dbeafe', color:'#1d4ed8' },
  'Mark Unpayment':   { bg:'#fff1f2', color:'#be123c' },
  'Donation Added':   { bg:'#d1fae5', color:'#065f46' },
  'Donation Updated': { bg:'#fef9c3', color:'#854d0e' },
  'Donation Deleted': { bg:'#fee2e2', color:'#991b1b' },
  'Expense Added':    { bg:'#fee2e2', color:'#991b1b' },
  'Expense Updated':  { bg:'#fef9c3', color:'#854d0e' },
  'Expense Deleted':  { bg:'#fce7f3', color:'#9d174d' },
  'Proof Uploaded':   { bg:'#ede9fe', color:'#6d28d9' },
  'Proof Deleted':    { bg:'#fee2e2', color:'#991b1b' },
  'Message Template Added':   { bg:'#dcfce7', color:'#15803d' },
  'Message Template Updated': { bg:'#fef9c3', color:'#854d0e' },
  'Message Template Deleted': { bg:'#fee2e2', color:'#991b1b' },
  'QR Added':       { bg:'#dcfce7', color:'#15803d' },
  'QR Updated':     { bg:'#fef9c3', color:'#854d0e' },
  'QR Set Active':  { bg:'#dbeafe', color:'#1d4ed8' },
  'QR Deleted':     { bg:'#fee2e2', color:'#991b1b' },
};

const _PROOF_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

let _historyRows  = [];
let _historyShown = 10;

async function loadTrackHistory() {
  const el = document.getElementById('historyContent');
  if (!el) return;
  if (!STATE.accessToken) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">Sync karein history dekhne ke liye</div>`;
    return;
  }
  el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">Loading...</div>`;
  try {
    const sessionLabel = STATE.currentSession?.label || '';
    const rows = (await sheetsGet('TrackHistory!A1:E1000'))
      .filter(r => r.length >= 2 && r[3] === sessionLabel);
    if (!rows.length) {
      el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">Is session mein koi activity record nahi hai</div>`;
      return;
    }
    _historyRows  = [...rows].reverse(); // newest first
    _historyShown = 10;
    _renderHistoryRows();
  } catch(e) {
    el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--red);font-size:13px">Error: ${e.message}</div>`;
  }
}

function _renderHistoryRows() {
  const el = document.getElementById('historyContent');
  if (!el) return;
  const visible  = _historyRows.slice(0, _historyShown);
  const hasMore  = _historyRows.length > _historyShown;
  const rowsHtml = visible.map(([ts, action, details, session, admin], i) => {
    const ac = _HISTORY_COLORS[action] || { bg:'#f1f5f9', color:'#475569' };
    const isProof = action === 'Proof Uploaded' || action === 'Proof Deleted';
    return `
      <div style="padding:10px 0;${i < visible.length-1 ? 'border-bottom:1px solid var(--border);' : ''}">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
          <span style="display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;background:${ac.bg};color:${ac.color}">${isProof ? _PROOF_ICON : ''}${action || ''}</span>
          <span style="font-size:13px;font-weight:600;color:var(--text)">${details || ''}</span>
        </div>
        <div style="font-size:11px;color:var(--muted);display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
          <span>${admin || '—'}</span>
          ${session ? `<span>·</span><span style="color:#0369a1;font-weight:600">${session}</span>` : ''}
          <span>·</span><span>${ts || ''}</span>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div id="historyList" style="max-height:520px;overflow-y:auto;overscroll-behavior:contain">
      ${rowsHtml}
      ${hasMore
        ? `<div style="text-align:center;padding:14px 0">
             <button onclick="_historyLoadMore()" style="background:var(--green-light,#f0fdf4);border:1px solid var(--green,#16a34a);color:var(--green-dark,#0f4a29);border-radius:10px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer">
               Load More (${_historyRows.length - _historyShown} remaining)
             </button>
           </div>`
        : `<div style="text-align:center;padding:10px 0;color:var(--muted);font-size:11px">— ${_historyRows.length} total records —</div>`
      }
    </div>`;
}

function _historyLoadMore() {
  _historyShown += 10;
  const list = document.getElementById('historyList');
  const scrollTop = list ? list.scrollTop : 0;
  _renderHistoryRows();
  requestAnimationFrame(() => {
    const el = document.getElementById('historyList');
    if (el) el.scrollTop = scrollTop;
  });
}

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
                <div style="width:36px;height:36px;border-radius:10px;flex-shrink:0;
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
};

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
    const rows = (await sheetsGet('TrackHistory!A1:E1000')).filter(r => r.length >= 2);
    if (!rows.length) {
      el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">Koi activity record nahi hai</div>`;
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
    return `
      <div style="padding:10px 0;${i < visible.length-1 ? 'border-bottom:1px solid var(--border);' : ''}">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;background:${ac.bg};color:${ac.color}">${action || ''}</span>
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

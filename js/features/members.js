// Converts dd/mm/yyyy or dd-Mon-yyyy (sheet's manual-entry formats) to
// yyyy-mm-dd so a native <input type="date"> can display it.
function _toISODate(str) {
  if (!str) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  m = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
    const mo = months[m[2]];
    if (mo) return `${m[3]}-${mo}-${m[1].padStart(2,'0')}`;
  }
  // Google Sheets serial date number (days since 1899-12-30) — happens when a
  // USER_ENTERED date string lands in a column that isn't formatted as Date,
  // so Sheets stores/returns it as a plain serial number instead of text.
  m = String(str).match(/^\d+(\.\d+)?$/);
  if (m) {
    const serial = parseFloat(str);
    if (serial > 20000 && serial < 80000) { // sane range (~1954-2119) so unrelated numbers aren't misread as dates
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
  }
  return '';
}

// Formats any of the sheet's date styles into "11-Apr-2026" for display badges.
function _toDisplayDate(str) {
  const iso = _toISODate(str);
  if (!iso) return str || '';
  const [y, mo, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d}-${months[parseInt(mo, 10) - 1]}-${y}`;
}

function renderMembers() {
  const addBtn = document.getElementById('memberAddBtn');
  if (addBtn) addBtn.style.display = _isActiveSession() ? 'flex' : 'none';

  // Session filter pills — built from whichever session labels actually
  // appear on members (newest first), regardless of what's currently selected.
  const sessionsEl = document.getElementById('memberSessionFilters');
  if (sessionsEl) {
    const uniqueSessions = [...new Set(STATE.allMembers.map(m => m.session).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a));
    if (uniqueSessions.length > 0) {
      sessionsEl.style.display = 'flex';
      sessionsEl.innerHTML = `
        <button class="month-pill ${STATE.memberSessionFilter === 'all' ? 'active' : ''}" onclick="setMemberSessionFilter('all')">All Sessions</button>
        ${uniqueSessions.map(s => `<button class="month-pill ${STATE.memberSessionFilter === s ? 'active' : ''}" onclick="setMemberSessionFilter('${s}')">${s}</button>`).join('')}
      `;
    } else {
      sessionsEl.style.display = 'none';
      sessionsEl.innerHTML = '';
    }
  }

  document.querySelectorAll('#screen-members .month-pills button[id^="memberSort"]').forEach(b => b.classList.remove('active'));
  document.getElementById('memberSort' + STATE.memberSortMode[0].toUpperCase() + STATE.memberSortMode.slice(1))?.classList.add('active');
  const dateBtn  = document.getElementById('memberSortDate');
  const alphaBtn = document.getElementById('memberSortAlpha');
  if (dateBtn)  dateBtn.textContent  = (STATE.memberSortMode === 'date'  && STATE.memberSortDir === 'asc')  ? 'Date Wise ↑ (Oldest)' : 'Date Wise ↓ (Newest)';
  if (alphaBtn) alphaBtn.textContent = (STATE.memberSortMode === 'alpha' && STATE.memberSortDir === 'desc') ? 'Z-A' : 'A-Z';

  const q = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const list = STATE.allMembers.filter(m => {
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.mobile.includes(q);
    const matchF = STATE.memberFilter === 'all'
      || (STATE.memberFilter === 'Active'   && m.status === 'Active')
      || (STATE.memberFilter === 'Inactive' && m.status !== 'Active')
      || (STATE.memberFilter === 'Regular'  && (m.type || 'Regular') === 'Regular')
      || (STATE.memberFilter === 'Donor'    && m.type === 'Donor');
    const matchS = STATE.memberSessionFilter === 'all' || m.session === STATE.memberSessionFilter;
    return matchQ && matchF && matchS;
  });

  if (STATE.memberSortMode === 'date') {
    const dir = STATE.memberSortDir === 'asc' ? 1 : -1; // desc = newest first
    list.sort((a, b) => dir * (_toISODate(a.doj) || '').localeCompare(_toISODate(b.doj) || ''));
  } else if (STATE.memberSortMode === 'alpha') {
    const dir = STATE.memberSortDir === 'desc' ? -1 : 1; // asc = A-Z
    list.sort((a, b) => dir * a.name.localeCompare(b.name));
  } // 'default' → keep sheet row order as-is

  const isActive = m => m.status === 'Active';
  const initials = name => name.trim().split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  document.getElementById('membersList').innerHTML = list.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg></div><p>No members found</p></div>`
    : `<div class="section-header">
         <span class="section-title">Members</span>
         <span class="section-count">${list.length} found</span>
       </div>` +
      list.map(m => {
        const idx = STATE.allMembers.indexOf(m);
        return `
        <div class="member-card" onclick="openMemberProfile(${idx})">
          <div class="member-avatar ${isActive(m) ? '' : 'inactive'}">${initials(m.name)}</div>
          <div class="member-info">
            <div class="member-name">
              ${m.name}
              <span class="badge ${isActive(m) ? 'badge-active' : 'badge-inactive'}">${m.status}</span>
              <span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 7px;border-radius:8px;font-weight:600;${m.type === 'Donor' ? 'background:#dbeafe;color:#1d4ed8' : 'background:#f0fdf4;color:#15803d'}">
                ${m.type === 'Donor'
                  ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`
                  : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>`
                }${m.type || 'Regular'}
              </span>
              ${m.session ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 7px;border-radius:8px;font-weight:600;background:#ede9fe;color:#6d28d9">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${m.session}
              </span>` : ''}
              ${m.doj ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 7px;border-radius:8px;font-weight:600;background:#e0f2fe;color:#0369a1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>DOJ ${_toDisplayDate(m.doj)}
              </span>` : ''}
              ${(!isActive(m) && m.doe) ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 7px;border-radius:8px;font-weight:600;background:#fee2e2;color:#991b1b">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>DOE ${_toDisplayDate(m.doe)}
              </span>` : ''}
            </div>
            <div class="member-sub">${m.mobile || 'No mobile'}</div>
            ${m.address ? `<div class="member-sub">${m.address}</div>` : ''}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`;
      }).join('');
}

// Nav-bar "Members" tab click — always reset to the unfiltered view so a
// filter left applied from a previous visit doesn't silently hide members.
function goToMembersTab(el) {
  STATE.memberFilter = 'all';
  STATE.memberSessionFilter = 'all';
  STATE.memberSortMode = 'default';
  STATE.memberSortDir = 'desc';
  const search = document.getElementById('memberSearch');
  if (search) search.value = '';
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.filter-tab[onclick*="setMemberFilter('all'"]`)?.classList.add('active');
  showScreen('members', el);
}

function setMemberFilter(f, el) {
  STATE.memberFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderMembers();
}

function setMemberSessionFilter(s) {
  STATE.memberSessionFilter = s;
  renderMembers();
}

function setMemberSortMode(mode) {
  if (STATE.memberSortMode === mode && mode !== 'default') {
    // Tapping the already-active sort pill flips its direction
    STATE.memberSortDir = STATE.memberSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    STATE.memberSortMode = mode;
    STATE.memberSortDir  = mode === 'alpha' ? 'asc' : 'desc'; // A-Z default / newest-first default
  }
  renderMembers();
}

function filterMembers() { renderMembers(); }

// ── Member Profile Modal ──────────────────────────────────

function openMemberProfile(idx) {
  const member = STATE.allMembers[idx];
  if (!member) return;
  _ensureProofsForIcons(() => { if (document.getElementById('memberProfileOverlay')?.classList.contains('open')) openMemberProfile(idx); });

  const payIdx     = STATE.allPayments.findIndex(p => nameMatch(p.name, member.name));
  const payRec     = payIdx !== -1 ? STATE.allPayments[payIdx] : null;
  const hasToken   = !!STATE.accessToken;
  const isActive   = member.status === 'Active';
  const isRegular  = (member.type || 'Regular') === 'Regular';
  const canEdit    = payIdx !== -1 && hasToken && isActive && isRegular && _isActiveSession();
  const needsSync  = payIdx !== -1 && !hasToken && isActive && isRegular && _isActiveSession();
  // Fall back to month list from any payment record if this member has no row
  const monthKeys = payRec
    ? Object.keys(payRec.months)
    : (STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : []);
  const initials  = n => n.trim().split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  let paidCount = 0, unpaidCount = 0, totalPaid = 0, totalDue = 0;
  let monthRows = '';

  if (monthKeys.length > 0) {
    monthKeys.forEach(mo => {
      // Use member's own value if present; missing key or no row → treat as blank (unpaid)
      const rawVal = payRec ? (payRec.months[mo] || '') : '';
      const paid   = isPaid(rawVal);
      const past   = isPastOrCurrent(mo);

      if (paid)       { paidCount++; totalPaid += FEE; }
      else if (past)  { unpaidCount++; totalDue += FEE; }
      // future + unpaid = not due yet, don't count

      const _icoUp    = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;
      const _icoCheck = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><polyline points="20 6 9 17 4 12"/></svg>`;
      const _icoX     = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      let chip, amt;
      if (paid && !past) {
        chip = `<span class="txn-chip txn-chip--paid">${_icoUp}Advance</span>`;
        amt  = `<span class="txn-amt txn-amt--paid">+${formatCurrency(FEE)}</span>`;
      } else if (paid) {
        chip = `<span class="txn-chip txn-chip--paid">${_icoCheck}Paid</span>`;
        amt  = `<span class="txn-amt txn-amt--paid">+${formatCurrency(FEE)}</span>`;
      } else if (!past) {
        chip = `<span class="txn-chip txn-chip--upcoming">Upcoming</span>`;
        amt  = `<span class="txn-amt txn-amt--muted">—</span>`;
      } else {
        chip = `<span class="txn-chip txn-chip--unpaid">${_icoX}Unpaid</span>`;
        amt  = `<span class="txn-amt txn-amt--unpaid">−${formatCurrency(FEE)}</span>`;
      }

      const rowClick = canEdit
        ? `onclick="togglePaymentFromProfile(${payIdx},'${mo}',${idx})" style="cursor:pointer" title="Tap to toggle"`
        : needsSync
          ? `onclick="syncData().then(()=>openMemberProfile(${idx}))" style="cursor:pointer" title="Sync required"`
          : '';
      const rowIcon = canEdit
        ? `<span style="color:#cbd5e1;flex-shrink:0;display:flex;align-items:center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>`
        : needsSync
          ? `<span style="color:#f59e0b;flex-shrink:0;display:flex;align-items:center" title="Sync required"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></span>`
          : '';
      monthRows += `
        <div class="txn-row${!past ? ' txn-row--future' : ''}" ${rowClick}>
          <span class="txn-month">${mo}</span>
          ${chip}
          ${amt}
          ${paid ? _proofStatusIconHtml(member.name, mo) : ''}
          ${rowIcon}
        </div>`;
    });
  }

  document.getElementById('memberProfileContent').innerHTML = `
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:13px;flex:1;min-width:0">
        <div class="member-avatar ${isActive ? '' : 'inactive'}" style="width:52px;height:52px;border-radius:16px;font-size:18px;flex-shrink:0">${initials(member.name)}</div>
        <div style="min-width:0">
          <div class="modal-title" style="font-size:16px">${member.name}</div>
          <div style="display:flex;align-items:center;gap:7px;margin-top:4px;flex-wrap:wrap">
            <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">${member.status}</span>
            <span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 7px;border-radius:8px;font-weight:600;${(member.type||'Regular')==='Donor' ? 'background:#dbeafe;color:#1d4ed8' : 'background:#f0fdf4;color:#15803d'}">
              ${(member.type||'Regular')==='Donor'
                ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`
                : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>`
              }${member.type || 'Regular'}
            </span>
            ${member.mobile ? `<span style="font-size:12px;color:var(--muted)">${member.mobile}</span>` : ''}
          </div>
          ${member.address ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${member.address}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="close-btn" style="background:#f0fdf4;color:var(--green-dark);display:flex;align-items:center;justify-content:center" onclick="openEditMember(${idx})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        <button class="close-btn" onclick="closeMemberProfile()">×</button>
      </div>
    </div>

    ${!isRegular ? `
    <div onclick="openEditMember(${idx})" style="cursor:pointer;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;color:#1e40af">Yeh Donor member hai</div>
        <div style="font-size:11px;color:#3b82f6;margin-top:1px">Payment mark karne ke liye type Regular karein → Tap to edit</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>` : ''}

    ${isRegular && !isActive ? `
    <div onclick="openEditMember(${idx})" style="cursor:pointer;background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:10px 12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#be123c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;color:#9f1239">Yeh Inactive member hai</div>
        <div style="font-size:11px;color:#e11d48;margin-top:1px">Payment mark karne ke liye pehle Active karein → Tap to edit</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#be123c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>` : ''}

    ${needsSync ? `
    <div onclick="syncData().then(()=>openMemberProfile(${idx}))" style="cursor:pointer;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:700;color:#92400e">Payment edit ke liye Sync karein</div>
        <div style="font-size:11px;color:#b45309;margin-top:1px">Tap to sync now</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>` : ''}

    ${monthKeys.length > 0 ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px">
      <div class="member-stat-card member-stat-card--green">
        <div class="member-stat-label">Months Paid</div>
        <div class="member-stat-value">${paidCount}</div>
        <div class="member-stat-sub">${formatCurrency(totalPaid)}</div>
      </div>
      <div class="member-stat-card member-stat-card--red">
        <div class="member-stat-label">Months Due</div>
        <div class="member-stat-value">${unpaidCount}</div>
        <div class="member-stat-sub">${totalDue > 0 ? formatCurrency(totalDue) : 'All clear'}</div>
      </div>
    </div>` : ''}

    <div class="card-title" style="margin-bottom:10px">Monthly Transactions</div>
    <div class="txn-list">
      ${monthRows || `<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px">No session data available</div>`}
    </div>

    ${monthKeys.length > 0 ? `
    <button onclick="openProofUpload('${member.name.replace(/'/g, "\\'")}')"
      style="width:100%;margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:14px;padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer;color:#fff;background:linear-gradient(135deg,#4c1d95 0%,#7c3aed 55%,#a78bfa 120%);box-shadow:0 4px 14px rgba(124,58,237,.32)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      Is Member Ke Payment Proofs
    </button>` : ''}

    ${monthKeys.length > 0 ? `
    <button class="whatsapp-btn" style="margin-top:16px" onclick="shareWhatsAppMember(${idx})">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      Is Member Ki Detail Share Karein
    </button>` : ''}
  `;

  _histPush({ modal: 'memberProfile' });
  document.getElementById('memberProfileOverlay').classList.add('open');
}

function closeMemberProfile() {
  _histBack();
  document.getElementById('memberProfileOverlay').classList.remove('open');
}

function shareWhatsAppMember(idx) {
  const member = STATE.allMembers[idx];
  if (!member) return;

  const payRec    = STATE.allPayments.find(p => nameMatch(p.name, member.name));
  const monthKeys = payRec
    ? Object.keys(payRec.months)
    : (STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : []);

  const session  = STATE.currentSession ? STATE.currentSession.label : '';
  const clean    = n => n.replace(/\(.*?\)/g, '').trim();

  const paidMonths   = [];
  const unpaidMonths = [];
  const advMonths    = [];

  monthKeys.forEach(mo => {
    const rawVal = payRec ? (payRec.months[mo] || '') : '';
    const paid   = isPaid(rawVal);
    const past   = isPastOrCurrent(mo);

    if (paid && !past) advMonths.push(mo);
    else if (paid)     paidMonths.push(mo);
    else if (past)     unpaidMonths.push(mo);
  });

  let msg = '';
  msg += `Assalamualkum wa Rahmatullahi wa Barakatuh! 🕌\n\n`;
  msg += `اسلام علیکم ورحمتہ وبرکاتہ\n\n`;

  msg += `*Tanzeem Abd-e-Mustafa — Bisauli*\n`;
  msg += `*تنظیم عبد مصطفیٰ — بسولی*\n`;

  msg += `*Session: ${session}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `👤 *${clean(member.name)}*\n`;
  msg += `Status: ${member.status}`;
  if (member.mobile) msg += `  |  📞 ${member.mobile}`;
  msg += '\n\n';

  if (paidMonths.length > 0) {
    msg += `✅ *Jama Kiya (${paidMonths.length} mahine):*\n`;
    msg += paidMonths.join(', ');
    msg += '\n\n';
  }

  if (unpaidMonths.length > 0) {
    msg += `❌ *Abhi Tak Baqi (${unpaidMonths.length} mahine):*\n`;
    msg += unpaidMonths.join(', ');
    msg += '\n\n';
  }

  if (advMonths.length > 0) {
    msg += `⬆️ *Pehle Se Jama Kar Diya (${advMonths.length} mahine):*\n`;
    msg += advMonths.join(', ');
    msg += '\n\n';
  }

  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📊 *Khulasa:*\n`;
  msg += `• Jama kiya: ${paidMonths.length} mahine\n`;
  msg += `• Baqi hai: ${unpaidMonths.length} mahine\n`;
  if (advMonths.length > 0) msg += `• Advance: ${advMonths.length} mahine\n`;
  msg += `\nJazakallah Khair 🤲`;

  const _raw    = (member.mobile || '').replace(/\D/g, '').replace(/^0+/, '');
  const _mobile = _raw.length === 10 ? '91' + _raw : _raw;
  const _waLink = _mobile ? `https://wa.me/${_mobile}?text=` : 'https://wa.me/?text=';
  _askShareFormat(msg, _waLink);
}

// ── Toggle payment from member profile ───────────────────

async function togglePaymentFromProfile(payIdx, mo, memberIdx) {
  if (!_isActiveSession()) { showAlert('Edit Nahi Ho Sakta', _sessionLockedMsg()); return; }
  const p = STATE.allPayments[payIdx];
  if (!p) return;
  const memberRec = STATE.allMembers.find(m => nameMatch(m.name, p.name));
  if (memberRec && memberRec.status !== 'Active') {
    showAlert('Pehle Active Karein', 'Yeh member Inactive hai. Payment mark karne se pehle isko Active karein.'); return;
  }
  if (memberRec && (memberRec.type || 'Regular') !== 'Regular') {
    showAlert('Payment Mark Nahi Ho Sakti', 'Donor member ki payment mark nahi ho sakti.'); return;
  }
  if (!await _ensureWriteAccess()) return;
  const months = Object.keys(p.months);
  const mIdx   = months.indexOf(mo);
  if (mIdx === -1) return;
  const col      = colLetter(3 + mIdx);
  const newVal   = isPaid(p.months[mo]) ? '' : 'Paid';
  const action   = newVal === 'Paid' ? 'Paid mark karein' : 'Unpaid mark karein';
  const cleanName = p.name.replace(/\(.*?\)/g, '').trim();
  showConfirm(
    `${action}?`,
    `<b>${cleanName}</b> — ${mo}<br><span style="color:var(--muted);font-size:12px">${isPaid(p.months[mo]) ? 'Paid ✓ hai → Unpaid karna chahte hain?' : 'Unpaid ✗ hai → Paid karna chahte hain?'}</span>`,
    async () => {
      try {
        await sheetsPut(`${STATE.currentSession.sheet}!${col}${p.row}`, [[newVal]]);
        STATE.allPayments[payIdx].months[mo] = newVal;
        const paidCount = Object.values(STATE.allPayments[payIdx].months).filter(v => isPaid(v)).length;
        STATE.allPayments[payIdx].total = String(paidCount * FEE);
        saveCache(STATE.currentSession.label);
        showAlert(newVal === 'Paid' ? 'Payment Mark Ho Gaya' : 'Payment Unmark Ho Gaya', `${cleanName} — ${mo} ${newVal === 'Paid' ? 'Paid mark ho gaya ✅' : 'Unpaid mark ho gaya'}`);
        _trackHistory(newVal === 'Paid' ? 'Mark Payment' : 'Mark Unpayment', `${cleanName} - ${mo}`);
        if (newVal === 'Paid') {
          _pushNotify('Payment Jama! ✅', `${cleanName} — ${mo} ka payment de diya`);
          _checkAllPaid(mo);
        } else {
          _pushNotify('Payment Hata Diya ✗', `${cleanName} — ${mo} payment wapas liya`);
        }
        _updatePushStats(mo);
        openMemberProfile(memberIdx);
      } catch(e) {
        showAlert('Error', e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message);
      }
    }
  );
}

// ── Member Edit ───────────────────────────────────────────

let _editMemberStatus = null;
let _editMemberType   = null;
let _editMemberAadhar = null;
let _editMemberRef    = null;

function openEditMember(idx) {
  if (!_isActiveSession()) { showAlert('Edit Nahi Ho Sakta', _sessionLockedMsg()); return; }
  const m = STATE.allMembers[idx];
  if (!m) return;
  _editMemberStatus = m.status;
  _editMemberType   = m.type || 'Regular';
  _editMemberAadhar = m.aadhar || 'No';
  _editMemberRef    = m;
  document.getElementById('memberProfileContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Edit Member</div>
      <button class="close-btn" onclick="openMemberProfile(${idx})">×</button>
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>Naam</label>
      <input id="em_name" value="${m.name.replace(/"/g, '&quot;')}" placeholder="Naam likhein...">
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Mobile Number</label>
      <input id="em_mobile" type="tel" value="${(m.mobile || '').replace(/"/g, '&quot;')}" placeholder="Mobile number...">
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>Status</label>
      <div style="display:flex;gap:8px">
        <button id="emStatusActive" class="btn ${m.status === 'Active' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditStatus('Active')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>Active</button>
        <button id="emStatusInactive" class="btn ${m.status !== 'Active' ? 'btn-danger' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditStatus('In Active')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>In Active</button>
      </div>
    </div>
    <div class="form-group" id="emDoeGroup" style="display:${m.status !== 'Active' ? 'block' : 'none'}">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Date of Exit (DOE)</label>
      <input id="em_doe" type="date" value="${_toISODate(m.doe) || (m.status !== 'Active' ? todayDate() : '')}">
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>Type</label>
      <div style="display:flex;gap:8px">
        <button id="emTypeRegular" class="btn ${(m.type||'Regular')==='Regular' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditType('Regular')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg> Regular</button>
        <button id="emTypeDonor"   class="btn ${m.type==='Donor' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditType('Donor')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> Donor</button>
      </div>
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M4 16c0-1.5 1.5-3 4-3s4 1.5 4 3"/><line x1="14" y1="8" x2="19" y2="8"/><line x1="14" y1="12" x2="19" y2="12"/></svg>Aadhar Card</label>
      <div style="display:flex;gap:8px">
        <button id="emAadharNo" class="btn ${(m.aadhar||'No')!=='Yes' ? 'btn-danger' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditAadhar('No')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>No</button>
        <button id="emAadharYes" class="btn ${m.aadhar==='Yes' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditAadhar('Yes')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>Yes</button>
      </div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="saveEditMember(${idx})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save Changes</button>
    <!--
    <button class="btn btn-danger" style="width:100%;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="deleteMember(${idx})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Member Delete Karein</button>
    -->
  `;
}

function setEditStatus(s) {
  if (s !== 'Active' && _memberHasSessionPayment(_editMemberRef)) {
    showAlert('Inactive Nahi Kar Sakte', 'Is member ne is session mein payment ki hai. Ye Inactive agle session ke liye ho sakta hai.');
    return;
  }
  _editMemberStatus = s;
  document.getElementById('emStatusActive').className   = 'btn ' + (s === 'Active' ? 'btn-primary'   : 'btn-secondary');
  document.getElementById('emStatusInactive').className = 'btn ' + (s !== 'Active' ? 'btn-danger' : 'btn-secondary');

  const doeGroup = document.getElementById('emDoeGroup');
  const doeInput = document.getElementById('em_doe');
  if (doeGroup) doeGroup.style.display = s !== 'Active' ? 'block' : 'none';
  if (doeInput) {
    if (s !== 'Active' && !doeInput.value) doeInput.value = todayDate();
    if (s === 'Active') doeInput.value = '';
  }
}

function _memberHasSessionPayment(m) {
  if (!m) return false;
  const payRec = STATE.allPayments.find(p => nameMatch(p.name, m.name));
  if (!payRec) return false;
  return Object.values(payRec.months).some(v => isPaid(v));
}

function setEditType(t) {
  if (t === 'Donor' && _memberHasSessionPayment(_editMemberRef)) {
    showAlert('Donor Nahi Bana Sakte', 'Is member ne payment ki hai. Wo payment Donation mein add karke payment sheet se hatayein, tabhi Donor bana sakte hain.');
    return;
  }
  _editMemberType = t;
  document.getElementById('emTypeRegular').className = 'btn ' + (t === 'Regular' ? 'btn-primary' : 'btn-secondary');
  document.getElementById('emTypeDonor').className   = 'btn ' + (t === 'Donor'   ? 'btn-primary' : 'btn-secondary');
}

function setEditAadhar(v) {
  _editMemberAadhar = v;
  document.getElementById('emAadharNo').className  = 'btn ' + (v !== 'Yes' ? 'btn-danger'  : 'btn-secondary');
  document.getElementById('emAadharYes').className = 'btn ' + (v === 'Yes' ? 'btn-primary' : 'btn-secondary');
}

async function saveEditMember(idx) {
  const m = STATE.allMembers[idx];
  if (!m) return;
  if (!await _ensureWriteAccess()) return;
  const newName   = (document.getElementById('em_name').value   || '').trim();
  const newMobile = (document.getElementById('em_mobile').value || '').trim();
  const newStatus = _editMemberStatus || m.status;
  const newType   = _editMemberType   || (m.type || 'Regular');
  const newAadhar = _editMemberAadhar || (m.aadhar || 'No');
  let   newDoe    = newStatus === 'Active' ? '' : (document.getElementById('em_doe')?.value || '');
  if (!newName) { showAlert('Naam Zaroori Hai', 'Naam khali nahi ho sakta.'); return; }
  if (newStatus !== 'Active' && !newDoe) { showAlert('DOE Zaroori Hai', 'Member ko Inactive karne ke liye Date of Exit (DOE) bharein.'); return; }
  const changes = [];
  if (newName   !== m.name)              changes.push(`Naam: <b>${m.name}</b> → <b>${newName}</b>`);
  if (newMobile !== (m.mobile || ''))    changes.push(`Mobile: <b>${m.mobile || '—'}</b> → <b>${newMobile || '—'}</b>`);
  if (newStatus !== m.status)            changes.push(`Status: <b>${m.status}</b> → <b>${newStatus}</b>`);
  if (newType   !== (m.type||'Regular')) changes.push(`Type: <b>${m.type||'Regular'}</b> → <b>${newType}</b>`);
  if (newAadhar !== (m.aadhar||'No'))    changes.push(`Aadhar Card: <b>${m.aadhar||'No'}</b> → <b>${newAadhar}</b>`);
  if (newDoe    !== (m.doe||''))         changes.push(`DOE: <b>${m.doe||'—'}</b> → <b>${newDoe||'—'}</b>`);
  if (!changes.length) { openMemberProfile(idx); return; }
  showConfirm('Yeh changes save karein?', changes.join('<br>'), async () => {
    try {
      if (newName   !== m.name)              await sheetsPut(`Members List!B${m.row}`, [[newName]]);
      if (newMobile !== (m.mobile||''))      await sheetsPut(`Members List!C${m.row}`, [[newMobile]]);
      if (newAadhar !== (m.aadhar||'No'))    await sheetsPut(`Members List!F${m.row}`, [[newAadhar]]);
      if (newStatus !== m.status)            await sheetsPut(`Members List!G${m.row}`, [[newStatus]]);
      if (newDoe    !== (m.doe||''))         await sheetsPut(`Members List!H${m.row}`, [[newDoe]]);
      if (newType   !== (m.type||'Regular')) await sheetsPut(`Members List!I${m.row}`, [[newType]]);

      // Reactivated (Inactive → Active): add to this session's payment sheet
      // if they aren't already a row there (e.g. session was created while
      // they were inactive). Never remove a row when going Active → Inactive.
      let _reactivateNote = '';
      if (newStatus === 'Active' && m.status !== 'Active') {
        const existingMatch = STATE.allPayments.find(p => nameMatch(p.name, newName));
        if (existingMatch) {
          _reactivateNote = ` (session sheet mein already "${existingMatch.name}" ke naam se row mili — nayi row nahi banayi)`;
        } else {
          const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
          if (months.length > 0 && STATE.currentSession?.sheet) {
            const payId     = STATE.allPayments.length + 1;
            const newPayRow = STATE.allPayments.length > 0
              ? Math.max(...STATE.allPayments.map(p => p.row)) + 1 : 2;
            await sheetsInsertRow(STATE.currentSession.sheet, newPayRow);
            const lastMonthCol = colLetter(2 + months.length);
            const totalCol     = colLetter(2 + months.length + 1);
            const totalFormula = `=COUNTIF(D${newPayRow}:${lastMonthCol}${newPayRow},"Paid")*C${newPayRow}`;
            await sheetsPut(`${STATE.currentSession.sheet}!A${newPayRow}:${totalCol}${newPayRow}`,
              [[payId, newName, FEE, ...months.map(() => ''), totalFormula]]);
            const emptyMonths = {};
            months.forEach(mo => { emptyMonths[mo] = ''; });
            STATE.allPayments.push({ row: newPayRow, name: newName, amount: String(FEE), months: emptyMonths, total: '0' });
            _reactivateNote = ' (session sheet mein nayi row add ho gayi)';
          } else {
            _reactivateNote = ' (session sheet update nahi hui — months/sheet data missing)';
          }
        }
      }

      STATE.allMembers[idx].name   = newName;
      STATE.allMembers[idx].mobile = newMobile;
      STATE.allMembers[idx].status = newStatus;
      STATE.allMembers[idx].type   = newType;
      STATE.allMembers[idx].aadhar = newAadhar;
      STATE.allMembers[idx].doe    = newDoe;
      saveCache(STATE.currentSession.label);
      showAlert('Member Update Ho Gaya', 'Member ki details save ho gayin!' + _reactivateNote + ' ✅');
      const changesSummary = changes.map(c => c.replace(/<[^>]+>/g, '')).join(', ');
      _trackHistory('Member Updated', `${newName} — ${changesSummary}`);
      _pushNotify('Member Update! ✏️', `${newName} ki profile mein badlav kiya gaya`);
      openMemberProfile(idx);
    } catch(e) {
      showAlert('Error', e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message);
    }
  });
}

async function deleteMember(idx) {
  if (!_isActiveSession()) { showAlert('Edit Nahi Ho Sakta', _sessionLockedMsg()); return; }
  const m = STATE.allMembers[idx];
  if (!m) return;
  if (!await _ensureWriteAccess()) return;
  showConfirm(
    'Member delete karein?',
    `<b>${m.name}</b> ko hamesha ke liye remove kar diya jayega.<br><span style="color:var(--red);font-size:12px">Yeh action wapas nahi ho sakta!</span>`,
    async () => {
      try {
        await sheetsDeleteRow('Members List', m.row);
        const deletedRow = m.row;
        STATE.allMembers.splice(idx, 1);
        STATE.allMembers.forEach(mb => { if (mb.row > deletedRow) mb.row--; });
        saveCache(STATE.currentSession.label);
        showAlert('Member Delete Ho Gaya', `${m.name} ko hamesha ke liye remove kar diya gaya. 🗑`);
        _trackHistory('Member Deleted', m.name);
        _pushNotify('Member Delete Ho Gaya! 🗑', `${m.name} ko Tanzeem se remove kiya gaya`);
        closeMemberProfile();
        renderMembers();
      } catch(e) {
        showAlert('Error', e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message);
      }
    }
  );
}

// ── Add New Member ────────────────────────────────────────

async function openAddMember() {
  if (!_isActiveSession()) { showAlert('Edit Nahi Ho Sakta', _sessionLockedMsg()); return; }
  if (!STATE.accessToken) await syncData();
  document.getElementById('memberProfileContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Naya Member Add Karein</div>
      <button class="close-btn" onclick="closeMemberProfile()">×</button>
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>Naam *</label>
      <input id="nm_name" placeholder="Naam likhein...">
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Mobile Number</label>
      <input id="nm_mobile" type="tel" placeholder="Mobile number...">
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Date of Joining (DOJ)</label>
      <input id="nm_doj" type="date">
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Address</label>
      <input id="nm_address" placeholder="Ghar ka pata...">
    </div>
    <div class="form-group">
      <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>Type</label>
      <div style="display:flex;gap:8px">
        <button id="nmTypeRegular" class="btn btn-primary" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setNewMemberType('Regular')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg> Regular</button>
        <button id="nmTypeDonor"   class="btn btn-secondary" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setNewMemberType('Donor')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> Donor</button>
      </div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="saveNewMember()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Member Add Karein</button>
  `;
  _newMemberStatus = 'Active';
  _newMemberAadhar = 'No';
  _newMemberType   = 'Regular';
  _histPush({ modal: 'memberProfile' });
  document.getElementById('memberProfileOverlay').classList.add('open');
}

let _newMemberStatus = 'Active';
let _newMemberAadhar = 'No';
let _newMemberType   = 'Regular';

function setNewMemberType(t) {
  _newMemberType = t;
  document.getElementById('nmTypeRegular').className = 'btn ' + (t === 'Regular' ? 'btn-primary' : 'btn-secondary');
  document.getElementById('nmTypeDonor').className   = 'btn ' + (t === 'Donor'   ? 'btn-primary' : 'btn-secondary');
}

function saveNewMember() {
  const name   = (document.getElementById('nm_name').value   || '').trim();
  const mobile = (document.getElementById('nm_mobile').value || '').trim();
  const doj    = (document.getElementById('nm_doj').value    || '').trim();
  const address= (document.getElementById('nm_address').value|| '').trim();
  const aadhar = _newMemberAadhar;
  const status = _newMemberStatus;
  const type   = _newMemberType;
  if (!name) { showAlert('Naam Zaroori Hai', 'Member add karne ke liye naam likhein.'); return; }
  if (STATE.allMembers.some(m => nameMatch(m.name, name))) {
    showAlert('Member Pehle Se Maujood Hai', `Is naam se milta-julta member (“${name}”) already Members List mein hai. Alag naam istemal karein ya us purane member ko dhundh kar edit karein.`);
    return;
  }
  const nextId = STATE.allMembers.length + 1;
  showConfirm(
    'Member add karein?',
    `<b>${name}</b>${mobile ? '<br>📞 ' + mobile : ''}${doj ? '<br>DOJ: ' + doj : ''}${address ? '<br>🏠 ' + address : ''}<br>Type: ${type}`,
    async () => {
      try {
        // Sheet columns: A=#, B=Name, C=Mobile, D=DOJ, E=Address, F=Aadhar, G=Status, H=DOE, I=Type, J=Session
        const joinSession = STATE.currentSession?.label || '';
        await sheetsAppend('Members List', [[nextId, name, mobile, doj, address, aadhar, status, '', type, joinSession]]);

        // Also add to session payment sheet with unpaid status for all months
        const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
        if (months.length > 0 && STATE.currentSession?.sheet) {
          const payId     = STATE.allPayments.length + 1;
          const newPayRow = STATE.allPayments.length > 0
            ? Math.max(...STATE.allPayments.map(p => p.row)) + 1 : 2;
          // Insert a blank row first so footer/summary rows shift down
          await sheetsInsertRow(STATE.currentSession.sheet, newPayRow);
          const lastMonthCol = colLetter(2 + months.length);       // last month column
          const totalCol     = colLetter(2 + months.length + 1);   // Total column
          const totalFormula = `=COUNTIF(D${newPayRow}:${lastMonthCol}${newPayRow},"Paid")*C${newPayRow}`;
          const rowData      = [payId, name, FEE, ...months.map(() => ''), totalFormula];
          await sheetsPut(`${STATE.currentSession.sheet}!A${newPayRow}:${totalCol}${newPayRow}`, [rowData]);
          const emptyMonths = {};
          months.forEach(m => { emptyMonths[m] = ''; });
          STATE.allPayments.push({ row: newPayRow, name, amount: String(FEE), months: emptyMonths, total: '0' });
        }

        const newRow = STATE.allMembers.length > 0
          ? Math.max(...STATE.allMembers.map(m => m.row)) + 1
          : 2;
        STATE.allMembers.push({ row: newRow, id: String(nextId), name, mobile, doj, address, aadhar, status, doe: '', type, session: joinSession });
        saveCache(STATE.currentSession.label);
        showAlert('Member Add Ho Gaya', `${name} Tanzeem mein add ho gaye! ✅`);
        _trackHistory('Member Added', name);
        fetch(CONFIG.WORKER_URL + '/api/push/notify', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ title: 'Naya Member Add Hua!', body: `${name} Tanzeem mein shamil ho gaye ✅` })
        }).catch(() => {});
        closeMemberProfile();
        renderMembers();
      } catch(e) {
        showAlert('Error', e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message);
      }
    }
  );
}

// ── AI-driven member actions ──────────────────────────────
// Mirrors saveNewMember()/saveEditMember()'s validation and write logic
// exactly, but takes plain arguments instead of reading form inputs — so the
// AI chat can propose the same action, get it confirmed via the same
// showConfirm() sheet, and have it executed the same way.

function _aiResolveMember(name) {
  return STATE.allMembers.filter(m => nameMatch(m.name, name || ''));
}

function _aiValidateAddMember({ name, mobile, address, type }) {
  if (!_isActiveSession()) return { ok: false, error: _sessionLockedMsg('Member add karne') };
  name    = (name    || '').trim();
  mobile  = (mobile  || '').trim();
  address = (address || '').trim();
  type    = type === 'Donor' ? 'Donor' : 'Regular';
  if (!name) return { ok: false, error: 'Member add karne ke liye naam zaroori hai.' };
  if (STATE.allMembers.some(m => nameMatch(m.name, name)))
    return { ok: false, error: `Is naam se milta-julta member ("${name}") already Members List mein hai. Alag naam istemal karein ya us purane member ko dhundh kar edit karein.` };
  const preview = `<b>${name}</b>${mobile ? '<br>📞 ' + mobile : ''}${address ? '<br>🏠 ' + address : ''}<br>Type: ${type}<br>Session: ${STATE.currentSession?.label || ''}`;
  return { ok: true, preview, args: { name, mobile, address, type } };
}

async function _aiCommitAddMember({ name, mobile, address, type }) {
  if (!await _ensureWriteAccess()) return { ok: false, error: 'Google sign-in/sync zaroori hai.' };
  try {
    const nextId       = STATE.allMembers.length + 1;
    const doj           = todayDate();
    const joinSession   = STATE.currentSession?.label || '';
    await sheetsAppend('Members List', [[nextId, name, mobile, doj, address, 'No', 'Active', '', type, joinSession]]);

    const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
    if (months.length > 0 && STATE.currentSession?.sheet) {
      const payId     = STATE.allPayments.length + 1;
      const newPayRow = STATE.allPayments.length > 0 ? Math.max(...STATE.allPayments.map(p => p.row)) + 1 : 2;
      await sheetsInsertRow(STATE.currentSession.sheet, newPayRow);
      const lastMonthCol = colLetter(2 + months.length);
      const totalCol     = colLetter(2 + months.length + 1);
      const totalFormula = `=COUNTIF(D${newPayRow}:${lastMonthCol}${newPayRow},"Paid")*C${newPayRow}`;
      await sheetsPut(`${STATE.currentSession.sheet}!A${newPayRow}:${totalCol}${newPayRow}`,
        [[payId, name, FEE, ...months.map(() => ''), totalFormula]]);
      const emptyMonths = {};
      months.forEach(mo => { emptyMonths[mo] = ''; });
      STATE.allPayments.push({ row: newPayRow, name, amount: String(FEE), months: emptyMonths, total: '0' });
    }

    const newRow = STATE.allMembers.length > 0 ? Math.max(...STATE.allMembers.map(m => m.row)) + 1 : 2;
    STATE.allMembers.push({ row: newRow, id: String(nextId), name, mobile, doj, address, aadhar: 'No', status: 'Active', doe: '', type, session: joinSession });
    saveCache(STATE.currentSession.label);
    _trackHistory('Member Added', name, true);
    fetch(CONFIG.WORKER_URL + '/api/push/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Naya Member Add Hua!', body: `${name} Tanzeem mein shamil ho gaye ✅ (AI se)` })
    }).catch(() => {});
    renderMembers();
    return { ok: true, message: `✅ **${name}** Tanzeem mein add ho gaye!${mobile ? ' 📞 ' + mobile : ''}${address ? ' — ' + address : ''} (Type: ${type})` };
  } catch (e) {
    return { ok: false, error: e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein.' : 'Error: ' + e.message };
  }
}

function _aiValidateEditMember({ name, newStatus, newType }) {
  if (!_isActiveSession()) return { ok: false, error: _sessionLockedMsg('Member edit karne') };
  const matches = _aiResolveMember(name);
  if (matches.length === 0) return { ok: false, error: `"${name}" naam ka koi member nahi mila.` };
  if (matches.length > 1) return { ok: false, error: `"${name}" se milte-julte ${matches.length} members hain: ${matches.map(x => x.name).join(', ')}. Pura naam batayein.` };
  const m   = matches[0];
  const idx = STATE.allMembers.indexOf(m);

  const wantStatus = newStatus ? (/inactive/i.test(newStatus) ? 'In Active' : 'Active') : null;
  const wantType   = newType   ? (/donor/i.test(newType) ? 'Donor' : 'Regular') : null;
  if (!wantStatus && !wantType) return { ok: false, error: 'Kya change karna hai — Status (Active/Inactive) ya Type (Regular/Donor)? Batayein.' };

  const statusChanging = wantStatus && wantStatus !== m.status;
  const typeChanging   = wantType   && wantType   !== (m.type || 'Regular');
  if (!statusChanging && !typeChanging)
    return { ok: false, error: `${m.name} already ${wantStatus || m.status}${wantType ? ' aur ' + wantType : ''} hain — koi change nahi hai.` };

  if (statusChanging && wantStatus !== 'Active' && _memberHasSessionPayment(m))
    return { ok: false, error: `${m.name} ko Inactive nahi kar sakte — isne is session mein payment ki hai. Ye Inactive agle session ke liye ho sakta hai.` };

  if (typeChanging && wantType === 'Donor' && _memberHasSessionPayment(m))
    return { ok: false, error: `${m.name} ko Donor nahi bana sakte — isne payment ki hai. Pehle wo payment Donation mein add karke payment sheet se hatayein, tabhi Donor bana sakte hain.` };

  const finalStatus = wantStatus || m.status;
  const finalType   = wantType   || (m.type || 'Regular');
  let newDoe = m.doe || '';
  if (statusChanging) newDoe = finalStatus === 'Active' ? '' : todayDate();

  const changes = [];
  if (statusChanging) changes.push(`Status: <b>${m.status}</b> → <b>${finalStatus}</b>`);
  if (typeChanging)   changes.push(`Type: <b>${m.type || 'Regular'}</b> → <b>${finalType}</b>`);
  if (statusChanging && finalStatus !== 'Active') changes.push(`DOE: <b>${m.doe || '—'}</b> → <b>${newDoe}</b>`);

  return {
    ok: true,
    preview: `<b>${m.name}</b><br>${changes.join('<br>')}<br>Session: ${STATE.currentSession?.label || ''}`,
    args: { idx, finalStatus, finalType, newDoe, prevStatus: m.status },
  };
}

async function _aiCommitEditMember({ idx, finalStatus, finalType, newDoe, prevStatus }) {
  const m = STATE.allMembers[idx];
  if (!m) return { ok: false, error: 'Member record mil nahi raha — dobara try karein.' };
  if (!await _ensureWriteAccess()) return { ok: false, error: 'Google sign-in/sync zaroori hai.' };
  try {
    if (finalStatus !== m.status)              await sheetsPut(`Members List!G${m.row}`, [[finalStatus]]);
    if (newDoe      !== (m.doe || ''))         await sheetsPut(`Members List!H${m.row}`, [[newDoe]]);
    if (finalType   !== (m.type || 'Regular')) await sheetsPut(`Members List!I${m.row}`, [[finalType]]);

    // Reactivated (Inactive → Active): add to this session's payment sheet
    // if missing — same rule as saveEditMember().
    let _reactivateNote = '';
    if (finalStatus === 'Active' && prevStatus !== 'Active') {
      const existingMatch = STATE.allPayments.find(p => nameMatch(p.name, m.name));
      if (existingMatch) {
        _reactivateNote = ' (session sheet mein already row maujood thi)';
      } else {
        const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
        if (months.length > 0 && STATE.currentSession?.sheet) {
          const payId     = STATE.allPayments.length + 1;
          const newPayRow = STATE.allPayments.length > 0 ? Math.max(...STATE.allPayments.map(p => p.row)) + 1 : 2;
          await sheetsInsertRow(STATE.currentSession.sheet, newPayRow);
          const lastMonthCol = colLetter(2 + months.length);
          const totalCol     = colLetter(2 + months.length + 1);
          const totalFormula = `=COUNTIF(D${newPayRow}:${lastMonthCol}${newPayRow},"Paid")*C${newPayRow}`;
          await sheetsPut(`${STATE.currentSession.sheet}!A${newPayRow}:${totalCol}${newPayRow}`,
            [[payId, m.name, FEE, ...months.map(() => ''), totalFormula]]);
          const emptyMonths = {};
          months.forEach(mo => { emptyMonths[mo] = ''; });
          STATE.allPayments.push({ row: newPayRow, name: m.name, amount: String(FEE), months: emptyMonths, total: '0' });
          _reactivateNote = ' (session sheet mein nayi row add ho gayi)';
        }
      }
    }

    STATE.allMembers[idx].status = finalStatus;
    STATE.allMembers[idx].type   = finalType;
    STATE.allMembers[idx].doe    = newDoe;
    saveCache(STATE.currentSession.label);
    _trackHistory('Member Updated', `${m.name} — Status: ${finalStatus}, Type: ${finalType}`, true);
    _pushNotify('Member Update! ✏️', `${m.name} ki profile AI se update hui`);
    renderMembers();
    return { ok: true, message: `✅ **${m.name}** update ho gaye — Status: ${finalStatus}, Type: ${finalType}.${_reactivateNote}` };
  } catch (e) {
    return { ok: false, error: e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein.' : 'Error: ' + e.message };
  }
}

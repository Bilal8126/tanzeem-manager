function renderMembers() {
  const q = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const list = STATE.allMembers.filter(m => {
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.mobile.includes(q);
    const matchF = STATE.memberFilter === 'all'
      || (STATE.memberFilter === 'Active'   && m.status === 'Active')
      || (STATE.memberFilter === 'Inactive' && m.status !== 'Active')
      || (STATE.memberFilter === 'Regular'  && (m.type || 'Regular') === 'Regular')
      || (STATE.memberFilter === 'Donor'    && m.type === 'Donor');
    return matchQ && matchF;
  });

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
            </div>
            <div class="member-sub">${m.mobile || 'No mobile'}</div>
            ${m.address ? `<div class="member-sub">${m.address}</div>` : ''}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`;
      }).join('');
}

function setMemberFilter(f, el) {
  STATE.memberFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderMembers();
}

function filterMembers() { renderMembers(); }

// ── Member Profile Modal ──────────────────────────────────

function openMemberProfile(idx) {
  const member = STATE.allMembers[idx];
  if (!member) return;

  const payIdx     = STATE.allPayments.findIndex(p => nameMatch(p.name, member.name));
  const payRec     = payIdx !== -1 ? STATE.allPayments[payIdx] : null;
  const hasToken   = !!STATE.accessToken;
  const isActive   = member.status === 'Active';
  const isRegular  = (member.type || 'Regular') === 'Regular';
  const canEdit    = payIdx !== -1 && hasToken && isActive && isRegular;
  const needsSync  = payIdx !== -1 && !hasToken && isActive && isRegular;
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

      let chip, amt;
      if (paid && !past) {
        chip = `<span class="txn-chip txn-chip--paid">↑ Advance</span>`;
        amt  = `<span class="txn-amt txn-amt--paid">+${formatCurrency(FEE)}</span>`;
      } else if (paid) {
        chip = `<span class="txn-chip txn-chip--paid">✓ Paid</span>`;
        amt  = `<span class="txn-amt txn-amt--paid">+${formatCurrency(FEE)}</span>`;
      } else if (!past) {
        chip = `<span class="txn-chip txn-chip--upcoming">Upcoming</span>`;
        amt  = `<span class="txn-amt txn-amt--muted">—</span>`;
      } else {
        chip = `<span class="txn-chip txn-chip--unpaid">✗ Unpaid</span>`;
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
  const p = STATE.allPayments[payIdx];
  if (!p) return;
  const memberRec = STATE.allMembers.find(m => nameMatch(m.name, p.name));
  if (memberRec && memberRec.status !== 'Active') {
    showToast('Inactive member ko pehle Active karein', 'error'); return;
  }
  if (memberRec && (memberRec.type || 'Regular') !== 'Regular') {
    showToast('Donor member ki payment mark nahi ho sakti', 'error'); return;
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
        showToast(newVal === 'Paid' ? '✅ Paid ho gaya!' : '✗ Unpaid ho gaya!');
        openMemberProfile(memberIdx);
      } catch(e) {
        showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
      }
    }
  );
}

// ── Member Edit ───────────────────────────────────────────

let _editMemberStatus = null;
let _editMemberType   = null;

function openEditMember(idx) {
  const m = STATE.allMembers[idx];
  if (!m) return;
  _editMemberStatus = m.status;
  _editMemberType   = m.type || 'Regular';
  document.getElementById('memberProfileContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Edit Member</div>
      <button class="close-btn" onclick="openMemberProfile(${idx})">×</button>
    </div>
    <div class="form-group">
      <label>Naam</label>
      <input id="em_name" value="${m.name.replace(/"/g, '&quot;')}" placeholder="Naam likhein...">
    </div>
    <div class="form-group">
      <label>Mobile Number</label>
      <input id="em_mobile" type="tel" value="${(m.mobile || '').replace(/"/g, '&quot;')}" placeholder="Mobile number...">
    </div>
    <div class="form-group">
      <label>Status</label>
      <div style="display:flex;gap:8px">
        <button id="emStatusActive" class="btn ${m.status === 'Active' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditStatus('Active')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>Active</button>
        <button id="emStatusInactive" class="btn ${m.status !== 'Active' ? 'btn-danger' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditStatus('In Active')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>In Active</button>
      </div>
    </div>
    <div class="form-group">
      <label>Type</label>
      <div style="display:flex;gap:8px">
        <button id="emTypeRegular" class="btn ${(m.type||'Regular')==='Regular' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditType('Regular')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg> Regular</button>
        <button id="emTypeDonor"   class="btn ${m.type==='Donor' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setEditType('Donor')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> Donor</button>
      </div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="saveEditMember(${idx})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save Changes</button>
    <button class="btn btn-danger" style="width:100%;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="deleteMember(${idx})"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Member Delete Karein</button>
  `;
}

function setEditStatus(s) {
  _editMemberStatus = s;
  document.getElementById('emStatusActive').className   = 'btn ' + (s === 'Active' ? 'btn-primary'   : 'btn-secondary');
  document.getElementById('emStatusInactive').className = 'btn ' + (s !== 'Active' ? 'btn-danger' : 'btn-secondary');
}

function setEditType(t) {
  _editMemberType = t;
  document.getElementById('emTypeRegular').className = 'btn ' + (t === 'Regular' ? 'btn-primary' : 'btn-secondary');
  document.getElementById('emTypeDonor').className   = 'btn ' + (t === 'Donor'   ? 'btn-primary' : 'btn-secondary');
}

async function saveEditMember(idx) {
  const m = STATE.allMembers[idx];
  if (!m) return;
  if (!await _ensureWriteAccess()) return;
  const newName   = (document.getElementById('em_name').value   || '').trim();
  const newMobile = (document.getElementById('em_mobile').value || '').trim();
  const newStatus = _editMemberStatus || m.status;
  const newType   = _editMemberType   || (m.type || 'Regular');
  if (!newName) { showToast('Naam khali nahi ho sakta', 'error'); return; }
  const changes = [];
  if (newName   !== m.name)              changes.push(`Naam: <b>${m.name}</b> → <b>${newName}</b>`);
  if (newMobile !== (m.mobile || ''))    changes.push(`Mobile: <b>${m.mobile || '—'}</b> → <b>${newMobile || '—'}</b>`);
  if (newStatus !== m.status)            changes.push(`Status: <b>${m.status}</b> → <b>${newStatus}</b>`);
  if (newType   !== (m.type||'Regular')) changes.push(`Type: <b>${m.type||'Regular'}</b> → <b>${newType}</b>`);
  if (!changes.length) { openMemberProfile(idx); return; }
  showConfirm('Yeh changes save karein?', changes.join('<br>'), async () => {
    try {
      if (newName   !== m.name)              await sheetsPut(`Members List!B${m.row}`, [[newName]]);
      if (newMobile !== (m.mobile||''))      await sheetsPut(`Members List!C${m.row}`, [[newMobile]]);
      if (newStatus !== m.status)            await sheetsPut(`Members List!G${m.row}`, [[newStatus]]);
      if (newType   !== (m.type||'Regular')) await sheetsPut(`Members List!I${m.row}`, [[newType]]);
      STATE.allMembers[idx].name   = newName;
      STATE.allMembers[idx].mobile = newMobile;
      STATE.allMembers[idx].status = newStatus;
      STATE.allMembers[idx].type   = newType;
      saveCache(STATE.currentSession.label);
      showToast('Member update ho gaya! ✅');
      openMemberProfile(idx);
    } catch(e) {
      showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
    }
  });
}

async function deleteMember(idx) {
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
        showToast('Member delete ho gaya! 🗑');
        closeMemberProfile();
        renderMembers();
      } catch(e) {
        showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
      }
    }
  );
}

// ── Add New Member ────────────────────────────────────────

async function openAddMember() {
  if (!STATE.accessToken) await syncData();
  document.getElementById('memberProfileContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Naya Member Add Karein</div>
      <button class="close-btn" onclick="closeMemberProfile()">×</button>
    </div>
    <div class="form-group">
      <label>Naam *</label>
      <input id="nm_name" placeholder="Naam likhein...">
    </div>
    <div class="form-group">
      <label>Mobile Number</label>
      <input id="nm_mobile" type="tel" placeholder="Mobile number...">
    </div>
    <div class="form-group">
      <label>Date of Joining (DOJ)</label>
      <input id="nm_doj" type="date">
    </div>
    <div class="form-group">
      <label>Address</label>
      <input id="nm_address" placeholder="Ghar ka pata...">
    </div>
    <div class="form-group">
      <label>Aadhar Card</label>
      <div style="display:flex;gap:8px">
        <button id="nmAadharNo" class="btn btn-secondary" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setNewMemberAadhar('No')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>No</button>
        <button id="nmAadharYes" class="btn btn-secondary" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setNewMemberAadhar('Yes')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>Yes</button>
      </div>
    </div>
    <div class="form-group">
      <label>Type</label>
      <div style="display:flex;gap:8px">
        <button id="nmTypeRegular" class="btn btn-primary" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setNewMemberType('Regular')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg> Regular</button>
        <button id="nmTypeDonor"   class="btn btn-secondary" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setNewMemberType('Donor')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> Donor</button>
      </div>
    </div>
    <div class="form-group">
      <label>Status</label>
      <div style="display:flex;gap:8px">
        <button id="nmStatusActive" class="btn btn-primary" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setNewMemberStatus('Active')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>Active</button>
        <button id="nmStatusInactive" class="btn btn-secondary" style="flex:1;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px" onclick="setNewMemberStatus('In Active')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>In Active</button>
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

function setNewMemberStatus(s) {
  _newMemberStatus = s;
  document.getElementById('nmStatusActive').className   = 'btn ' + (s === 'Active' ? 'btn-primary'   : 'btn-secondary');
  document.getElementById('nmStatusInactive').className = 'btn ' + (s !== 'Active' ? 'btn-danger' : 'btn-secondary');
}

function setNewMemberType(t) {
  _newMemberType = t;
  document.getElementById('nmTypeRegular').className = 'btn ' + (t === 'Regular' ? 'btn-primary' : 'btn-secondary');
  document.getElementById('nmTypeDonor').className   = 'btn ' + (t === 'Donor'   ? 'btn-primary' : 'btn-secondary');
}

function setNewMemberAadhar(v) {
  _newMemberAadhar = v;
  document.getElementById('nmAadharNo').className  = 'btn ' + (v === 'No'  ? 'btn-danger'   : 'btn-secondary');
  document.getElementById('nmAadharYes').className = 'btn ' + (v === 'Yes' ? 'btn-primary' : 'btn-secondary');
}

function saveNewMember() {
  const name   = (document.getElementById('nm_name').value   || '').trim();
  const mobile = (document.getElementById('nm_mobile').value || '').trim();
  const doj    = (document.getElementById('nm_doj').value    || '').trim();
  const address= (document.getElementById('nm_address').value|| '').trim();
  const aadhar = _newMemberAadhar;
  const status = _newMemberStatus;
  const type   = _newMemberType;
  if (!name) { showToast('Naam likhein', 'error'); return; }
  const nextId = STATE.allMembers.length + 1;
  showConfirm(
    'Member add karein?',
    `<b>${name}</b>${mobile ? '<br>📞 ' + mobile : ''}${doj ? '<br>DOJ: ' + doj : ''}${address ? '<br>🏠 ' + address : ''}<br>Type: ${type}<br>Status: ${status}`,
    async () => {
      try {
        // Sheet columns: A=#, B=Name, C=Mobile, D=DOJ, E=Address, F=Aadhar, G=Status, H=DOE, I=Type
        await sheetsAppend('Members List', [[nextId, name, mobile, doj, address, aadhar, status, '', type]]);
        const newRow = STATE.allMembers.length > 0
          ? Math.max(...STATE.allMembers.map(m => m.row)) + 1
          : 2;
        STATE.allMembers.push({ row: newRow, id: String(nextId), name, mobile, doj, address, aadhar, status, doe: '', type });
        saveCache(STATE.currentSession.label);
        showToast('Member add ho gaya! ✅');
        fetch(CONFIG.WORKER_URL + '/api/push/notify', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ title: 'Naya Member Add Hua!', body: `${name} Tanzeem mein shamil ho gaye ✅` })
        }).catch(() => {});
        closeMemberProfile();
        renderMembers();
      } catch(e) {
        showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
      }
    }
  );
}

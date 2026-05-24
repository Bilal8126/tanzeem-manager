function renderMembers() {
  const q = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const list = STATE.allMembers.filter(m => {
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.mobile.includes(q);
    const matchF = STATE.memberFilter === 'all'
      || (STATE.memberFilter === 'Active' && m.status === 'Active')
      || (STATE.memberFilter === 'Inactive' && m.status !== 'Active');
    return matchQ && matchF;
  });

  const isActive = m => m.status === 'Active';
  const initials = name => name.trim().split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  document.getElementById('membersList').innerHTML = list.length === 0
    ? `<div class="empty-state"><div class="empty-state-icon">👤</div><p>No members found</p></div>`
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

  const payRec    = STATE.allPayments.find(p => p.name === member.name);
  // Fall back to month list from any payment record if this member has no row
  const monthKeys = payRec
    ? Object.keys(payRec.months)
    : (STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : []);
  const isActive  = member.status === 'Active';
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

      monthRows += `
        <div class="txn-row${!past ? ' txn-row--future' : ''}">
          <span class="txn-month">${mo}</span>
          ${chip}
          ${amt}
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
            ${member.mobile ? `<span style="font-size:12px;color:var(--muted)">${member.mobile}</span>` : ''}
          </div>
          ${member.address ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${member.address}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="close-btn" style="background:#f0fdf4;color:var(--green-dark);font-size:15px" onclick="openEditMember(${idx})">✏</button>
        <button class="close-btn" onclick="closeMemberProfile()">×</button>
      </div>
    </div>

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

  document.getElementById('memberProfileOverlay').classList.add('open');
}

function closeMemberProfile() {
  document.getElementById('memberProfileOverlay').classList.remove('open');
}

function shareWhatsAppMember(idx) {
  const member = STATE.allMembers[idx];
  if (!member) return;

  const payRec    = STATE.allPayments.find(p => p.name === member.name);
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

  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

// ── Member Edit ───────────────────────────────────────────

let _editMemberStatus = null;

function openEditMember(idx) {
  const m = STATE.allMembers[idx];
  if (!m) return;
  _editMemberStatus = m.status;
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
      <label>Status</label>
      <div style="display:flex;gap:8px">
        <button id="emStatusActive" class="btn ${m.status === 'Active' ? 'btn-primary' : 'btn-secondary'}" style="flex:1;padding:10px" onclick="setEditStatus('Active')">✅ Active</button>
        <button id="emStatusInactive" class="btn ${m.status !== 'Active' ? 'btn-danger' : 'btn-secondary'}" style="flex:1;padding:10px" onclick="setEditStatus('Inactive')">❌ Inactive</button>
      </div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:6px" onclick="saveEditMember(${idx})">💾 Save Changes</button>
  `;
}

function setEditStatus(s) {
  _editMemberStatus = s;
  document.getElementById('emStatusActive').className   = 'btn ' + (s === 'Active' ? 'btn-primary'   : 'btn-secondary');
  document.getElementById('emStatusInactive').className = 'btn ' + (s !== 'Active' ? 'btn-danger' : 'btn-secondary');
}

function saveEditMember(idx) {
  const m = STATE.allMembers[idx];
  if (!m) return;
  if (!STATE.accessToken) { showToast('Write ke liye pehle Sync karein 🔄', 'error'); return; }
  const newName   = (document.getElementById('em_name').value || '').trim();
  const newStatus = _editMemberStatus || m.status;
  if (!newName) { showToast('Naam khali nahi ho sakta', 'error'); return; }
  const changes = [];
  if (newName !== m.name)     changes.push(`Naam: <b>${m.name}</b> → <b>${newName}</b>`);
  if (newStatus !== m.status) changes.push(`Status: <b>${m.status}</b> → <b>${newStatus}</b>`);
  if (!changes.length) { openMemberProfile(idx); return; }
  showConfirm('Yeh changes save karein?', changes.join('<br>'), async () => {
    try {
      if (newName !== m.name)     await sheetsPut(`Members List!B${m.row}`, [[newName]]);
      if (newStatus !== m.status) await sheetsPut(`Members List!G${m.row}`, [[newStatus]]);
      STATE.allMembers[idx].name   = newName;
      STATE.allMembers[idx].status = newStatus;
      saveCache(STATE.currentSession.label);
      showToast('Member update ho gaya! ✅');
      openMemberProfile(idx);
    } catch(e) {
      showToast(e.message === 'AUTH_EXPIRED' ? 'Session expired — sync karein' : 'Error: ' + e.message, 'error');
    }
  });
}

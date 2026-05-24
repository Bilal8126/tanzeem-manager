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

  const payRec   = STATE.allPayments.find(p => p.name === member.name);
  const isActive = member.status === 'Active';
  const initials = n => n.trim().split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();

  let paidCount = 0, unpaidCount = 0, totalPaid = 0, totalDue = 0;
  let monthRows = '';

  if (payRec) {
    const months = Object.keys(payRec.months);
    months.forEach(mo => {
      const paid = isPaid(payRec.months[mo]);
      const past = isPastOrCurrent(mo);

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
      <button class="close-btn" onclick="closeMemberProfile()">×</button>
    </div>

    ${payRec ? `
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
      ${payRec ? monthRows : `<div style="text-align:center;padding:24px;color:#94a3b8;font-size:13px">No payment data</div>`}
    </div>
  `;

  document.getElementById('memberProfileOverlay').classList.add('open');
}

function closeMemberProfile() {
  document.getElementById('memberProfileOverlay').classList.remove('open');
}


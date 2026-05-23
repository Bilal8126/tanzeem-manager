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
      list.map(m => `
        <div class="member-card">
          <div class="member-avatar ${isActive(m) ? '' : 'inactive'}">${initials(m.name)}</div>
          <div class="member-info">
            <div class="member-name">
              ${m.name}
              <span class="badge ${isActive(m) ? 'badge-active' : 'badge-inactive'}">${m.status}</span>
            </div>
            <div class="member-sub">${m.mobile || 'No mobile'}</div>
            ${m.address ? `<div class="member-sub">${m.address}</div>` : ''}
          </div>
        </div>`).join('');
}

function setMemberFilter(f, el) {
  STATE.memberFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderMembers();
}

function filterMembers() { renderMembers(); }


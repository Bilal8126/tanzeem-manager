function renderDashboard() {
  const regular         = STATE.allMembers.filter(m => (m.type || 'Regular') === 'Regular');
  const donors          = STATE.allMembers.filter(m => m.type === 'Donor');
  const regularActive   = regular.filter(m => m.status === 'Active').length;
  const regularInactive = regular.length - regularActive;
  const active          = STATE.allMembers.filter(m => m.status === 'Active').length;
  const inactive        = STATE.allMembers.length - active;
  const s             = STATE.sessionSummary;
  const months        = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const monthlyTotals = months.map(m =>
    STATE.allPayments.reduce((sum, p) =>
      sum + (p.months[m] === 'Paid' ? (parseInt(p.amount) || 150) : 0), 0)
  );

  const balanceColor = s.balance < 0 ? '#e53e3e' : '#fff';

  document.getElementById('dashboardContent').innerHTML = `
    <div class="metrics">
      <div class="metric green">
        <div class="metric-label">Total Members</div>
        <div class="metric-value">${STATE.allMembers.length}</div>
        <div class="metric-bg-icon">👥</div>
      </div>
      <div class="metric blue">
        <div class="metric-label">Regular Active</div>
        <div class="metric-value">${regularActive}</div>
        <div class="metric-bg-icon">✅</div>
      </div>
      <div class="metric orange">
        <div class="metric-label">Grand Total</div>
        <div class="metric-value sm">${formatCurrency(s.grandTotal)}</div>
        <div class="metric-bg-icon">💰</div>
      </div>
      <div class="metric purple">
        <div class="metric-label">Balance</div>
        <div class="metric-value sm" style="color:${balanceColor}">${formatCurrency(s.balance)}</div>
        <div class="metric-bg-icon">📊</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Monthly Collection — ${STATE.currentSession.label}</div>
      <div style="position:relative;height:190px"><canvas id="dashChart"></canvas></div>
    </div>

    <div class="card">
      <div class="card-title">Session Summary</div>
      <div class="stat-row"><span class="muted">Last year balance</span><span style="font-weight:600">${formatCurrency(s.lastYearBalance)}</span></div>
      <div class="stat-row"><span class="muted">Current collected</span><span style="font-weight:600">${formatCurrency(s.currentTotal)}</span></div>
      <div class="stat-row"><span class="muted">Total donations</span><span style="font-weight:600;color:#1a6b3c">${formatCurrency(s.totalDonation)}</span></div>
      <div class="stat-row"><span class="muted">Grand total</span><span style="font-weight:600">${formatCurrency(s.grandTotal)}</span></div>
      <div class="stat-row"><span class="muted">Total expenses</span><span style="font-weight:600;color:#e53e3e">${formatCurrency(s.totalExpense)}</span></div>
      <div class="stat-row total-row">
        <span>Balance</span>
        <span style="color:${s.balance < 0 ? '#e53e3e' : '#1a6b3c'}">${formatCurrency(s.balance)}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Member Overview</div>
      <div class="stat-row"><span class="muted" style="font-weight:600">👤 Regular</span><span style="font-weight:700">${regular.length}</span></div>
      <div class="stat-row" style="padding-left:14px"><span class="muted">Active</span><span style="color:#1a6b3c;font-weight:600">${regularActive}</span></div>
      <div class="stat-row" style="padding-left:14px"><span class="muted">In Active</span><span style="color:#e53e3e;font-weight:600">${regularInactive}</span></div>
      <div class="stat-row"><span class="muted" style="font-weight:600">🎁 Donors</span><span style="color:#1d4ed8;font-weight:700">${donors.length}</span></div>
      <div class="stat-row total-row"><span>Total Members</span><span>${STATE.allMembers.length}</span></div>
    </div>`;

  setTimeout(() => buildDashChart(months, monthlyTotals), 80);
}

function buildDashChart(months, data) {
  const ctx = document.getElementById('dashChart');
  if (!ctx) return;
  if (STATE.dashChart) { STATE.dashChart.destroy(); STATE.dashChart = null; }
  STATE.dashChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Rs.',
        data,
        backgroundColor: months.map((_, i) =>
          i === data.indexOf(Math.max(...data))
            ? '#0f4a29'
            : 'rgba(26,107,60,0.75)'
        ),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' Rs.' + ctx.parsed.y.toLocaleString()
          },
          backgroundColor: '#1a6b3c',
          titleColor: '#fff',
          bodyColor: '#fff',
          cornerRadius: 8,
          padding: 10,
        }
      },
      scales: {
        y: {
          ticks: { callback: v => 'Rs.' + (v/1000).toFixed(0) + 'k', font: { size: 10 }, color: '#9ca3af' },
          grid: { color: '#f3f4f6' },
          border: { display: false }
        },
        x: {
          ticks: { font: { size: 10 }, color: '#9ca3af' },
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });
}

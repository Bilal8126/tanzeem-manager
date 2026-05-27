const _chatHistory = [];

function buildDataContext() {
  const activeMembers  = STATE.allMembers.filter(m => m.status === 'Active');
  const inactiveMembers = STATE.allMembers.filter(m => m.status !== 'Active');

  const totalDonations = STATE.allDonations.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const totalExpenses  = STATE.allExpenses.reduce((s, e)  => s + (parseFloat(e.amount) || 0), 0);

  const months       = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const currentMonth = months.length > 0 ? detectCurrentMonth(months) : 'N/A';

  // Use buildMemberStats() — same function as Payments screen — so AI sees identical data.
  // It handles: blank = unpaid, isPastOrCurrent filtering, ghost members, inactive members.
  const stats         = STATE.allPayments.length > 0 ? buildMemberStats(STATE.allPayments) : [];
  const activeStats   = stats.filter(s => !s.isInactive);
  const inactiveStats = stats.filter(s =>  s.isInactive);

  const totalCollected = stats.reduce((s, m) => s + m.totalPaid, 0);
  const balance        = totalCollected + totalDonations - totalExpenses;

  // Monthly breakdown — paid count / unpaid count per month
  const monthSummary = months.map(m => {
    const past   = isPastOrCurrent(m);
    const paidCt = stats.filter(s => isPaid(s.months[m])).length;
    // blank / null / anything ≠ 'Paid' → unpaid (only for past months)
    const unpaidCt = past ? stats.filter(s => !isPaid(s.months[m])).length : 0;
    const tag = m === currentMonth ? ' ← THIS MONTH' : (!past ? ' (future)' : '');
    return `  ${m}${tag}: ${paidCt} paid, ${unpaidCt} unpaid`;
  }).join('\n');

  // Per-member detail — uses pre-computed paidList / unpaidList from buildMemberStats
  // paidList = months with 'Paid'; unpaidList = past months without 'Paid' (blank = unpaid)
  const memberDetails = stats.map(s => {
    const label = s.isInactive ? '[Inactive]' : '[Active]';
    return `  ${s.name} ${label}: Paid: ${s.paidList.join(', ') || 'none'} | Unpaid: ${s.unpaidList.join(', ') || 'none'} | Total collected: Rs.${s.totalPaid} | Total pending: Rs.${s.totalPending}`;
  }).join('\n');

  // Top members: paid in every past month
  const pastMonths = months.filter(isPastOrCurrent);
  const topMembers = activeStats.filter(s =>
    pastMonths.length > 0 && pastMonths.every(m => isPaid(s.months[m]))
  ).map(s => s.name);

  // Donation list
  const donationList = STATE.allDonations.map(d =>
    `  ${d.donorName || d.name || 'Unknown'}: Rs.${d.amount} (${d.date || ''})`
  ).join('\n') || '  None';

  // Expense list
  const expenseList = STATE.allExpenses.map(e =>
    `  ${e.description || e.title || 'Expense'}: Rs.${e.amount} (${e.date || ''})`
  ).join('\n') || '  None';

  const now          = new Date();
  const todayStr     = now.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  const sessionLabel = STATE.currentSession?.label || 'Unknown';

  return `You are a smart assistant for Tanzeem Abd e Mustafa, a community organization.
IMPORTANT: Always reply in Hinglish (mix of Hindi and English). Be friendly, clear, and helpful. Use "Rs." for amounts.

=== DATE & SESSION ===
Today's date: ${todayStr}
Current session: ${sessionLabel}
Session months (in order): ${months.join(', ') || 'N/A'}
Current month in this session: ${currentMonth}
RULE: When user says "is mahine" or "this month" — always mean "${currentMonth}".
RULE: "Paid" = paid. Blank / empty / null / "Un Paid" = UNPAID. Never say someone is paid if their cell is blank.

=== OVERVIEW ===
Total members: ${STATE.allMembers.length} (Active: ${activeMembers.length}, Inactive: ${inactiveMembers.length})
Inactive members: ${inactiveMembers.map(m => m.name).join(', ') || 'none'}
Total subscription collected: Rs.${totalCollected}
Total donations: Rs.${totalDonations}
Total expenses: Rs.${totalExpenses}
Balance: Rs.${balance}

=== TOP MEMBERS (paid every past month so far) ===
${topMembers.length > 0 ? topMembers.join(', ') : 'Koi nahi jisne sab past months pay kiye ho'}

=== MONTHLY BREAKDOWN ===
${monthSummary || 'No data'}

=== EVERY MEMBER — PAID & UNPAID MONTHS ===
(unpaidList = months where payment is blank or not marked Paid)
${memberDetails || 'No data'}

=== DONATIONS ===
${donationList}

=== EXPENSES ===
${expenseList}

Answer any question about members, payments, balance, or tanzeem. If asked in Hindi/Urdu/Hinglish, reply in Hinglish.`;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if (!q) return;

  input.value = '';
  appendMessage('user', q);
  _chatHistory.push({ role: 'user', parts: [{ text: q }] });
  appendMessage('ai', '...');

  try {
    const res = await fetch(CONFIG.WORKER_URL + '/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildDataContext() }] },
        contents: _chatHistory,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });

    if (!res.ok) throw new Error('Worker error ' + res.status);

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Koi response nahi mila.';
    updateLastAiMessage(text);
    _chatHistory.push({ role: 'model', parts: [{ text }] });
  } catch (e) {
    updateLastAiMessage('Error: ' + e.message);
  }
}

function quickAsk(q) {
  document.getElementById('chatInput').value = q;
  sendChat();
}

function clearChat() {
  _chatHistory.length = 0; // wipe conversation history
  const c = document.getElementById('chatMessages');
  if (c) c.innerHTML = `
    <div class="msg ai">
      <div class="msg-bubble">Assalamu Alaikum! I am your Tanzeem assistant. Ask me anything about members, payments, or finances.</div>
    </div>`;
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = `<div class="msg-bubble">${text}</div>`;
  const c = document.getElementById('chatMessages');
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function updateLastAiMessage(text) {
  const msgs = document.querySelectorAll('#chatMessages .msg.ai');
  const last = msgs[msgs.length - 1];
  if (last) last.querySelector('.msg-bubble').textContent = text;
}

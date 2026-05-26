const _chatHistory = [];

function buildDataContext() {
  const active   = STATE.allMembers.filter(m => m.status === 'Active');
  const inactive = STATE.allMembers.filter(m => m.status !== 'Active');

  const totalCollected = STATE.allPayments.reduce((s, p) => s + (parseInt(p.total) || 0), 0);
  const totalDonations = STATE.allDonations.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const totalExpenses  = STATE.allExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const balance        = totalCollected + totalDonations - totalExpenses;

  const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];

  // Monthly collection summary
  const monthSummary = months.map(m => {
    const paid   = STATE.allPayments.filter(p => p.months[m] === 'Paid').length;
    const unpaid = STATE.allPayments.filter(p => p.months[m] === 'Un Paid' || p.months[m] === 'UnPaid').length;
    return `  ${m}: ${paid} paid (Rs.${paid * 150}), ${unpaid} unpaid`;
  }).join('\n');

  // Per-member payment detail
  const memberDetails = STATE.allPayments.map(p => {
    const paidMonths   = months.filter(m => p.months[m] === 'Paid');
    const unpaidMonths = months.filter(m => p.months[m] === 'Un Paid' || p.months[m] === 'UnPaid');
    return `  ${p.name}: Total Rs.${p.total} | Paid: ${paidMonths.join(', ') || 'none'} | Unpaid: ${unpaidMonths.join(', ') || 'none'}`;
  }).join('\n');

  // Top members: paid in every month
  const topMembers = STATE.allPayments.filter(p =>
    months.length > 0 && months.every(m => p.months[m] === 'Paid')
  ).map(p => p.name);

  // Donation list
  const donationList = STATE.allDonations.map(d =>
    `  ${d.donorName || d.name || 'Unknown'}: Rs.${d.amount} (${d.date || ''})`
  ).join('\n') || '  None';

  // Expense list
  const expenseList = STATE.allExpenses.map(e =>
    `  ${e.description || e.title || 'Expense'}: Rs.${e.amount} (${e.date || ''})`
  ).join('\n') || '  None';

  return `You are a smart assistant for Tanzeem Abd e Mustafa, a community organization. Session: ${STATE.currentSession}.

IMPORTANT: Always reply in Hinglish (mix of Hindi and English). Be friendly, clear, and helpful. Use "Rs." for amounts.

=== OVERVIEW ===
Total members: ${STATE.allMembers.length} (Active: ${active.length}, Inactive: ${inactive.length})
Inactive members: ${inactive.map(m => m.name).join(', ') || 'none'}
Total subscription collected: Rs.${totalCollected}
Total donations: Rs.${totalDonations}
Total expenses: Rs.${totalExpenses}
Balance: Rs.${balance}

=== TOP MEMBERS (paid every month) ===
${topMembers.length > 0 ? topMembers.join(', ') : 'Koi nahi jisne sab months pay kiye ho'}

=== MONTHLY BREAKDOWN ===
${monthSummary || 'No data'}

=== MEMBER PAYMENT DETAILS ===
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

function buildDataContext() {
  const active = STATE.allMembers.filter(m => m.status === 'Active').length;
  const inactive = STATE.allMembers.filter(m => m.status !== 'Active');
  const totalCollected = STATE.allPayments.reduce((s, p) => s + (parseInt(p.total) || 0), 0);
  const totalDonations = STATE.allDonations.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const totalExpenses  = STATE.allExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];

  const monthSummary = months.map(m => {
    const paid   = STATE.allPayments.filter(p => p.months[m] === 'Paid').length;
    const unpaid = STATE.allPayments.filter(p => p.months[m] === 'Un Paid' || p.months[m] === 'UnPaid').length;
    return `${m}: ${paid} paid, ${unpaid} unpaid, Rs.${paid * 150} collected`;
  }).join('\n');

  const memberTotals = STATE.allPayments.map(p => `${p.name}: Rs.${p.total}`).join('\n');

  return `You are a helpful assistant for Tanzeem Abd e Mustafa NGO, Bisauli. Session: ${STATE.currentSession}.

SUMMARY:
Total members: ${STATE.allMembers.length}, Active: ${active}, Inactive: ${inactive.length}
Inactive members: ${inactive.map(m => m.name).join(', ') || 'none'}
Total collected: Rs.${totalCollected}
Total donations: Rs.${totalDonations}
Total expenses: Rs.${totalExpenses}
Balance: Rs.${totalCollected + totalDonations - totalExpenses}

MONTHLY BREAKDOWN:
${monthSummary}

MEMBER TOTALS:
${memberTotals}

Answer clearly and concisely in English. Be friendly and helpful.`;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  appendMessage('user', q);
  appendMessage('ai', 'Thinking...');
  try {
    const res = await fetch(`${CONFIG.GEMINI_URL}?key=${CONFIG.GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildDataContext() }] },
        contents: [{ parts: [{ text: q }] }]
      })
    });
    const d = await res.json();
    const reply = d.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, could not get a response.';
    updateLastAiMessage(reply);
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

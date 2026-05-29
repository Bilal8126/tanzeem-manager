const _chatHistory = [];

function buildDataContext() {
  const activeMembers  = STATE.allMembers.filter(m => m.status === 'Active');
  const inactiveMembers = STATE.allMembers.filter(m => m.status !== 'Active');

  const ss             = STATE.sessionSummary || {};
  const totalCollected = ss.currentTotal    || 0;
  const totalDonations = ss.totalDonation   || 0;
  const totalExpenses  = ss.totalExpense     || 0;
  const prevBalance    = ss.lastYearBalance  || 0;
  const balance        = ss.balance          || (prevBalance + totalCollected + totalDonations - totalExpenses);

  const months       = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const currentMonth = months.length > 0 ? detectCurrentMonth(months) : 'N/A';

  // Use buildMemberStats() — same function as Payments screen — so AI sees identical data.
  // It handles: blank = unpaid, isPastOrCurrent filtering, ghost members, inactive members.
  const stats         = STATE.allPayments.length > 0 ? buildMemberStats(STATE.allPayments) : [];
  const activeStats   = stats.filter(s => !s.isInactive);
  const inactiveStats = stats.filter(s =>  s.isInactive);

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
    `  ${d.donor || 'Unknown'}: Rs.${d.amount}${d.note ? ' (' + d.note + ')' : ''} (${d.date || ''})`
  ).join('\n') || '  None';

  // Expense list
  const expenseList = STATE.allExpenses.map(e =>
    `  ${e.desc || 'Expense'}: Rs.${e.amount} (${e.date || ''})`
  ).join('\n') || '  None';

  const now          = new Date();
  const todayStr     = now.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
  const sessionLabel = STATE.currentSession?.label || 'Unknown';

  // Full member name list for disambiguation
  const allMemberNames = stats.map(s => s.name.replace(/\(.*?\)/g, '').trim()).join(', ');

  return `You are a smart assistant for Tanzeem Abd e Mustafa, a community organization.
IMPORTANT: Always reply in Hinglish (mix of Hindi and English). Be friendly, clear, and helpful. Use "Rs." for amounts.

=== DISAMBIGUATION RULE (very important) ===
Full member list: ${allMemberNames}
When a user mentions a name (e.g. "Bilal", "Ahmed"), search the member list above for all members whose name CONTAINS that word (case-insensitive).
- If EXACTLY ONE member matches → answer about that member directly.
- If TWO OR MORE members match → DO NOT guess. Ask the user which one they mean.
  Example reply: "Aap kaunse Bilal ke baare mein pooch rahe hain?\n1. Bilal Ansari\n2. Bilal Khan\nNumber batayein ya poora naam likhein."
- If NO member matches → say "Yeh naam members mein nahi mila. Kripya poora naam likhein."
Always apply this rule before answering any member-specific question.

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
${prevBalance > 0 ? `Previous year balance: Rs.${prevBalance}` : ''}
Total subscription collected: Rs.${totalCollected}
Total donations: Rs.${totalDonations}
Total expenses: Rs.${totalExpenses}
Closing balance: Rs.${balance}
Balance formula: ${prevBalance > 0 ? `Rs.${prevBalance} (prev year) + ` : ''}Rs.${totalCollected} (collected) + Rs.${totalDonations} (donations) - Rs.${totalExpenses} (expenses) = Rs.${balance}

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

let _dotsTimer = null;
function _animateDots() {
  clearInterval(_dotsTimer);
  const dots = ['.', '..', '...'];
  let i = 0;
  _dotsTimer = setInterval(() => {
    const el = document.getElementById('aiDots');
    if (!el) { clearInterval(_dotsTimer); return; }
    el.textContent = dots[i++ % 3];
  }, 500);
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if (!q) return;

  input.value = '';
  appendMessage('user', q);
  _chatHistory.push({ role: 'user', parts: [{ text: q }] });
  appendMessage('ai', '<span style="color:#94a3b8">Soch raha hoon<span id="aiDots">...</span></span>');
  _animateDots();

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

    if (res.status === 503) throw new Error('503');
    if (!res.ok) throw new Error('ERR_' + res.status);

    const data = await res.json();
    if (data.error) throw new Error('API_' + (data.error.code || 500));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Koi response nahi mila.';
    updateLastAiMessage(text);
    _chatHistory.push({ role: 'model', parts: [{ text }] });
  } catch (e) {
    const msg = e.message === '503' || e.message.includes('503')
      ? '⚠️ Server thoda busy hai. Please kuch seconds baad dobara try karein. 🙏'
      : '⚠️ Kuch gadbad ho gayi. Please dobara try karein.';
    updateLastAiMessage(msg);
    _chatHistory.pop(); // remove failed user message from history
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

// Lightweight markdown → HTML (for AI responses only)
function _mdToHtml(text) {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline = s => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>');

  const lines = text.split('\n');
  const out = [];
  let inUl = false, inOl = false;

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^[-*•]\s+/.test(line)) {
      if (!inUl) { closeList(); out.push('<ul style="margin:4px 0 4px 14px;padding:0">'); inUl = true; }
      out.push(`<li>${inline(esc(line.replace(/^[-*•]\s+/, '')))}</li>`);
    } else if (/^\d+[.)]\s+/.test(line)) {
      if (!inOl) { closeList(); out.push('<ol style="margin:4px 0 4px 14px;padding:0">'); inOl = true; }
      out.push(`<li>${inline(esc(line.replace(/^\d+[.)]\s+/, '')))}</li>`);
    } else if (/^#{1,3}\s/.test(line)) {
      closeList();
      out.push(`<div style="font-weight:700;margin:6px 0 2px">${inline(esc(line.replace(/^#+\s+/, '')))}</div>`);
    } else if (line === '') {
      closeList();
      out.push('<div style="height:6px"></div>');
    } else {
      closeList();
      out.push(`<div>${inline(esc(line))}</div>`);
    }
  }
  closeList();
  return out.join('');
}

function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  // User messages: plain text (safe). AI messages: rendered markdown.
  if (role === 'user') bubble.textContent = text;
  else bubble.innerHTML = _mdToHtml(text);
  div.appendChild(bubble);
  const c = document.getElementById('chatMessages');
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function updateLastAiMessage(text) {
  clearInterval(_dotsTimer);
  const msgs = document.querySelectorAll('#chatMessages .msg.ai');
  const last = msgs[msgs.length - 1];
  if (last) last.querySelector('.msg-bubble').innerHTML = _mdToHtml(text);
}

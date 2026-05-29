const _chatHistory = [];

// ── Prompt cache (Map keyed by data-state + question type) ────
const _promptCache = new Map();
let   _promptDataKey = '';

function _getDataKey() {
  return [
    STATE.currentSession?.label,
    STATE.allMembers.length,
    STATE.allPayments.length,
    STATE.allDonations.length,
    STATE.allExpenses.length,
  ].join('|');
}

// ── Shared computed data (built once per cache cycle) ─────────
function _buildShared() {
  const activeMembers   = STATE.allMembers.filter(m => m.status === 'Active');
  const inactiveMembers = STATE.allMembers.filter(m => m.status !== 'Active');
  const ss              = STATE.sessionSummary || {};
  const totalCollected  = ss.currentTotal    || 0;
  const totalDonations  = ss.totalDonation   || 0;
  const totalExpenses   = ss.totalExpense    || 0;
  const prevBalance     = ss.lastYearBalance || 0;
  const balance         = ss.balance || (prevBalance + totalCollected + totalDonations - totalExpenses);
  const months          = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
  const currentMonth    = months.length > 0 ? detectCurrentMonth(months) : 'N/A';
  const stats           = STATE.allPayments.length > 0 ? buildMemberStats(STATE.allPayments) : [];
  const pastMonths      = months.filter(isPastOrCurrent);
  const todayStr        = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const sessionLabel    = STATE.currentSession?.label || 'Unknown';
  return {
    activeMembers, inactiveMembers, ss,
    totalCollected, totalDonations, totalExpenses, prevBalance, balance,
    months, currentMonth, stats, pastMonths, todayStr, sessionLabel,
  };
}

// ── Prompt section builders ───────────────────────────────────
function _pBase() {
  return `You are a smart assistant for Tanzeem Abd-e-Mustafa. Always reply in Hinglish (Hindi+English mix). Be friendly, clear, and helpful. Use "Rs." for amounts.`;
}

function _pAppInfo(d) {
  return `=== APP & TANZEEM INFO ===
App: Tanzeem Manager | Developer: Bilal Ansari (unhone is app ko Tanzeem ke liye banaya)
Agar pooche "kisne banaya" ya "developer kaun" → "Yeh app Bilal Ansari ne banai hai."
Tanzeem: Abd-e-Mustafa Bisauli | Founded: 2023
Members: ${STATE.allMembers.length} (Active: ${d.activeMembers.length}, Inactive: ${d.inactiveMembers.length})
Founding: Mohsin Ansari, Javed Ansari, Moh. Hasnain Ansari, Bilal Ansari, Mubeen Ansari, Tofeeq Ansari, Altaf Ansari, Shahrukh Ansari
Maqsad: Gareebo ki madad, Masjid/Madrasa, Langar, Jaloos langar, Deen ki khidmat`;
}

function _pDisambiguation(d) {
  const names = d.stats.map(s => s.name.replace(/\(.*?\)/g, '').trim()).join(', ');
  return `=== NAME RULE ===
Members: ${names}
1 match → answer directly. 2+ matches → ask which one. 0 → say not found.`;
}

function _pSession(d) {
  return `=== SESSION ===
Today: ${d.todayStr} | Session: ${d.sessionLabel}
Months: ${d.months.join(', ') || 'N/A'} | Current: ${d.currentMonth}
"is mahine"/"this month" = "${d.currentMonth}". Blank/null = UNPAID.`;
}

function _pFinancials(d) {
  return `=== FINANCIALS ===
Active: ${d.activeMembers.length} | Inactive: ${d.inactiveMembers.length} (${d.inactiveMembers.map(m => m.name).join(', ') || 'none'})
${d.prevBalance > 0 ? `Prev year: Rs.${d.prevBalance} | ` : ''}Collected: Rs.${d.totalCollected} | Donations: Rs.${d.totalDonations} | Expenses: Rs.${d.totalExpenses} | Balance: Rs.${d.balance}
Formula: ${d.prevBalance > 0 ? `Rs.${d.prevBalance}+` : ''}Rs.${d.totalCollected}+Rs.${d.totalDonations}-Rs.${d.totalExpenses}=Rs.${d.balance}`;
}

function _pMonthly(d) {
  const rows = d.months.map(m => {
    const past     = isPastOrCurrent(m);
    const paidCt   = d.stats.filter(s => isPaid(s.months[m])).length;
    const unpaidCt = past ? d.stats.filter(s => !isPaid(s.months[m])).length : 0;
    const tag      = m === d.currentMonth ? ' ←NOW' : (!past ? '(future)' : '');
    return `  ${m}${tag}: ${paidCt}P ${unpaidCt}U`;
  }).join('\n');
  return `=== MONTHLY ===\n${rows || 'No data'}`;
}

function _pMembers(d, includeInactiveDetail = false) {
  const activeStats   = d.stats.filter(s => !s.isInactive);
  const inactiveStats = d.stats.filter(s =>  s.isInactive);
  const topMembers    = activeStats
    .filter(s => d.pastMonths.length > 0 && d.pastMonths.every(m => isPaid(s.months[m])))
    .map(s => s.name).join(', ');
  const activeRows = activeStats.map(s =>
    `  ${s.name}: P:${s.paidList.join(',') || '-'} U:${s.unpaidList.join(',') || '-'} Rs.${s.totalPaid}/${s.totalPending}`
  ).join('\n');
  // Inactive: name + total only (saves tokens). Full detail only when user asks specifically.
  const inactiveRows = inactiveStats.map(s =>
    includeInactiveDetail
      ? `  ${s.name}[I]: P:${s.paidList.join(',') || '-'} U:${s.unpaidList.join(',') || '-'} Rs.${s.totalPaid}`
      : `  ${s.name}[I]: Rs.${s.totalPaid} total paid`
  ).join('\n');
  return `=== TOP MEMBERS (all past months paid) ===
${topMembers || 'None yet'}

=== ACTIVE MEMBERS ===
(format: Paid months | Unpaid months | Collected/Pending)
${activeRows || 'No data'}

=== INACTIVE MEMBERS ===
${inactiveRows || 'None'}`;
}

function _pDonations() {
  const rows = STATE.allDonations.map(d =>
    `  ${d.donor || 'Unknown'}: Rs.${d.amount}${d.note ? ' (' + d.note + ')' : ''} ${d.date || ''}`
  ).join('\n') || '  None';
  return `=== DONATIONS ===\n${rows}`;
}

function _pExpenses() {
  const rows = STATE.allExpenses.map(e =>
    `  ${e.desc || 'Expense'}: Rs.${e.amount} ${e.date || ''}`
  ).join('\n') || '  None';
  return `=== EXPENSES ===\n${rows}`;
}

// ── Question classifier → picks minimal prompt sections ───────
function _classifyQuestion(q) {
  const ql = q.toLowerCase();
  // Tanzeem / app info
  if (/tanzeem kya|kisne banaya|developer|creator|history|founding|maqsad|kab shuru|about tanzeem/.test(ql))
    return 'tanzeem';
  // Donations or expenses
  if (/donation|expense|kharcha|chanda|kharch/.test(ql))
    return 'finance';
  // Specific member name detected
  if (STATE.allPayments.length > 0) {
    const stats = buildMemberStats(STATE.allPayments);
    const words = ql.split(/\s+/);
    const hit   = stats.some(s =>
      s.name.replace(/\(.*?\)/g, '').trim().toLowerCase()
        .split(/\s+/).some(part => part.length > 2 && words.includes(part))
    );
    if (hit) return 'member';
  }
  // General payment / month questions
  if (/paid|unpaid|payment|mahine|month|baki|baaki|jama|status|kitne/.test(ql))
    return 'payments';
  // General balance / financial overview
  if (/balance|total|kitna|amount|summary|overview/.test(ql))
    return 'finance';
  return 'full';
}

// ── Local answers — zero API call ─────────────────────────────
function _tryLocalAnswer(q) {
  const ql = q.toLowerCase();
  const ss = STATE.sessionSummary || {};

  // Balance (only if not asking about a specific member)
  if (/\bbalance\b|closing balance|kitna paisa|total balance|paisa kitna/.test(ql)
      && !/\b(ka|ki|ke)\b/.test(ql)) {
    const prev = ss.lastYearBalance || 0;
    const coll = ss.currentTotal   || 0;
    const don  = ss.totalDonation  || 0;
    const exp  = ss.totalExpense   || 0;
    const bal  = ss.balance || (prev + coll + don - exp);
    const lines = [];
    if (prev > 0) lines.push(`- Pichhle saal se: **Rs.${prev}**`);
    lines.push(`- Subscription jama: **Rs.${coll}**`, `- Donations: **Rs.${don}**`, `- Expenses: **Rs.${exp}**`);
    return `**Tanzeem Balance** 💰\n\n${lines.join('\n')}\n\n---\n**Closing Balance: Rs.${bal}**\n\n*Formula: ${prev > 0 ? `Rs.${prev} + ` : ''}Rs.${coll} + Rs.${don} − Rs.${exp} = Rs.${bal}*`;
  }

  // Member count
  if (/kitne member|members kitne|total members|members hain|members hai|kitne log hain/.test(ql)) {
    const active   = STATE.allMembers.filter(m => m.status === 'Active').length;
    const inactive = STATE.allMembers.filter(m => m.status !== 'Active').length;
    return `**Members Overview** 👥\n\n- Total: **${STATE.allMembers.length}**\n- Active: **${active}**\n- Inactive: **${inactive}**`;
  }

  // This month paid / unpaid
  if (/is mahine|this month|current month|aaj ka mahina/.test(ql) && /paid|unpaid|kitne|status/.test(ql)) {
    const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
    const curr   = months.length > 0 ? detectCurrentMonth(months) : null;
    if (!curr) return null;
    const stats  = buildMemberStats(STATE.allPayments);
    const active = stats.filter(s => !s.isInactive);
    const paid   = active.filter(s => isPaid(s.months[curr]));
    const unpaid = active.filter(s => !isPaid(s.months[curr]));
    return `**${curr} — Payment Status** 📅\n\n✅ **Paid (${paid.length}):**\n${paid.map(s => `- ${s.name}`).join('\n') || '- Koi nahi'}\n\n❌ **Unpaid (${unpaid.length}):**\n${unpaid.map(s => `- ${s.name}`).join('\n') || '- Koi nahi'}`;
  }

  // Income summary
  if (/total collected|kitna jama|total jama|subscription total|income kitni/.test(ql)) {
    const coll = ss.currentTotal  || 0;
    const don  = ss.totalDonation || 0;
    return `**Income Summary** 📊\n\n- Subscription: **Rs.${coll}**\n- Donations: **Rs.${don}**\n\n**Total Income: Rs.${coll + don}**`;
  }

  return null; // needs API
}

// ── Build context prompt (cached per type + data state) ───────
function buildDataContext(type = 'full', includeInactiveDetail = false) {
  const dataKey = _getDataKey();
  if (dataKey !== _promptDataKey) {
    _promptCache.clear();       // data changed → all cached prompts stale
    _promptDataKey = dataKey;
  }
  const cacheKey = type + '|' + includeInactiveDetail;
  if (_promptCache.has(cacheKey)) return _promptCache.get(cacheKey);

  const d     = _buildShared();
  const parts = [_pBase()];

  switch (type) {
    case 'tanzeem':
      parts.push(_pAppInfo(d));
      break;
    case 'finance':
      parts.push(_pSession(d), _pFinancials(d), _pDonations(), _pExpenses());
      break;
    case 'payments':
      parts.push(_pDisambiguation(d), _pSession(d), _pFinancials(d), _pMonthly(d), _pMembers(d, false));
      break;
    case 'member':
      parts.push(_pDisambiguation(d), _pSession(d), _pFinancials(d), _pMonthly(d), _pMembers(d, includeInactiveDetail));
      break;
    default: // 'full'
      parts.push(_pAppInfo(d), _pDisambiguation(d), _pSession(d), _pFinancials(d),
                 _pMonthly(d), _pMembers(d, includeInactiveDetail), _pDonations(), _pExpenses());
  }

  parts.push('\nJawab Hinglish mein do. Friendly aur concise raho.');
  const prompt = parts.join('\n\n');
  _promptCache.set(cacheKey, prompt);
  return prompt;
}

// ─────────────────────────────────────────────────────────────
let _dotsTimer = null;
function _animateDots() {
  clearInterval(_dotsTimer);
  const dots = ['.', '..', '...'];
  let i = 0;
  _dotsTimer = setInterval(() => {
    const msgs = document.querySelectorAll('#chatMessages .msg.ai');
    const last = msgs[msgs.length - 1];
    if (!last) { clearInterval(_dotsTimer); return; }
    const bubble = last.querySelector('.msg-bubble');
    if (bubble) bubble.innerHTML = `<span style="color:#94a3b8;font-style:italic">Soch raha hoon${dots[i++ % 3]}</span>`;
  }, 500);
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if (!q) return;

  input.value = '';
  appendMessage('user', q);

  // ── Local answer — zero API cost ──────────────────────────
  const localAns = _tryLocalAnswer(q);
  if (localAns) {
    appendMessage('ai', localAns);
    _chatHistory.push({ role: 'user',  parts: [{ text: q }] });
    _chatHistory.push({ role: 'model', parts: [{ text: localAns }] });
    return;
  }

  _chatHistory.push({ role: 'user', parts: [{ text: q }] });
  appendMessage('ai', 'Soch raha hoon...');
  _animateDots();

  const ql              = q.toLowerCase();
  const includeInactive = /inactive|band|chhod diya|left members/.test(ql);
  const qType           = _classifyQuestion(q);

  try {
    const res = await fetch(CONFIG.WORKER_URL + '/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildDataContext(qType, includeInactive) }] },
        contents: _chatHistory.slice(-8),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
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
    _chatHistory.pop();
  }
}

function quickAsk(q) {
  document.getElementById('chatInput').value = q;
  sendChat();
}

function clearChat() {
  _chatHistory.length = 0;
  const c = document.getElementById('chatMessages');
  if (c) c.innerHTML = `
    <div class="msg ai">
      <div class="msg-bubble">Assalamu Alaikum! I am your Tanzeem assistant. Ask me anything about members, payments, or finances.</div>
    </div>`;
}

// ── Lightweight markdown → HTML (AI responses + local answers)
function _mdToHtml(text) {
  const esc    = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const inline = s => s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:11px">$1</code>');

  const lines = text.split('\n');
  const out   = [];
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
    } else if (/^---$/.test(line)) {
      closeList();
      out.push('<hr style="border:none;border-top:1px solid #e2e8f0;margin:6px 0">');
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
  const div    = document.createElement('div');
  div.className = 'msg ' + role;
  const bubble  = document.createElement('div');
  bubble.className = 'msg-bubble';
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

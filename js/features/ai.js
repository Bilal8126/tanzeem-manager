const _chatHistory = [];

// ── Prompt cache (Map keyed by data-state + question type) ────
const _promptCache = new Map();
let   _promptDataKey = '';

// ── Gemini function-calling tools ──────────────────────────────
// The model only ever *proposes* a call with structured args — the actual
// validation and write happens in JS (_aiValidate*/_aiCommit* in
// members.js/payments.js), gated behind the same showConfirm() sheet every
// other write in the app uses. Nothing is written without that confirm.
const AI_TOOLS = [{
  functionDeclarations: [
    {
      name: 'add_member',
      description: 'Naya member Tanzeem mein add karta hai.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name:    { type: 'STRING', description: 'Member ka pura naam' },
          mobile:  { type: 'STRING', description: 'Mobile number — user ne na diya ho to khali string' },
          address: { type: 'STRING', description: 'Address — user ne na diya ho to khali string' },
          type:    { type: 'STRING', enum: ['Regular', 'Donor'], description: 'Member Regular hai ya Donor' },
        },
        required: ['name', 'mobile', 'address', 'type'],
      },
    },
    {
      name: 'edit_member',
      description: 'Kisi existing member ka Status (Active/Inactive) ya Type (Regular/Donor) badalta hai.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name:      { type: 'STRING', description: 'Existing member ka naam' },
          newStatus: { type: 'STRING', enum: ['Active', 'Inactive'], description: 'Naya status, agar status change karna ho' },
          newType:   { type: 'STRING', enum: ['Regular', 'Donor'], description: 'Naya type, agar type change karna ho' },
        },
        required: ['name'],
      },
    },
    {
      name: 'mark_payment',
      description: 'Kisi member ke kisi mahine ka payment mark (paid) ya unmark (unpaid) karta hai.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name:   { type: 'STRING', description: 'Member ka naam' },
          month:  { type: 'STRING', description: 'Mahine ka naam, jaisa is session mein hai (jaise September)' },
          action: { type: 'STRING', enum: ['mark', 'unmark'], description: '"mark" = paid karna, "unmark" = unpaid karna' },
        },
        required: ['name', 'month', 'action'],
      },
    },
    {
      name: 'add_donation',
      description: 'Ek nayi donation add karta hai.',
      parameters: {
        type: 'OBJECT',
        properties: {
          donor:  { type: 'STRING', description: 'Donor ka naam' },
          amount: { type: 'STRING', description: 'Amount (Rs.), sirf number' },
          date:   { type: 'STRING', description: 'Tarikh (yyyy-mm-dd), na di ho to khali string' },
          note:   { type: 'STRING', description: 'Note/wajah, na di ho to khali string' },
        },
        required: ['donor', 'amount', 'date', 'note'],
      },
    },
    {
      name: 'add_expense',
      description: 'Ek naya kharcha (expense) add karta hai.',
      parameters: {
        type: 'OBJECT',
        properties: {
          desc:   { type: 'STRING', description: 'Kharche ki wajah / kisko diya gaya' },
          amount: { type: 'STRING', description: 'Amount (Rs.), sirf number' },
          date:   { type: 'STRING', description: 'Tarikh (yyyy-mm-dd), na di ho to khali string' },
        },
        required: ['desc', 'amount', 'date'],
      },
    },
    {
      name: 'edit_donation',
      description: 'Ek existing donation ka amount, date, note, ya donor ka naam badalta hai.',
      parameters: {
        type: 'OBJECT',
        properties: {
          donor:       { type: 'STRING', description: 'Jis donor ki donation dhundhni hai' },
          matchAmount: { type: 'STRING', description: 'Agar isi donor ki 2+ donations hain to purani amount batakar specify karein — warna khali string' },
          newDonor:    { type: 'STRING', description: 'Naya naam, agar change karna ho — warna khali string' },
          newAmount:   { type: 'STRING', description: 'Naya amount, agar change karna ho — warna khali string' },
          newDate:     { type: 'STRING', description: 'Nayi tarikh, agar change karni ho — warna khali string' },
          newNote:     { type: 'STRING', description: 'Naya note, agar change karna ho — warna khali string' },
        },
        required: ['donor'],
      },
    },
    {
      name: 'edit_expense',
      description: 'Ek existing expense ka amount, date, ya wajah/description badalta hai.',
      parameters: {
        type: 'OBJECT',
        properties: {
          desc:        { type: 'STRING', description: 'Jis expense ki wajah/description se dhundhna hai' },
          matchAmount: { type: 'STRING', description: 'Agar isi wajah ke 2+ expenses hain to purani amount batakar specify karein — warna khali string' },
          newDesc:     { type: 'STRING', description: 'Nayi wajah/description, agar change karni ho — warna khali string' },
          newAmount:   { type: 'STRING', description: 'Naya amount, agar change karna ho — warna khali string' },
          newDate:     { type: 'STRING', description: 'Nayi tarikh, agar change karni ho — warna khali string' },
        },
        required: ['desc'],
      },
    },
  ],
}];

// name → { validate, commit, title } — validate/commit live in members.js/payments.js/finance.js
const _AI_ACTION_HANDLERS = {
  add_member:    { validate: (a) => _aiValidateAddMember(a),    commit: (a) => _aiCommitAddMember(a),    title: 'Naya Member Add Karein?' },
  edit_member:   { validate: (a) => _aiValidateEditMember(a),   commit: (a) => _aiCommitEditMember(a),   title: 'Member Update Karein?' },
  mark_payment:  { validate: (a) => _aiValidateMarkPayment(a),  commit: (a) => _aiCommitMarkPayment(a),  title: 'Payment Update Karein?' },
  add_donation:  { validate: (a) => _aiValidateAddDonation(a),  commit: (a) => _aiCommitAddDonation(a),  title: 'Donation Add Karein?' },
  add_expense:   { validate: (a) => _aiValidateAddExpense(a),   commit: (a) => _aiCommitAddExpense(a),   title: 'Kharcha Add Karein?' },
  edit_donation: { validate: (a) => _aiValidateEditDonation(a), commit: (a) => _aiCommitEditDonation(a), title: 'Donation Update Karein?' },
  edit_expense:  { validate: (a) => _aiValidateEditExpense(a),  commit: (a) => _aiCommitEditExpense(a),  title: 'Kharcha Update Karein?' },
};

// Called when Gemini's response is a functionCall instead of text.
async function _handleAiFunctionCall(fnCall) {
  const handler = _AI_ACTION_HANDLERS[fnCall.name];
  if (!handler) {
    updateLastAiMessage('⚠️ Yeh action abhi supported nahi hai.');
    return;
  }
  const result = handler.validate(fnCall.args || {});
  if (!result.ok) {
    updateLastAiMessage(result.error);
    _chatHistory.push({ role: 'model', parts: [{ text: result.error }] });
    return;
  }
  const previewPlain = result.preview.replace(/<br>/g, '\n').replace(/<\/?b>/g, '**');
  updateLastAiMessage(`Confirm karne ke liye popup dekhein 👇\n\n${previewPlain}`);
  _chatHistory.push({ role: 'model', parts: [{ text: `[Confirmation popup dikhaya gaya] ${previewPlain.replace(/\n/g, ' | ')}` }] });
  showConfirm(handler.title, result.preview, async () => {
    const commitResult = await handler.commit(result.args);
    const finalText = commitResult.ok ? commitResult.message : `⚠️ ${commitResult.error}`;
    appendMessage('ai', finalText);
    _chatHistory.push({ role: 'model', parts: [{ text: finalText }] });
  });
}

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
1 match → answer directly. 2+ matches → ask which one. 0 → say not found.
Yeh list SAARE members ki hai — chahe unka Join-Session koi bhi ho, chahe woh kisi purane session mein add hue ho. Kisi member ko dhoondhte waqt uske Join-Session ko current/active session se compare karke "not found" mat bolo — naam match hote hi member mil gaya, bas uski payment/subscription details hamesha CURRENT ACTIVE SESSION ke payment data se hi aayengi.`;
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

// Personal-record fields (DOJ, address, DOE, join-session) straight from the
// Members List sheet — separate from the payment-stats rows in _pMembers()
// so "kab add hua / kaha ka hai / kab Inactive hua" can be answered directly.
function _pMemberProfiles() {
  const rows = STATE.allMembers.map(m => {
    const parts = [
      `DOJ(add hua) ${m.doj || 'N/A'}`,
      `Address(kaha ka hai) ${m.address || 'N/A'}`,
      `Status ${m.status || 'Active'}`,
      `Type ${m.type || 'Regular'}`,
      `Join-Session ${m.session || 'N/A'}`,
    ];
    if (m.status !== 'Active' && m.doe) parts.push(`DOE(Inactive kab hua) ${m.doe}`);
    return `  ${m.name}: ${parts.join(' | ')}`;
  }).join('\n');
  return `=== MEMBER PROFILES (personal record — kab add hua, kaha ke hain, active/inactive kab/kis session mein hue) ===
${rows || '  No data'}
NOTE: "Total members" / "kitne members hain" hamesha SAB members ka count hai (${STATE.allMembers.length}), chahe kisi bhi session mein active ho ya jo bhi session abhi active ho — Join-Session field sirf yeh batati hai ke woh member kis session mein add hua tha, ispar total ko filter mat karo jab tak user khud kisi specific session ke members maange.`;
}

// Reads the TrackHistory sheet directly (not cached anywhere else) so "last
// member kaun add hua", "kisne kiya", "kab kiya" can be answered from the
// actual audit trail instead of guessed from member/payment data. Filtered
// to the current active session, matching how Settings/Dashboard show it.
// Never cached in _promptCache — history changes with every action.
async function _pTrackHistory() {
  const sessionLabel = STATE.currentSession?.label || '';
  if (!STATE.accessToken) return `=== RECENT ACTIVITY HISTORY ===\n  Sync karke dekhein — abhi TrackHistory read nahi ho sakti.`;
  try {
    const rows = (await sheetsGet('TrackHistory!A1:E1000'))
      .filter(r => r.length >= 2 && r[3] === sessionLabel);
    const recent = rows.slice(-40).reverse(); // newest first, last 40 of this session
    const lines = recent.map(([ts, action, details, , admin]) =>
      `  [${ts}] ${action}: ${details || ''} — by ${admin || 'Unknown'}`
    ).join('\n');
    return `=== RECENT ACTIVITY HISTORY (session: ${sessionLabel}, sabse naya sabse upar, [ts] format dd/mm/yyyy hh:mm AM/PM) ===
${lines || '  Is session mein abhi tak koi activity record nahi hai'}
Is list se "kaun/kisne", "kab", "last kaun", "pichle N din mein kya hua", "Tanzeem mein kya chal raha hai" type sawalon ka seedha jawab do — jo yahan hai wahi sach hai, mat guess karo. "Last N din" ya "date wise" poochein to entries ko date ke hisaab se group karke, har din ka summary (kya hua, kisne kiya) batayein — sirf date [ts] ke sahi hisaab se filter karein.`;
  } catch (e) {
    return `=== RECENT ACTIVITY HISTORY ===\n  History load nahi ho payi: ${e.message}`;
  }
}

// Multi-turn conversational rules for "who am I" self-lookup and for names
// that don't match any real member — relies on _chatHistory (last 8 turns)
// so a bare name reply is understood as the answer to the AI's own question.
function _pPersonaFlow() {
  return `=== SELF-LOOKUP & NEW-VISITOR FLOW ===
Agar koi pooche "main kaun hoon", "meri details batao", "who am i", ya apna record maange, aur unka naam pata na ho: pehle unka naam poochein. Naam milte hi MEMBER PROFILES se unki puri detail do — DOJ (kab add hue), Address (kaha ke hain), Status (Active/Inactive), aur agar Inactive hain to DOE (kab Inactive hue) aur Join-Session. Uske baad poochein: "Aapko apni payment/subscription ke baare mein jaanna hai kya?" — haan kahein to unki payment status (paid/unpaid months, total) batao.

Yeh "not found" sirf tab bolein jab naam MEMBER PROFILES/disambiguation ki poori list (sab sessions ke members) mein kahin bhi match na ho — kisi member ka Join-Session purana hone se woh "not found" nahi ban jata, woh ab bhi member hai. Agar diya gaya naam kisi bhi member se sach mein match nahi hota: unhe seedha bataye ke woh Tanzeem ke member nahi hain. Fir Tanzeem Abd-e-Mustafa ke baare mein thodi jaankari dete hue (maqsad: gareebo ki madad, masjid/madrasa, langar, deen ki khidmat) unhe member banne ki garmjoshi se dawat dein. Phir poochein: "Kya aap Tanzeem ka member banna chahte hain?" — haan kahein to unhe bataye ke aap unki basic details (naam, mobile number, address) le kar aage guide kar denge, aur wahi maangna shuru kar dein.`;
}

// Tells the model what it's allowed to *do* (as opposed to just answer).
// The actual gating/validation happens in JS (see _aiValidate*/_aiCommit*
// in members.js/payments.js) — this just steers when to call the tools.
function _pActions() {
  return `=== ACTIONS (AI khud kaam kar sakta hai) ===
Aap add_member, edit_member, mark_payment, add_donation, edit_donation, add_expense, aur edit_expense functions call kar sakte hain jab user seedha aisa kahe (jaise "naya member add karo", "Bilal ko Inactive karo", "Hasnain ka September payment mark karo", "Rs.500 ki donation add karo", "Bilal ki donation ka amount 700 kar do", "langar ka kharcha add karo", "us kharche ki date badlo"). Function call karne se PEHLE us function ke saare zaroori fields conversation mein poochein — jab tak sab clear na ho jaye, function mat call karein (agar user koi optional field dena na chahe jaise mobile/address/date/note, to khali string bhej sakte hain, lekin poochna zaroor). Edit karte waqt sirf wahi fields bhejein jo change karni hain — baaki khali chhod dein. Ek baar mein sirf ek action. Yeh saare actions hamesha CURRENT ACTIVE SESSION ki sheet mein hote hain.
Function call karne ke baad app khud validation karke ek confirmation popup dikhayega aur result bata dega — aapko sirf details gather karke function call karna hai, result ke baare mein khud kuch mat kahna.`;
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
  // Activity/audit-trail questions — who did what and when (TrackHistory sheet)
  if (/last member|kaun.*add hua|kisne.*add|kisne.*kiya|kisne.*mark|kisne.*update|kab.*add hua|kab.*inactive|kaun.*inactive hua|kab.*mark|recent activity|last activity|activity history|track history|last \d+ din|pichle \d+ din|kya hua|kya chal raha|tanzeem mein kya/.test(ql))
    return 'history';
  // Tanzeem / app info
  if (/tanzeem kya|kisne banaya|developer|creator|founding|maqsad|kab shuru|about tanzeem/.test(ql))
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
  if (/is mahine|this month|current month|aaj ka mahina/.test(ql) && /\bpaid\b|unpaid|kitne|status/.test(ql)) {
    const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
    const curr   = months.length > 0 ? detectCurrentMonth(months) : null;
    if (!curr) return null;
    const stats  = buildMemberStats(STATE.allPayments);
    const active = stats.filter(s => !s.isInactive);
    const paid   = active.filter(s =>  isPaid(s.months[curr]));
    const unpaid = active.filter(s => !isPaid(s.months[curr]));
    // Show only paid, only unpaid, or both depending on question
    const wantUnpaid = /unpaid/.test(ql);
    const wantPaid   = /\bpaid\b/.test(ql);
    if (wantUnpaid && !wantPaid) {
      return `**${curr} — Unpaid Members** ❌\n\nUnpaid: **${unpaid.length}**\n\n${unpaid.map(s => `- ${s.name}`).join('\n') || '- Koi nahi! Sab ne pay kar diya 🎉'}`;
    }
    if (wantPaid && !wantUnpaid) {
      return `**${curr} — Paid Members** ✅\n\nPaid: **${paid.length}**\n\n${paid.map(s => `- ${s.name}`).join('\n') || '- Abhi kisi ne pay nahi kiya'}`;
    }
    return `**${curr} — Payment Status** 📅\n\n✅ **Paid (${paid.length}):**\n${paid.map(s => `- ${s.name}`).join('\n') || '- Koi nahi'}\n\n❌ **Unpaid (${unpaid.length}):**\n${unpaid.map(s => `- ${s.name}`).join('\n') || '- Koi nahi'}`;
  }

  // Total collected THIS month specifically
  if (/this month|is mahine/.test(ql) && /total|collected|jama/.test(ql)) {
    const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
    const curr   = months.length > 0 ? detectCurrentMonth(months) : null;
    if (!curr) return null;
    const stats  = buildMemberStats(STATE.allPayments);
    const paid   = stats.filter(s => !s.isInactive && isPaid(s.months[curr]));
    const fee    = (typeof FEE !== 'undefined') ? FEE : 150;
    const amount = paid.length * fee;
    return `**${curr} — Total Collected** 💵\n\n- Paid members: **${paid.length}**\n- Amount: **Rs.${amount}**\n\n${paid.map(s => `- ${s.name}`).join('\n') || '- Koi nahi'}`;
  }

  // Inactive members list
  if (/^inactive members$|inactive members list|inactive log/.test(ql)) {
    const inactive = STATE.allMembers.filter(m => m.status !== 'Active');
    if (inactive.length === 0)
      return `**Inactive Members** 😊\n\nAbhi koi inactive member nahi hai. Sab active hain!`;
    return `**Inactive Members (${inactive.length})** 📋\n\n${inactive.map((m, i) => `${i + 1}. ${m.name}`).join('\n')}`;
  }

  // Best month (highest paid count among past months)
  if (/^best month$|best month kaun|sabse best mahina|sabse zyada paid/.test(ql)) {
    const months = STATE.allPayments.length > 0 ? Object.keys(STATE.allPayments[0].months) : [];
    const past   = months.filter(isPastOrCurrent);
    if (past.length === 0) return `**Best Month** 📊\n\nAbhi tak koi past month nahi hai.`;
    const stats  = buildMemberStats(STATE.allPayments);
    const active = stats.filter(s => !s.isInactive).length;
    const counts = past.map(m => ({ month: m, paid: stats.filter(s => !s.isInactive && isPaid(s.months[m])).length }));
    counts.sort((a, b) => b.paid - a.paid);
    const best = counts[0];
    const rows  = counts.map((c, i) => `${i + 1}. ${c.month}: **${c.paid}/${active}** paid`).join('\n');
    return `**Best Month** 🏆\n\n**${best.month}** — ${best.paid}/${active} members ne pay kiya\n\n**Sab past months:**\n${rows}`;
  }

  // Member totals (sorted by amount)
  if (/^member totals$|member total|har member ka|sabka total/.test(ql)) {
    const stats  = STATE.allPayments.length > 0 ? buildMemberStats(STATE.allPayments) : [];
    const active = stats.filter(s => !s.isInactive).sort((a, b) => b.totalPaid - a.totalPaid);
    const rows   = active.map((s, i) => `${i + 1}. ${s.name}: **Rs.${s.totalPaid}**${s.totalPending > 0 ? ` *(Rs.${s.totalPending} pending)*` : ''}`).join('\n');
    const total  = active.reduce((sum, s) => sum + s.totalPaid, 0);
    return `**Member Totals** 💰\n\n${rows || 'No data'}\n\n---\n**Total Collected: Rs.${total}**`;
  }

  // Session income summary (general)
  if (/total collected|kitna jama|total jama|subscription total|income kitni/.test(ql)) {
    const coll = ss.currentTotal  || 0;
    const don  = ss.totalDonation || 0;
    return `**Income Summary** 📊\n\n- Subscription: **Rs.${coll}**\n- Donations: **Rs.${don}**\n\n**Total Income: Rs.${coll + don}**`;
  }

  // Tanzeem / app info — fully static, no API needed
  if (/tanzeem kya|tanzeem ke baare|about tanzeem|tanzeem kab|tanzeem kis|tanzeem history|tanzeem maqsad|tanzeem ka kaam/.test(ql)) {
    const active   = STATE.allMembers.filter(m => m.status === 'Active').length;
    const inactive = STATE.allMembers.filter(m => m.status !== 'Active').length;
    return `**Tanzeem Abd-e-Mustafa — Bisauli** 🕌\n\n- **Shuruwaat:** Year 2023\n- **Total Members:** ${STATE.allMembers.length} (Active: ${active}, Inactive: ${inactive})\n\n**Founding Members:**\n1. Mohsin Ansari\n2. Javed Ansari\n3. Moh. Hasnain Ansari\n4. Bilal Ansari\n5. Mubeen Ansari\n6. Tofeeq Ansari\n7. Altaf Ansari\n8. Shahrukh Ansari\n\n**Maqsad (Kaam):**\n- Gareebo ki madad karna\n- Masjid aur Madrasa ki madad\n- Langar lagana\n- Jaloos mein langar dena\n- Deen ki khidmat karna`;
  }

  if (/kisne banaya|developer kaun|creator kaun|app kisne|app ka developer|app banaya/.test(ql)) {
    return `**App Developer** 💻\n\nYeh application **Bilal Ansari** ne banai hai. Unhone Tanzeem Abd-e-Mustafa ke liye yeh poora Tanzeem Manager app design aur develop kiya hai.`;
  }

  return null; // needs API
}

// ── Build context prompt (cached per type + data state) ───────
async function buildDataContext(type = 'full', includeInactiveDetail = false) {
  const d = _buildShared();

  // History queries read TrackHistory live — never cached, since it changes
  // with every single action and staleness here means a wrong "kisne kiya".
  if (type === 'history') {
    const parts = [_pBase(), _pSession(d), await _pTrackHistory(), _pMemberProfiles()];
    parts.push('\nJawab Hinglish mein do. Friendly aur concise raho.');
    return parts.join('\n\n');
  }

  const dataKey = _getDataKey();
  if (dataKey !== _promptDataKey) {
    _promptCache.clear();       // data changed → all cached prompts stale
    _promptDataKey = dataKey;
  }
  const cacheKey = type + '|' + includeInactiveDetail;
  if (_promptCache.has(cacheKey)) return _promptCache.get(cacheKey);

  const parts = [_pBase()];

  switch (type) {
    case 'tanzeem':
      parts.push(_pAppInfo(d));
      break;
    case 'finance':
      parts.push(_pSession(d), _pFinancials(d), _pDonations(), _pExpenses(), _pActions());
      break;
    case 'payments':
      parts.push(_pDisambiguation(d), _pSession(d), _pFinancials(d), _pMonthly(d), _pMembers(d, false), _pMemberProfiles(), _pActions());
      break;
    case 'member':
      parts.push(_pDisambiguation(d), _pSession(d), _pFinancials(d), _pMonthly(d), _pMembers(d, includeInactiveDetail), _pMemberProfiles(), _pPersonaFlow(), _pActions());
      break;
    default: // 'full'
      parts.push(_pAppInfo(d), _pDisambiguation(d), _pSession(d), _pFinancials(d),
                 _pMonthly(d), _pMembers(d, includeInactiveDetail), _pMemberProfiles(), _pDonations(), _pExpenses(), _pPersonaFlow(), _pActions());
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

// Enter sends; Shift+Enter inserts a newline (textarea's default behavior).
function _chatInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
}

function _autoGrowChatInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if (!q) return;

  input.value = '';
  input.style.height = 'auto';
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
    const systemText = await buildDataContext(qType, includeInactive);
    const res = await fetch(CONFIG.WORKER_URL + '/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: _chatHistory.slice(-8),
        tools: AI_TOOLS,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      })
    });

    if (res.status === 503) throw new Error('503');
    if (!res.ok) throw new Error('ERR_' + res.status);

    const data = await res.json();
    if (data.error) throw new Error('API_' + (data.error.code || 500));

    const parts    = data.candidates?.[0]?.content?.parts || [];
    const fnCallPart = parts.find(p => p.functionCall);
    if (fnCallPart) {
      await _handleAiFunctionCall(fnCallPart.functionCall);
    } else {
      const text = parts.map(p => p.text || '').join('') || 'Koi response nahi mila.';
      updateLastAiMessage(text);
      _chatHistory.push({ role: 'model', parts: [{ text }] });
    }
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
  clearInterval(_dotsTimer);
  _chatHistory.length = 0;
  const c = document.getElementById('chatMessages');
  if (c) c.innerHTML = `
    <div class="msg ai">
      <div class="msg-bubble">Assalamu Alaikum! Main aapka Tanzeem assistant hoon. Members, payments, ya finance ke baare mein kuch bhi poochein.</div>
    </div>`;
  const input = document.getElementById('chatInput');
  if (input) { input.value = ''; input.style.height = 'auto'; }
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

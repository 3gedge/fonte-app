/* ============================================================
   FONTE · app prototype logic (demo data, no real funds)
   ============================================================ */
const fmt = (n, d = 2) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = (n) => '$' + Math.round(n).toLocaleString('en-US');

/* ---------- profiles ---------- */
// No-TP Hold halving-cycle strategy (2026-06-15). Each profile holds a 50/50
// BTC/ETH basket during the post-halving bull, a 100% stablecoin LP (msUSD/USDC) in the bear.
// Numbers are BACKTESTED (BTC since 2011 / ETH since 2016, 3 cycles), `blended` =
// cycle CAGR, `vs` = Calmar (vs 0.8 for HODL), `dip` = worst drawdown. Currently
// in the stable phase, so dtd/mtd/ytd reflect stablecoin LP yield (fees + rewards, variable).
const PROFILES = {
  conservative: {
    name: 'Conservative', target: 116, targetRange: '~116%*', dip: 55, blended: 116, vs: '2.1', dtd: 0.05, mtd: 1.4, ytd: 6.0,
    tagline: 'A 60% BTC/ETH basket held through the post-halving bull, then a 100% auto-rebalanced stablecoin LP (msUSD/USDC) between cycles. Lumpy by design. Most of the return lands in the ~18-month bull window.',
    alloc: [
      { name: 'BTC core (spot)', short: 'BTC core', pct: 30, color: '#F7931A', ic: '₿', sub: 'Held through the bull cycle', apr: 'cycle' },
      { name: 'ETH core (spot)', short: 'ETH core', pct: 30, color: '#B06A3B', ic: 'Ξ', sub: 'Held through the bull cycle', apr: 'cycle' },
      { name: 'msUSD/USDC LP cushion', short: 'LP cushion', pct: 40, color: '#0E7C66', ic: '$', sub: 'In-bull cushion · adds on deep dips', apr: '~17% APR' },
    ],
  },
  balanced: {
    name: 'Balanced', target: 128, targetRange: '~128%*', dip: 60, blended: 128, vs: '2.1', dtd: 0.05, mtd: 1.4, ytd: 6.0,
    tagline: 'An 80% BTC/ETH basket held through the bull window and sold near the cycle top, an auto-rebalanced stablecoin LP (msUSD/USDC) in between. No hedge. It rides the cycle.',
    alloc: [
      { name: 'BTC core (spot)', short: 'BTC core', pct: 40, color: '#F7931A', ic: '₿', sub: 'Held through the bull cycle', apr: 'cycle' },
      { name: 'ETH core (spot)', short: 'ETH core', pct: 40, color: '#B06A3B', ic: 'Ξ', sub: 'Held through the bull cycle', apr: 'cycle' },
      { name: 'msUSD/USDC LP cushion', short: 'LP cushion', pct: 20, color: '#0E7C66', ic: '$', sub: 'In-bull cushion · adds on deep dips', apr: '~17% APR' },
    ],
  },
  aggressive: {
    name: 'Aggressive', target: 139, targetRange: '~139%*', dip: 65, blended: 139, vs: '2.1', dtd: 0.05, mtd: 1.4, ytd: 6.0,
    tagline: 'Fully invested in a 50/50 BTC/ETH basket through the bull, all into an auto-rebalanced stablecoin LP (msUSD/USDC) in the bear. Highest upside, deepest drawdowns.',
    alloc: [
      { name: 'BTC core (spot)', short: 'BTC core', pct: 50, color: '#F7931A', ic: '₿', sub: 'Held through the bull cycle', apr: 'cycle' },
      { name: 'ETH core (spot)', short: 'ETH core', pct: 50, color: '#B06A3B', ic: 'Ξ', sub: 'Held through the bull cycle', apr: 'cycle' },
    ],
  },
};

/* ---------- quiz ---------- */
const QUIZ = [
  { q: 'If your portfolio dropped 30% in a single month, what would you most likely do?',
    opts: [['Sell to stop the bleeding', 1], ['Feel uneasy, but hold', 2], ['See a sale, and buy more', 3]] },
  { q: 'What are you really hoping this money does for you?',
    opts: [['Earn steady income and protect what I have', 1], ['Grow solidly, I can handle some swings', 2], ['Grow as much as possible, swings are fine', 3]] },
  { q: 'How long can this money stay invested?',
    opts: [['Less than a year', 1], ['One to three years', 2], ['Three years or more', 3]] },
  { q: 'How familiar are you with crypto?',
    opts: [['New to it', 1], ['Some experience', 2], ['Very experienced', 3]] },
];

const App = {
  step: 0, qi: 0, answers: [], profileKey: 'balanced', funded: 5000, balance: 5000, bookValue: 5000, mode: 'fresh',
  wallet: '0x0000…0000', sheet: null, _clock: null,

  go(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('s-' + name).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    const pills = document.getElementById('stepPills');
    const chip = document.getElementById('acctChip');
    const stepMap = { quiz: 1, result: 1, wallet: 2, fund: 3, deploying: 4, dashboard: 0 };
    if (name === 'dashboard') { pills.style.display = 'none'; chip.style.display = 'flex'; }
    else if (stepMap[name]) { pills.style.display = 'flex'; chip.style.display = 'none'; this.setPills(stepMap[name]); }
    else { pills.style.display = 'none'; chip.style.display = 'none'; }
    if (name === 'quiz') this.renderQuiz();
    if (name === 'result') this.renderResult();
    if (name === 'wallet') this.runWallet();
    if (name === 'fund') this.initFund();
    if (name === 'deploying') this.runDeploy();
    if (name === 'dashboard') this.renderDashboard();
  },
  setPills(n) {
    document.querySelectorAll('.step-pill').forEach(p => {
      const s = +p.dataset.s;
      p.classList.toggle('done', s < n);
      p.classList.toggle('active', s === n);
    });
  },
  start() { this.qi = 0; this.answers = []; this.go('quiz'); },
  demoLogin() {
    // Sample account: invested $21,294, now worth $24,318 (+14.2% since inception).
    this.profileKey = 'balanced'; this.funded = 21294; this.bookValue = 21294; this.balance = 24318; this.mode = 'sample';
    this.walletFull = '0x20066A79a0AE70A73074772A102F579e9eB2363B';
    this.wallet = '0x2006…363B';
    this.go('dashboard');
  },

  /* ---- quiz ---- */
  renderQuiz() {
    const item = QUIZ[this.qi];
    const sel = this.answers[this.qi];
    const card = document.getElementById('quizCard');
    card.innerHTML = `
      <div class="quiz-count" style="margin-bottom:14px">Question ${this.qi + 1} of ${QUIZ.length}</div>
      <div class="quiz-q serif">${item.q}</div>
      <div class="opts">
        ${item.opts.map((o, i) => `
          <div class="opt ${sel === o[1] ? 'sel' : ''}" data-v="${o[1]}" onclick="App.pick(${o[1]})">
            <span class="radio"></span><span>${o[0]}</span>
          </div>`).join('')}
      </div>
      <div class="quiz-nav">
        <button class="btn btn-ghost" ${this.qi === 0 ? 'disabled' : ''} onclick="App.prevQ()">Back</button>
        <button class="btn btn-ink" id="qNext" ${sel ? '' : 'disabled'} onclick="App.nextQ()">${this.qi === QUIZ.length - 1 ? 'See my match' : 'Next'}</button>
      </div>`;
  },
  pick(v) { this.answers[this.qi] = v; this.renderQuiz(); },
  prevQ() { if (this.qi > 0) { this.qi--; this.renderQuiz(); } },
  nextQ() {
    if (!this.answers[this.qi]) return;
    if (this.qi < QUIZ.length - 1) { this.qi++; this.renderQuiz(); }
    else { this.score(); this.go('result'); }
  },
  score() {
    const total = this.answers.reduce((a, b) => a + b, 0);
    this.profileKey = total <= 6 ? 'conservative' : total <= 9 ? 'balanced' : 'aggressive';
  },

  /* ---- result ---- */
  renderResult() {
    const p = PROFILES[this.profileKey];
    document.getElementById('resName').textContent = p.name;
    document.getElementById('resTagline').textContent = p.tagline;
    document.getElementById('resCard').innerHTML = `
      <div class="res-stat-row">
        <div class="res-stat"><div class="k">Cycle CAGR*</div><div class="v tnum" style="color:var(--accent)">${p.targetRange}</div></div>
        <div class="res-stat"><div class="k">Worst dip</div><div class="v tnum">${p.dip}%</div></div>
        <div class="res-stat"><div class="k">Calmar (vs 0.8 HODL)</div><div class="v" style="color:var(--pos)">${p.vs}</div></div>
      </div>
      <p style="font-size:11.5px;color:var(--ink-3);line-height:1.5;margin:-2px 0 16px">*Backtested across 3 halving cycles, not a forward promise. Returns are lumpy; the basket is held only in the ~18-month bull window, then a 100% stablecoin LP (msUSD/USDC). Currently in the stable phase until ~Oct 2026.</p>
      <div style="font-weight:600;font-size:14px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:14px">Your mix</div>
      ${p.alloc.map(a => `
        <div class="alloc-top"><span class="name"><span class="swatch" style="background:${a.color}"></span>${a.name}</span><span class="pct">${a.pct}%</span></div>
        <div class="alloc-bar"><div class="alloc-fill" style="width:${a.pct}%;background:${a.color}"></div></div>`).join('')}`;
  },

  /* ---- wallet ---- */
  runWallet() {
    let full = '0x'; for (let i = 0; i < 40; i++) full += Math.floor(Math.random() * 16).toString(16);
    this.walletFull = full;
    this.wallet = full.slice(0, 6) + '…' + full.slice(-4).toUpperCase();
    document.getElementById('walletAddr').textContent = this.wallet;
    document.getElementById('walletNext').disabled = true;
    const rows = document.querySelectorAll('#keyAnim .key-row');
    rows.forEach(r => r.classList.remove('show'));
    rows.forEach((r, i) => setTimeout(() => r.classList.add('show'), 500 + i * 650));
    setTimeout(() => { document.getElementById('walletNext').disabled = false; }, 500 + rows.length * 650 + 200);
  },

  /* ---- fund ---- */
  initFund() {
    const range = document.getElementById('amtRange');
    range.value = this.funded;
    this.updateFund(this.funded);
    range.oninput = () => { this.snapPreset(null); this.updateFund(+range.value); };
    document.querySelectorAll('.amt-preset').forEach(p => {
      p.onclick = () => { range.value = p.dataset.v; this.snapPreset(p); this.updateFund(+p.dataset.v); };
    });
  },
  snapPreset(el) { document.querySelectorAll('.amt-preset').forEach(p => p.classList.toggle('sel', p === el)); },
  updateFund(v) {
    this.funded = v;
    const p = PROFILES[this.profileKey];
    document.getElementById('amtDisplay').textContent = fmt0(v);
    document.getElementById('projRate').textContent = `(at ${p.target}% target)`;
    document.getElementById('projVal').textContent = fmt0(v * (1 + p.target / 100));
  },

  /* ---- deploying ---- */
  runDeploy() {
    const arc = document.getElementById('deployArc'), pct = document.getElementById('deployPct');
    const steps = document.querySelectorAll('#deploySteps .dstep');
    steps.forEach(s => s.classList.remove('active', 'done'));
    let p = 0; const C = 264;
    const tick = setInterval(() => {
      p += 4 + Math.random() * 6; if (p > 100) p = 100;
      arc.style.strokeDashoffset = C - (C * p / 100);
      pct.textContent = Math.round(p) + '%';
      const si = Math.min(steps.length - 1, Math.floor(p / 25));
      steps.forEach((s, i) => { s.classList.toggle('done', i < si); s.classList.toggle('active', i === si); });
      if (p >= 100) {
        clearInterval(tick);
        steps.forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
        this.mode = 'fresh';
        this.balance = this.funded;
        this.bookValue = this.funded;
        setTimeout(() => this.go('dashboard'), 650);
      }
    }, 280);
  },

  /* ---- dashboard ---- */
  renderDashboard() {
    const p = PROFILES[this.profileKey];
    const total = this.balance;

    // header: wallet (top right) + risk profile (in content)
    document.getElementById('acctWallet').textContent = this.wallet;
    const pc = document.getElementById('dProfile');
    pc.querySelector('span:last-child').textContent = p.name;

    document.getElementById('dTotal').textContent = fmt(total);

    // Book value (net invested / inception) + all-time P&L measured from it
    const book = this.bookValue;
    const allPnl = total - book;
    const allPct = book > 0 ? allPnl / book * 100 : 0;
    document.getElementById('dBook').textContent = fmt0(book);
    const at = document.getElementById('dAllTime');
    const aSign = allPnl > 0 ? '+' : allPnl < 0 ? '−' : '+';
    at.textContent = `${aSign}$${Math.abs(allPnl).toLocaleString('en-US', { maximumFractionDigits: 0 })} (${aSign}${Math.abs(allPct).toFixed(2)}%) since inception`;
    at.className = 'at-pnl tnum ' + (allPnl > 0 ? 'pos' : allPnl < 0 ? 'neg' : 'flat');

    // DTD pnl% to the right of total (fresh ~0, sample = profile daily)
    const dtd = this.mode === 'sample' ? p.dtd : 0;
    const dtdEl = document.getElementById('dDtd');
    const sign = dtd > 0 ? '+' : dtd < 0 ? '−' : '+';
    dtdEl.className = 'dtd' + (dtd > 0 ? '' : dtd < 0 ? ' neg' : ' flat');
    dtdEl.querySelector('.dtd-val').textContent = `${sign}${Math.abs(dtd).toFixed(2)}%`;

    // EDT last-updated timestamp + live ticker
    this.startClock();

    document.getElementById('mYield').textContent = p.blended + '%';
    document.getElementById('mVs').textContent = p.vs;
    document.getElementById('mDip').textContent = (this.mode === 'sample' ? (p.dip * 0.66).toFixed(1) : p.dip) + '%';

    // MTD + YTD P&L cards (% headline, $ subline, colored by sign).
    // Dollars are measured on the book value (invested basis) so YTD and
    // all-time stay consistent for an account opened within the year.
    const mtdPct = this.mode === 'sample' ? p.mtd : 0;
    const ytdPct = this.mode === 'sample' ? p.ytd : 0;
    this._setPnl('mMtd', 'mMtdUsd', mtdPct, book * mtdPct / 100);
    this._setPnl('mYtd', 'mYtdUsd', ytdPct, book * ytdPct / 100);

    // fees (sample only): 10% of notional yield earned + closed swing profit
    const feeYield = this.mode === 'sample' ? total * 0.0055 : 0;
    const feeSwing = this.mode === 'sample' ? total * 0.0021 : 0;
    const feeTotal = feeYield + feeSwing;
    document.getElementById('mFee').textContent = fmt(feeTotal);
    document.getElementById('feeBig').textContent = fmt(feeTotal);
    document.getElementById('feePct').textContent = (total > 0 ? (feeTotal / total * 100) : 0).toFixed(2) + '% of AUM';
    document.getElementById('feeYield').textContent = fmt(feeYield);
    document.getElementById('feeSwing').textContent = fmt(feeSwing);

    // positions
    document.getElementById('posList').innerHTML = p.alloc.map(a => {
      const val = total * a.pct / 100;
      const aprTxt = a.apr === 'core' ? (this.mode === 'sample' ? '+22% YTD' : 'long hold')
        : a.apr === 'swing' ? (this.mode === 'sample' ? '+12.3%' : 'scanning')
        : a.apr === 'short' ? (this.mode === 'sample' ? '+5.4%' : 'flat, no position')
        : a.apr;
      const aprColor = ['core', 'swing', 'short'].includes(a.apr) && this.mode !== 'sample' ? 'color:var(--ink-3)' : '';
      return `<div class="pos-row">
        <div class="pos-left"><div class="pos-ic" style="background:${a.color}">${a.ic}</div>
        <div><div class="pos-name">${a.name}</div><div class="pos-sub">${a.sub}</div></div></div>
        <div class="pos-right"><div class="pos-val tnum">${fmt0(val)}</div><div class="pos-apr" style="${aprColor}">${aprTxt}</div></div>
      </div>`;
    }).join('');

    // donut + legend (uses short labels so "BTC / ETH" reads correctly)
    this.renderDonut(p.alloc);
    document.getElementById('legend').innerHTML = p.alloc.map(a =>
      `<div class="lr"><span class="nm"><span class="swatch" style="background:${a.color}"></span>${a.short}</span><span class="pc">${a.pct}%</span></div>`).join('');

    // equity chart
    this.renderEq(this.mode === 'sample');
    document.getElementById('perfTag').textContent = this.mode === 'sample' ? 'sample · 12 months' : 'since you joined';

    // activity
    this.renderActivity(total);
  },

  /* ---- period P&L card (% headline + $ subline, sign-colored) ---- */
  _setPnl(idPct, idUsd, pct, usd) {
    const pe = document.getElementById(idPct), ue = document.getElementById(idUsd);
    if (!pe || !ue) return;
    const sign = pct > 0 ? '+' : pct < 0 ? '−' : '+';
    const cls = pct > 0 ? 'pos' : pct < 0 ? 'neg' : 'flat';
    pe.textContent = `${sign}${Math.abs(pct).toFixed(2)}%`;
    pe.className = 'v tnum ' + cls;
    ue.textContent = `${sign}$${Math.abs(usd).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    ue.className = 'sub tnum ' + (cls === 'flat' ? '' : cls);
  },

  /* ---- EDT live clock ---- */
  startClock() {
    const tick = () => {
      const el = document.getElementById('dUpdated');
      if (!el) return;
      el.textContent = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZoneName: 'short',
      });
    };
    tick();
    if (this._clock) clearInterval(this._clock);
    this._clock = setInterval(tick, 5000);
  },
  renderDonut(alloc) {
    const r = 15.9, C = 100; let off = 25;
    const svg = ['<circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--surface-2)" stroke-width="6"/>'];
    alloc.forEach(a => {
      svg.push(`<circle cx="21" cy="21" r="${r}" fill="none" stroke="${a.color}" stroke-width="6" stroke-dasharray="${a.pct} ${C - a.pct}" stroke-dashoffset="${off}"/>`);
      off -= a.pct;
    });
    document.getElementById('donut').innerHTML = svg.join('');
  },
  renderEq(sample) {
    const W = 600, H = 180, pts = 40;
    let path = '', area = '', y = H * 0.62;
    const data = [];
    for (let i = 0; i < pts; i++) {
      const drift = sample ? -0.9 : -0.06;
      const vol = sample ? 5.2 : 0.5;
      y += drift + (Math.sin(i * 0.6) * vol * 0.4) + (Math.random() - 0.45) * vol;
      y = Math.max(16, Math.min(H - 12, y));
      data.push(y);
    }
    data.forEach((yy, i) => {
      const x = (i / (pts - 1)) * W;
      path += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + yy.toFixed(1) + ' ';
    });
    area = path + `L${W},${H} L0,${H} Z`;
    document.getElementById('eqChart').innerHTML = `
      <defs><linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E7C66" stop-opacity=".16"/><stop offset="1" stop-color="#0E7C66" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#eqg)"/>
      <path d="${path}" fill="none" stroke="#0E7C66" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
  renderActivity(total) {
    const fresh = [
      ['Deposit received', 'vault funded', fmt0(total), 'just now'],
      ['Rotated to stable phase', 'between halving cycles', '', 'just now'],
      ['Deployed into msUSD/USDC LP', 'auto-rebalanced · earning fees + rewards', fmt0(total), '1 min ago'],
      ['Next basket entry scheduled', '912d post-halving · ~Oct 2026', '', '2 min ago'],
    ];
    const sample = [
      ['Earned stablecoin LP yield', 'stable phase · msUSD/USDC pool', '+' + fmt(total * 0.0007), '3h ago'],
      ['Rebalanced the LP range', 'kept msUSD/USDC in range', '', 'yesterday'],
      ['Earned stablecoin LP yield', 'stable phase · msUSD/USDC pool', '+' + fmt(total * 0.0007), '3d ago'],
      ['Sold BTC / ETH at cycle top', 'rotated 100% into the stablecoin LP', '+' + fmt(total * 0.09), 'Sep 2025'],
      ['Charged performance fee', '10% of realised cycle gains', '−' + fmt(total * 0.009), 'Sep 2025'],
    ];
    const items = this.mode === 'sample' ? sample : fresh;
    document.getElementById('activity').innerHTML = items.map(([t, s, v, when]) => `
      <div class="act">
        <div class="ai"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M13 5l7 7-7 7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div><div class="at">${t}</div><div class="as">${s} · ${when}</div></div>
        ${v ? `<div class="av" style="${v.startsWith('−') ? 'color:var(--neg)' : ''}">${v}</div>` : ''}
      </div>`).join('');
  },

  /* ---- deposit / withdraw sheets ---- */
  _short(a) { return a && a.length > 14 ? a.slice(0, 6) + '…' + a.slice(-4) : (a || ''); },
  _close() { return `<button class="sheet-close" aria-label="Close" onclick="App.closeModal()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`; },
  _checkSVG() { return `<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`; },

  openSheet(kind) {
    this.sheet = { kind, step: 1, amount: kind === 'deposit' ? 1000 : 0, dest: '0x7F3a9C4e88aB2105Dd4417c0E9F1b6532ad8b21C', copied: false };
    this.renderSheet();
    document.getElementById('modalBg').classList.add('show');
  },
  renderSheet() {
    const s = this.sheet, p = PROFILES[this.profileKey], box = document.getElementById('modalBox');
    let h = '';
    if (s.kind === 'deposit') {
      if (s.step === 1) {
        h = `<div class="sheet-head"><h3>Add funds</h3>${this._close()}</div>
          <div class="sheet-sub">How much would you like to add to your ${p.name} portfolio?</div>
          <div class="amt-field"><span class="cur">$</span><input id="sheetAmt" inputmode="numeric" value="${s.amount}" aria-label="Amount to add"></div>
          <div class="amt-presets" id="sheetPresets">
            <div class="amt-preset" data-v="500">$500</div><div class="amt-preset" data-v="1000">$1k</div>
            <div class="amt-preset" data-v="5000">$5k</div><div class="amt-preset" data-v="10000">$10k</div></div>
          <div class="field-err" id="sheetErr" style="display:none"></div>
          <div class="sheet-foot"><button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-ink" id="sheetNext" onclick="App.sheetNext()">Continue</button></div>`;
      } else if (s.step === 2) {
        h = `<div class="sheet-head"><h3>Send ${fmt0(s.amount)} USDC</h3>${this._close()}</div>
          <div class="sheet-sub">Send USDC on Base to your wallet. We allocate it to your target mix automatically.</div>
          <div class="addr-copy"><span class="a">${this.walletFull || this.wallet}</span>
            <button class="copy-btn" id="copyBtn" onclick="App.copyAddr()">Copy</button></div>
          <div class="sheet-note"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" stroke-width="1.7"/></svg>
            Only send USDC on the Base network. Funds sent on other networks may be lost.</div>
          <div class="sheet-foot"><button class="btn btn-ghost" onclick="App.sheetBack()">Back</button>
            <button class="btn btn-ink" onclick="App.applyDeposit()">I have sent it</button></div>`;
      } else {
        h = `<div class="success-check">${this._checkSVG()}</div>
          <h3 style="text-align:center;font-family:Fraunces;font-weight:600;font-size:24px;margin-bottom:8px">Funds on the way</h3>
          <p style="text-align:center;color:var(--ink-2);margin-bottom:22px;line-height:1.5">${fmt0(s.amount)} will be allocated to your ${p.name} mix as soon as it lands.</p>
          <button class="btn btn-ink btn-block" onclick="App.closeModal()">Done</button>`;
      }
    } else { // withdraw
      if (s.step === 1) {
        h = `<div class="sheet-head"><h3>Withdraw</h3>${this._close()}</div>
          <div class="sheet-sub">Withdraw any amount to your own wallet. No lock-up, no penalty.</div>
          <div class="amt-field"><span class="cur">$</span><input id="sheetAmt" inputmode="decimal" value="" placeholder="0" aria-label="Amount to withdraw"><button class="max" onclick="App.setMax()">Max</button></div>
          <div class="bal-note">Available: <b>${fmt(this.balance)}</b></div>
          <div class="field-err" id="sheetErr" style="display:none"></div>
          <div class="field-lab">To wallet</div>
          <div class="dest-field"><input id="sheetDest" value="${s.dest}" aria-label="Destination wallet address"></div>
          <div class="sheet-foot" style="margin-top:18px"><button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
            <button class="btn btn-ink" id="sheetNext" onclick="App.sheetNext()">Review</button></div>`;
      } else if (s.step === 2) {
        h = `<div class="sheet-head"><h3>Review withdrawal</h3>${this._close()}</div>
          <div class="sheet-sub">Confirm the details. Funds usually arrive within a few minutes.</div>
          <div class="review-row"><span class="k">Amount</span><span class="v tnum">${fmt(s.amount)}</span></div>
          <div class="review-row"><span class="k">To wallet</span><span class="v mono">${this._short(s.dest)}</span></div>
          <div class="review-row"><span class="k">Network</span><span class="v">Base</span></div>
          <div class="review-row"><span class="k">Fee</span><span class="v" style="color:var(--pos)">$0, gas covered</span></div>
          <div class="review-row"><span class="k">Remaining balance</span><span class="v tnum">${fmt(this.balance - s.amount)}</span></div>
          <div class="sheet-foot" style="margin-top:20px"><button class="btn btn-ghost" onclick="App.sheetBack()">Back</button>
            <button class="btn btn-ink" onclick="App.applyWithdraw()">Confirm withdrawal</button></div>`;
      } else {
        h = `<div class="success-check">${this._checkSVG()}</div>
          <h3 style="text-align:center;font-family:Fraunces;font-weight:600;font-size:24px;margin-bottom:8px">Withdrawal sent</h3>
          <p style="text-align:center;color:var(--ink-2);margin-bottom:22px;line-height:1.5">${fmt(s.amount)} is on its way to ${this._short(s.dest)}.</p>
          <button class="btn btn-ink btn-block" onclick="App.closeModal()">Done</button>`;
      }
    }
    box.innerHTML = h;
    if (s.step === 1) this.wireAmt();
  },
  wireAmt() {
    const inp = document.getElementById('sheetAmt'); if (!inp) return;
    const dest = document.getElementById('sheetDest');
    inp.addEventListener('input', () => this.validateSheet());
    if (dest) dest.addEventListener('input', () => this.validateSheet());
    document.querySelectorAll('#sheetPresets .amt-preset').forEach(pp =>
      pp.addEventListener('click', () => { inp.value = pp.dataset.v; this.validateSheet(); }));
    this.validateSheet();
    if (this.sheet.kind === 'withdraw') setTimeout(() => inp.focus(), 50);
  },
  validateSheet() {
    const s = this.sheet, inp = document.getElementById('sheetAmt'); if (!inp) return;
    s.amount = parseFloat((inp.value || '').replace(/[^0-9.]/g, '')) || 0;
    const dest = document.getElementById('sheetDest'); if (dest) s.dest = dest.value.trim();
    const err = document.getElementById('sheetErr'), next = document.getElementById('sheetNext');
    let msg = '', ok = s.amount > 0;
    if (s.kind === 'withdraw') {
      if (s.amount > this.balance) { msg = 'Amount is more than your available balance.'; ok = false; }
      if (!s.dest) ok = false;
    }
    if (err) { err.style.display = msg ? 'block' : 'none'; err.textContent = msg; }
    if (next) next.disabled = !ok;
  },
  sheetNext() { this.validateSheet(); if (document.getElementById('sheetNext').disabled) return; this.sheet.step = 2; this.renderSheet(); },
  sheetBack() { this.sheet.step = 1; this.renderSheet(); },
  setMax() { const inp = document.getElementById('sheetAmt'); if (inp) { inp.value = Math.floor(this.balance); this.validateSheet(); } },
  copyAddr() {
    const t = this.walletFull || this.wallet;
    if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {});
    const b = document.getElementById('copyBtn'); if (b) { b.textContent = 'Copied'; b.classList.add('done'); setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('done'); }, 1600); }
  },
  applyDeposit() {
    // A deposit adds principal: raise both market value and book value equally
    // (your return in $ and % is unchanged by adding cash).
    this.balance += this.sheet.amount;
    this.bookValue += this.sheet.amount;
    this.renderDashboard(); this.sheet.step = 3; this.renderSheet();
  },
  applyWithdraw() {
    // A withdrawal removes a slice of the whole portfolio. Reduce book value
    // proportionally so the remaining position keeps the same P&L percentage.
    const amt = this.sheet.amount;
    const f = this.balance > 0 ? Math.min(1, amt / this.balance) : 0;
    this.bookValue = Math.max(0, this.bookValue * (1 - f));
    this.balance = Math.max(0, this.balance - amt);
    this.renderDashboard(); this.sheet.step = 3; this.renderSheet();
  },

  closeModal() { document.getElementById('modalBg').classList.remove('show'); },
};

/* appbar shadow on scroll */
addEventListener('scroll', () => {
  document.getElementById('appbar').classList.toggle('solid', scrollY > 8);
}, { passive: true });

/* deep link: app.html#demo opens straight to the sample dashboard */
if (location.hash === '#demo' || /(?:\?|&)demo\b/.test(location.search)) {
  App.demoLogin();
}

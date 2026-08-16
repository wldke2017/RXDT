import store from '../store.js';

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function render(page) {
  if (page === 'follow/team') return renderTeam();
  return renderSignalHub();
}

// ---- SIGNAL COPY TRADING HUB ----
function renderSignalHub() {
  const doublingData = store.get('assetDoubling3Signals') || [];

  return `
  <div>
    <div class="page-header">
      <h1 class="page-title">RXDT Signal Copy Trading</h1>
      <div class="follow-sub-nav">
        <button class="sub-nav-btn active" onclick="window.location.hash='#/follow'">Signal Strategy & Doubling</button>
        <button class="sub-nav-btn" onclick="window.location.hash='#/contract'">Signal Trade History</button>
        <button class="sub-nav-btn" onclick="window.location.hash='#/follow/team'">VIP Team Dividends</button>
      </div>
    </div>

    <!-- Signal Schedule Card -->
    <div class="card" style="border:1px solid rgba(0,242,254,0.3);background:linear-gradient(135deg, rgba(13,18,29,0.9), rgba(9,13,22,0.9));margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        <img src="assets/images/rxdt_logo.png" alt="RXDT" style="width:40px;height:40px;filter:drop-shadow(0 0 10px #00f2fe);"/>
        <div>
          <h3 style="margin:0;font-size:18px;color:#00f2fe;">📡 Daily AI Signal Windows</h3>
          <div style="font-size:12px;color:var(--text-sub);">3 Automated Sessions Daily: <strong>5:00 PM, 6:00 PM, and 7:00 PM EAT</strong></div>
        </div>
      </div>
      <p style="font-size:14px;color:var(--text-sub);line-height:1.6;margin-bottom:16px;">
        Join live AI signal copy trading during active windows to earn 1.4% – 3.1% daily returns. Signals execute automatically when Auto-Execute is enabled, or you can confirm execution manually.
      </p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn-primary" style="padding:10px 24px;font-size:14px;" onclick="navigateTo('contract')">
          ⚡ Join Signal Copy Trading Now
        </button>
      </div>
    </div>

    <!-- Signal Entry -->
    <div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid rgba(0,242,254,0.2);margin-bottom:24px;">
      <div style="flex:1;min-width:200px;">
        <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);margin-bottom:4px;">🔐 Direct AI Signal Code Tracking</div>
        <div style="font-size:13px;color:var(--text-sub);">Have an exclusive signal verification code? Enter it below to join the algorithmic trade pool.</div>
      </div>
      <div style="display:flex;gap:8px;flex:1;min-width:240px;">
        <input type="text" id="signal-code" class="form-control" placeholder="Enter AI signal code..."/>
        <button class="btn-primary" onclick="trackSignal()">Verify Signal</button>
      </div>
    </div>

    <!-- Asset Doubling Schedule Table & AI Graphic -->
    <div class="card" style="background:linear-gradient(180deg, #131926 0%, #0d121d 100%);border:1px solid rgba(0,242,254,0.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" style="width:36px;height:36px;filter:drop-shadow(0 0 8px #00f2fe);"/>
          <div>
            <div class="card-title" style="margin:0;font-size:18px;">📈 Asset Doubling Growth Projection Table</div>
            <div style="font-size:12px;color:#00f2fe;letter-spacing:1px;font-weight:600;">3 SIGNALS DAILY · AI QUANTITATIVE COMPOUNDING</div>
          </div>
        </div>
        <div style="background:rgba(0,242,254,0.1);border:1px solid #00f2fe;padding:6px 12px;border-radius:20px;font-size:12px;color:#00f2fe;font-weight:600;">
          ⚡ Referral & Deposit Bonuses Accelerate Stake & Doubling Speed!
        </div>
      </div>

      <!-- Banner AI Visual -->
      <div style="position:relative;border-radius:12px;overflow:hidden;margin-bottom:20px;height:140px;background:url('assets/images/rxdt_home_hero_bg.png') center/cover no-repeat;display:flex;align-items:center;padding:0 24px;box-shadow:inset 0 0 40px rgba(0,0,0,0.8);">
        <div style="z-index:2;max-width:500px;">
          <span style="background:#7928ca;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">TIER RULES</span>
          <h4 style="margin:6px 0 4px 0;font-size:16px;color:#fff;font-weight:700;">Capital < $500: Testing Mode (34 Days Doubling)</h4>
          <p style="margin:0;font-size:13px;color:#cbd5e1;">Capital ≥ $500: Standard Mode (28 Days Doubling). Staking 10% per signal.</p>
        </div>
        <img src="assets/images/rxdt_hero_ship.png" alt="AI Trader" style="position:absolute;right:10px;height:160px;opacity:0.85;pointer-events:none;"/>
      </div>

      <p style="font-size:13px;color:var(--text-sub);margin-bottom:16px;">
        Each AI signal executes trades using 10% of your account balance. Below is the progressive growth model:
      </p>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>$100 Start <br/><span style="font-size:10px;color:#00f5a0;">(Testing - 34 Days)</span></th>
              <th>$200 Start <br/><span style="font-size:10px;color:#00f5a0;">(Testing - 34 Days)</span></th>
              <th>$500 Start <br/><span style="font-size:10px;color:#00f2fe;">(Standard - 28 Days)</span></th>
              <th>$1,000 Start <br/><span style="font-size:10px;color:#00f2fe;">(Standard - 28 Days)</span></th>
              <th>$2,000 Start <br/><span style="font-size:10px;color:#00f2fe;">(Standard - 28 Days)</span></th>
              <th>$5,000 Start <br/><span style="font-size:10px;color:#ff007a;">(Standard - 28 Days)</span></th>
            </tr>
          </thead>
          <tbody>
            ${doublingData.map(d => `
              <tr>
                <td><strong>Day ${d.day}</strong></td>
                <td class="price-up">$${fmt(d.c100 || d.c520)}</td>
                <td class="price-up">$${fmt(d.c200 || d.c1050)}</td>
                <td class="price-up">$${fmt(d.c500 || d.c2100)}</td>
                <td class="price-up">$${fmt(d.c1000 || d.c3180)}</td>
                <td class="price-up">$${fmt(d.c2000 || d.c5200)}</td>
                <td style="font-weight:800;color:var(--el-color-primary);">$${fmt(d.c5000 || d.c10600)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

// ---- VIP TEAM DIVIDENDS ----
function renderTeam() {
  const vipTiers = store.get('teamVipTiers') || [];
  const team = store.getTeam();

  return `
  <div>
    <div class="page-header">
      <h1 class="page-title">VIP Team Rewards & Dividends</h1>
      <div class="follow-sub-nav">
        <button class="sub-nav-btn" onclick="window.location.hash='#/follow'">Signal Strategy & Doubling</button>
        <button class="sub-nav-btn" onclick="window.location.hash='#/contract'">Signal Trade History</button>
        <button class="sub-nav-btn active" onclick="window.location.hash='#/follow/team'">VIP Team Dividends</button>
      </div>
    </div>

    <!-- Team Level Rewards Table -->
    <div class="card">
      <div class="card-title">🏆 VIP Partner Team Level Rewards</div>
      <p style="font-size:13px;color:var(--text-sub);margin-bottom:16px;">Directly refer 5 members to unlock team rewards and receive stable weekly trading volume dividends!</p>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr><th>Team Level</th><th>Team Size Required</th><th>Promotion Cash Bonus</th><th>Trading Volume Dividend</th></tr>
          </thead>
          <tbody>
            ${vipTiers.map(v => `
              <tr ${v.tier === team.currentVip ? 'style="background:rgba(0,242,254,0.1);"' : ''}>
                <td><span class="badge badge-info">${v.tier}</span> ${v.tier === team.currentVip ? ' (Current)' : ''}</td>
                <td>${v.teamSize} Members</td>
                <td class="price-up">$${v.reward.toLocaleString()}</td>
                <td style="font-weight:700;color:var(--el-color-primary);">${v.dividendPct}% Dividend</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;
}

export function init(page) {
  window.toast = toast;

  window.trackSignal = function() {
    const code = document.getElementById('signal-code')?.value.trim();
    if (!code) { toast('Please enter an AI signal code', 'error'); return; }
    toast(`AI Signal "${code}" verified! Joining high-frequency execution pool.`, 'success');
  };
}

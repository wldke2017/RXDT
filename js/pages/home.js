import store from '../store.js';

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function render() {
  const market = store.getMarketData();
  const hot = market.filter(m => m.hot);
  const aiModels = store.getAnalysts();
  const promos = store.get('depositPromotions') || [];
  const vipTiers = store.get('teamVipTiers') || [];

  return `
  <!-- RXDT Hero Banner -->
  <div class="home-hero">
    <div class="hero-content">
      <div class="hero-badge">⚡ U.S. State of Colorado Compliant · Entity ID: 20261325716</div>
      <h1 class="hero-title">RXDT <span class="highlight">AI Quantitative</span> Exchange</h1>
      <p class="hero-sub">In the vast crypto ocean, we are an endless ocean-going vessel. Powered by Warren Pennington's Quantitative Model VI.</p>
      
      <div class="hero-actions">
        <button class="btn-dark hero-btn" onclick="navigateTo('follow')">🤖 Start AI Trading</button>
        <button class="btn-outline hero-btn" onclick="navigateTo('market')">📊 View AI Markets</button>
      </div>

      <div class="hero-stats">
        <div class="hero-stat"><span class="stat-val">$50T</span><span class="stat-lbl">Vanguard Group Managed Assets</span></div>
        <div class="hero-stat"><span class="stat-val">1.8% – 2.8%</span><span class="stat-lbl">Average Daily AI Returns</span></div>
        <div class="hero-stat"><span class="stat-val">26–34 Days</span><span class="stat-lbl">Asset Doubling Cycle</span></div>
      </div>
    </div>
    <div class="hero-graphic">
      <img src="assets/images/rxdt_hero_ship.png" alt="RXDT Voyage Vessel" class="hero-ship-img" style="max-width:380px;border-radius:16px;box-shadow:0 0 30px rgba(0,242,254,0.3);border:1px solid rgba(0,242,254,0.3);"/>
    </div>
  </div>

  <!-- AI Signal Benefit Cards -->
  <div class="grid-2" style="margin-bottom:20px;">
    <div class="card" style="border-left:4px solid var(--el-color-primary);">
      <div style="font-size:12px;color:var(--el-color-primary);font-weight:700;letter-spacing:1px;margin-bottom:6px;">BASIC MEMBERSHIP</div>
      <h3 style="font-size:20px;font-weight:700;margin-bottom:8px;">3 Daily AI Quantitative Signals</h3>
      <p style="font-size:14px;color:var(--text-sub);margin-bottom:12px;">Trade 1% of your account balance per signal. Average daily return of <strong>1.8% to 2.1%</strong>. Approximately double your capital in <strong>34 days</strong>.</p>
      <button class="btn-primary" style="padding:6px 16px;font-size:13px;" onclick="navigateTo('follow')">Get 3 Signals Daily →</button>
    </div>

    <div class="card" style="border-left:4px solid var(--accent-purple);">
      <div style="font-size:12px;color:var(--accent-purple);font-weight:700;letter-spacing:1px;margin-bottom:6px;">TEAM LEADER MEMBERSHIP</div>
      <h3 style="font-size:20px;font-weight:700;margin-bottom:8px;">4 Daily AI Signals (Permanent +1)</h3>
      <p style="font-size:14px;color:var(--text-sub);margin-bottom:12px;">Invite 5 team members to unlock a 4th daily signal. Daily return increases to <strong>2.4% to 2.8%</strong>. Double capital in <strong>26 days</strong>!</p>
      <button class="btn-dark" style="padding:6px 16px;font-size:13px;" onclick="navigateTo('invite-friends')">Invite 5 Members →</button>
    </div>
  </div>

  <!-- Hot Crypto Assets -->
  <div class="card">
    <div class="card-title">
      🔥 Live AI Quantitative Markets
      <button class="btn-outline" style="font-size:13px;padding:6px 14px;" onclick="navigateTo('market')">View All →</button>
    </div>
    <div class="hot-tickers">
      ${hot.map(item => `
        <div class="ticker-card" onclick="navigateTo('market')">
          <div class="ticker-symbol">${item.symbol}</div>
          <div class="ticker-name">${item.name}</div>
          <div class="ticker-price">$${fmt(item.price)}</div>
          <div class="${item.changeRate >= 0 ? 'price-up' : 'price-down'}">
            ${item.changeRate >= 0 ? '▲' : '▼'} ${Math.abs(item.changeRate).toFixed(2)}%
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Global Deposit Promotion Rewards Table -->
  <div class="card">
    <div class="card-title">🎁 Global Deposit Promotion Rewards</div>
    <p style="font-size:14px;color:var(--text-sub);margin-bottom:16px;">Make your first deposit to claim instant new user rewards & referrer bonuses!</p>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr><th>First Deposit Range</th><th>New User Reward</th><th>Referrer Reward</th><th>Distribution</th></tr>
        </thead>
        <tbody>
          ${promos.map(p => `
            <tr>
              <td style="font-weight:700;color:var(--el-color-primary);">${p.range}</td>
              <td class="price-up">+${typeof p.newUserBonus === 'number' ? '$' + p.newUserBonus : p.newUserBonus}</td>
              <td class="price-up">+${typeof p.referrerBonus === 'number' ? '$' + p.referrerBonus : p.referrerBonus}</td>
              <td><span class="badge badge-success">Same Day Credit</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Institutional Founder & Executive Team -->
  <div class="card">
    <div class="card-title">🏛️ Institutional Leadership & Founder</div>
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
      <img src="assets/images/warren_pennington.png" alt="Warren Pennington" style="width:140px;height:140px;object-fit:cover;border-radius:12px;border:2px solid var(--el-color-primary);flex-shrink:0;"/>
      <div style="flex:1;min-width:0;">
        <h3 style="font-size:20px;font-weight:700;color:var(--el-color-primary);margin-bottom:4px;">WARREN PENNINGTON</h3>
        <div style="font-size:13px;color:var(--text-sub);margin-bottom:12px;">Founder of RXDT Quantitative Model VI & Former Global Head of FinTech Strategies at Vanguard Group</div>
        <p style="font-size:14px;color:var(--text-muted);line-height:1.6;margin-bottom:12px;">
          Mr. Pennington holds a B.S. in Aerospace Engineering and M.S. in Telecommunications (CU Boulder), CPA certified, and managed $50 Trillion in assets at Vanguard. He launched the proprietary RXDT Quantitative AI Model to help global investors navigate crypto markets safely.
        </p>
        <button class="btn-outline" onclick="navigateTo('about')">Read Complete Institutional Background →</button>
      </div>
    </div>
  </div>

  <!-- Compliance Trophy & Regulatory Authorization -->
  <div class="card" style="background:linear-gradient(135deg,#0d1322,#161e31);border:1px solid rgba(0,242,254,0.3);">
    <div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap;">
      <div style="flex:1;min-width:0;">
        <div class="badge badge-info" style="margin-bottom:8px;">OFFICIAL COMPLIANCE STATEMENT</div>
        <h2 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:8px;">KORE / RXDT Exchange</h2>
        <p style="font-size:14px;color:var(--text-sub);line-height:1.7;margin-bottom:16px;">
          RXDT Exchange Inc is officially authorized and registered by the State of Colorado, USA (Entity ID: <strong>20261325716</strong>). You can verify official details directly on the Colorado Secretary of State Business Search System.
        </p>
        <a href="https://www.coloradosos.gov/biz/BusinessEntityCriteriaExt.do" target="_blank" class="btn-primary" style="display:inline-block;">
          🔍 Verify Registration on Colorado SOS
        </a>
      </div>
      <img src="assets/images/compliance_trophy.png" alt="Compliance Trophy" style="width:clamp(100px,40%,180px);border-radius:12px;box-shadow:0 0 25px rgba(0,242,254,0.2);flex-shrink:0;"/>
    </div>
  </div>
  `;
}

export function init() {}

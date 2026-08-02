import store from '../store.js';

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function render() {
  const user = store.getUser();
  const isLoggedIn = store.isLoggedIn();
  const market = store.getMarketData();
  const hot = market.filter(m => m.hot);
  const aiModels = store.getAnalysts();

  return `
  <!-- Home Hero Section with Generated Brand Image -->
  <div class="home-hero-container">
    <div class="home-hero-bg" style="background-image: url('assets/images/rxdt_home_hero_bg.png');"></div>
    <div class="home-hero-overlay"></div>
    
    <div class="home-hero-inner">
      <!-- Top Bar: Account Balance Widget -->
      <div class="home-balance-header card-glass">
        <div class="hbh-brand">
          <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" class="hbh-logo-img"/>
          <div class="hbh-brand-text">
            <span class="hbh-title">RXDT EXCHANGE</span>
            <span class="hbh-tag">AI QUANT VI</span>
          </div>
        </div>

        <div class="hbh-balance-group">
          ${isLoggedIn && user ? `
            <div class="hbh-stat-item">
              <span class="hbh-lbl">Account Balance</span>
              <span class="hbh-val">$${fmt(user.availableBalance)} <small>USDT</small></span>
            </div>
            <div class="hbh-stat-item desktop-only">
              <span class="hbh-lbl">Total Assets</span>
              <span class="hbh-val">$${fmt(user.totalAssets)} <small>USDT</small></span>
            </div>
            <div class="hbh-actions">
              <button class="btn-primary btn-sm" onclick="navigateTo('recharge')">Deposit</button>
              <button class="btn-outline btn-sm" onclick="navigateTo('withdraw')">Withdraw</button>
            </div>
          ` : `
            <div class="hbh-stat-item">
              <span class="hbh-lbl">Global Quantitative Platform</span>
              <span class="hbh-val" style="font-size:15px;color:var(--el-color-primary);">AI Trading Engine VI Active</span>
            </div>
          `}
        </div>
      </div>

      <!-- Main Banner Headline -->
      <div class="home-hero-main">
        <div class="hero-badge">⚡ U.S. State of Colorado Compliant · Entity ID: 20261325716</div>
        <h1 class="hero-title-main">
          Next-Generation <span class="highlight-cyan">AI Quantitative</span> Trading
        </h1>
        <p class="hero-subtitle-main">
          Empowering global crypto investors with high-frequency automated algorithmic trading models. Average daily return of 1.8% to 2.8%.
        </p>

        <div class="home-quick-actions">
          <button class="btn-dark action-btn" onclick="navigateTo('follow')">🤖 Start AI Trading</button>
          <button class="btn-outline action-btn" onclick="navigateTo('market')">📊 Live Markets</button>
          <button class="btn-outline action-btn" onclick="navigateTo('invite-friends')">🎁 Refer & Earn</button>
        </div>

        <div class="hero-stats-row">
          <div class="hstat-box">
            <span class="hstat-val">$50T</span>
            <span class="hstat-lbl">Managed Asset Heritage</span>
          </div>
          <div class="hstat-box">
            <span class="hstat-val">1.8% – 2.8%</span>
            <span class="hstat-lbl">Daily AI Returns</span>
          </div>
          <div class="hstat-box">
            <span class="hstat-val">26–34 Days</span>
            <span class="hstat-lbl">Doubling Cycle</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- AI Quantitative Models Showcase -->
  <div class="card" style="margin-top:24px;">
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
      <span>🤖 Featured AI Quantitative Models</span>
      <button class="btn-outline" style="font-size:13px;padding:6px 14px;" onclick="navigateTo('follow')">Explore All Models →</button>
    </div>
    
    <div class="grid-2" style="gap:16px;">
      ${aiModels.slice(0, 2).map(a => `
        <div class="card-glass" style="padding:16px;border-radius:12px;border:1px solid var(--border-color);display:flex;gap:12px;align-items:center;">
          <div style="font-size:36px;width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:rgba(0,242,254,0.1);border-radius:50%;border:1px solid var(--border-color);">${a.avatar}</div>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);">${a.name}</div>
            <div style="font-size:13px;color:var(--text-sub);">Win Rate: <strong class="price-up">${a.winRate}%</strong> · 1D Return: <strong class="price-up">+${a.oneDayReturnRate.toFixed(2)}%</strong></div>
          </div>
          <button class="btn-primary" style="padding:6px 14px;font-size:13px;" onclick="navigateTo('follow')">Follow</button>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- Live Market Tickers -->
  <div class="card">
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
      <span>🔥 Live AI Markets</span>
      <button class="btn-outline" style="font-size:13px;padding:6px 14px;" onclick="navigateTo('market')">View All Markets →</button>
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

  <!-- Institutional Background Teaser -->
  <div class="card" style="background:linear-gradient(135deg,#0d1322,#161e31);border:1px solid rgba(0,242,254,0.3);">
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
      <div style="flex:1;min-width:240px;">
        <div class="badge badge-info" style="margin-bottom:8px;">INSTITUTIONAL FOUNDER</div>
        <h3 style="font-size:20px;font-weight:700;color:#fff;margin-bottom:6px;">Warren Pennington & RXDT Exchange</h3>
        <p style="font-size:14px;color:var(--text-sub);line-height:1.6;margin-bottom:12px;">
          Founded by former Vanguard Group Global Head of FinTech Strategies. Fully registered in Colorado, USA (Entity ID: <strong>20261325716</strong>).
        </p>
        <button class="btn-outline" onclick="navigateTo('about')">Learn More About RXDT →</button>
      </div>
      <img src="assets/images/warren_pennington.png" alt="Warren Pennington" style="width:100px;height:100px;object-fit:cover;border-radius:12px;border:2px solid var(--el-color-primary);flex-shrink:0;"/>
    </div>
  </div>
  `;
}

export function init() {}

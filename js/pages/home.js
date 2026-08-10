import store from '../store.js';

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function render() {
  const user = store.getUser();
  const isLoggedIn = store.isLoggedIn();

  return `
  <!-- Home Hero Section with AI Signals Focus -->
  <div class="home-hero-container">
    <div class="home-hero-bg" style="background-image: url('assets/images/rxdt_home_hero_bg.png');"></div>
    <div class="home-hero-overlay"></div>
    
    <div class="home-hero-inner">
      <!-- Top Bar: Account Balance & Brand Header -->
      <div class="home-balance-header card-glass">
        <div class="hbh-brand">
          <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" class="hbh-logo-img"/>
          <div class="hbh-brand-text">
            <span class="hbh-title">RXDT EXCHANGE</span>
            <span class="hbh-tag">AI QUANT SIGNALS</span>
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
          Next-Gen <span class="highlight-cyan">AI Trading Signals</span> & Auto Execution
        </h1>
        <p class="hero-subtitle-main">
          High-accuracy real-time AI signal feeds with automated high-frequency execution. Average daily return of 1.8% to 2.8%.
        </p>

        <div class="home-quick-actions">
          <button class="btn-dark action-btn" onclick="navigateTo('contract')">⚡ Access AI Signals</button>
          <button class="btn-outline action-btn" onclick="navigateTo('market')">📊 Live Signal Feeds</button>
          <button class="btn-outline action-btn" onclick="navigateTo('invite-friends')">🎁 Refer & Earn</button>
          <button class="btn-outline action-btn" onclick="navigateTo('earn-guide')">📈 Signals Guide</button>
        </div>
      </div>
    </div>
  </div>

  <!-- AI Signals Visual Showcase (Auto-scrolling Image Carousel) -->
  <div class="card" style="margin-top:24px; padding:20px;">
    <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" style="width:28px;height:28px;filter:drop-shadow(0 0 6px rgba(0,242,254,0.6));"/>
        <span style="font-size:18px;font-weight:700;">RXDT Daily AI Signal Trading Windows</span>
      </div>
      <button class="btn-outline" style="font-size:13px;padding:6px 14px;" onclick="navigateTo('contract')">Start Copying Signals →</button>
    </div>

    <!-- Auto Scroll Horizontality Carousel -->
    <div class="signals-carousel-wrapper">
      <div class="signals-carousel-track" id="signalsCarouselTrack">
        <!-- Signal 1: 5:00 PM EAT -->
        <div class="signals-card-item card-glass" onclick="navigateTo('contract')">
          <div class="signals-img-box">
            <img src="assets/images/daily_signal_1_5pm.png" alt="AI Signal 1 - 5:00 PM EAT" class="signals-banner-img"/>
          </div>
          <div class="signals-card-body">
            <div class="signals-card-header">
              <div>
                <span class="signals-title">Daily AI Signal #1</span>
                <div style="margin-top:4px;">
                  <span class="chip chip-cyan" style="font-size:11px;font-weight:700;">⏰ 5:00 PM EAT (14:00 UTC)</span>
                </div>
              </div>
              <span class="chip chip-green">1.4% Yield</span>
            </div>
            <p class="signals-desc">First daily quantitative trade window for Tier 1 traders & above ($100+ deposit).</p>
            <div class="signals-meta">
              <span>Time Window: <strong style="color:var(--el-color-primary);">5:00 - 5:30 PM</strong></span>
              <button class="btn-primary btn-sm" onclick="event.stopPropagation(); navigateTo('contract')">Join 5 PM Signal</button>
            </div>
          </div>
        </div>

        <!-- Signal 2: 6:00 PM EAT -->
        <div class="signals-card-item card-glass" onclick="navigateTo('contract')">
          <div class="signals-img-box">
            <img src="assets/images/daily_signal_2_6pm.png" alt="AI Signal 2 - 6:00 PM EAT" class="signals-banner-img"/>
          </div>
          <div class="signals-card-body">
            <div class="signals-card-header">
              <div>
                <span class="signals-title">Daily AI Signal #2</span>
                <div style="margin-top:4px;">
                  <span class="chip chip-cyan" style="font-size:11px;font-weight:700;">⏰ 6:00 PM EAT (15:00 UTC)</span>
                </div>
              </div>
              <span class="chip chip-cyan">2.4% Yield</span>
            </div>
            <p class="signals-desc">Second daily quantitative trade window for Tier 2 traders & above ($300+ deposit).</p>
            <div class="signals-meta">
              <span>Time Window: <strong style="color:var(--el-color-primary);">6:00 - 6:30 PM</strong></span>
              <button class="btn-primary btn-sm" onclick="event.stopPropagation(); navigateTo('contract')">Join 6 PM Signal</button>
            </div>
          </div>
        </div>

        <!-- Signal 3: 7:00 PM EAT -->
        <div class="signals-card-item card-glass" onclick="navigateTo('contract')">
          <div class="signals-img-box">
            <img src="assets/images/daily_signal_3_7pm.png" alt="AI Signal 3 - 7:00 PM EAT" class="signals-banner-img"/>
          </div>
          <div class="signals-card-body">
            <div class="signals-card-header">
              <div>
                <span class="signals-title">Daily AI Signal #3</span>
                <div style="margin-top:4px;">
                  <span class="chip chip-cyan" style="font-size:11px;font-weight:700;">🔥 7:00 PM EAT (16:00 UTC)</span>
                </div>
              </div>
              <span class="chip chip-green">3.1% Max Yield</span>
            </div>
            <p class="signals-desc">Third daily quantitative trade window for Tier 3 traders & VIPs ($1,000+ deposit).</p>
            <div class="signals-meta">
              <span>Time Window: <strong style="color:var(--el-color-primary);">7:00 - 7:30 PM</strong></span>
              <button class="btn-primary btn-sm" onclick="event.stopPropagation(); navigateTo('contract')">Join 7 PM Signal</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- AI Signals Key Metrics & Value Proposition -->
  <div class="grid-3" style="gap:16px;margin-top:20px;margin-bottom:20px;">
    <div class="stat-card-icon card-glass" style="padding:16px;border-radius:12px;border:1px solid rgba(0,242,254,0.2);">
      <div class="sci-icon" style="font-size:28px;">⚡</div>
      <div class="sci-info">
        <div class="sci-label">AI Signal Accuracy</div>
        <div class="sci-value" style="color:var(--el-color-primary);">92% – 96.5%</div>
      </div>
    </div>
    <div class="stat-card-icon card-glass" style="padding:16px;border-radius:12px;border:1px solid rgba(0,242,254,0.2);">
      <div class="sci-icon" style="font-size:28px;">💹</div>
      <div class="sci-info">
        <div class="sci-label">Daily AI Signal Return</div>
        <div class="sci-value" style="color:var(--color-up);">1.8% – 2.8%</div>
      </div>
    </div>
    <div class="stat-card-icon card-glass" style="padding:16px;border-radius:12px;border:1px solid rgba(0,242,254,0.2);">
      <div class="sci-icon" style="font-size:28px;">🛡️</div>
      <div class="sci-info">
        <div class="sci-label">Doubling Cycle</div>
        <div class="sci-value" style="color:#a78bfa;">26–34 Days</div>
      </div>
    </div>
  </div>

  <!-- Institutional Background & Compliance Teaser -->
  <div class="card" style="background:linear-gradient(135deg,#0d1322,#161e31);border:1px solid rgba(0,242,254,0.3);">
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
      <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" style="width:70px;height:70px;object-fit:contain;filter:drop-shadow(0 0 10px rgba(0,242,254,0.5));flex-shrink:0;"/>
      <div style="flex:1;min-width:240px;">
        <div class="badge badge-info" style="margin-bottom:8px;">POWERED BY RXDT AI SIGNALS</div>
        <h3 style="font-size:20px;font-weight:700;color:#fff;margin-bottom:6px;">Automated Algorithmic AI Signal Execution</h3>
        <p style="color:var(--text-sub);font-size:14px;line-height:1.6;margin-bottom:12px;">
          RXDT Exchange operates under USA Colorado State Compliance (Entity ID: 20261325716). Our proprietary AI signal models connect directly to copy-trading pools for hands-free passive yield.
        </p>
      </div>
      <button class="btn-primary" style="padding:12px 24px;font-size:15px;font-weight:700;" onclick="navigateTo('follow')">Start AI Trading Now</button>
    </div>
  </div>
  `;
}

export function init() {
  // Setup smooth infinite horizontal auto-scrolling for AI Signal Cards
  const track = document.getElementById('signalsCarouselTrack');
  if (!track) return;

  let isHovered = false;
  track.addEventListener('mouseenter', () => { isHovered = true; });
  track.addEventListener('mouseleave', () => { isHovered = false; });

  setInterval(() => {
    if (isHovered) return;
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: 340, behavior: 'smooth' });
    }
  }, 3500);
}


import store from '../store.js';

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function render() {
  const user = store.getUser();
  const isLoggedIn = store.isLoggedIn();

  return `
  <!-- ======== HOME: COMPACT BRAND HEADER ======== -->
  <div class="home-brand-bar">
    <div class="hbb-left">
      <img src="assets/images/rxdt_logo.png" alt="RXDT" class="hbb-logo"/>
      <div class="hbb-titles">
        <span class="hbb-name">RXDT EXCHANGE</span>
        <span class="hbb-sub">AI Quant Signals Platform</span>
      </div>
    </div>
    <div class="hbb-right">
      ${isLoggedIn && user ? `
        <div class="hbb-balance">
          <span class="hbb-bal-label">Balance</span>
          <span class="hbb-bal-value">$${fmt(user.availableBalance)} <small>USDT</small></span>
        </div>
        <div class="hbb-btns">
          <button class="btn-primary btn-xs" onclick="navigateTo('recharge')">Deposit</button>
          <button class="btn-outline btn-xs" onclick="navigateTo('withdraw')">Withdraw</button>
        </div>
      ` : `
        <button class="btn-primary btn-sm hbb-cta" onclick="navigateTo('login')">Get Started</button>
      `}
    </div>
  </div>

  <!-- ======== HOME: SIGNAL CARDS HERO ======== -->
  <div class="home-signals-hero">

    <!-- Live indicator pill -->
    <div class="home-live-pill">
      <span class="live-dot"></span>
      <span>3 Daily AI Signal Windows &middot; Live</span>
    </div>

    <!-- Signal Card 1 -->
    <div class="home-sig-card" onclick="navigateTo('contract')">
      <img src="assets/images/daily_signal_1_5pm.png" alt="AI Signal 1 – 5:00 PM EAT" class="home-sig-img"/>
      <div class="home-sig-tap-hint">Tap to Start Trading</div>
    </div>

    <!-- Signal Card 2 -->
    <div class="home-sig-card" onclick="navigateTo('contract')">
      <img src="assets/images/daily_signal_2_6pm.png" alt="AI Signal 2 – 6:00 PM EAT" class="home-sig-img"/>
      <div class="home-sig-tap-hint">Tap to Start Trading</div>
    </div>

    <!-- Signal Card 3 -->
    <div class="home-sig-card" onclick="navigateTo('contract')">
      <img src="assets/images/daily_signal_3_7pm.png" alt="AI Signal 3 – 7:00 PM EAT" class="home-sig-img"/>
      <div class="home-sig-tap-hint">Tap to Start Trading</div>
    </div>
  </div>

  <!-- ======== HOME: KEY STATS ROW ======== -->
  <div class="home-stats-row">
    <div class="home-stat-chip">
      <span class="hsc-icon">⚡</span>
      <div>
        <div class="hsc-value">92–96.5%</div>
        <div class="hsc-label">Accuracy</div>
      </div>
    </div>
    <div class="home-stat-chip">
      <span class="hsc-icon">💹</span>
      <div>
        <div class="hsc-value" style="color:var(--color-up);">1.8–2.8%</div>
        <div class="hsc-label">Daily Return</div>
      </div>
    </div>
    <div class="home-stat-chip">
      <span class="hsc-icon">🔁</span>
      <div>
        <div class="hsc-value" style="color:#a78bfa;">26–34 Days</div>
        <div class="hsc-label">Doubling Cycle</div>
      </div>
    </div>
  </div>

  <!-- ======== HOME: PRIMARY CTA ======== -->
  <div class="home-cta-row">
    <button class="btn-primary home-main-cta" onclick="navigateTo('contract')">
      ⚡ Access AI Signals Now
    </button>
    <button class="btn-outline home-sec-cta" onclick="navigateTo('follow')">
      📋 Copy Top Traders
    </button>
  </div>
  `;
}

export function init() {
  // Touch tap detection for signal cards
  const cards = document.querySelectorAll('.home-sig-card');
  cards.forEach(card => {
    let startX = 0;
    card.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', e => {
      const diff = Math.abs(e.changedTouches[0].clientX - startX);
      if (diff < 8) card.click();
    }, { passive: true });
  });
}

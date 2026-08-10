import store from '../store.js';

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function render() {
  const user = store.getUser();
  const isLoggedIn = store.isLoggedIn();

  const availableBalance = user ? (user.availableBalance || 0) : 0;
  const inOrderBalance = user ? (user.frozenBalance || user.inOrderBalance || 0) : 0;
  const totalAssets = user ? (user.totalAssets || (availableBalance + inOrderBalance)) : 0;

  return `
  <!-- ======== HOME: ELEGANT BALANCE & BRAND CARD ======== -->
  <div class="home-balance-card">
    <div class="hbc-header">
      <div class="hbc-brand">
        <img src="assets/images/rxdt_logo.png" alt="RXDT" class="hbc-logo"/>
        <div class="hbc-titles">
          <span class="hbc-name">RXDT EXCHANGE</span>
          <span class="hbc-sub">AI Quant Signals Platform</span>
        </div>
      </div>
      <div class="hbc-badge">
        <span class="live-dot"></span> Active
      </div>
    </div>

    ${isLoggedIn && user ? `
      <div class="hbc-stats-grid">
        <div class="hbc-stat-item">
          <span class="hbc-label">Available Balance</span>
          <span class="hbc-value">$${fmt(availableBalance)} <small>USDT</small></span>
        </div>
        <div class="hbc-stat-item">
          <span class="hbc-label">In Order (In Signal/Trade)</span>
          <span class="hbc-value highlight-gold">$${fmt(inOrderBalance)} <small>USDT</small></span>
        </div>
        <div class="hbc-stat-item full-width">
          <span class="hbc-label">Total Assets</span>
          <span class="hbc-value highlight-cyan">$${fmt(totalAssets)} <small>USDT</small></span>
        </div>
      </div>

      <div class="hbc-actions">
        <button class="btn-primary hbc-btn" onclick="navigateTo('recharge')">Deposit</button>
        <button class="btn-outline hbc-btn" onclick="navigateTo('withdraw')">Withdraw</button>
      </div>
    ` : `
      <div class="hbc-guest-box">
        <p class="hbc-guest-txt">Join the premier AI Quantitative Trading Platform. Start automated trading today.</p>
        <button class="btn-primary hbc-btn" onclick="navigateTo('login')">Get Started / Log In</button>
      </div>
    `}
  </div>

  <!-- ======== HOME: SINGLE BOX HORIZONTAL AUTO-SWIPING SIGNALS CAROUSEL ======== -->
  <div class="home-signals-carousel-box">
    <div class="hscb-header">
      <div class="hscb-title">
        <span class="live-dot"></span> 3 Daily AI Signal Windows
      </div>
      <span class="hscb-subtitle">Swipe or auto-scroll &rarr;</span>
    </div>

    <div class="hscb-track-wrapper" id="signalsCarouselTrack">
      <!-- Signal 1 -->
      <div class="hscb-slide" onclick="navigateTo('contract')">
        <img src="assets/images/daily_signal_1_5pm.png" alt="AI Signal 1 – 5:00 PM EAT" class="hscb-img"/>
        <div class="hscb-badge">Signal 1 · 5:00 PM EAT</div>
      </div>

      <!-- Signal 2 -->
      <div class="hscb-slide" onclick="navigateTo('contract')">
        <img src="assets/images/daily_signal_2_6pm.png" alt="AI Signal 2 – 6:00 PM EAT" class="hscb-img"/>
        <div class="hscb-badge">Signal 2 · 6:00 PM EAT</div>
      </div>

      <!-- Signal 3 -->
      <div class="hscb-slide" onclick="navigateTo('contract')">
        <img src="assets/images/daily_signal_3_7pm.png" alt="AI Signal 3 – 7:00 PM EAT" class="hscb-img"/>
        <div class="hscb-badge">Signal 3 · 7:00 PM EAT</div>
      </div>
    </div>

    <!-- Carousel Indicator Dots -->
    <div class="hscb-dots">
      <span class="hscb-dot active" data-idx="0"></span>
      <span class="hscb-dot" data-idx="1"></span>
      <span class="hscb-dot" data-idx="2"></span>
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
  const track = document.getElementById('signalsCarouselTrack');
  if (!track) return;

  const dots = document.querySelectorAll('.hscb-dot');
  let currentIdx = 0;
  let isHovered = false;

  const updateDots = (idx) => {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
    });
  };

  track.addEventListener('mouseenter', () => { isHovered = true; });
  track.addEventListener('mouseleave', () => { isHovered = false; });
  track.addEventListener('touchstart', () => { isHovered = true; }, { passive: true });
  track.addEventListener('touchend', () => { setTimeout(() => { isHovered = false; }, 3000); }, { passive: true });

  track.addEventListener('scroll', () => {
    const width = track.clientWidth;
    if (width > 0) {
      const idx = Math.round(track.scrollLeft / width);
      if (idx !== currentIdx) {
        currentIdx = idx;
        updateDots(currentIdx);
      }
    }
  }, { passive: true });

  setInterval(() => {
    if (isHovered) return;
    const slides = track.querySelectorAll('.hscb-slide');
    if (!slides.length) return;
    
    currentIdx = (currentIdx + 1) % slides.length;
    const scrollAmount = track.clientWidth * currentIdx;
    track.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    updateDots(currentIdx);
  }, 3500);
}


import store from './store.js';
import router from './router.js';

// Initialize app on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  renderShell();
  await store.checkAuth();
  router.init();

  store.subscribe('auth', () => updateUserNav());
  store.subscribe('user', () => updateUserNav());

  startMarketUpdates();

  // Check and show signal pop-up if in active window
  if (store.isLoggedIn()) {
    setTimeout(() => checkSignalWindow(), 1500); // slight delay after page load
  }
  store.subscribe('auth', () => {
    if (store.isLoggedIn()) setTimeout(() => checkSignalWindow(), 1000);
  });

  // ---- Signal Push Notification Poller ----
  // Polls the backend every 8 seconds while logged in so the signal pop-up
  // is pushed to users automatically at exactly 5pm, 6pm, and 7pm EAT the
  // moment the signal window opens — no manual refresh required.
  startSignalPoller();

  // ---- Aggressive Signal Popup on Every Page Navigation ----
  // Whenever the user navigates to a different page (home → market → profile,
  // etc.), immediately re-check for an active signal and show the popup again
  // if they haven't joined yet. This makes the popup "follow" the user across
  // the entire site until they join the signal.
  window.addEventListener('hashchange', () => {
    if (store.isLoggedIn()) checkSignalWindow();
  });
});

// Start polling for active signals to "push" notifications at signal times
let signalPollTimer = null;
function startSignalPoller() {
  if (signalPollTimer) return; // already running
  signalPollTimer = setInterval(() => {
    if (!store.isLoggedIn()) return;
    checkSignalWindow();
  }, 8 * 1000); // check every 8 seconds
}

function renderShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Toast Container -->
    <div class="toast-container" id="toast-container"></div>

    <!-- Desktop Navbar -->
    <nav class="navbar">
      <div class="brand" onclick="navigateTo('home')">
        <img src="assets/images/rxdt_logo.png" alt="RXDT" class="logo-img"/>
        <span style="letter-spacing:1px;">RXDT</span>
      </div>

      <div class="nav-links">
        <div class="nav-item" data-page="home" onclick="navigateTo('home')">Home</div>
        <div class="nav-item" data-page="market" onclick="navigateTo('market')">Markets</div>
        <div class="nav-item" data-page="follow" onclick="navigateTo('follow')">AI Trading</div>
        <div class="nav-item" data-page="recharge" onclick="navigateTo('recharge')">Deposit</div>
        <div class="nav-item" data-page="about" onclick="navigateTo('about')">About</div>
      </div>

      <div class="user-actions" id="user-actions-area">
        ${renderUserActions()}
      </div>
    </nav>

    <!-- Main Page Content -->
    <main class="bg-grid-pattern">
      <div class="page-container" id="page-content">
        <!-- Router renders here -->
      </div>
    </main>

    <!-- Footer -->
    <footer class="footer" id="app-footer">
      <div class="footer-links">
        <a onclick="navigateTo('home')">Home</a>
        <a onclick="navigateTo('market')">Markets</a>
        <a onclick="navigateTo('follow')">AI Trading</a>
        <a onclick="navigateTo('about')">About Us</a>
        <a onclick="navigateTo('customer-service')">Customer Service</a>
        <a onclick="navigateTo('agreement')">User Agreement</a>
        <a onclick="navigateTo('investment-agreement')">AI Trading Agreement</a>
      </div>
      <div class="footer-copy">© 2026 RXDT Exchange Inc · State of Colorado Registered Entity ID: 20261325716 · Powered by Voyage Investment & Vanguard FinTech Strategies</div>
    </footer>

    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-nav">
      <div class="mobile-nav-items">
        <div class="mobile-nav-item" data-page="home" onclick="navigateTo('home')">
          <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>Home</span>
        </div>
        <div class="mobile-nav-item" data-page="market" onclick="navigateTo('market')">
          <svg viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
          <span>Market</span>
        </div>
        <div class="mobile-nav-item" data-page="contract" onclick="navigateTo('contract')">
          <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 10H8v-2h6v2zm2-4H8V7h8v2z"/></svg>
          <span>Contract</span>
        </div>
        <div class="mobile-nav-item" data-page="assets" onclick="navigateTo('assets')">
          <svg viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
          <span>Assets</span>
        </div>
        <div class="mobile-nav-item" data-page="invite-friends" onclick="navigateTo('invite-friends')">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          <span>Profile</span>
        </div>
      </div>
    </nav>
  `;
}


function renderUserActions() {
  const isLoggedIn = store.isLoggedIn();
  if (isLoggedIn) {
    const user = store.getUser();
    const displayName = user?.name || user?.phone || user?.email || 'User';
    return `
      <div class="user-avatar-btn" onclick="toggleUserMenu()">
        <div class="user-avatar-circle" style="background:linear-gradient(135deg,#00f2fe,#7928ca);">${displayName[0].toUpperCase()}</div>
        <span style="font-size:14px;font-weight:600;">${displayName}</span>
        <span>▾</span>
      </div>
      <div class="user-dropdown" id="user-dropdown" style="background:#131926;border:1px solid rgba(255,255,255,0.15);">
        <div class="udrop-item" onclick="navigateTo('assets');closeUserMenu()">My Assets</div>
        <div class="udrop-item" onclick="navigateTo('follow/note');closeUserMenu()">My AI Orders</div>
        <div class="udrop-item" onclick="navigateTo('invite-friends');closeUserMenu()">Invite Friends</div>
        <div class="udrop-item" onclick="navigateTo('security-settings');closeUserMenu()">Security Settings</div>
        <div class="udrop-item" onclick="navigateTo('kyc');closeUserMenu()">KYC Verification</div>
        <div class="udrop-divider"></div>
        <div class="udrop-item danger" onclick="doLogout()">Logout</div>
      </div>
    `;
  } else {
    return `
      <button class="btn-outline" onclick="navigateTo('login')">Login</button>
      <button class="btn-primary" onclick="navigateTo('register')">Register</button>
    `;
  }
}

function updateUserNav() {
  const area = document.getElementById('user-actions-area');
  if (area) area.innerHTML = renderUserActions();
}

window.toggleUserMenu = function () {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.toggle('open');
};

window.closeUserMenu = function () {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.remove('open');
};

window.doLogout = function () {
  if (confirm('Are you sure you want to logout?')) {
    store.logout();
    window.location.hash = '#/home';
  }
};

document.addEventListener('click', function (e) {
  const dd = document.getElementById('user-dropdown');
  if (dd && !e.target.closest('.user-avatar-btn')) {
    dd.classList.remove('open');
  }
});

function startMarketUpdates() {
  setInterval(() => {
    const market = store.getMarketData();
    market.forEach(item => {
      const delta = (Math.random() - 0.5) * 0.4;
      item.price = Math.max(0.01, item.price * (1 + delta / 100));
      item.change = item.price * (delta / 100);
      item.changeRate = parseFloat((item.changeRate + (Math.random() - 0.5) * 0.05).toFixed(2));
    });
  }, 8000);
}

// ---- Signal Window Pop-Up ----
async function checkSignalWindow() {
  if (!store.isLoggedIn()) return;
  if (document.getElementById('rxdt-signal-popup')) return; // already shown

  const TOKEN = localStorage.getItem('rxdt_token');
  try {
    const res = await fetch('/api/signals/active', {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const data = await res.json();
    if (!data.activeSignal || !data.qualified || data.alreadyExecuted) return;
    showSignalPopup(data);
  } catch (e) {
    console.warn('Signal check failed:', e);
  }
}

function showSignalPopup(signalData) {
  if (document.getElementById('rxdt-signal-popup')) return;

  const signal = signalData.activeSignal;
  const tier = signalData.tier;

  const overlay = document.createElement('div');
  overlay.id = 'rxdt-signal-popup';
  overlay.className = 'rxdt-signal-overlay';
  overlay.innerHTML = `
  <div class="rxdt-signal-card" onclick="event.stopPropagation()">
    <button class="rxdt-signal-close" onclick="document.getElementById('rxdt-signal-popup').remove()">✕</button>
    <div class="rxdt-signal-badge">📩 Invited Me</div>
    <div class="rxdt-signal-img-wrap">
      <img src="assets/images/signal_popup.png" alt="RXDT Strategy Copy Trading" class="rxdt-signal-img"/>
      <div class="rxdt-signal-img-gradient"></div>
    </div>
    <div class="rxdt-signal-content">
      <div class="rxdt-signal-title">Strategy Copy Trading</div>
      <div class="rxdt-signal-sub">AI-powered signals — 3 sessions daily at 5pm, 6pm, 7pm EAT. ${tier ? tier.description : ''}</div>
    </div>
    <div class="rxdt-signal-footer">
      <span class="rxdt-signal-join-text">Join Copy Trading</span>
      <button class="rxdt-signal-join-btn" onclick="document.getElementById('rxdt-signal-popup').remove();navigateTo('contract');setTimeout(()=>{const t=document.getElementById('tab-invited');if(t)t.click();},600);">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
      </button>
    </div>
  </div>`;

  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}


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
});

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
        <span class="logo-tag">AI QUANT</span>
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
    <main>
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
    return `
      <div class="user-avatar-btn" onclick="toggleUserMenu()">
        <div class="user-avatar-circle" style="background:linear-gradient(135deg,#00f2fe,#7928ca);">${(user?.name || 'R')[0]}</div>
        <span style="font-size:14px;font-weight:600;">${user?.name || 'Raju'}</span>
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

window.toggleUserMenu = function() {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.toggle('open');
};

window.closeUserMenu = function() {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.remove('open');
};

window.doLogout = function() {
  if (confirm('Are you sure you want to logout?')) {
    store.logout();
    window.location.hash = '#/home';
  }
};

document.addEventListener('click', function(e) {
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

import store from './store.js';
import router from './router.js';

// Session flag: once the user clicks "Join Copy Trading", suppress the
// aggressive signal popup for the remainder of the session (until refresh).
// Using an in-memory flag (not localStorage) means it resets on page refresh.
let copyTradeDismissed = false;

// Set the dismissal flag from anywhere (used by the Join Copy Trading button)
window.dismissCopyTradePopup = function () {
  copyTradeDismissed = true;
};

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
    requestNotificationPermission();
    checkAutoOpenChatForNewUsers();
  }
  store.subscribe('auth', () => {
    if (store.isLoggedIn()) {
      setTimeout(() => checkSignalWindow(), 1000);
      requestNotificationPermission();
      checkAutoOpenChatForNewUsers();
    }
  });

  // ---- Signal Push Notification Poller ----
  // Polls the backend every 8 seconds while logged in so the signal pop-up
  // is pushed to users automatically at exactly 5pm, 6pm, and 7pm EAT the
  // moment the signal window opens — no manual refresh required.
  startSignalPoller();

  // ---- Signal Auto-Execute Heartbeat ----
  // Polls a public endpoint every 8 seconds from EVERY page (logged in or
  // not) so the backend auto-executes eligible signal trades during active
  // windows EVEN when no logged-in user has the app open. Previously the
  // backend only auto-executed when a logged-in user's poller hit
  // /api/signals/active — so if nobody opened the app at 5pm/6pm/7pm EAT,
  // no trades were executed that day.
  startSignalHeartbeat();

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
  }, 30 * 1000); // check every 30 seconds
}

// Public heartbeat to keep signal auto-execution alive even when no user
// is logged in / polling. Runs unconditionally from every page hit so the
// backend's autoExecuteEligibleSignals() fires during each signal window.
let signalHeartbeatTimer = null;
function startSignalHeartbeat() {
  if (signalHeartbeatTimer) return;
  signalHeartbeatTimer = setInterval(() => {
    fetch('/api/signals/poll', { method: 'GET', cache: 'no-store' }).catch(() => { });
  }, 45 * 1000);
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
        <a onclick="navigateTo('earn-guide')">How to Earn</a>
        <a onclick="navigateTo('about')">About Us</a>
        <a onclick="navigateTo('customer-service')">Customer Service</a>
        <a onclick="navigateTo('agreement')">User Agreement</a>
        <a onclick="navigateTo('investment-agreement')">AI Trading Agreement</a>
      </div>
      <div style="margin-top:12px;padding:10px 16px;background:rgba(0,242,254,0.05);border:1px solid rgba(0,242,254,0.2);border-radius:10px;display:inline-block;font-size:12px;color:var(--text-sub);">
        💬 <strong style="color:#00f2fe;">Contact CEO on Telegram:</strong> <a href="https://t.me/RXDT888" target="_blank" style="color:#fff;font-weight:700;text-decoration:underline;">@RXDT888</a>
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
        <div class="mobile-nav-item" data-page="profile" onclick="navigateTo('profile')">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          <span>Profile</span>
        </div>
      </div>
    </nav>

    <!-- Floating Bottom-Right Live Chat Widget (Option 1) -->
    <div class="vance-floating-widget" id="vance-floating-widget">
      <div class="vance-speech-bubble" id="vance-speech-bubble">
        <span>👋 Hi! Need help with Signal Copy-Trading? Chat with Prof. Vance direct!</span>
        <button class="vance-speech-bubble-close" onclick="dismissVanceBubble(event)">✕</button>
      </div>
      <div class="vance-avatar-trigger" onclick="openChat()">
        <div class="vance-avatar-wrapper">
          <img src="assets/images/warren_pennington.png" alt="Prof. Arthur Vance" class="vance-avatar-img" />
          <span class="vance-status-dot"></span>
        </div>
        <div class="vance-trigger-info">
          <span class="vance-trigger-title">Prof. Vance</span>
          <span class="vance-trigger-sub">Live Support · Online</span>
        </div>
      </div>
    </div>

    <!-- Global Live Chat Modal (Prof. Vance Persona) -->
    <div class="vance-chat-modal-overlay" id="vance-chat-modal" onclick="if(event.target===this)closeChat()">
      <div class="vance-chat-modal-container">
        <div class="vance-chat-header">
          <div class="vance-chat-header-profile">
            <img src="assets/images/warren_pennington.png" alt="Prof. Arthur Vance" class="vance-header-avatar" />
            <div>
              <div class="vance-header-name">Prof. Arthur Vance</div>
              <div class="vance-header-role">RXDT CEO & Quantitative Director</div>
              <div class="vance-header-status">
                <span class="online-dot"></span> Online · Avg response: &lt;2 mins
              </div>
            </div>
          </div>
          <button class="modal-close" onclick="closeChat()" style="background:none;border:none;color:#a5b4fc;font-size:20px;cursor:pointer;">✕</button>
        </div>

        <div class="vance-quick-chips">
          <div class="vance-chip" onclick="sendQuickChip('How do daily Signal Trades work?')">📡 Signal Schedule</div>
          <div class="vance-chip" onclick="sendQuickChip('I need help with my Deposit')">💳 Deposit Assistance</div>
          <div class="vance-chip" onclick="sendQuickChip('Can I speak directly with Prof. Vance?')">💬 Contact Prof. Vance</div>
        </div>

        <div id="vance-chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:rgba(0,0,0,0.15);">
          <div class="chat-msg support" style="display:flex;gap:10px;align-items:flex-start;">
            <img src="assets/images/warren_pennington.png" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #00f2fe;" />
            <div>
              <div class="chat-bubble" style="background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:0 14px 14px 14px;font-size:13px;max-width:85%;">
                👋 Hello, my friend. It is a pleasure to meet you. I am <strong>Prof. Vance</strong>, the founder of RXDT Exchange Investment Group. Please provide your stock account ID in the following format. This will make it easier for me to assist you in applying for your benefits.<br/><br/>
                <strong>Name:</strong><br/>
                <strong>Deposit Amount:</strong><br/>
                <strong>Country:</strong><br/>
                <strong>Your RXDT Account ID:</strong><br/>
                <strong>Languages Spoken:</strong>
              </div>
              <div class="chat-time" style="font-size:10px;color:#64748b;margin-top:4px;">Just now</div>
            </div>
          </div>
        </div>

        <div style="padding:14px 16px;border-top:1px solid rgba(255,255,255,0.08);background:#0f172a;display:flex;gap:10px;align-items:center;">
          <input type="text" id="vance-chat-input" class="form-control" placeholder="Message Prof. Vance..."
            style="border-radius:20px;padding:10px 16px;background:#1e293b;border:1px solid rgba(0,242,254,0.3);color:#fff;font-size:13px;"
            onkeydown="if(event.key==='Enter')sendChatMsg()"/>
          <button class="btn-primary" onclick="sendChatMsg()" style="border-radius:20px;padding:10px 20px;font-size:13px;font-weight:700;">Send</button>
        </div>
      </div>
    </div>
  `;
}

function renderUserActions() {
  const isLoggedIn = store.isLoggedIn();
  const user = store.getUser();
  const displayName = user?.name || user?.phone || user?.email || 'User';

  const chatBtnHtml = `
    <button class="header-chat-btn" onclick="openChat()" title="Live Chat with Prof. Vance">
      <span class="online-dot"></span>
      <span>💬 Chat with Prof. Vance</span>
    </button>
  `;

  if (isLoggedIn) {
    return `
      ${chatBtnHtml}
      <div class="user-avatar-btn" onclick="toggleUserMenu()">
        <div class="user-avatar-circle" style="background:linear-gradient(135deg,#00f2fe,#7928ca);">${displayName[0].toUpperCase()}</div>
        <span style="font-size:14px;font-weight:600;">${displayName}</span>
        <span>▾</span>
      </div>
      <div class="user-dropdown" id="user-dropdown" style="background:#131926;border:1px solid rgba(255,255,255,0.15);">
        <div class="udrop-item" onclick="navigateTo('profile');closeUserMenu()">My Profile</div>
        <div class="udrop-item" onclick="navigateTo('assets');closeUserMenu()">My Assets</div>
        <div class="udrop-item" onclick="navigateTo('contract');closeUserMenu()">Signal Trade History</div>
        <div class="udrop-item" onclick="navigateTo('invite-friends');closeUserMenu()">Invite Friends</div>
        <div class="udrop-item" onclick="navigateTo('earn-guide');closeUserMenu()">How to Earn</div>
        <div class="udrop-item" onclick="navigateTo('security-settings');closeUserMenu()">Security Settings</div>
        <div class="udrop-item" onclick="navigateTo('kyc');closeUserMenu()">KYC Verification</div>
        <div class="udrop-divider"></div>
        <div class="udrop-item danger" onclick="doLogout()">Logout</div>
      </div>
    `;
  } else {
    return `
      ${chatBtnHtml}
      <button class="btn-outline" onclick="navigateTo('login')">Login</button>
      <button class="btn-primary" onclick="navigateTo('register')">Register</button>
    `;
  }
}

function updateUserNav() {
  const area = document.getElementById('user-actions-area');
  if (area) area.innerHTML = renderUserActions();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.dismissVanceBubble = function (e) {
  if (e) e.stopPropagation();
  const bubble = document.getElementById('vance-speech-bubble');
  if (bubble) bubble.style.display = 'none';
};

window.openChat = function () {
  const modal = document.getElementById('vance-chat-modal');
  if (modal) modal.classList.add('active');
  loadChatMessages();
  setTimeout(() => {
    const input = document.getElementById('vance-chat-input');
    if (input) input.focus();
  }, 100);
};

window.closeChat = function () {
  const modal = document.getElementById('vance-chat-modal');
  if (modal) modal.classList.remove('active');
};

async function loadChatMessages() {
  const token = localStorage.getItem('rxdt_token');
  if (!token) return;
  try {
    const res = await fetch('/api/chat/messages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    renderChatMessages(data.messages || []);
  } catch (e) { console.warn('Load chat messages error:', e); }
}

async function checkAutoOpenChatForNewUsers() {
  if (!store.isLoggedIn()) return;
  const token = localStorage.getItem('rxdt_token');
  if (!token) return;
  try {
    const res = await fetch('/api/chat/messages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const messages = data.messages || [];
    const userMsgCount = messages.filter(m => m.sender === 'user').length;
    if (userMsgCount === 0) {
      setTimeout(() => {
        window.openChat();
      }, 1200);
    }
  } catch (e) {
    console.warn('Auto open chat check error:', e);
  }
}

function renderChatMessages(messages) {
  const container = document.getElementById('vance-chat-messages');
  if (!container) return;
  let html = `
    <div class="chat-msg support" style="display:flex;gap:10px;align-items:flex-start;">
      <img src="assets/images/warren_pennington.png" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #00f2fe;" />
      <div>
        <div class="chat-bubble" style="background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:0 14px 14px 14px;font-size:13px;max-width:85%;">
          👋 Hello, my friend. It is a pleasure to meet you. I am <strong>Prof. Vance</strong>, the founder of RXDT Exchange Investment Group. Please provide your stock account ID in the following format. This will make it easier for me to assist you in applying for your benefits.<br/><br/>
          <strong>Name:</strong><br/>
          <strong>Deposit Amount:</strong><br/>
          <strong>Country:</strong><br/>
          <strong>Your RXDT Account ID:</strong><br/>
          <strong>Languages Spoken:</strong>
        </div>
        <div class="chat-time" style="font-size:10px;color:#64748b;margin-top:4px;">Just now</div>
      </div>
    </div>
  `;
  messages.forEach(m => {
    if (m.sender === 'admin') {
      html += `
        <div class="chat-msg support" style="display:flex;gap:10px;align-items:flex-start;margin-top:8px;">
          <img src="assets/images/warren_pennington.png" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #00f2fe;" />
          <div>
            <div class="chat-bubble" style="background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:0 14px 14px 14px;font-size:13px;max-width:85%;">
              ${escapeHtml(m.message)}
            </div>
            <div class="chat-time" style="font-size:10px;color:#64748b;margin-top:4px;">${new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="chat-msg user" style="display:flex;justify-content:flex-end;margin-top:8px;">
          <div style="text-align:right;max-width:85%;">
            <div class="chat-bubble" style="background:linear-gradient(135deg,#00f2fe,#0284c7);color:#060b19;font-weight:600;padding:10px 14px;border-radius:14px 0 14px 14px;font-size:13px;display:inline-block;text-align:left;">
              ${escapeHtml(m.message)}
            </div>
            <div class="chat-time" style="font-size:10px;color:#64748b;margin-top:4px;">Just now</div>
          </div>
        </div>
      `;
    }
  });
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

window.sendQuickChip = function (text) {
  const input = document.getElementById('vance-chat-input');
  if (input) {
    input.value = text;
    window.sendChatMsg();
  }
};

window.sendChatMsg = async function () {
  const input = document.getElementById('vance-chat-input');
  if (!input || !input.value.trim()) return;
  const msg = input.value.trim();
  input.value = '';
  const container = document.getElementById('vance-chat-messages');
  if (!container) return;

  const userEl = document.createElement('div');
  userEl.className = 'chat-msg user';
  userEl.style.cssText = 'display:flex;justify-content:flex-end;margin-top:8px;';
  userEl.innerHTML = `
    <div style="text-align:right;max-width:85%;">
      <div class="chat-bubble" style="background:linear-gradient(135deg,#00f2fe,#0284c7);color:#060b19;font-weight:600;padding:10px 14px;border-radius:14px 0 14px 14px;font-size:13px;display:inline-block;text-align:left;">
        ${escapeHtml(msg)}
      </div>
      <div class="chat-time" style="font-size:10px;color:#64748b;margin-top:4px;">Just now</div>
    </div>
  `;
  container.appendChild(userEl);
  container.scrollTop = container.scrollHeight;

  const token = localStorage.getItem('rxdt_token');
  try {
    await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
  } catch (e) { console.warn('Send chat message error:', e); }
};

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

// ---- Browser Notification Support ----
// Track which signals have already been notified to avoid duplicate notifications
let notifiedSignals = new Set();

// Request notification permission when the user logs in
function requestNotificationPermission() {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch (e) { /* notifications not supported */ }
}

// Send a browser notification for an active signal
function sendSignalNotification(signalData) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const signal = signalData.activeSignal;
    if (!signal) return;

    // Avoid duplicate notifications for the same signal
    const notifyKey = `signal_${signal.signalId}_${new Date().toISOString().split('T')[0]}`;
    if (notifiedSignals.has(notifyKey)) return;
    notifiedSignals.add(notifyKey);

    const isFreeSignal = !!signal.isFreeSignal;
    const title = isFreeSignal ? '🎁 FREE Signal is Live!' : '📡 Signal is Live!';
    const body = isFreeSignal
      ? `Free 8PM referral signal is now active! Join now to earn.`
      : `Signal ${signal.signalId} is now active! Join copy trading to earn daily profits.`;

    const notification = new Notification(title, {
      body,
      icon: 'assets/images/rxdt_logo.png',
      tag: notifyKey,
      requireInteraction: true,
    });

    // Clicking the notification navigates to the contract page
    notification.onclick = () => {
      window.focus();
      window.location.hash = '#/contract';
      notification.close();
    };
  } catch (e) { /* notification failed */ }
}

// ---- Signal Window Pop-Up ----
async function checkSignalWindow() {
  if (!store.isLoggedIn()) return;
  // User already clicked "Join Copy Trading" — suppress popup for this session
  if (copyTradeDismissed) return;
  if (document.getElementById('rxdt-signal-popup')) return; // already shown

  const TOKEN = localStorage.getItem('rxdt_token');
  try {
    const res = await fetch('/api/signals/active', {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.activeSignal || !data.qualified || data.alreadyExecuted) return;
    showSignalPopup(data);
    // Send browser notification when signal is active
    sendSignalNotification(data);
  } catch (e) {
    console.warn('Signal check failed:', e);
  }
}

function showSignalPopup(signalData) {
  if (document.getElementById('rxdt-signal-popup')) return;

  const signal = signalData.activeSignal;
  const tier = signalData.tier;
  // Whether the user prefers auto-execution (default true). When false,
  // the popup should clearly indicate they need to execute manually.
  const autoExec = signalData.autoSignalExec !== false;

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
      <div class="rxdt-signal-mode-row">
        <span class="rxdt-signal-mode-label">Auto Execute</span>
        <label class="signal-toggle">
          <input type="checkbox" id="popup-auto-exec-toggle" ${autoExec ? 'checked' : ''} onchange="togglePopupAutoExec(this.checked)"/>
          <span class="signal-toggle-slider"></span>
        </label>
        <span class="signal-toggle-label" id="popup-auto-exec-label" style="color:${autoExec ? '#00c49a' : '#f59e0b'};">${autoExec ? 'Auto' : 'Manual'}</span>
      </div>
      <div class="rxdt-signal-manual-note" id="popup-manual-note" style="${autoExec ? 'display:none;' : ''}">
        ⚠️ Manual mode: You will execute this trade yourself. Click the button below to confirm.
      </div>
    </div>
    <div class="rxdt-signal-footer">
      <span class="rxdt-signal-join-text">${autoExec ? 'Join Copy Trading' : 'Execute Manually'}</span>
      <button class="rxdt-signal-join-btn" onclick="document.getElementById('rxdt-signal-popup').remove();dismissCopyTradePopup();navigateTo('contract');setTimeout(()=>{const t=document.getElementById('tab-invited');if(t)t.click();},600);">
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
      </button>
    </div>
  </div>`;

  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

// Toggle auto-exec preference from the signal popup
window.togglePopupAutoExec = async function (checked) {
  const label = document.getElementById('popup-auto-exec-label');
  const note = document.getElementById('popup-manual-note');
  const joinText = document.querySelector('.rxdt-signal-join-text');
  try {
    await store.setSignalPreference(checked);
    if (label) {
      label.textContent = checked ? 'Auto' : 'Manual';
      label.style.color = checked ? '#00c49a' : '#f59e0b';
    }
    if (note) note.style.display = checked ? 'none' : '';
    if (joinText) joinText.textContent = checked ? 'Join Copy Trading' : 'Execute Manually';
  } catch (err) {
    console.warn('Failed to update signal preference:', err);
    const toggle = document.getElementById('popup-auto-exec-toggle');
    if (toggle) toggle.checked = !checked;
  }
};


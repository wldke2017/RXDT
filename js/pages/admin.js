// Admin Dashboard Page
import store from '../store.js';

// Admin secret is entered by the administrator at login and stored only
// for the current browser session — never hardcoded in client source code.
const ADMIN_SESSION_KEY = 'rxdt_admin_unlocked';
const ADMIN_SECRET_KEY = 'rxdt_admin_secret';
const BASE = '/api/admin';

function getAdminSecret() {
  return sessionStorage.getItem(ADMIN_SECRET_KEY) || '';
}

async function adminFetch(endpoint, method = 'GET', body = null) {
  const secret = getAdminSecret();
  if (!secret) throw new Error('Admin secret not set. Please log in again.');
  const url = `${BASE}${endpoint}`;
  const opts = { method, headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Chat admin endpoints are mounted at /api/chat/admin/* (not /api/admin/chat/*)
async function chatFetch(endpoint, method = 'GET', body = null) {
  const secret = getAdminSecret();
  if (!secret) throw new Error('Admin secret not set. Please log in again.');
  const url = `/api/chat/admin${endpoint}`;
  const opts = { method, headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function timeAgo(dateStr) {
  if (!dateStr) return 'N/A';
  const dt = new Date(dateStr);
  return dt.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

function renderLockScreen() {
  return `
  <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;">
    <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:20px;padding:40px 32px;max-width:380px;width:100%;text-align:center;">
      <div style="font-size:52px;margin-bottom:16px;">🔐</div>
      <h2 style="font-size:20px;font-weight:800;margin:0 0 6px;">Admin Access</h2>
      <p style="font-size:14px;color:var(--text-sub);margin:0 0 24px;">RXDT Exchange — Restricted Area</p>
      <div class="input-suffix" style="margin-bottom:16px;">
        <input type="password" id="admin-pwd-input" class="form-control" placeholder="Enter admin password"
          style="text-align:center;font-size:16px;letter-spacing:2px;"
          onkeydown="if(event.key==='Enter') submitAdminPassword()"/>
        <button class="pwd-toggle" onclick="togglePwd('admin-pwd-input')">👁</button>
      </div>
      <div id="admin-pwd-error" style="color:#ef4444;font-size:13px;margin-bottom:12px;min-height:18px;"></div>
      <button class="btn-primary" style="width:100%;height:48px;font-size:16px;font-weight:800;border-radius:10px;" onclick="submitAdminPassword()">
        Unlock Dashboard
      </button>
    </div>
  </div>`;
}

export function render() {
  if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== 'true') {
    return renderLockScreen();
  }
  return renderDashboard();
}

function renderDashboard() {
  return `
  <div style="max-width:960px;margin:0 auto;padding:16px;">

      <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0;">🛡️ Admin Dashboard</h1>
        <div style="font-size:13px;color:var(--text-sub);margin-top:4px;">RXDT Exchange — Management Panel</div>
        <div id="admin-live-status" style="font-size:11px;color:#00c49a;margin-top:4px;">🟢 Live alerts: ON</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <button class="btn-primary" onclick="runMasterSystemRepairAdmin()" style="padding:8px 18px;font-size:13px;font-weight:800;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;border-radius:8px;color:#fff;box-shadow:0 0 12px rgba(245,158,11,0.4);">🛠️ FIX ALL USER BALANCES & TRANSACTIONS</button>
        <button class="btn-outline" onclick="runDatabaseHardResetAdmin()" style="padding:8px 16px;font-size:13px;color:#ef4444;border-color:#ef4444;">💣 Reset All Balances to $0.00</button>
        <button class="btn-outline" onclick="sendSignalReminderEmailsBroadcast()" style="padding:8px 16px;font-size:13px;color:#00d4ff;border-color:#00d4ff;">📧 Send Reminders</button>
        <button class="btn-outline" onclick="settleStuckTrades()" style="padding:8px 16px;font-size:13px;color:#10b981;border-color:#10b981;">🔄 Settle Stuck Trades</button>
        <button class="btn-outline" onclick="releaseFrozenFunds()" style="padding:8px 16px;font-size:13px;color:#f59e0b;border-color:#f59e0b;">🔓 Release In-Orders</button>
        <button class="btn-outline" id="admin-sound-btn" onclick="toggleAdminSound()" style="padding:8px 16px;font-size:13px;">🔔 Sound: On</button>
        <button class="btn-outline" onclick="loadAdminStats()" id="admin-refresh-btn" style="padding:8px 16px;font-size:13px;">🔄 Refresh</button>
        <button class="btn-outline" onclick="adminLogout()" style="padding:8px 16px;font-size:13px;color:#ef4444;border-color:#ef4444;">Logout</button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div id="admin-stats-bar" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px;">
      <div class="admin-stat-card" id="stat-users"><div class="asc-val">—</div><div class="asc-label">Total Users</div></div>
      <div class="admin-stat-card" id="stat-balance"><div class="asc-val">—</div><div class="asc-label">Total Balance</div></div>
      <div class="admin-stat-card asc-warn" id="stat-dep"><div class="asc-val">—</div><div class="asc-label">Pending Deposits</div></div>
      <div class="admin-stat-card asc-warn" id="stat-wit"><div class="asc-val">—</div><div class="asc-label">Pending Withdrawals</div></div>
      <div class="admin-stat-card asc-warn" id="stat-kyc"><div class="asc-val">—</div><div class="asc-label">Pending KYC</div></div>
      <div class="admin-stat-card asc-green" id="stat-sig"><div class="asc-val">—</div><div class="asc-label">Signal Trades</div></div>
    </div>

    <!-- Brand Assets (Arthur Vance & Logo) -->
    <div style="background:linear-gradient(135deg, #0f172a, #1e1b4b);border:1px solid #00f2fe;border-radius:14px;padding:16px 20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="margin:0;font-size:15px;font-weight:800;color:#fff;">🖼️ Brand & Marketing Assets</h3>
          <div style="font-size:12px;color:var(--text-sub);margin-top:2px;">Official founder image, logo, copy-paste messages & VIP congratulation cards.</div>
        </div>
        <button class="btn-outline" style="font-size:12px;padding:6px 14px;border-color:#00f2fe;color:#00f2fe;" onclick="switchAdminTab('marketing', document.querySelectorAll('.tabs-header .tab-btn')[8]);renderMarketingHubTab();">📢 Open Marketing & VIP Storage Hub →</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;">
        <div style="text-align:center;background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;border:1px solid rgba(0,242,254,0.2);">
          <div style="font-size:12px;font-weight:700;color:#00f2fe;margin-bottom:8px;">👤 Arthur Vance — Founder & CEO</div>
          <img src="assets/images/warren_pennington.png" alt="Arthur Vance" style="width:100%;max-width:160px;height:auto;border-radius:10px;border:2px solid #00f2fe;margin-bottom:8px;object-fit:cover;" />
          <a href="assets/images/warren_pennington.png" download="Arthur_Vance.png" class="btn-outline" style="font-size:12px;padding:6px 14px;display:inline-block;border-color:#00f2fe;color:#00f2fe;">📥 Download Image</a>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;border:1px solid rgba(0,242,254,0.2);">
          <div style="font-size:12px;font-weight:700;color:#00f2fe;margin-bottom:8px;">🚀 RXDT Exchange Logo</div>
          <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" style="width:100%;max-width:160px;height:auto;border-radius:10px;border:2px solid #00f2fe;margin-bottom:8px;object-fit:contain;background:rgba(255,255,255,0.05);" />
          <a href="assets/images/rxdt_logo.png" download="RXDT_Logo.png" class="btn-outline" style="font-size:12px;padding:6px 14px;display:inline-block;border-color:#00f2fe;color:#00f2fe;">📥 Download Logo</a>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-header" style="margin-bottom:20px;">
      <button class="tab-btn active" onclick="switchAdminTab('deposits',this)">💰 Deposits</button>
      <button class="tab-btn" onclick="switchAdminTab('withdrawals',this)">📤 Withdrawals</button>
      <button class="tab-btn" onclick="switchAdminTab('kyc',this)">🪪 KYC</button>
      <button class="tab-btn" onclick="switchAdminTab('users',this)">👥 Users</button>
      <button class="tab-btn" onclick="switchAdminTab('signals',this)">📡 Signals</button>
      <button class="tab-btn" onclick="switchAdminTab('vip',this);loadVipRewardsView()">🎁 VIP Rewards</button>
      <button class="tab-btn" onclick="switchAdminTab('earnings',this);loadEarningsView()">📊 Earnings</button>
      <button class="tab-btn" onclick="switchAdminTab('infographics',this);renderInfographicsTab()">🖼️ Profit Cards</button>
      <button class="tab-btn" onclick="switchAdminTab('marketing',this);renderMarketingHubTab()">📢 Marketing & VIP Assets</button>
      <button class="tab-btn" onclick="switchAdminTab('notifications',this);renderAdminNotificationsTab()">🔔 Notifications</button>
      <button class="tab-btn" onclick="switchAdminTab('chat',this);loadChatConversations()">💬 Chat</button>
    </div>

    <!-- Deposits Panel -->
    <div id="admin-tab-deposits">
      <div id="admin-deposits-list"><div class="admin-loading">Loading deposits...</div></div>
    </div>

    <!-- Withdrawals Panel -->
    <div id="admin-tab-withdrawals" style="display:none;">
      <div id="admin-withdrawals-list"><div class="admin-loading">Loading withdrawals...</div></div>
    </div>

    <!-- KYC Panel -->
    <div id="admin-tab-kyc" style="display:none;">
      <div id="admin-kyc-list"><div class="admin-loading">Loading KYC submissions...</div></div>
    </div>

    <!-- Users Panel -->
    <div id="admin-tab-users" style="display:none;">
      <div style="display:flex;gap:8px;margin-bottom:14px;">
        <input type="text" id="user-search" class="form-control" placeholder="🔍 Search by name, phone, ID..." style="max-width:320px;" oninput="filterUsers(this.value)"/>
      </div>
      <div id="admin-users-list"><div class="admin-loading">Loading users...</div></div>
    </div>

    <!-- VIP Rewards Panel -->
    <div id="admin-tab-vip" style="display:none;">
      <div id="admin-vip-container"><div class="admin-loading">Loading VIP rewards data...</div></div>
    </div>

    <!-- Earnings Panel -->
    <div id="admin-tab-earnings" style="display:none;">
      <div id="admin-earnings-list"></div>
    </div>

    <!-- Infographics Panel -->
    <div id="admin-tab-infographics" style="display:none;">
      <div id="admin-infographics-container"></div>
    </div>

    <!-- Marketing & VIP Hub Panel -->
    <div id="admin-tab-marketing" style="display:none;">
      <div id="admin-marketing-container"></div>
    </div>

    <!-- Social Group Notifications Panel -->
    <div id="admin-tab-notifications" style="display:none;">
      <div id="admin-notifications-container"></div>
    </div>

    <!-- Chat Panel -->
    <div id="admin-tab-chat" style="display:none;">
      <div id="admin-chat-list" class="admin-loading">Loading conversations...</div>
      <div id="admin-chat-conversation" style="display:none;"></div>
    </div>

    <!-- Signal Trades Panel -->
    <div id="admin-tab-signals" style="display:none;">
      <!-- Live Test Signal Trigger Control -->
      <div style="background:linear-gradient(135deg, #1e293b, #0f172a);border:1px solid #00f2fe;border-radius:14px;padding:16px 20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="margin:0;font-size:16px;color:#fff;">⚡ Live Signal Window Trigger (Demo Testing)</h3>
            <p style="margin:4px 0 0;font-size:12px;color:var(--text-sub);">Force-trigger an active signal window outside 5pm-7pm EAT to test pop-ups & trading.</p>
          </div>
          <div id="signal-test-status-badge" style="font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;background:rgba(255,255,255,0.06);color:var(--text-muted);">Checking...</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <select id="trigger-signal-id" class="form-control" style="max-width:140px;height:40px;font-size:13px;">
            <option value="1">Signal 1 (5:00 PM)</option>
            <option value="2">Signal 2 (6:00 PM)</option>
            <option value="3">Signal 3 (7:00 PM)</option>
          </select>
          <select id="trigger-signal-duration" class="form-control" style="max-width:140px;height:40px;font-size:13px;" onchange="toggleCustomDuration(this.value)">
            <option value="15">Active for 15 mins</option>
            <option value="30">Active for 30 mins</option>
            <option value="60">Active for 1 hour</option>
            <option value="custom">⏱ Custom minutes</option>
          </select>
          <input type="number" id="trigger-signal-custom-duration" class="form-control" 
                 placeholder="Minutes (e.g. 2)" min="1" max="120" value="2"
                 style="max-width:100px;height:40px;font-size:13px;display:none;"/>
          <input type="number" id="trigger-signal-delivery-seconds" class="form-control" 
                 placeholder="Delivery secs" min="5" max="3600" value="30"
                 style="max-width:110px;height:40px;font-size:13px;" 
                 title="How long the trade stays In Order before auto-settlement (seconds). 30 = default 30-second delivery contract."/>
          <button class="btn-primary" style="height:40px;padding:0 20px;font-size:14px;font-weight:700;border-radius:8px;" onclick="triggerTestSignal('start')">🚀 Start Test Signal</button>
          <button class="btn-outline" style="height:40px;padding:0 16px;font-size:13px;border-color:#ef4444;color:#ef4444;" onclick="triggerTestSignal('stop')">🛑 Stop Signal</button>
          <button class="btn-success" style="height:40px;padding:0 16px;font-size:13px;font-weight:700;border-radius:8px;" onclick="adminAutoExecuteSignals()">⚡ Auto-Execute Signals</button>
        </div>
      </div>

      <div id="admin-signals-list"><div class="admin-loading">Loading signal trades...</div></div>
    </div>

    <!-- KYC Image Preview Modal -->
    <div class="modal-overlay" id="kyc-img-modal" onclick="closeKycImgModal()">
      <div class="modal-content" style="max-width:600px;background:var(--bg-card);border-radius:16px;padding:20px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <strong id="kyc-img-modal-title">KYC Documents</strong>
          <button class="btn-outline" style="padding:4px 10px;" onclick="closeKycImgModal()">✕</button>
        </div>
        <div id="kyc-img-modal-body" style="display:flex;flex-direction:column;gap:16px;"></div>
      </div>
    </div>

    <!-- Balance Adjust Modal -->
    <div class="modal-overlay" id="balance-modal" onclick="closeBalanceModal()">
      <div class="modal-content" style="max-width:420px;background:var(--bg-card);border-radius:16px;padding:24px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <strong style="font-size:16px;">💰 Adjust User Balance</strong>
          <button class="btn-outline" style="padding:4px 10px;" onclick="closeBalanceModal()">✕</button>
        </div>
        <div id="balance-modal-user-info" style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;"></div>
        <input type="hidden" id="balance-modal-user-id"/>
        <label style="font-size:13px;color:var(--text-sub);margin-bottom:6px;display:block;">Amount (positive to credit, negative to debit)</label>
        <input type="number" id="balance-modal-amount" class="form-control" placeholder="e.g. 500 or -200" style="margin-bottom:10px;"/>
        <input type="text" id="balance-modal-remark" class="form-control" placeholder="Remark (e.g. Manual credit)" style="margin-bottom:16px;"/>
        <button class="btn-primary" style="width:100%;height:46px;font-size:15px;font-weight:700;" onclick="submitBalanceAdjust()">Apply Adjustment</button>
      </div>
    </div>

  </div>`;
}

export function init() {
  window.toast = window.toast || ((m, t) => alert(m));

  window.togglePwd = function (id) {
    const inp = document.getElementById(id);
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  // Validate the entered admin secret against the backend before unlocking.
  window.submitAdminPassword = async function () {
    const input = document.getElementById('admin-pwd-input');
    const errEl = document.getElementById('admin-pwd-error');
    const btn = document.querySelector('#admin-pwd-error + .btn-primary');
    if (!input) return;

    const secret = input.value.trim();
    if (!secret) {
      if (errEl) errEl.textContent = '❌ Please enter the admin secret.';
      return;
    }

    if (errEl) errEl.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

    try {
      // Set the secret first so adminFetch uses it, then probe the backend.
      sessionStorage.setItem(ADMIN_SECRET_KEY, secret);
      await adminFetch('/stats');
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      const container = document.getElementById('page-content');
      if (container) {
        container.innerHTML = renderDashboard();
        initDashboard();
      }
    } catch (err) {
      sessionStorage.removeItem(ADMIN_SECRET_KEY);
      if (errEl) errEl.textContent = '❌ Invalid admin secret: ' + err.message;
      input.value = '';
      input.focus();
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Unlock Dashboard'; }
    }
  };

  if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== 'true') return;
  initDashboard();
}

let allUsersCache = [];

// ---- Real-Time Pending Alerts ----
// Polls the backend every 15 seconds. When the number of pending items
// (deposits, withdrawals, KYC) increases, fires a toast + sound + browser
// notification so the admin is alerted in real-time.
let adminPollTimer = null;
let adminSoundEnabled = true;
let lastPendingCounts = { deposits: -1, withdrawals: -1, kyc: -1 };
let lastChatUnread = -1;

function adminToast(msg, type = 'info') {
  if (window.toast) { window.toast(msg, type); return; }
  // Minimal fallback toast if window.toast isn't wired up yet
  const container = document.getElementById('toast-container');
  if (!container) { alert(msg); return; }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function playAdminAlertSound() {
  if (!adminSoundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Pleasant two-tone alert
    [880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.13);
    });
  } catch (e) { /* audio not supported */ }
}

function sendBrowserNotification(title, body) {
  try {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'assets/images/rxdt_logo.png' });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification(title, { body, icon: 'assets/images/rxdt_logo.png' });
      });
    }
  } catch (e) { /* notifications not available */ }
}

async function pollPendingItems() {
  try {
    const pending = await adminFetch('/pending').catch(() => null);
    if (!pending || pending === null) return;

    const depositIds = (pending.pendingDeposits || []).map(d => d.id);
    const withdrawalIds = (pending.pendingWithdrawals || []).map(w => w.id);
    const kycIds = (pending.pendingKyc || []).map(k => k.id);

    // First poll: just baseline, don't alert on pre-existing items
    if (lastPendingCounts.deposits === -1) {
      lastPendingCounts = { deposits: depositIds.length, withdrawals: withdrawalIds.length, kyc: kycIds.length };
      if (depositIds.length || withdrawalIds.length || kycIds.length) {
        const statusEl = document.getElementById('admin-live-status');
        if (statusEl) statusEl.textContent = `🟢 Live alerts: ON · ${depositIds.length + withdrawalIds.length + kycIds.length} pending`;
      }
      return;
    }

    const newDeposits = depositIds.length - lastPendingCounts.deposits;
    const newWithdrawals = withdrawalIds.length - lastPendingCounts.withdrawals;
    const newKyc = kycIds.length - lastPendingCounts.kyc;

    lastPendingCounts = { deposits: depositIds.length, withdrawals: withdrawalIds.length, kyc: kycIds.length };

    if (newDeposits > 0 || newWithdrawals > 0 || newKyc > 0) {
      const parts = [];
      if (newDeposits > 0) parts.push(`${newDeposits} new deposit${newDeposits > 1 ? 's' : ''}`);
      if (newWithdrawals > 0) parts.push(`${newWithdrawals} new withdrawal${newWithdrawals > 1 ? 's' : ''}`);
      if (newKyc > 0) parts.push(`${newKyc} new KYC`);
      const msg = `🔔 ${parts.join(', ')} pending!`;

      adminToast(msg, 'warning');
      playAdminAlertSound();
      sendBrowserNotification('RXDT Admin Alert', parts.join(', ') + ' pending review');

      // Auto-refresh the dashboard data so new items appear immediately
      window.loadAdminStats && window.loadAdminStats();
    }

    // ---- Chat unread notification polling ----
    try {
      const chatData = await chatFetch('/pending-count').catch(() => null);
      if (chatData && chatData.unreadCount !== undefined) {
        const unread = parseInt(chatData.unreadCount);
        if (lastChatUnread === -1) {
          lastChatUnread = unread;
        } else if (unread > lastChatUnread) {
          const newMsgs = unread - lastChatUnread;
          adminToast(`💬 ${newMsgs} new support message${newMsgs > 1 ? 's' : ''}!`, 'warning');
          playAdminAlertSound();
          sendBrowserNotification('RXDT Admin Alert', `${newMsgs} new support message${newMsgs > 1 ? 's' : ''} from users`);
          lastChatUnread = unread;
        } else {
          lastChatUnread = unread;
        }
      }
    } catch (e) { /* chat polling is non-fatal */ }

    const statusEl = document.getElementById('admin-live-status');
    if (statusEl) {
      const total = depositIds.length + withdrawalIds.length + kycIds.length;
      statusEl.textContent = total > 0
        ? `🟢 Live alerts: ON · ${total} pending`
        : '🟢 Live alerts: ON';
    }
  } catch (e) { /* poll errors are non-fatal */ }
}

function initDashboard() {
  window.toast = window.toast || ((m, t) => alert(m));

  window.adminLogout = function () {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SECRET_KEY);
    window.location.reload();
  };

  // Sound toggle button
  window.toggleAdminSound = function () {
    adminSoundEnabled = !adminSoundEnabled;
    const btn = document.getElementById('admin-sound-btn');
    if (btn) {
      btn.textContent = adminSoundEnabled ? '🔔 Sound: On' : '🔕 Sound: Off';
      btn.style.color = adminSoundEnabled ? '' : '#ef4444';
      btn.style.borderColor = adminSoundEnabled ? '' : '#ef4444';
    }
  };

  // Start real-time polling (only once)
  if (!adminPollTimer) {
    // Baseline immediately, then poll every 15s
    setTimeout(() => pollPendingItems(), 1000);
    adminPollTimer = setInterval(() => pollPendingItems(), 15000);
    // Cleanup when leaving the admin page
    window.addEventListener('hashchange', () => {
      if (adminPollTimer) { clearInterval(adminPollTimer); adminPollTimer = null; }
      lastPendingCounts = { deposits: -1, withdrawals: -1, kyc: -1 };
      lastChatUnread = -1;
    }, { once: true });
  }

  // Release all users' frozen ("In Orders") funds back to available balance.
  // Useful for legacy users whose signal trades never auto-settled.
  window.releaseFrozenFunds = async function () {
    if (!confirm('Release ALL frozen (In Orders) funds back to available balance for all users? This cannot be undone.')) return;
    try {
      const res = await adminFetch('/users/release-frozen', 'POST', {});
      window.toast('✅ ' + res.message, 'success');
      await loadAdminStats();
    } catch (err) {
      window.toast('Error: ' + err.message, 'error');
    }
  };

  window.switchAdminTab = function (tab, btn) {
    document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['deposits', 'withdrawals', 'kyc', 'users', 'signals', 'vip', 'earnings', 'infographics', 'marketing', 'notifications', 'chat'].forEach(t => {
      const el = document.getElementById(`admin-tab-${t}`);
      if (el) el.style.display = t === tab ? '' : 'none';
    });
    if (tab === 'users' && !allUsersCache.length) loadUsers();
    if (tab === 'signals') loadSignalTrades();
    if (tab === 'vip') loadVipRewardsView();
    if (tab === 'marketing') renderMarketingHubTab();
    if (tab === 'notifications') renderAdminNotificationsTab();
  };

  window.loadVipRewardsView = async function () {
    const container = document.getElementById('admin-vip-container');
    if (!container) return;
    container.innerHTML = `<div class="admin-loading">Loading VIP rewards data...</div>`;

    try {
      const data = await adminFetch('/vip-rewards');
      if (!data.success) throw new Error(data.error || 'Failed to load VIP rewards');

      container.innerHTML = `
        <div style="background:linear-gradient(135deg, #1e1b4b, #0f172a);border:1px solid #818cf8;border-radius:16px;padding:20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <h2 style="margin:0;font-size:18px;color:#fff;">🏆 RXDT VIP Monthly Salary & Promotion Rewards</h2>
              <div style="font-size:13px;color:#a5b4fc;margin-top:4px;">Automatic 10-day salaries on 3rd, 13th, and 23rd of each month.</div>
            </div>
            <div style="display:flex;gap:10px;">
              <button class="btn-primary" style="background:linear-gradient(135deg,#f59e0b,#d97706);border:none;font-weight:700;padding:10px 18px;border-radius:8px;" onclick="triggerAdminSalaryPayout()">
                ⚡ Trigger 10-Day Salary Payout Now
              </button>
            </div>
          </div>
        </div>

        <!-- Brand Strategy Posters & VIP Rewards Banner Preview Card -->
        <div style="background:#090d16;border:1px solid #d97706;border-radius:14px;padding:18px;margin-bottom:20px;">
          <div style="font-size:14px;font-weight:700;color:#f59e0b;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
            <span>🖼️ Brand Strategy Posters & VIP Rewards Schedule</span>
            <span style="font-size:11px;color:var(--text-sub);font-weight:normal;">Official 30-Day Growth Schedules</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:14px;margin-bottom:16px;">
            <div style="text-align:center;background:rgba(255,255,255,0.02);padding:10px;border-radius:10px;border:1px solid rgba(245,158,11,0.2);">
              <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:6px;">Tier 1: $100 Plan (1.4% Daily)</div>
              <img src="assets/images/rxdt_100_strategy.png" alt="RXDT $100 Strategy" style="width:100%;border-radius:8px;margin-bottom:8px;" />
              <a href="assets/images/rxdt_100_strategy.png" download="RXDT_100_Strategy.png" class="btn-outline" style="font-size:11px;padding:4px 10px;display:inline-block;border-color:#f59e0b;color:#f59e0b;">📥 Download PNG</a>
            </div>

            <div style="text-align:center;background:rgba(255,255,255,0.02);padding:10px;border-radius:10px;border:1px solid rgba(245,158,11,0.2);">
              <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:6px;">Tier 2: $300 Plan (2.4% Daily)</div>
              <img src="assets/images/rxdt_300_strategy.png" alt="RXDT $300 Strategy" style="width:100%;border-radius:8px;margin-bottom:8px;" />
              <a href="assets/images/rxdt_300_strategy.png" download="RXDT_300_Strategy.png" class="btn-outline" style="font-size:11px;padding:4px 10px;display:inline-block;border-color:#f59e0b;color:#f59e0b;">📥 Download PNG</a>
            </div>

            <div style="text-align:center;background:rgba(255,255,255,0.02);padding:10px;border-radius:10px;border:1px solid rgba(245,158,11,0.2);">
              <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:6px;">Tier 3: $1,000 Plan (3.1% Daily)</div>
              <img src="assets/images/rxdt_1000_strategy.png" alt="RXDT $1000 Strategy" style="width:100%;border-radius:8px;margin-bottom:8px;" />
              <a href="assets/images/rxdt_1000_strategy.png" download="RXDT_1000_Strategy.png" class="btn-outline" style="font-size:11px;padding:4px 10px;display:inline-block;border-color:#f59e0b;color:#f59e0b;">📥 Download PNG</a>
            </div>
          </div>

          <div style="text-align:center;">
            <div style="font-size:12px;font-weight:700;color:#a5b4fc;margin-bottom:6px;">🏆 VIP Monthly Salary & Promotion Schedule</div>
            <img src="assets/images/rxdt_vip_rewards.png" alt="RXDT VIP Banner" style="width:100%;max-width:650px;border-radius:10px;border:1px solid rgba(245,158,11,0.3);" />
          </div>
        </div>

        <!-- Promotion Claims Section -->
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin:0 0 14px;font-size:16px;color:#f59e0b;">🎁 Pending VIP Promotion Claims</h3>
          ${!data.promotionClaims || data.promotionClaims.length === 0 ? `
            <div style="font-size:13px;color:var(--text-muted);padding:14px;text-align:center;">No promotion claims submitted yet.</div>
          ` : `
            <div class="table-container">
              <table class="data-table" style="font-size:13px;">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>VIP Tier</th>
                    <th>Reward Amount</th>
                    <th>Status</th>
                    <th>Submitted Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.promotionClaims.map(c => `
                    <tr>
                      <td><strong>${c.user_name || 'User'}</strong> <span style="font-size:11px;color:var(--text-sub);">${c.user_phone || c.user_id}</span></td>
                      <td><span class="badge" style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b66;">${c.vip_level}</span></td>
                      <td style="color:#10b981;font-weight:700;">$${parseFloat(c.reward_amount).toFixed(2)}</td>
                      <td><span class="badge ${c.status === 'approved' ? 'badge-success' : c.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${c.status}</span></td>
                      <td>${new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        ${c.status === 'pending' ? `
                          <button class="btn-success" style="padding:4px 10px;font-size:12px;margin-right:6px;" onclick="approveVipPromotionClaim('${c.id}', 'approved')">Approve & Credit</button>
                          <button class="btn-outline" style="padding:4px 10px;font-size:12px;color:#ef4444;border-color:#ef4444;" onclick="approveVipPromotionClaim('${c.id}', 'rejected')">Reject</button>
                        ` : `
                          <span style="font-size:12px;color:var(--text-sub);">${c.status}</span>
                        `}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- User VIP Tier Status Audit Table -->
        <div class="card">
          <h3 style="margin:0 0 14px;font-size:16px;color:#fff;">👥 Users VIP Tier Audit & Salary Rates</h3>
          <div class="table-container">
            <table class="data-table" style="font-size:13px;">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Current VIP</th>
                  <th>Direct (L1)</th>
                  <th>Total 3-Level</th>
                  <th>10-Day Salary</th>
                  <th>Promotion Reward</th>
                  <th>Last Payout</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${data.users.map(u => `
                  <tr>
                    <td><strong>${u.name || 'Trader'}</strong> <br/><span style="font-size:11px;color:var(--text-sub);">${u.phone || u.email || u.id}</span></td>
                    <td><span class="badge" style="background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b66;">${u.vipLevel}</span></td>
                    <td><strong>${u.directMembers}</strong></td>
                    <td><strong>${u.total3LevelMembers}</strong></td>
                    <td style="color:#10b981;font-weight:700;">$${u.salary10Days.toFixed(2)}</td>
                    <td style="color:#f59e0b;font-weight:700;">$${u.promotionReward.toFixed(2)}</td>
                    <td style="font-size:11px;color:var(--text-sub);">${u.lastSalaryDate ? new Date(u.lastSalaryDate).toLocaleDateString() : 'Never'}</td>
                    <td>
                      ${u.salary10Days > 0 ? `
                        <button class="btn-outline" style="padding:4px 10px;font-size:12px;color:#10b981;border-color:#10b981;" onclick="triggerAdminSalaryPayout('${u.id}')">Pay Salary ($${u.salary10Days})</button>
                      ` : `
                        <span style="font-size:11px;color:var(--text-muted);">Ineligible</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div style="color:#ef4444;padding:20px;text-align:center;">Failed to load VIP rewards: ${err.message}</div>`;
    }
  };

  window.triggerAdminSalaryPayout = async function (userId = null) {
    const msg = userId ? `Pay 10-day salary to user ${userId}?` : `Execute 10-day salary payouts for ALL eligible VIP members?`;
    if (!confirm(msg)) return;
    try {
      const res = await adminFetch('/trigger-salary-payout', 'POST', { targetUserId: userId });
      window.toast('✅ ' + res.message, 'success');
      loadVipRewardsView();
    } catch (err) {
      window.toast('❌ ' + err.message, 'error');
    }
  };

  window.approveVipPromotionClaim = async function (claimId, status) {
    if (!confirm(`Are you sure you want to mark claim ${claimId} as ${status}?`)) return;
    try {
      const res = await adminFetch('/approve-promotion', 'POST', { claimId, status });
      window.toast('✅ ' + res.message, 'success');
      loadVipRewardsView();
    } catch (err) {
      window.toast('❌ ' + err.message, 'error');
    }
  };

  // ---- Stats ----
  window.loadAdminStats = async function () {
    const btn = document.getElementById('admin-refresh-btn');
    if (btn) { btn.textContent = '⏳ Loading...'; btn.disabled = true; }
    try {
      const [stats, pending] = await Promise.all([
        adminFetch('/stats').catch(() => null),
        adminFetch('/pending').catch(() => ({ pendingDeposits: [], pendingWithdrawals: [], pendingKyc: [] }))
      ]);

      if (stats) {
        document.getElementById('stat-users').querySelector('.asc-val').textContent = stats.totalUsers;
        document.getElementById('stat-balance').querySelector('.asc-val').textContent = '$' + fmt(stats.totalBalance);
        document.getElementById('stat-dep').querySelector('.asc-val').textContent = stats.pendingDeposits;
        document.getElementById('stat-wit').querySelector('.asc-val').textContent = stats.pendingWithdrawals;
        document.getElementById('stat-kyc').querySelector('.asc-val').textContent = stats.pendingKyc;
        document.getElementById('stat-sig').querySelector('.asc-val').textContent = stats.totalSignalTrades;
      }

      renderDeposits(pending.pendingDeposits || []);
      renderWithdrawals(pending.pendingWithdrawals || []);
      renderKyc(pending.pendingKyc || []);

    } catch (err) {
      window.toast('Failed to load data: ' + err.message, 'error');
    } finally {
      if (btn) { btn.textContent = '🔄 Refresh'; btn.disabled = false; }
    }
  };

  function renderDeposits(deps) {
    const el = document.getElementById('admin-deposits-list');
    if (!el) return;
    if (!deps.length) { el.innerHTML = `<div class="empty-state">✅ No pending deposits</div>`; return; }
    el.innerHTML = deps.map(d => `
      <div class="admin-card" id="dep-card-${d.id}">
        <div class="admin-card-header">
          <div>
            <div class="admin-card-title">💰 ${d.coin || 'USDT'} (${d.network || 'TRC20'})</div>
            <div class="admin-card-sub">Order: <strong>${d.order_number}</strong></div>
            <div class="admin-card-sub">User: <code>${d.user_name || d.user_id}</code> · Phone: <code>${d.user_phone || 'N/A'}</code></div>
            <div class="admin-card-sub">User ID: <code style="font-size:11px;">${d.user_id}</code></div>
          </div>
          <div class="admin-card-amount">$${fmt(d.amount)}</div>
        </div>
        <div class="admin-card-meta"><span>🕐 ${timeAgo(d.created_at)}</span></div>
        <div class="admin-card-actions">
          <button class="btn-success" onclick="adminApproveDeposit('${d.id}')">✅ Approve</button>
          <button class="btn-danger" onclick="adminRejectDeposit('${d.id}')">❌ Reject</button>
        </div>
      </div>`).join('');
  }

  function renderWithdrawals(withs) {
    const el = document.getElementById('admin-withdrawals-list');
    if (!el) return;
    if (!withs.length) { el.innerHTML = `<div class="empty-state">✅ No pending withdrawals</div>`; return; }
    el.innerHTML = withs.map(w => `
      <div class="admin-card" id="wit-card-${w.id}">
        <div class="admin-card-header">
          <div>
            <div class="admin-card-title">📤 ${w.coin || 'USDT'} (${w.network || 'TRC20'})</div>
            <div class="admin-card-sub">Order: <strong>${w.order_number}</strong></div>
            <div class="admin-card-sub">User: <code>${w.user_name || w.user_id}</code> · Phone: <code>${w.user_phone || 'N/A'}</code></div>
            <div class="admin-card-sub" style="word-break:break-all;">Address: <code style="color:#00f2fe;font-size:11px;">${w.address || 'N/A'}</code></div>
          </div>
          <div class="admin-card-amount">$${fmt(w.amount)}</div>
        </div>
        <div class="admin-card-meta"><span>🕐 ${timeAgo(w.created_at)}</span></div>
        <div class="admin-card-actions">
          <button class="btn-success" onclick="adminApproveWithdrawal('${w.id}')">✅ Approve</button>
          <button class="btn-danger" onclick="adminRejectWithdrawal('${w.id}')">❌ Reject</button>
        </div>
      </div>`).join('');
  }

  // Store KYC image data in a JS map (avoids embedding huge base64 strings in HTML attributes)
  const kycImagesCache = {};

  function renderKyc(kycs) {
    const el = document.getElementById('admin-kyc-list');
    if (!el) return;
    if (!kycs.length) { el.innerHTML = `<div class="empty-state">✅ No pending KYC submissions</div>`; return; }
    // Cache image data by KYC id so the Photos button only needs the id
    kycs.forEach(k => {
      kycImagesCache[k.id] = { front: k.front_img, back: k.back_img, handheld: k.handheld_img, name: k.real_name };
    });
    el.innerHTML = kycs.map(k => `
      <div class="admin-card" id="kyc-card-${k.id}">
        <div class="admin-card-header">
          <div>
            <div class="admin-card-title">🪪 ${k.real_name || 'N/A'}</div>
            <div class="admin-card-sub">User: <code>${k.user_name || k.user_id}</code> · Phone: <code>${k.user_phone || 'N/A'}</code></div>
            <div class="admin-card-sub">Nationality: <strong>${k.nationality || 'N/A'}</strong> · ID Type: <strong>${k.document_type || 'N/A'}</strong></div>
            <div class="admin-card-sub">ID No: <strong>${k.id_number || 'N/A'}</strong></div>
          </div>
          <button class="btn-outline" style="padding:6px 14px;font-size:13px;" onclick="viewKycImages('${k.id}')">
            🖼️ Photos
          </button>
        </div>
        <div class="admin-card-meta"><span>🕐 ${timeAgo(k.created_at)}</span></div>
        <div class="admin-card-actions">
          <button class="btn-success" onclick="adminApproveKyc('${k.id}')">✅ Approve</button>
          <button class="btn-danger" onclick="adminRejectKyc('${k.id}')">❌ Reject</button>
        </div>
      </div>`).join('');
  }

  // ---- Users ----
  async function loadUsers() {
    const el = document.getElementById('admin-users-list');
    if (el) el.innerHTML = `<div class="admin-loading">Loading users...</div>`;
    try {
      const data = await adminFetch('/users');
      allUsersCache = data.users || [];
      renderUsers(allUsersCache);
    } catch (err) {
      if (el) el.innerHTML = `<div class="empty-state" style="color:#ef4444;">Failed to load users: ${err.message}</div>`;
    }
  }

  function renderUsers(users) {
    const el = document.getElementById('admin-users-list');
    if (!el) return;
    if (!users.length) { el.innerHTML = `<div class="empty-state">No users found</div>`; return; }
    el.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="admin-table">
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Email</th>
          <th>Balance</th><th>Total Assets</th><th>KYC</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody>
        ${users.map(u => `
          <tr>
            <td><strong>${u.name || '—'}</strong><br/><code style="font-size:10px;color:var(--text-muted);">${u.id}</code></td>
            <td>${u.phone || '—'}</td>
            <td style="font-size:12px;">${u.email || '—'}</td>
            <td class="color-up" style="font-weight:700;">$${fmt(u.available_balance)}</td>
            <td>$${fmt(u.total_assets)}</td>
            <td><span class="kyc-badge ${u.kyc_status === 'pass' ? 'kyc-pass' : u.kyc_status === 'rejected' ? 'kyc-fail' : 'kyc-pending'}">${u.kyc_status || 'none'}</span></td>
            <td style="font-size:11px;">${timeAgo(u.created_at).substring(0, 10)}</td>
            <td>
              <button class="btn-outline" style="padding:4px 10px;font-size:12px;" onclick="openBalanceModal('${u.id}','${(u.name || '').replace(/'/g, "\\'")}','${fmt(u.available_balance)}')">💰 Balance</button>
              <button class="btn-outline" style="padding:4px 10px;font-size:12px;color:#f59e0b;border-color:#f59e0b;margin-left:6px;" onclick="resetUserBalanceAdmin('${u.id}', '${(u.name || u.phone || u.id).replace(/'/g, "\\'")}')">🔄 Reset $0</button>
              <button class="btn-outline" style="padding:4px 10px;font-size:12px;color:#f59e0b;border-color:#f59e0b;margin-left:6px;" onclick="reconcileSignalTrades('${u.id}')">🔧 Reconcile</button>
              <button class="btn-outline" style="padding:4px 10px;font-size:12px;color:#ef4444;border-color:#ef4444;margin-left:6px;" onclick="deleteUserAdmin('${u.id}', '${(u.name || u.phone || u.id).replace(/'/g, "\\'")}')">🗑️ Delete</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  window.resetUserBalanceAdmin = async function (userId, userName) {
    if (!confirm(`⚠️ RESET BALANCE & WIPE ALL HISTORY FOR "${userName}" (${userId})?\n\nThis will reset their balance to $0.00 AND permanently erase all their deposit, withdrawal, copy-trade, and transaction history records.`)) return;
    try {
      const res = await adminFetch('/users/reset-balance', 'POST', { userId });
      window.toast('✅ ' + (res.message || 'Balance reset to $0.00'), 'success');
      const targetUser = allUsersCache.find(u => u.id === userId);
      if (targetUser) {
        targetUser.available_balance = 0;
        targetUser.total_assets = 0;
        targetUser.frozen_balance = 0;
        targetUser.total_earnings = 0;
      }
      renderUsers(allUsersCache);
      if (window.loadAdminStats) await window.loadAdminStats();
    } catch (err) {
      window.toast('Error resetting balance: ' + err.message, 'error');
    }
  };

  window.deleteUserAdmin = async function (userId, userName) {
    if (!confirm(`⚠️ ARE YOU SURE YOU WANT TO DELETE USER "${userName}" (${userId})?\n\nThis will permanently delete the user account and clean up their records safely.`)) return;
    try {
      const res = await adminFetch(`/users/${userId}`, 'DELETE');
      window.toast('✅ ' + (res.message || 'User deleted successfully'), 'success');
      allUsersCache = allUsersCache.filter(u => u.id !== userId);
      renderUsers(allUsersCache);
      if (window.loadAdminStats) await window.loadAdminStats();
    } catch (err) {
      window.toast('Error deleting user: ' + err.message, 'error');
    }
  };

  window.filterUsers = function (q) {
    const lq = q.toLowerCase();
    const filtered = allUsersCache.filter(u =>
      (u.name || '').toLowerCase().includes(lq) ||
      (u.phone || '').toLowerCase().includes(lq) ||
      (u.id || '').toLowerCase().includes(lq) ||
      (u.email || '').toLowerCase().includes(lq)
    );
    renderUsers(filtered);
  };

  // ---- Signal Trades & Test Trigger ----
  async function checkTestSignalStatus() {
    try {
      const data = await adminFetch('/signal-status');
      const badge = document.getElementById('signal-test-status-badge');
      if (!badge) return;
      if (data.isTestActive && data.testSignal) {
        badge.style.background = 'rgba(0,196,154,0.2)';
        badge.style.color = '#00c49a';
        badge.textContent = `🟢 TEST SIGNAL ${data.testSignal.signalId} ACTIVE (${data.testSignal.minutesRemaining}m left)`;
      } else {
        badge.style.background = 'rgba(255,255,255,0.06)';
        badge.style.color = 'var(--text-muted)';
        badge.textContent = '⚪ No Test Signal Active';
      }
    } catch (e) { }
  }

  // Show/hide custom duration input when "Custom" is selected
  window.toggleCustomDuration = function (value) {
    const customInput = document.getElementById('trigger-signal-custom-duration');
    if (customInput) {
      customInput.style.display = value === 'custom' ? 'block' : 'none';
    }
  };

  window.triggerTestSignal = async function (action) {
    const signalId = document.getElementById('trigger-signal-id')?.value || '1';
    const durationSelect = document.getElementById('trigger-signal-duration');
    const customInput = document.getElementById('trigger-signal-custom-duration');
    let duration = durationSelect?.value || '15';
    if (duration === 'custom') {
      const customVal = parseInt(customInput?.value);
      if (!customVal || customVal < 1) {
        window.toast('Please enter a valid custom duration (min 1 minute)', 'error');
        return;
      }
      duration = String(customVal);
    }

    // Custom delivery seconds: how long the trade stays "In Order" before auto-settlement.
    let deliverySeconds = 30;
    if (action === 'start') {
      const deliveryInput = document.getElementById('trigger-signal-delivery-seconds');
      const deliveryVal = parseInt(deliveryInput?.value);
      if (deliveryVal && deliveryVal >= 5) {
        deliverySeconds = deliveryVal;
      } else {
        window.toast('Please enter a valid delivery duration (min 5 seconds)', 'error');
        return;
      }
    }

    try {
      const res = await adminFetch('/trigger-signal', 'POST', { action, signalId, duration, deliverySeconds });
      window.toast(res.message, 'success');
      await checkTestSignalStatus();
    } catch (err) {
      window.toast('Error: ' + err.message, 'error');
    }
  };

  // ---- Auto-Execute Signals for All Eligible Users ----
  window.adminAutoExecuteSignals = async function () {
    if (!confirm('Auto-execute the current signal for ALL eligible users? This ensures every qualified user receives their entitled signal even if offline.')) return;
    try {
      const res = await adminFetch('/auto-execute-signals', 'POST', {});
      window.toast(res.message, res.executed > 0 ? 'success' : 'info');
      await loadSignalTrades();
    } catch (err) {
      window.toast('Error: ' + err.message, 'error');
    }
  };

  async function loadSignalTrades() {
    checkTestSignalStatus();
    const el = document.getElementById('admin-signals-list');
    if (el) el.innerHTML = `<div class="admin-loading">Loading signal trades...</div>`;
    try {
      const data = await adminFetch('/signal-trades');
      const trades = data.trades || [];
      if (!trades.length) { el.innerHTML = `<div class="empty-state">No signal trades recorded yet</div>`; return; }
      el.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead><tr>
            <th>User</th><th>Signal</th><th>Pair</th><th>Trade Amount</th><th>Profit</th><th>Bal Before</th><th>Bal After</th><th>Tier</th><th>Time</th>
          </tr></thead>
          <tbody>
          ${trades.map(t => `
            <tr>
              <td><strong>${t.user_name || '—'}</strong><br/><code style="font-size:10px;">${t.user_phone || t.user_id}</code></td>
              <td style="font-weight:700;">Signal ${t.signal_id}</td>
              <td>${t.pair}</td>
              <td>$${fmt(t.trade_amount, 4)}</td>
              <td class="color-up" style="font-weight:700;">+$${fmt(t.profit, 4)}</td>
              <td>$${fmt(t.balance_before, 2)}</td>
              <td class="color-up">$${fmt(t.balance_after, 2)}</td>
              <td><span class="kyc-badge kyc-pass">${t.tier_label || '—'}</span></td>
              <td style="font-size:11px;">${timeAgo(t.created_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    } catch (err) {
      if (el) el.innerHTML = `<div class="empty-state" style="color:#ef4444;">Failed to load: ${err.message}</div>`;
    }
  }

  // ---- Signal Reconcile (repair double-settled trades) ----
  window.reconcileSignalTrades = async function (userId) {
    if (!confirm(`Reconcile signal settlements for user ${userId}?\n\nThis checks for trades that were settled multiple times (a bug that caused users to earn double/triple) and reverses the duplicate credits.`)) return;
    try {
      const res = await adminFetch('/signals/reconcile', 'POST', { userId });
      window.toast(res.message, res.reversed.length > 0 ? 'success' : 'info');
      if (res.reversed.length > 0) {
        window.toast(`💵 Reversed $${res.reversed.reduce((s, r) => s + r.amount, 0).toFixed(2)} in duplicate credits`, 'success');
      }
      await loadUsers();
    } catch (err) {
      window.toast('Error: ' + err.message, 'error');
    }
  };

  // ---- Balance Modal ----
  window.openBalanceModal = function (userId, name, balance) {
    document.getElementById('balance-modal-user-id').value = userId;
    document.getElementById('balance-modal-user-info').innerHTML = `
      <strong>${name}</strong><br/>
      <span style="color:var(--text-muted);">ID: ${userId}</span><br/>
      <span>Current Balance: <strong style="color:#00f2fe;">$${balance}</strong></span>`;
    document.getElementById('balance-modal-amount').value = '';
    document.getElementById('balance-modal-remark').value = '';
    document.getElementById('balance-modal').classList.add('active');
  };

  window.closeBalanceModal = function () {
    document.getElementById('balance-modal')?.classList.remove('active');
  };

  window.submitBalanceAdjust = async function () {
    const userId = document.getElementById('balance-modal-user-id').value;
    const amount = parseFloat(document.getElementById('balance-modal-amount').value);
    const remark = document.getElementById('balance-modal-remark').value;
    if (!userId || isNaN(amount)) { window.toast('Please enter a valid amount', 'error'); return; }
    try {
      const res = await adminFetch('/users/balance', 'POST', { userId, amount, remark });
      window.toast('✅ ' + res.message, 'success');
      closeBalanceModal();
      // Refresh users list
      await loadUsers();
    } catch (err) {
      window.toast('Error: ' + err.message, 'error');
    }
  };

  // ---- Action Handlers ----
  window.adminApproveDeposit = async function (id) {
    if (!confirm('Approve this deposit and credit user balance?')) return;
    try {
      const res = await adminFetch('/deposits/approve', 'POST', { depositId: id });
      window.toast('✅ ' + res.message, 'success');
      document.getElementById(`dep-card-${id}`)?.remove();
    } catch (err) { window.toast('Error: ' + err.message, 'error'); }
  };

  window.adminRejectDeposit = async function (id) {
    if (!confirm('Reject this deposit?')) return;
    try {
      const res = await adminFetch('/deposits/reject', 'POST', { depositId: id });
      window.toast('✅ ' + res.message, 'success');
      document.getElementById(`dep-card-${id}`)?.remove();
    } catch (err) { window.toast('Error: ' + err.message, 'error'); }
  };

  window.adminApproveWithdrawal = async function (id) {
    if (!confirm('Approve this withdrawal?')) return;
    try {
      const res = await adminFetch('/withdrawals/approve', 'POST', { withdrawalId: id });
      window.toast('✅ ' + res.message, 'success');
      document.getElementById(`wit-card-${id}`)?.remove();
    } catch (err) { window.toast('Error: ' + err.message, 'error'); }
  };

  window.adminRejectWithdrawal = async function (id) {
    if (!confirm('Reject this withdrawal? Funds will be refunded to user.')) return;
    try {
      const res = await adminFetch('/withdrawals/reject', 'POST', { withdrawalId: id });
      window.toast('✅ ' + res.message, 'success');
      document.getElementById(`wit-card-${id}`)?.remove();
    } catch (err) { window.toast('Error: ' + err.message, 'error'); }
  };

  window.adminApproveKyc = async function (id) {
    if (!confirm('Approve this KYC submission?')) return;
    try {
      const res = await adminFetch('/kyc/approve', 'POST', { kycId: id });
      window.toast('✅ ' + res.message, 'success');
      document.getElementById(`kyc-card-${id}`)?.remove();
    } catch (err) { window.toast('Error: ' + err.message, 'error'); }
  };

  window.adminRejectKyc = async function (id) {
    const reason = prompt('Reason for rejection:') || 'Unclear documents';
    if (reason === null) return;
    try {
      const res = await adminFetch('/kyc/reject', 'POST', { kycId: id, reason });
      window.toast('✅ ' + res.message, 'success');
      document.getElementById(`kyc-card-${id}`)?.remove();
    } catch (err) { window.toast('Error: ' + err.message, 'error'); }
  };

  window.viewKycImages = function (id) {
    const data = kycImagesCache[id];
    const modal = document.getElementById('kyc-img-modal');
    const body = document.getElementById('kyc-img-modal-body');
    const title = document.getElementById('kyc-img-modal-title');
    if (!modal || !body) return;
    if (title) title.textContent = `KYC — ${(data && data.name) || 'Unknown'}`;

    const imgSection = (label, src) => {
      if (!src) return `<div style="color:var(--text-muted);font-size:13px;">📷 ${label}: Not provided</div>`;
      return `
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text-sub);margin-bottom:6px;">📷 ${label}</div>
          <img src="${src}" style="width:100%;border-radius:10px;border:1px solid var(--border-color);" alt="${label}" onerror="this.style.display='none'"/>
        </div>`;
    };

    body.innerHTML = imgSection('Front of ID', data && data.front) + imgSection('Back of ID', data && data.back) + imgSection('Selfie Holding ID', data && data.handheld);
    modal.classList.add('active');
  };

  window.closeKycImgModal = function () {
    document.getElementById('kyc-img-modal')?.classList.remove('active');
  };

  // ---- EARNINGS VIEW (Infographic Table) ----
  window.loadEarningsView = function () {
    const el = document.getElementById('admin-earnings-list');
    if (!el) return;

    const cards = [
      { num: '1', title: '💰 Deposit Funds', desc: 'Min $100 unlocks Tier 1 signals. Deposits earn Lucky Wheel spins (1-10 per deposit). Higher tiers need $300 & $1,000.' },
      { num: '2', title: '📡 AI Signal Copy Trading', desc: 'Join live signals at 5pm, 6pm, 7pm EAT. T1: 1 signal (1.4%), T2: 2 signals (2.4%), T3: 3 signals (3.1%) daily profit.' },
      { num: '3', title: '🤖 AI Quantitative Models', desc: 'Allocate capital to AI models. Earn 1.8%-2.8% daily returns. Doubling cycle: 26-34 days. Min allocation $100-$500.' },
      { num: '4', title: '👥 Referral Commissions', desc: 'Earn 7.5% on L1 referrals profits, 3.75% on L2, halving up the chain. Each referral = 1 free 8pm signal!' },
      { num: '5', title: '🎡 Lucky Wheel', desc: 'Deposits earn spin chances. Win up to $88.88 USDT per spin. Win cap: 1%-10% of last deposit amount.' },
      { num: '6', title: '🏆 VIP Team Dividends', desc: 'Refer 5+ members to unlock team rewards & weekly trading volume dividends. The bigger your team, the higher your rewards.' },
      { num: '7', title: '🆔 KYC Verification', desc: 'Complete identity verification to unlock withdrawals. Required before users can withdraw their earnings.' }
    ];

    el.innerHTML = `
<div style="background:linear-gradient(135deg,#0d1322,#1a1f35);border-radius:16px;padding:24px;border:1px solid rgba(0,242,254,0.2);margin-bottom:20px;">
  <div style="text-align:center;margin-bottom:20px;">
    <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" style="width:48px;height:48px;margin-bottom:8px;filter:drop-shadow(0 0 10px #00f2fe);"/>
    <h2 style="color:#fff;font-size:20px;margin:0 0 4px;">🚀 RXDT Exchange — How Users Earn</h2>
    <p style="color:var(--text-sub);font-size:13px;margin:0;">AI Quantitative Trading Platform · Institutional Grade</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
    ${cards.map(c => `
    <div style="background:rgba(0,242,254,0.05);border:1px solid rgba(0,242,254,0.2);border-radius:12px;padding:14px;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,242,254,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#00f2fe;flex-shrink:0;">${c.num}</div>
        <div>
          <div style="font-weight:700;color:#fff;font-size:14px;">${c.title}</div>
          <div style="font-size:12px;color:var(--text-sub);line-height:1.5;">${c.desc}</div>
        </div>
      </div>
    </div>`).join('')}
    <div style="background:rgba(121,40,202,0.1);border:1px solid rgba(167,139,250,0.3);border-radius:12px;padding:14px;">
      <div style="display:flex;gap:10px;align-items:flex-start;">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(121,40,202,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#a78bfa;flex-shrink:0;">📢</div>
        <div>
          <div style="font-weight:700;color:#a78bfa;font-size:14px;">💬 Talk to the CEO</div>
          <div style="font-size:12px;color:var(--text-sub);line-height:1.5;">Users can contact the CEO Arthur Vance on Telegram: <a href="https://t.me/RXDT888" target="_blank" style="color:#00f2fe;font-weight:700;text-decoration:underline;">@RXDT888</a></div>
        </div>
      </div>
    </div>
  </div>
</div>`;
  };

  // ---- CHAT: Load Conversations List ----
  window.loadChatConversations = async function () {
    const el = document.getElementById('admin-chat-list');
    const convEl = document.getElementById('admin-chat-conversation');
    if (convEl) convEl.style.display = 'none';
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = '<div class="admin-loading">Loading conversations...</div>';

    try {
      const data = await chatFetch('/conversations');
      const conversations = data.conversations || [];
      if (!conversations.length) {
        el.innerHTML = '<div class="empty-state">💬 No conversations yet</div>';
        return;
      }
      el.innerHTML = conversations.map(c => {
        const lastMsg = c.last_message || '';
        const truncated = lastMsg.length > 60 ? lastMsg.substring(0, 60) + '...' : lastMsg;
        const unreadBadge = c.unread_count > 0 ? `<span style="background:#ef4444;color:#fff;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:700;margin-left:8px;">${c.unread_count}</span>` : '';
        return `
          <div class="admin-card" style="cursor:pointer;" onclick="loadUserConversation('${c.user_id}')">
            <div class="admin-card-header">
              <div>
                <div class="admin-card-title">${c.user_name || 'Unknown'} ${unreadBadge}</div>
                <div class="admin-card-sub">${c.user_phone || ''}</div>
                <div class="admin-card-sub" style="color:var(--text-muted);font-size:12px;">${truncated}</div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);">${c.last_message_at ? timeAgo(c.last_message_at).substring(0, 16) : ''}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      el.innerHTML = '<div class="empty-state" style="color:#ef4444;">Failed to load: ' + err.message + '</div>';
    }
  };

  // ---- CHAT: Load Single User Conversation ----
  window.loadUserConversation = async function (userId) {
    const listEl = document.getElementById('admin-chat-list');
    const convEl = document.getElementById('admin-chat-conversation');
    if (listEl) listEl.style.display = 'none';
    if (!convEl) return;
    convEl.style.display = 'block';
    convEl.innerHTML = '<div class="admin-loading">Loading messages...</div>';

    try {
      const data = await chatFetch('/messages/' + userId);
      const messages = data.messages || [];
      const user = data.user || {};

      let msgsHtml = messages.map(m => {
        const isAdmin = m.sender === 'admin';
        return `
          <div style="display:flex;justify-content:${isAdmin ? 'flex-end' : 'flex-start'};margin-bottom:10px;">
            <div style="max-width:80%;padding:10px 14px;border-radius:12px;background:${isAdmin ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.06)'};border:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:13px;color:#fff;">${m.message}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${m.created_at ? timeAgo(m.created_at).substring(0, 16) : ''}</div>
            </div>
          </div>
        `;
      }).join('');

      convEl.innerHTML = `
        <div style="margin-bottom:16px;">
          <button class="btn-outline" style="padding:6px 12px;font-size:13px;" onclick="loadChatConversations()">← Back</button>
          <span style="margin-left:12px;font-weight:700;color:#fff;">💬 ${user.name || 'Unknown'} ${user.phone ? '(' + user.phone + ')' : ''}</span>
        </div>
        <div id="admin-chat-msgs" style="background:rgba(0,0,0,0.2);border-radius:12px;padding:16px;min-height:200px;max-height:400px;overflow-y:auto;margin-bottom:12px;">
          ${msgsHtml}
        </div>
        <div style="display:flex;gap:8px;">
          <input type="text" id="admin-chat-reply-input" class="form-control" placeholder="Type your reply..."
            onkeydown="if(event.key==='Enter')adminSendChatReply('${userId}')"/>
          <button class="btn-primary" onclick="adminSendChatReply('${userId}')">Send</button>
        </div>
      `;
      // Scroll to bottom
      const msgsContainer = document.getElementById('admin-chat-msgs');
      if (msgsContainer) msgsContainer.scrollTop = msgsContainer.scrollHeight;
    } catch (err) {
      convEl.innerHTML = '<div class="empty-state" style="color:#ef4444;">Failed to load messages: ' + err.message + '</div>';
    }
  };

  // ---- CHAT: Send Admin Reply ----
  window.adminSendChatReply = async function (userId) {
    const input = document.getElementById('admin-chat-reply-input');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';

    try {
      await chatFetch('/reply', 'POST', { userId, message: msg });
      // Reload conversation
      window.loadUserConversation(userId);
    } catch (err) {
      window.toast('Error: ' + err.message, 'error');
    }
  };

  // ---- INFOGRAPHICS: 30-Day Signal Earnings Cards Generator ----
  window.renderInfographicsTab = function () {
    const el = document.getElementById('admin-infographics-container');
    if (!el) return;

    el.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:16px;padding:24px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
          <div>
            <h2 style="font-size:18px;font-weight:800;margin:0 0 4px;color:#fff;">🖼️ 30-Day Signal Earnings Infographics</h2>
            <p style="font-size:13px;color:var(--text-sub);margin:0;">Download high-resolution branded cards with Passenger Jet background & Telegram support info.</p>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn-primary" onclick="downloadInfographic('standard')" style="padding:10px 18px;font-size:13px;font-weight:700;">📥 Download Standard Table (PNG)</button>
            <button class="btn-primary" onclick="downloadInfographic('referral')" style="padding:10px 18px;font-size:13px;font-weight:700;background:linear-gradient(135deg,#00f2fe,#4facfe);border:none;color:#090d16;">🚀 Download Referral Table (PNG)</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;">
          <!-- Card 1: Standard (No Referral) -->
          <div style="border:1px solid rgba(0,242,254,0.3);border-radius:14px;overflow:hidden;background:#090d16;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
            <div style="padding:14px 16px;background:rgba(0,242,254,0.08);border-bottom:1px solid rgba(0,242,254,0.2);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:800;font-size:14px;color:#00f2fe;">📊 Table 1: Without Referrals</span>
              <button class="btn-outline" onclick="downloadInfographic('standard')" style="padding:4px 10px;font-size:11px;">Save PNG</button>
            </div>
            <div style="padding:16px;">
              <canvas id="canvas-standard" width="800" height="950" style="width:100%;height:auto;border-radius:10px;display:block;"></canvas>
            </div>
          </div>

          <!-- Card 2: Boosted (With Referral) -->
          <div style="border:1px solid rgba(245,158,11,0.3);border-radius:14px;overflow:hidden;background:#090d16;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
            <div style="padding:14px 16px;background:rgba(245,158,11,0.08);border-bottom:1px solid rgba(245,158,11,0.2);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:800;font-size:14px;color:#f59e0b;">🚀 Table 2: With 1 Daily Referral</span>
              <button class="btn-outline" onclick="downloadInfographic('referral')" style="padding:4px 10px;font-size:11px;color:#f59e0b;border-color:#f59e0b;">Save PNG</button>
            </div>
            <div style="padding:16px;">
              <canvas id="canvas-referral" width="800" height="950" style="width:100%;height:auto;border-radius:10px;display:block;"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      drawInfographicCanvas('canvas-standard', false);
      drawInfographicCanvas('canvas-referral', true);
    }, 100);
  };

  function drawInfographicCanvas(canvasId, isReferralMode) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 800;
    const height = 950;

    // Load background airplane image
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = 'assets/airplane_bg.png';

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = 'assets/images/rxdt_logo.png';

    let bgLoaded = false;
    let logoLoaded = false;

    function renderAll() {
      // 1. Draw Background
      if (bgLoaded) {
        ctx.drawImage(bgImg, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, width, height);
      }

      // Dark moody overlay for contrast
      ctx.fillStyle = 'rgba(9, 13, 22, 0.78)';
      ctx.fillRect(0, 0, width, height);

      // Radial glowing gradient header
      const radGrad = ctx.createRadialGradient(400, 150, 20, 400, 150, 400);
      radGrad.addColorStop(0, isReferralMode ? 'rgba(245, 158, 11, 0.25)' : 'rgba(0, 242, 254, 0.25)');
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);

      // Header Glass Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = isReferralMode ? 'rgba(245, 158, 11, 0.4)' : 'rgba(0, 242, 254, 0.4)';
      ctx.lineWidth = 2;
      roundRect(ctx, 40, 35, 720, 150, 16, true, true);

      // RXDT Logo
      if (logoLoaded) {
        ctx.drawImage(logoImg, 60, 55, 70, 70);
      } else {
        ctx.fillStyle = '#00f2fe';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillText('RXDT', 60, 100);
      }

      // Title & Subtitle
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px Inter, sans-serif';
      ctx.fillText('RXDT EXCHANGE', 150, 85);

      ctx.fillStyle = isReferralMode ? '#FBBF24' : '#00F2FE';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText(
        isReferralMode
          ? '🚀 30-DAY AI SIGNAL PROFIT MODEL (WITH 1 DAILY REFERRAL)'
          : '⚡ 30-DAY AI SIGNAL PROFIT MODEL (STANDARD MODE)',
        150,
        115
      );

      ctx.fillStyle = '#94A3B8';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText('Quantitative Analysis VI Model • Compound Yield Projection', 150, 140);

      // Table Header Row
      const startY = 220;
      const rowHeight = 160;

      const tiers = [
        {
          name: 'TIER 1',
          dep: '$100 – $299',
          baseDep: 100,
          signals: '1 Signal / day (Signal 1)',
          dailyRate: 0.014,
          dailyProfitLabel: '1.4% daily',
          boostedRate: 0.029,
          boostedLabel: '2.9% daily (1.4% + 1.5% referral signal)',
          noRef30Day: '$151.75',
          noRefProfit: '+$51.75 (+51.7%)',
          withRef30Day: '$235.76',
          withRefProfit: '+$135.76 (+135.7%)',
          accent: '#38BDF8',
        },
        {
          name: 'TIER 2',
          dep: '$300 – $999',
          baseDep: 300,
          signals: '2 Signals / day (Signals 1 & 2)',
          dailyRate: 0.024,
          dailyProfitLabel: '2.4% daily',
          boostedRate: 0.039,
          boostedLabel: '3.9% daily (2.4% + 1.5% referral signal)',
          noRef30Day: '$611.11',
          noRefProfit: '+$311.11 (+103.7%)',
          withRef30Day: '$945.34',
          withRefProfit: '+$645.34 (+215.1%)',
          accent: '#F59E0B',
        },
        {
          name: 'TIER 3',
          dep: '$1,000+',
          baseDep: 1000,
          signals: '3 Signals / day (Signals 1, 2 & 3)',
          dailyRate: 0.031,
          dailyProfitLabel: '3.1% daily',
          boostedRate: 0.046,
          boostedLabel: '4.6% daily (3.1% + 1.5% referral signal)',
          noRef30Day: '$2,498.96',
          noRefProfit: '+$1,498.96 (+149.9%)',
          withRef30Day: '$3,854.34',
          withRefProfit: '+$2,854.34 (+285.4%)',
          accent: '#10B981',
        },
      ];

      // Draw Tiers Cards
      tiers.forEach((t, idx) => {
        const y = startY + idx * (rowHeight + 16);

        // Card Container
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = isReferralMode ? 'rgba(245, 158, 11, 0.35)' : 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 40, y, 720, rowHeight, 14, true, true);

        // Accent Tag Bar
        ctx.fillStyle = t.accent;
        roundRect(ctx, 40, y, 10, rowHeight, { tl: 14, bl: 14, tr: 0, br: 0 }, true, false);

        // Tier Title & Deposit Range
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText(t.name, 70, y + 38);

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(`Min Deposit: ${t.dep}`, 170, y + 36);

        // Signal info
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText(`📡 Entitled Signals: ${t.signals}`, 70, y + 68);

        // Daily profit rate
        ctx.fillStyle = isReferralMode ? '#FBBF24' : '#00F2FE';
        ctx.font = 'bold 15px Inter, sans-serif';
        ctx.fillText(`⚡ Daily Yield: ${isReferralMode ? t.boostedLabel : t.dailyProfitLabel}`, 70, y + 96);

        // Divider line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(70, y + 112);
        ctx.lineTo(740, y + 112);
        ctx.stroke();

        // 30 Days Result Banner
        ctx.fillStyle = '#94A3B8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText(`30-Day Balance (Compounded):`, 70, y + 138);

        const endBal = isReferralMode ? t.withRef30Day : t.noRef30Day;
        const profit = isReferralMode ? t.withRefProfit : t.noRefProfit;

        ctx.fillStyle = '#34D399';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText(endBal, 285, y + 140);

        ctx.fillStyle = '#10B981';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(`Net Profit: ${profit}`, 440, y + 138);
      });

      // Footer Banner Box
      const footerY = 760;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, 40, footerY, 720, 145, 14, true, true);

      // Contact & Branding in Footer
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText('💬 NEED ASSISTANCE & OFFICIAL SIGNALS?', 65, footerY + 38);

      ctx.fillStyle = '#00F2FE';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText('Telegram Support: @RXDT_Official', 65, footerY + 68);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText('Official Website: https://rxdt.site • Colorado Entity ID: 20261325716', 65, footerY + 94);

      ctx.fillStyle = '#64748B';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('Disclaimer: Returns are simulated based on 30-day compounding algorithms. Trading carries market risk.', 65, footerY + 120);
    }

    bgImg.onload = () => { bgLoaded = true; renderAll(); };
    bgImg.onerror = () => { renderAll(); };

    logoImg.onload = () => { logoLoaded = true; renderAll(); };
    logoImg.onerror = () => { renderAll(); };

    renderAll();
  }

  function roundRect(ctx, x, y, w, h, radius, fill, stroke) {
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + w - radius.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius.tr);
    ctx.lineTo(x + w, y + h - radius.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius.br, y + h);
    ctx.lineTo(x + radius.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  window.downloadInfographic = function (type) {
    const canvasId = type === 'referral' ? 'canvas-referral' : 'canvas-standard';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `RXDT_30Day_Profit_Table_${type.toUpperCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    window.toast('📥 Downloading PNG image...', 'success');
  };

  // ============================================================
  // 📢 Marketing, Brand Assets & VIP Congratulation Storage Hub
  // ============================================================

  window.copyToClipboard = function (text, label = 'Message') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.toast) window.toast(`📋 ${label} copied to clipboard!`, 'success');
      }).catch(err => {
        fallbackCopyText(text, label);
      });
    } else {
      fallbackCopyText(text, label);
    }
  };

  function fallbackCopyText(text, label) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      if (window.toast) window.toast(`📋 ${label} copied to clipboard!`, 'success');
    } catch (e) {
      alert(`Could not auto-copy. Please copy manually:\n\n${text}`);
    }
    document.body.removeChild(textarea);
  }

  const DEFAULT_MARKETING_MESSAGES = [
    // ── ANTI-SCAM SECURITY NOTICES ──
    {
      id: 'msg-antiscam-1',
      title: '⚠️ URGENT: Scam Warning — Official Communication Notice',
      platform: 'Telegram / WhatsApp / Facebook',
      category: 'Security',
      text: `⚠️ IMPORTANT SECURITY NOTICE — PLEASE READ & SHARE ⚠️

🚨 We have received reports of SCAMMERS on social media impersonating Prof. Arthur Vance, CEO of RXDT Exchange.

🛑 Prof. Vance does NOT contact users via:
❌ Personal WhatsApp or Telegram DMs
❌ Facebook Messenger or Instagram DMs
❌ Any unofficial social media accounts

✅ Prof. Vance ONLY communicates with users through the OFFICIAL RXDT platform:
👉 https://www.rxdt.site

🔐 If anyone contacts you claiming to be Prof. Vance outside the platform — it is a SCAMMER. Do NOT send them money or share personal details.

📢 Protect yourself and warn your team. Share this message widely.

— RXDT Exchange Official Team
🌐 rxdt.site | 📩 Live Chat: Available on platform`
    },
    {
      id: 'msg-antiscam-2',
      title: '🛡️ Security Alert — How to Verify Real RXDT Communication',
      platform: 'Facebook / Instagram',
      category: 'Security',
      text: `🛡️ HOW TO STAY SAFE ON RXDT EXCHANGE 🛡️

❗ Scammers are active on social media pretending to be Prof. Arthur Vance and RXDT staff.

✅ THE ONLY OFFICIAL WAY to communicate with Prof. Vance or RXDT Support is:
💬 Live Chat inside the app → https://www.rxdt.site

🚫 RXDT will NEVER:
• Ask for your password or seed phrase
• Request payments through personal accounts
• DM you first on WhatsApp, Telegram, or Facebook

🔐 Your account security is our priority. Always verify through the official website.

👇 Share this to protect your friends and family in the RXDT community.

📲 Official Platform: https://www.rxdt.site
💬 CEO Official Telegram (announcements only): @RXDT888`
    },
    {
      id: 'msg-antiscam-3',
      title: '📣 Short Alert — Anti-Scam Warning (Quick Post)',
      platform: 'WhatsApp Groups / Twitter / X',
      category: 'Security',
      text: `📣 RXDT SCAM ALERT 📣

⚠️ Scammers are impersonating Prof. Arthur Vance on social media!

✅ Prof. Vance ONLY communicates through: https://www.rxdt.site (Live Chat inside the platform)

🚫 Do NOT respond to anyone claiming to be him on WhatsApp, Telegram DMs, Facebook, or Instagram.

🔗 Official site: https://www.rxdt.site
📢 Official Telegram channel: @RXDT888

Please share this warning widely. Stay safe! 🙏`
    },
    {
      id: 'msg-welcome-1',
      title: '🚀 Welcome & Quick Start Pitch',
      platform: 'Telegram / WhatsApp',
      category: 'Onboarding',
      text: `Welcome to RXDT Exchange! 📈

Follow these simple steps to start earning daily profits:
1. 💰 Deposit $100+ to unlock Tier 1 Copy Trading.
2. 📡 Join live AI signals daily at 5:00 PM, 6:00 PM & 7:00 PM EAT.
3. 🤖 Allocate capital to AI Quantitative Models for 1.8%-2.8% daily returns.
4. 👥 Invite friends to earn 7.5% referral profit commissions!

Official Telegram: @RXDT888 | Website: https://rxdt.site`
    },
    {
      id: 'msg-signal-alert',
      title: '📡 Daily Signal Window Alert',
      platform: 'Telegram',
      category: 'Signals',
      text: `⚡ ATTENTION RXDT TRADERS! ⚡

Live AI Strategy Copy Trading Signal is NOW ACTIVE! 🚀

🕒 Signal Schedule (EAT):
• Tier 1 ($100+): 5:00 PM EAT (1.4% Return)
• Tier 2 ($300+): 6:00 PM EAT (2.4% Return)
• Tier 3 ($1,000+): 7:00 PM EAT (3.1% Return)

👉 Log in now & click 'Join Strategy Copy Trading' on the Contract page before the signal window closes!`
    },
    {
      id: 'msg-vip-pitch',
      title: '🏆 VIP 1 - VIP 9 Monthly Salary & Bonus Pitch',
      platform: 'Facebook / WhatsApp',
      category: 'VIP',
      text: `💰 Build Your Team & Unlock 10-Day Salaries on RXDT! 🏆

Did you know you can earn guaranteed recurring salaries every 10 days?

• VIP 1 (5 Members): $30 every 10 days ($90/mo) + $100 Bonus
• VIP 2 (15 Members): $70 every 10 days ($210/mo) + $250 Bonus
• VIP 3 (30 Members): $150 every 10 days ($450/mo) + $500 Bonus
• VIP 4 (60 Members): $300 every 10 days ($900/mo) + $1,000 Bonus

Salaries are automatically distributed on the 3rd, 13th, & 23rd of every month! Start inviting today!`
    },
    {
      id: 'msg-support-contact',
      title: '💬 Customer Support & CEO Telegram Contact',
      platform: 'Support',
      category: 'Support',
      text: `Hello! Need assistance or have questions about your deposits, withdrawals, or copy trading signals?

Contact our Founder & CEO Arthur Vance directly on Telegram:
👉 Username: @RXDT888
👉 Link: https://t.me/RXDT888

Our team is available 24/7 to assist you!`
    },
    {
      id: 'msg-monthly-salary-advantages',
      title: '💰 Why RXDT Monthly Salary Rewards Change Everything',
      platform: 'WhatsApp / Telegram / Facebook',
      category: 'VIP',
      text: `💰 *WHY RXDT MONTHLY SALARY REWARDS CHANGE EVERYTHING* 💰

Most platforms give you a one-time bonus and that's it.
RXDT Exchange gives you a *continuous monthly salary* — paid every 10 days, 3 times a month.

Here are 6 reasons our leaders keep building:

1️⃣ *Continuously Growing Passive Income*
Beyond trading profits, your salary keeps flowing every month — no extra effort once your team is active.

2️⃣ *Designed for Long-Term Builders*
This isn't a one-off bonus. It rewards those who invest in their teams consistently — real leaders.

3️⃣ *Build a Stable, Thriving Team*
Grow your community and watch it become a healthy, self-sustaining ecosystem that works for you 24/7.

4️⃣ *Platform Recognition for Leadership*
The higher your VIP rank, the higher your salary — from $90/month all the way up to $9,000/month.
🥉 VIP 1 → $90/mo  |  👑 VIP 5 → $1,800/mo  |  🏆 VIP 9 → $9,000/mo

5️⃣ *Multiple Income Streams, All Working Together*
✅ AI Signal Trading Returns (1.8%–2.8% Daily)
✅ Referral Commissions (7.5%)
✅ Promotion Bonuses (up to $11,000 USDT)
✅ 10-Day Team Salary (up to $3,000 per cycle)

6️⃣ *Long-Term Value Far Exceeds Any One-Time Bonus*
A bonus is earned once. A salary is earned forever. As your team grows, so does your income.

🧠 *RXDT firmly believes: Real wealth is built, not stumbled upon.*

Since launching on 30th July 2026 under the vision of Founder & CEO *Arthur Vance*, RXDT has been committed to building a lasting financial foundation for every member.

🌍 Register today and start building your legacy:
👉 https://www.rxdt.site/#/register?invite=RXN2ZO

📩 Direct support & mentorship:
💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'msg-charity-community',
      title: '❤️ RXDT Community Charity — Giving Back Together',
      platform: 'WhatsApp / Telegram / Facebook',
      category: 'Community',
      text: `❤️ *RXDT COMMUNITY GIVES BACK* 🌍

At RXDT Exchange, profit is only part of our story.
The other part? *People.*

Recently, our incredible team leaders organized a charity visit to a local children's home — bringing essential supplies and, more importantly, bringing *joy*.

🏠 *What We Did:*
✅ Coordinated with community members to donate daily essentials
✅ Spent quality time chatting, playing & laughing with the children
✅ Showed that behind every trade is a human heart

💞 *The most meaningful gift wasn't the supplies.*
It was the radiant smiles on the children's faces — the reminder that even the smallest act of kindness creates real warmth.

Since our official launch on *30th July 2026*, under the vision of Founder & CEO *Arthur Vance*, the RXDT community has stood for more than returns.
We stand for *impact* — both in your portfolio and in the world.

🧡 To every member who gave their time and love: *THANK YOU.*

This is what RXDT is truly about:
🌍 *Working together. Growing together. Giving back to society.*

✨ Join a platform that cares:
👉 https://www.rxdt.site/#/register?invite=RXN2ZO
💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'msg-platform-overview',
      title: '🚀 RXDT Exchange — Full Platform Overview',
      platform: 'WhatsApp / Telegram / Facebook',
      category: 'General Marketing',
      text: `🚀 *RXDT EXCHANGE · THE NEXT-GENERATION GLOBAL INTELLIGENT TRADING PLATFORM!* 🚀

If you've been looking for a smarter way to grow your money — you've found it.

📅 *Launched:* July 30, 2026
💰 *Minimum Deposit:* 100 USDT
💵 *Minimum Withdrawal:* 30 USDT
📤 *Withdrawal Fee:* 7%

📈 *Intelligent Trading System:*
RXDT's AI releases *3 trading orders daily*, generating a return of *2.7%–3.0% per day*.
(Actual returns reflect live market performance.)

🌟 *Your 7 Income Streams on RXDT:*

💵 10-Day Salary — paid 3× per month (3rd, 13th & 23rd)
💸 VIP Level Promotion Bonus — up to $11,000 USDT
💰 Referral Rewards — 7.5% of every friend's trading profits
💎 New User First Deposit Bonus — activated immediately
🎁 Exclusive Community VIP Promotion Rewards
👥 Team Trading Profit Sharing
📊 Trading Volume Bonus

🧠 *Built under the vision of Founder & CEO Arthur Vance*, RXDT is dedicated to empowering global traders with institutional-grade AI technology — now accessible to everyone.

📩 *Have questions?* Send me a private message — I'll walk you through everything step by step.

🌍 Register now and activate your first deposit bonus:
👉 https://www.rxdt.site/#/register?invite=RXN2ZO
💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'msg-global-expansion',
      title: '🌍 RXDT Global Market Development Plan',
      platform: 'WhatsApp / Telegram / Facebook',
      category: 'General Marketing',
      text: `🌍 *RXDT GLOBAL MARKET DEVELOPMENT PLAN* 🌍

*Now is not the time to watch. It’s the time to move.*

📅 *Officially Launched:* July 30, 2026
🏗️ *Founder & CEO:* Arthur Vance

🌎 *Current Global Footprint:*
✅ Africa — Rapidly Growing
✅ Europe — Expanding Fast
✅ Asia — Massive Scale
✅ America — Building Momentum
✅ Middle East — Emerging Leaders

Our global community is growing steadily. More teams and members are joining the RXDT ecosystem every single day.

⏰ *Why NOW is the Golden Window:*

🔑 For every team leader and early participant, *this is the golden age of platform development.*

🌱 A truly promising platform doesn’t wait for the market to mature — it gives extraordinary opportunities to those who dare to act before it does.

⚡ *The earlier you join, the earlier your strategy takes shape.*
⚡ *The earlier your strategy takes shape, the greater your team’s long-term advantage.*

Today’s efforts aren’t just about participating in a platform — they are about laying the foundation for your long-term business legacy in the digital asset space.

📊 The ecosystem is rapidly expanding. The market is not yet saturated. *The window is open — but it won’t be forever.*

🚀 *Grow together with RXDT.*
🌍 *Develop together with the global market.*

✨ Seize your opportunity in the new era of digital assets:
👉 https://www.rxdt.site/#/register?invite=RXN2ZO
💬 CEO Telegram: @RXDT888`
    }
  ];

  const DEFAULT_BRAND_IMAGES = [
    {
      id: 'img-daily-signal-1',
      name: 'AI Signal 1 (5:00 PM EAT / 14:00 UTC) Poster',
      category: 'Daily AI Signals',
      path: 'assets/images/daily_signal_1_5pm.png',
      caption: `⏰ *DAILY AI SIGNAL #1 IS LIVE! (5:00 PM EAT)* ⏰\n\n🎯 Signal Time: 5:00 PM - 5:30 PM EAT\n📈 Daily Return: 1.4% Yield\n💰 Tier 1 ($100+ Total Deposit)\n\n👉 Join live signal copy-trading now on RXDT Exchange!\n💬 Telegram Support: @RXDT888`
    },
    {
      id: 'img-daily-signal-2',
      name: 'AI Signal 2 (6:00 PM EAT / 15:00 UTC) Poster',
      category: 'Daily AI Signals',
      path: 'assets/images/daily_signal_2_6pm.png',
      caption: `🚀 *DAILY AI SIGNAL #2 IS LIVE! (6:00 PM EAT)* 🚀\n\n🎯 Signal Time: 6:00 PM - 6:30 PM EAT\n📈 Daily Return: 2.4% Cumulative Yield\n💰 Tier 2 ($300+ Total Deposit)\n\n👉 Connect your account to automated AI execution today!\n💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'img-daily-signal-3',
      name: 'AI Signal 3 (7:00 PM EAT / 16:00 UTC) Poster',
      category: 'Daily AI Signals',
      path: 'assets/images/daily_signal_3_7pm.png',
      caption: `🔥 *DAILY AI SIGNAL #3 MAX YIELD! (7:00 PM EAT)* 🔥\n\n🎯 Signal Time: 7:00 PM - 7:30 PM EAT\n📈 Daily Return: 3.1% Max Yield\n💰 Tier 3 ($1,000+ Deposit) & VIP Ranks\n\n👉 Maximize your passive income with verified AI signal feeds!\n💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'img-sig-banner-1',
      name: 'RXDT AI Quant Signals Banner',
      category: 'AI Signals',
      path: 'assets/images/ai_signals_banner_1.png',
      caption: `🚀 *RXDT AI QUANT SIGNALS LIVE!* 🚀\n\nExperience next-gen automated high-frequency crypto trading with 94.8% win accuracy.\n⚡ Real-time Buy/Sell triggers\n💹 1.8% – 2.8% Average Daily Returns\n🛡️ USA Colorado State Compliant (Entity ID: 20261325716)\n\n👉 Join live signal copy-trading now on RXDT Exchange!\n💬 Telegram Support: @RXDT888`
    },

    {
      id: 'img-sig-banner-2',
      name: 'RXDT High-Frequency Arbitrage Banner',
      category: 'AI Signals',
      path: 'assets/images/ai_signals_banner_2.png',
      caption: `⚡ *RXDT HIGH-FREQUENCY ARBITRAGE V4* ⚡\n\nAutomated cross-exchange liquidity arbitrage operating 24/7!\n📈 Daily Return: 1.8% – 2.8%\n⏱️ Doubling Cycle: 26–34 Days\n🤖 92.3% Win Rate\n\n👉 Connect your deposit to automated AI signal execution today!\n💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'img-sig-banner-3',
      name: 'Automated AI Execution Guard Banner',
      category: 'AI Signals',
      path: 'assets/images/ai_signals_banner_3.png',
      caption: `🛡️ *AUTOMATED AI EXECUTION & TREND GUARD* 🛡️\n\nInstitutional-grade momentum analytics protecting capital while maximizing returns.\n🎯 96.1% Win Rate\n💰 Passive Daily Yields\n\n👉 Start copying verified AI signals on RXDT Exchange!\n💬 Official CEO Contact: @RXDT888`
    },
    {
      id: 'img-founder',
      name: 'Arthur Vance — Founder & CEO',
      category: 'Founder',
      path: 'assets/images/warren_pennington.png',
      caption: `👤 *MEET ARTHUR VANCE — RXDT FOUNDER & CEO*\n\nLeading the future of AI quantitative trading. RXDT Exchange operates under USA Colorado State Compliance (Entity ID: 20261325716).\n\n💬 Official Telegram: @RXDT888`
    },
    {
      id: 'img-logo',
      name: 'RXDT Exchange Official Logo',
      category: 'Branding',
      path: 'assets/images/rxdt_logo.png',
      caption: `🚀 *RXDT EXCHANGE OFFICIAL LOGO*\n\nYour trusted partner in AI quantitative crypto trading. Join our global community today!`
    },
    {
      id: 'img-tier1',
      name: 'Tier 1 ($100 Plan) Strategy Poster',
      category: 'Strategy Posters',
      path: 'assets/images/rxdt_100_strategy.png',
      caption: `🔥 *START TRADING WITH JUST $100 ON RXDT!* 🔥\n\nUnlock Tier 1 AI Quantitative Signals and earn steady daily returns!\n👉 Register today and access live signals!`
    },
    {
      id: 'img-tier2',
      name: 'Tier 2 ($300 Plan) Strategy Poster',
      category: 'Strategy Posters',
      path: 'assets/images/rxdt_300_strategy.png',
      caption: `📈 *GROW YOUR PORTFOLIO WITH RXDT TIER 2 ($300)!* 📈\n\nAccelerated returns powered by high-frequency AI quantitative trading.`
    },
    {
      id: 'img-tier3',
      name: 'Tier 3 ($1,000 Plan) Strategy Poster',
      category: 'Strategy Posters',
      path: 'assets/images/rxdt_1000_strategy.png',
      caption: `💎 *MAXIMIZE YIELDS WITH RXDT TIER 3 ($1,000)!* 💎\n\nInstitutional-grade AI signal feeds designed for high capital growth!`
    },
    {
      id: 'img-vip-matrix',
      name: 'VIP Monthly Salary & Promotion Reward Matrix',
      category: 'VIP Banners',
      path: 'assets/images/rxdt_vip_rewards.png',
      caption: `🏆 *RXDT VIP SALARY & REWARD MATRIX* 🏆\n\nBuild your team and earn 10-day salaries up to $3,000 ($9,000/mo) plus promotion bonuses up to $11,000 USDT!`
    },
    {
      id: 'img-signal-popup',
      name: 'Strategy Copy Trading Signal Popup Header',
      category: 'Signals',
      path: 'assets/images/signal_popup.png',
      caption: `📡 *LIVE AI COPY-TRADING SIGNALS ACTIVE!* 📡\n\nCopy verified signals at 5pm, 6pm & 7pm EAT!`
    },
    {
      id: 'img-monthly-salary-leadership',
      name: 'Monthly Salary Rewards & Leadership Program Poster',
      category: 'VIP Banners',
      path: 'assets/images/rxdt_monthly_salary_leadership.svg',
      caption: `💰 *RXDT MONTHLY SALARY REWARDS — BUILD YOUR LEGACY* 💰\n\n✅ 6 Powerful Advantages of the RXDT Leadership Salary Program:\n1️⃣ Continuously Growing Passive Income\n2️⃣ Designed for Long-Term Builders\n3️⃣ Build a Stable, Self-Sustaining Team\n4️⃣ Platform Recognition for Leadership (VIP 1–9)\n5️⃣ Multiple Income Streams Working Together\n6️⃣ Long-Term Value Far Exceeds Any One-Time Bonus\n\n🏆 Salary Range: $90/mo (VIP 1) → $9,000/mo (VIP 9)\n💬 Paid every 10 days — 3rd, 13th & 23rd of each month\n\n👉 Register: https://www.rxdt.site/#/register?invite=RXN2ZO\n💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'img-charity-community',
      name: 'RXDT Community Charity — Giving Back Poster',
      category: 'Community',
      path: 'assets/images/rxdt_charity_community.svg',
      caption: `❤️ *RXDT COMMUNITY GIVES BACK* 🌍\n\nOur team leaders organized a heartfelt charity visit to a local children's home — donating essential supplies and spending quality time with the children.\n\n🏠 Essential supplies donated\n💞 Joyful moments shared — smiles, laughter & play\n🌍 A community built on care, not just profit\n\n*Working together. Growing together. Giving back to society.*\n\n✨ Join us: https://www.rxdt.site/#/register?invite=RXN2ZO\n💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'img-platform-overview',
      name: 'RXDT Exchange — Full Platform Overview Poster',
      category: 'General Marketing',
      path: 'assets/images/rxdt_platform_overview.svg',
      caption: `🚀 *RXDT EXCHANGE — NEXT-GEN INTELLIGENT TRADING PLATFORM* 🚀\n\n📅 Launched: July 30, 2026\n💰 Min. Deposit: 100 USDT  ·  Min. Withdrawal: 30 USDT\n📈 Daily Returns: 2.7%–3.0%  ·  3 AI Orders/Day\n\n🌟 7 Income Streams:\n💵 10-Day Salary  |  💸 VIP Promotion Bonus  |  💰 Referral Rewards\n💎 First Deposit Bonus  |  🎁 Community VIP Rewards  |  👥 Team Profit Share  |  📊 Volume Bonus\n\n🌍 Register now: https://www.rxdt.site/#/register?invite=RXN2ZO\n💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'img-global-expansion',
      name: 'RXDT Global Market Development Plan Poster',
      category: 'General Marketing',
      path: 'assets/images/rxdt_global_expansion.svg',
      caption: `🌍 *RXDT GLOBAL MARKET DEVELOPMENT PLAN* 🌍\n\nRXDT is actively expanding across 5 continents:\n✅ Africa  ·  ✅ Europe  ·  ✅ Asia  ·  ✅ America  ·  ✅ Middle East\n\n⏰ NOW is the Golden Window for early movers.\n🌱 The ecosystem is expanding. The market is not yet saturated.\n📊 The earlier you act, the greater your long-term advantage.\n\n🚀 Grow with RXDT — develop with the global market.\n👉 Register: https://www.rxdt.site/#/register?invite=RXN2ZO\n💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'img-antiscam-warning',
      name: '⚠️ Anti-Scam Security Warning Banner',
      category: 'Security',
      path: 'assets/images/rxdt_anti_scam_warning.png',
      caption: `⚠️ *OFFICIAL SECURITY NOTICE — RXDT EXCHANGE* ⚠️\n\n🚨 BEWARE OF SCAMMERS impersonating Prof. Arthur Vance on social media!\n\n✅ Prof. Vance ONLY communicates through the official platform:\n👉 https://www.rxdt.site (Live Chat inside the app)\n\n🚫 Do NOT respond to anyone claiming to be him on WhatsApp, Telegram DMs, Facebook, or Instagram.\n\n📢 Share this to protect your community.\n🌐 rxdt.site | 💬 CEO Telegram (announcements only): @RXDT888`
    }
  ];


  const VIP_TIER_DATA = [
    { level: 1, name: 'VIP 1 Junior Trader', members: 5, salary: '$30', salaryTotal: '$90/mo', bonus: '$100', icon: '🥉' },
    { level: 2, name: 'VIP 2 Senior Trader', members: 15, salary: '$70', salaryTotal: '$210/mo', bonus: '$250', icon: '🥈' },
    { level: 3, name: 'VIP 3 Master Trader', members: 30, salary: '$150', salaryTotal: '$450/mo', bonus: '$500', icon: '🥇' },
    { level: 4, name: 'VIP 4 Elite Strategist', members: 60, salary: '$300', salaryTotal: '$900/mo', bonus: '$1,000', icon: '💎' },
    { level: 5, name: 'VIP 5 Regional Director', members: 120, salary: '$600', salaryTotal: '$1,800/mo', bonus: '$2,200', icon: '👑' },
    { level: 6, name: 'VIP 6 Managing Director', members: 250, salary: '$1,200', salaryTotal: '$3,600/mo', bonus: '$4,500', icon: '🌟' },
    { level: 7, name: 'VIP 7 Global Ambassador', members: 500, salary: '$1,800', salaryTotal: '$5,400/mo', bonus: '$6,500', icon: '🚀' },
    { level: 8, name: 'VIP 8 Executive Partner', members: 1000, salary: '$2,400', salaryTotal: '$7,200/mo', bonus: '$8,500', icon: '🔥' },
    { level: 9, name: 'VIP 9 Chairman Club', members: 2000, salary: '$3,000', salaryTotal: '$9,000/mo', bonus: '$11,000', icon: '🏆' }
  ];

  window.renderMarketingHubTab = function () {
    const container = document.getElementById('admin-marketing-container');
    if (!container) return;

    // ── Always use DEFAULT items as base + merge any user-added custom items on top ──
    // This ensures newly added default messages/images always appear without clearing cache.
    const customMessages = JSON.parse(localStorage.getItem('rxdt_admin_messages') || '[]')
      .filter(m => m.isCustom);
    const messages = [...DEFAULT_MARKETING_MESSAGES, ...customMessages];

    const customImages = JSON.parse(localStorage.getItem('rxdt_admin_images') || '[]')
      .filter(i => i.isCustom);
    const images = [...DEFAULT_BRAND_IMAGES, ...customImages];

    container.innerHTML = `
      <div style="background:linear-gradient(135deg, #0f172a, #1e1b4b);border:1px solid #00f2fe;border-radius:16px;padding:20px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="margin:0;font-size:20px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;">
              📢 Marketing, Brand Assets & VIP Celebration Hub
            </h2>
            <div style="font-size:13px;color:var(--text-sub);margin-top:4px;">
              Centralized library for copy-paste marketing messages, VIP achievement cards, and official brand assets for WhatsApp, Telegram & Facebook.
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-outline" onclick="openAddMessageModal()" style="font-size:12px;padding:8px 14px;border-color:#00f2fe;color:#00f2fe;">➕ Add New Message</button>
            <button class="btn-outline" onclick="openAddImageModal()" style="font-size:12px;padding:8px 14px;border-color:#f59e0b;color:#f59e0b;">📤 Upload Brand Asset</button>
          </div>
        </div>
      </div>

      <!-- Sub Navigation Buttons -->
      <div style="display:flex;gap:10px;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;flex-wrap:wrap;">
        <button class="btn-outline active-subtab" id="subtab-btn-messages" onclick="switchMarketingSubTab('messages')" style="font-size:13px;padding:8px 16px;background:rgba(0,242,254,0.15);border-color:#00f2fe;color:#00f2fe;">📋 Copy-Paste Messages</button>
        <button class="btn-outline" id="subtab-btn-vip" onclick="switchMarketingSubTab('vip')" style="font-size:13px;padding:8px 16px;border-color:rgba(255,255,255,0.2);color:var(--text-sub);">🏆 VIP Congratulation Cards (VIP 1–9)</button>
        <button class="btn-outline" id="subtab-btn-images" onclick="switchMarketingSubTab('images')" style="font-size:13px;padding:8px 16px;border-color:rgba(255,255,255,0.2);color:var(--text-sub);">🖼️ Brand & Image Library</button>
      </div>

      <!-- SUB-SECTION 1: Copy-Paste Messages -->
      <div id="mkt-subtab-messages">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;">
          ${messages.map(msg => `
            <div style="background:#090d16;border:1px solid rgba(0,242,254,0.2);border-radius:14px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <strong style="color:#00f2fe;font-size:14px;">${msg.title}</strong>
                  <span style="font-size:10px;padding:2px 8px;border-radius:12px;background:rgba(0,242,254,0.15);color:#00f2fe;font-weight:700;">${msg.platform}</span>
                </div>
                <textarea readonly style="width:100%;height:140px;background:rgba(0,0,0,0.4);color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;font-size:12px;font-family:monospace;resize:none;margin-bottom:12px;line-height:1.4;">${msg.text}</textarea>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <button class="btn-dark" style="flex:1;font-size:12px;padding:8px 0;background:#00f2fe;color:#000;font-weight:700;" onclick="copyToClipboard(\`${msg.text.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`, '${msg.title.replace(/'/g, "\\'")}')">📋 Copy Message</button>
                ${msg.isCustom ? `<button class="btn-outline" style="font-size:11px;padding:6px 10px;border-color:#ff4d4d;color:#ff4d4d;" onclick="deleteCustomMessage('${msg.id}')">🗑️</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- SUB-SECTION 2: VIP Congratulation Cards (VIP 1 - VIP 9) -->
      <div id="mkt-subtab-vip" style="display:none;">
        <div style="margin-bottom:16px;background:rgba(245,158,11,0.1);border:1px solid #f59e0b;padding:12px 16px;border-radius:12px;font-size:13px;color:#fcd34d;">
          💡 <strong>VIP Celebration Cards & Announcement Templates:</strong> Generate official congratulation posts for WhatsApp & Telegram groups when users unlock VIP ranks!
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:16px;">
          ${VIP_TIER_DATA.map(vip => {
      const groupMsg = `🎉 *CONGRATULATIONS TO OUR NEW VIP TRADER!* 🎉\n\n👏 Huge congratulations to user **[Username / Phone]** for reaching **${vip.name}** on RXDT Exchange!\n\n${vip.icon} **VIP Level:** ${vip.name}\n💰 **10-Day Salary:** ${vip.salary} (Paid 3rd, 13th & 23rd)\n💵 **Monthly Income:** ${vip.salaryTotal}\n🎁 **Promotion Bonus:** ${vip.bonus} USDT\n\n🚀 Keep climbing the ranks on RXDT! Join live signals today at 5pm, 6pm & 7pm EAT!\n💬 CEO Telegram: @RXDT888`;
      return `
            <div style="background:#090d16;border:1px solid #f59e0b;border-radius:14px;padding:16px;text-align:center;position:relative;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
              <div style="font-size:36px;margin-bottom:6px;">${vip.icon}</div>
              <div style="font-size:16px;font-weight:800;color:#f59e0b;margin-bottom:4px;">${vip.name}</div>
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:10px;">Requirement: <strong>${vip.members} Active Team Members</strong></div>
              
              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:10px;margin-bottom:12px;font-size:12px;text-align:left;">
                <div style="color:#fff;margin-bottom:2px;">💵 <strong>10-Day Salary:</strong> <span style="color:#10b981;font-weight:700;">${vip.salary}</span> (${vip.salaryTotal})</div>
                <div style="color:#fff;">🎁 <strong>Promotion Bonus:</strong> <span style="color:#00f2fe;font-weight:700;">${vip.bonus} USDT</span></div>
              </div>

              <div style="display:flex;gap:8px;">
                <button class="btn-outline" style="flex:1;font-size:11px;padding:7px 0;border-color:#f59e0b;color:#f59e0b;" onclick="copyToClipboard(\`${groupMsg.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`, '${vip.name} Group Post')">📋 Copy Group Post</button>
                <button class="btn-dark" style="flex:1;font-size:11px;padding:7px 0;background:#f59e0b;color:#000;font-weight:700;" onclick="downloadVipCardBadge(${vip.level})">📥 Download Badge</button>
              </div>
            </div>
            `;
    }).join('')}
        </div>
      </div>

      <!-- SUB-SECTION 3: Brand & Image Library -->
      <div id="mkt-subtab-images" style="display:none;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;">
          ${images.map(img => {
      const captionText = img.caption || `🚀 *${img.name}*\n\nOfficial RXDT Exchange AI Quantitative Trading Asset.\n👉 Join live signal copy trading on RXDT Exchange!\n💬 Telegram: @RXDT888`;
      return `
            <div style="background:#090d16;border:1px solid rgba(0,242,254,0.25);border-radius:14px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(0,242,254,0.15);color:#00f2fe;font-weight:700;">${img.category}</span>
                </div>
                <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px;">${img.name}</div>
                <div style="background:rgba(0,0,0,0.4);border-radius:10px;padding:8px;margin-bottom:10px;min-height:140px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.05);">
                  <img src="${img.path}" alt="${img.name}" style="max-width:100%;max-height:130px;object-fit:contain;border-radius:6px;" />
                </div>
                <div style="margin-bottom:10px;">
                  <label style="font-size:11px;color:var(--text-sub);display:block;margin-bottom:4px;">📱 Social Media Post Caption (WhatsApp/Telegram)</label>
                  <textarea readonly style="width:100%;height:85px;background:rgba(0,0,0,0.3);color:#cbd5e1;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 8px;font-size:11px;font-family:monospace;resize:none;line-height:1.35;">${captionText}</textarea>
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn-dark" style="flex:1;font-size:11px;padding:7px 0;background:#00f2fe;color:#000;font-weight:700;" onclick="copyToClipboard(\`${captionText.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`, '${img.name.replace(/'/g, "\\'")} Post Text')">📋 Copy Post Text</button>
                <a href="${img.path}" download="${img.name.replace(/[^a-zA-Z0-9]/g, '_')}.png" class="btn-outline" style="flex:1;font-size:11px;padding:7px 0;border-color:#00f2fe;color:#00f2fe;text-align:center;display:block;">📥 Download Image</a>
                ${img.isCustom ? `<button class="btn-outline" style="font-size:11px;padding:7px 8px;border-color:#ff4d4d;color:#ff4d4d;" onclick="deleteCustomImage('${img.id}')">🗑️</button>` : ''}
              </div>
            </div>
            `;
    }).join('')}
        </div>
      </div>


      <!-- Add Message Modal -->
      <div class="modal-overlay" id="add-message-modal" style="display:none;z-index:9999;">
        <div class="modal-content" style="max-width:500px;background:#090d16;border:1px solid #00f2fe;border-radius:16px;padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <strong style="color:#00f2fe;font-size:16px;">➕ Add Custom Copy-Paste Message</strong>
            <button class="btn-outline" style="padding:2px 8px;" onclick="closeAddMessageModal()">✕</button>
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:12px;color:var(--text-sub);display:block;margin-bottom:4px;">Message Title</label>
            <input type="text" id="new-msg-title" class="form-control" placeholder="e.g. Special Weekend Promo Pitch" style="width:100%;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:12px;color:var(--text-sub);display:block;margin-bottom:4px;">Platform Target</label>
            <select id="new-msg-platform" class="form-control" style="width:100%;">
              <option value="WhatsApp">WhatsApp</option>
              <option value="Telegram">Telegram</option>
              <option value="Facebook">Facebook</option>
              <option value="Support">Support Reply</option>
              <option value="General">General Marketing</option>
            </select>
          </div>
          <div style="margin-bottom:14px;">
            <label style="font-size:12px;color:var(--text-sub);display:block;margin-bottom:4px;">Message Text</label>
            <textarea id="new-msg-text" class="form-control" style="width:100%;height:120px;font-family:monospace;font-size:12px;" placeholder="Write your marketing or copy-paste text here..."></textarea>
          </div>
          <button class="btn-dark" style="width:100%;background:#00f2fe;color:#000;font-weight:700;padding:10px 0;" onclick="saveCustomMessage()">Save Message Template</button>
        </div>
      </div>

      <!-- Add Image Modal -->
      <div class="modal-overlay" id="add-image-modal" style="display:none;z-index:9999;">
        <div class="modal-content" style="max-width:500px;background:#090d16;border:1px solid #f59e0b;border-radius:16px;padding:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <strong style="color:#f59e0b;font-size:16px;">📤 Upload Brand Asset / Image</strong>
            <button class="btn-outline" style="padding:2px 8px;" onclick="closeAddImageModal()">✕</button>
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:12px;color:var(--text-sub);display:block;margin-bottom:4px;">Asset Name / Description</label>
            <input type="text" id="new-img-name" class="form-control" placeholder="e.g. CEO Anniversary Banner" style="width:100%;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:12px;color:var(--text-sub);display:block;margin-bottom:4px;">Category</label>
            <input type="text" id="new-img-category" class="form-control" placeholder="e.g. Promo Banners" style="width:100%;" />
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:12px;color:var(--text-sub);display:block;margin-bottom:4px;">Upload File OR Enter Image URL</label>
            <input type="file" id="new-img-file" accept="image/*" class="form-control" style="width:100%;margin-bottom:6px;" />
            <input type="text" id="new-img-url" class="form-control" placeholder="OR paste image URL here (https://...)" style="width:100%;" />
          </div>
          <button class="btn-dark" style="width:100%;background:#f59e0b;color:#000;font-weight:700;padding:10px 0;" onclick="saveCustomImage()">Upload Asset to Storage</button>
        </div>
      </div>
    `;
  };

  window.switchMarketingSubTab = function (tab) {
    const tabs = ['messages', 'vip', 'images'];
    tabs.forEach(t => {
      const btn = document.getElementById(`subtab-btn-${t}`);
      const sec = document.getElementById(`mkt-subtab-${t}`);
      if (sec) sec.style.display = t === tab ? '' : 'none';
      if (btn) {
        if (t === tab) {
          btn.style.background = t === 'vip' ? 'rgba(245,158,11,0.15)' : 'rgba(0,242,254,0.15)';
          btn.style.borderColor = t === 'vip' ? '#f59e0b' : '#00f2fe';
          btn.style.color = t === 'vip' ? '#f59e0b' : '#00f2fe';
        } else {
          btn.style.background = 'transparent';
          btn.style.borderColor = 'rgba(255,255,255,0.2)';
          btn.style.color = 'var(--text-sub)';
        }
      }
    });
  };

  window.openAddMessageModal = function () {
    const m = document.getElementById('add-message-modal');
    if (m) m.style.display = 'flex';
  };

  window.closeAddMessageModal = function () {
    const m = document.getElementById('add-message-modal');
    if (m) m.style.display = 'none';
  };

  window.saveCustomMessage = function () {
    const title = document.getElementById('new-msg-title')?.value.trim();
    const platform = document.getElementById('new-msg-platform')?.value;
    const text = document.getElementById('new-msg-text')?.value.trim();

    if (!title || !text) {
      if (window.toast) window.toast('Please enter both title and message text', 'error');
      return;
    }

    // Only custom items are persisted in localStorage
    let customMessages = JSON.parse(localStorage.getItem('rxdt_admin_messages') || '[]')
      .filter(m => m.isCustom);
    customMessages.push({
      id: 'custom-msg-' + Date.now(),
      title,
      platform,
      category: 'Custom',
      text,
      isCustom: true
    });

    localStorage.setItem('rxdt_admin_messages', JSON.stringify(customMessages));
    closeAddMessageModal();
    renderMarketingHubTab();
    if (window.toast) window.toast('✅ Custom message template saved!', 'success');
  };

  window.deleteCustomMessage = function (id) {
    // Only custom items live in localStorage; filter by id
    let customMessages = JSON.parse(localStorage.getItem('rxdt_admin_messages') || '[]')
      .filter(m => m.isCustom && m.id !== id);
    localStorage.setItem('rxdt_admin_messages', JSON.stringify(customMessages));
    renderMarketingHubTab();
    if (window.toast) window.toast('Custom message deleted', 'info');
  };

  window.openAddImageModal = function () {
    const m = document.getElementById('add-image-modal');
    if (m) m.style.display = 'flex';
  };

  window.closeAddImageModal = function () {
    const m = document.getElementById('add-image-modal');
    if (m) m.style.display = 'none';
  };

  window.saveCustomImage = function () {
    const name = document.getElementById('new-img-name')?.value.trim();
    const category = document.getElementById('new-img-category')?.value.trim() || 'Custom';
    const fileInput = document.getElementById('new-img-file');
    const urlInput = document.getElementById('new-img-url')?.value.trim();

    if (!name) {
      if (window.toast) window.toast('Please enter asset name', 'error');
      return;
    }

    const processSave = (path) => {
      let images = JSON.parse(localStorage.getItem('rxdt_admin_images') || '[]');
      images.push({
        id: 'custom-img-' + Date.now(),
        name,
        category,
        path,
        isCustom: true
      });
      localStorage.setItem('rxdt_admin_images', JSON.stringify(images));
      closeAddImageModal();
      renderMarketingHubTab();
      if (window.toast) window.toast('✅ Brand asset uploaded and saved!', 'success');
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        processSave(e.target.result);
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else if (urlInput) {
      processSave(urlInput);
    } else {
      if (window.toast) window.toast('Please upload an image file or enter a valid URL', 'error');
    }
  };

  window.deleteCustomImage = function (id) {
    // Only custom items live in localStorage; filter by id
    let customImages = JSON.parse(localStorage.getItem('rxdt_admin_images') || '[]')
      .filter(i => i.isCustom && i.id !== id);
    localStorage.setItem('rxdt_admin_images', JSON.stringify(customImages));
    renderMarketingHubTab();
    if (window.toast) window.toast('Brand asset deleted', 'info');
  };

  window.downloadVipCardBadge = function (level) {
    const vip = VIP_TIER_DATA.find(v => v.level === level);
    if (!vip) return;

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 600, 360);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 360);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 580, 340);

    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RXDT EXCHANGE OFFICIAL VIP ACHIEVEMENT', 300, 45);

    ctx.font = '54px sans-serif';
    ctx.fillText(vip.icon, 300, 115);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(vip.name.toUpperCase(), 300, 160);

    ctx.strokeStyle = 'rgba(245,158,11,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 180);
    ctx.lineTo(500, 180);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`10-Day Recurring Salary: ${vip.salary} (${vip.salaryTotal})`, 300, 225);
    ctx.fillText(`Promotion Reward: ${vip.bonus} USDT`, 300, 255);
    ctx.fillText(`Active Direct Members: ${vip.members}+`, 300, 285);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('Verify & Join: https://rxdt.site | Telegram CEO: @RXDT888', 300, 325);

    const link = document.createElement('a');
    link.download = `RXDT_${vip.name.replace(/\s+/g, '_')}_Badge.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    if (window.toast) window.toast(`📥 Downloading ${vip.name} Badge PNG...`, 'success');
  };

  // ── ADMIN SOCIAL GROUP NOTIFICATIONS (Auto-Generated Updates) ──────────────
  const DEFAULT_NOTIFICATION_LOGS = [
    {
      id: 'notif-demo-1',
      event_type: 'user_registered',
      category: 'New User',
      title: '🎉 New Trader Joined (User #89421)',
      created_at: new Date().toISOString(),
      message_text: `🎉 *NEW TRADER JOINED RXDT EXCHANGE!* 🎉

👏 Warm welcome to user **Trader_8942** to the RXDT trading community!

👤 *User ID:* USR-89421
👥 *Referred By:* User RXN2ZO (John D.)
💰 *Deposit Status:* ⌛ Deposit Pending (Unlocks signals & copy-trading once deposit is completed)

🚀 Start your AI Quantitative Copy-Trading journey on RXDT Exchange today!
🌍 Registration: https://www.rxdt.site/#/register?invite=RXN2ZO
💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'notif-demo-2',
      event_type: 'deposit_approved',
      category: 'Deposit',
      title: '💰 Deposit Approved ($500.00 USDT — Trader_4412)',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      message_text: `💰 *NEW DEPOSIT CONFIRMED & REFERRAL COMMISSION PAID!* 💰

👏 Congratulations to **Trader_4412** for completing a deposit of **$500.00 USDT**!

🎁 *Referrer Bonus Earned:* $37.50 USDT (7.5% Commission paid to User RXN2ZO)
📈 *Unlocked Strategy:* Tier 2 ($300+)
📡 *Daily AI Signal Schedule:* 6:00 PM EAT (2.4% Yield)
📊 *Daily Return:* 1.8% – 2.8% Automated AI Execution

🚀 Maximize your passive earnings on RXDT Exchange!
🌍 Registration: https://www.rxdt.site/#/register?invite=RXN2ZO
💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'notif-demo-3',
      event_type: 'vip_unlocked',
      category: 'VIP Rank',
      title: '🏆 VIP 3 Master Trader Unlocked (Trader_7701)',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      message_text: `🏆 *CONGRATULATIONS TO OUR NEW VIP TRADER!* 🏆

👏 Huge congratulations to **Trader_7701** for reaching **VIP 3 Master Trader** on RXDT Exchange!

🏅 *VIP Level:* VIP 3 Master Trader
💵 *10-Day Salary:* $150 (Paid 3rd, 13th & 23rd of every month)
💰 *Monthly Income:* $450/mo Total Salary
🎁 *Promotion Bonus:* $500 USDT

🚀 Build your team and climb the leadership ranks on RXDT!
🌍 Registration: https://www.rxdt.site/#/register?invite=RXN2ZO
💬 CEO Telegram: @RXDT888`
    },
    {
      id: 'notif-demo-4',
      event_type: 'withdrawal_completed',
      category: 'Withdrawal',
      title: '📤 Withdrawal Approved ($250.00 USDT — Tra***12)',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      message_text: `📤 *WITHDRAWAL PROOF & SUCCESSFUL DISTRIBUTION!* 📤

✅ Withdrawal request of **$250.00 USDT** for user **Tra***12** has been verified and processed!

💵 *Amount Received:* $232.50 USDT (Fee: $17.50 USDT)
🌐 *Network:* USDT (TRC-20)
⚡ *Status:* Fully Distributed & Verified

🛡️ Trade with confidence on USA Colorado State Compliant RXDT Exchange!
🌍 Registration: https://www.rxdt.site/#/register?invite=RXN2ZO
💬 CEO Telegram: @RXDT888`
    }
  ];

  window.renderAdminNotificationsTab = async function (filterCategory = 'ALL') {
    const container = document.getElementById('admin-notifications-container');
    if (!container) return;

    container.innerHTML = `<div class="admin-loading">Loading social group updates...</div>`;

    let serverNotifs = [];
    try {
      const data = await adminFetch('/notifications');
      if (data && data.notifications) serverNotifs = data.notifications;
    } catch (e) { }

    const combinedNotifs = [...serverNotifs, ...DEFAULT_NOTIFICATION_LOGS];

    const filteredNotifs = filterCategory === 'ALL'
      ? combinedNotifs
      : combinedNotifs.filter(n => (n.category || '').toLowerCase() === filterCategory.toLowerCase() || (n.event_type || '').toLowerCase() === filterCategory.toLowerCase());

    const getBadgeStyle = (cat) => {
      const c = (cat || '').toLowerCase();
      if (c.includes('user') || c.includes('registered')) return 'background:rgba(0,242,254,0.15);color:#00f2fe;border:1px solid #00f2fe;';
      if (c.includes('deposit')) return 'background:rgba(255,226,89,0.15);color:#ffe259;border:1px solid #ffe259;';
      if (c.includes('vip') || c.includes('rank')) return 'background:rgba(168,85,247,0.15);color:#c084fc;border:1px solid #a855f7;';
      if (c.includes('withdrawal')) return 'background:rgba(56,239,125,0.15);color:#38ef7d;border:1px solid #38ef7d;';
      return 'background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);';
    };

    container.innerHTML = `
      <div style="background:linear-gradient(135deg, #090d16, #161b26);border:1px solid #00f2fe;border-radius:16px;padding:20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="margin:0;font-size:20px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;">
              🔔 Social Group Notifications & Auto-Generated Updates
            </h2>
            <div style="font-size:13px;color:var(--text-sub);margin-top:4px;">
              Real-time branded posts generated automatically when users register, deposit, upgrade VIP ranks, or withdraw funds.
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:12px;color:#00f2fe;font-weight:700;background:rgba(0,242,254,0.1);padding:6px 12px;border-radius:20px;border:1px solid rgba(0,242,254,0.3);">
              📊 Total Logs: ${combinedNotifs.length}
            </span>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;align-items:center;">
        <button class="btn-outline" style="font-size:13px;padding:6px 14px;${filterCategory === 'ALL' ? 'background:rgba(0,242,254,0.15);border-color:#00f2fe;color:#00f2fe;' : ''}" onclick="renderAdminNotificationsTab('ALL')">🌐 All Activity (${combinedNotifs.length})</button>
        <button class="btn-outline" style="font-size:13px;padding:6px 14px;${filterCategory === 'New User' ? 'background:rgba(0,242,254,0.15);border-color:#00f2fe;color:#00f2fe;' : ''}" onclick="renderAdminNotificationsTab('New User')">🎉 New Users</button>
        <button class="btn-outline" style="font-size:13px;padding:6px 14px;${filterCategory === 'Deposit' ? 'background:rgba(255,226,89,0.15);border-color:#ffe259;color:#ffe259;' : ''}" onclick="renderAdminNotificationsTab('Deposit')">💰 Deposits</button>
        <button class="btn-outline" style="font-size:13px;padding:6px 14px;${filterCategory === 'VIP Rank' ? 'background:rgba(168,85,247,0.15);border-color:#a855f7;color:#c084fc;' : ''}" onclick="renderAdminNotificationsTab('VIP Rank')">🏆 VIP Ranks</button>
        <button class="btn-outline" style="font-size:13px;padding:6px 14px;${filterCategory === 'Withdrawal' ? 'background:rgba(56,239,125,0.15);border-color:#38ef7d;color:#38ef7d;' : ''}" onclick="renderAdminNotificationsTab('Withdrawal')">📤 Withdrawals</button>
      </div>

      <!-- Cards Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:16px;">
        ${filteredNotifs.map(n => `
          <div style="background:#090d16;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-size:11px;padding:3px 10px;border-radius:12px;font-weight:700;${getBadgeStyle(n.category || n.event_type)}">
                  ${n.category || n.event_type}
                </span>
                <span style="font-size:11px;color:var(--text-sub);">${new Date(n.created_at).toLocaleString()}</span>
              </div>
              <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:10px;">${n.title}</div>
              <textarea readonly style="width:100%;height:150px;background:rgba(0,0,0,0.5);color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;font-size:12px;font-family:monospace;resize:none;margin-bottom:12px;line-height:1.4;">${n.message_text}</textarea>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="btn-dark" style="flex:1;font-size:12px;padding:10px 0;background:#00f2fe;color:#000;font-weight:800;border-radius:8px;" onclick="copyToClipboard(\`${n.message_text.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`, '${n.title.replace(/'/g, "\\'")}')">
                📋 Copy Group Post
              </button>
              ${n.id && !n.id.startsWith('notif-demo-') ? `
                <button class="btn-outline" style="font-size:12px;padding:8px 12px;border-color:#ff4d4d;color:#ff4d4d;border-radius:8px;" onclick="deleteAdminNotificationLog('${n.id}')">🗑️</button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  window.deleteAdminNotificationLog = async function (id) {
    if (!confirm('Are you sure you want to delete this notification log?')) return;
    try {
      const res = await adminFetch(`/notifications/${id}`, { method: 'DELETE' });
      if (res && res.error) throw new Error(res.error);
      if (window.toast) window.toast('Notification deleted', 'info');
      renderAdminNotificationsTab();
    } catch (err) {
      if (window.toast) window.toast('Delete error: ' + err.message, 'error');
    }
  };

  window.sendSignalReminderEmailsBroadcast = async function () {
    if (!confirm('Send Daily Signal Reminder emails to all registered users with bound email addresses?')) return;
    try {
      if (window.toast) window.toast('Sending signal reminder emails to all users...', 'info');
      const res = await adminFetch('/send-signal-reminders', 'POST');
      if (window.toast) {
        window.toast(res.message || `Sent ${res.sentCount || 0} signal reminder emails!`, 'info');
      }
      alert(`✅ ${res.message || 'Signal reminder emails sent!'}\nTotal Sent: ${res.sentCount || 0}`);
    } catch (err) {
      if (window.toast) window.toast('Email broadcast error: ' + err.message, 'error');
      alert('❌ Failed to send emails: ' + err.message);
    }
  };

  window.settleStuckTrades = async function () {
    if (!confirm('Force-settle all past-due signal trades right now?')) return;
    try {
      if (window.toast) window.toast('Settling stuck trades...', 'info');
      const res = await adminFetch('/settle-stuck-trades', 'POST');
      if (window.toast) {
        window.toast(res.message || `Settled ${res.settled || 0} trades!`, 'info');
      }
      alert(`✅ ${res.message || 'Stuck trades settled!'}\nSettled: ${res.settled || 0}\nErrors: ${res.errors || 0}`);
      if (window.loadAdminStats) window.loadAdminStats();
    } catch (err) {
      if (window.toast) window.toast('Settle error: ' + err.message, 'error');
      alert('❌ Failed to settle trades: ' + err.message);
    }
  };

  window.runMasterSystemRepairAdmin = async function () {
    if (!confirm('Run Master System Balance & Transaction Repair across ALL users?\n\nThis will:\n1. Force-settle all open signal trades with full profit & history logs.\n2. Reconcile total_deposits from approved deposits.\n3. Release any orphan frozen funds back to available balance.\n4. Align total_assets across all user accounts.')) return;
    try {
      if (window.toast) window.toast('Running Master System Repair across all users...', 'info');
      const res = await adminFetch('/master-repair', 'POST');
      if (window.toast) {
        window.toast(res.message || 'Master Repair Completed!', 'success');
      }
      alert(`✅ MASTER REPAIR COMPLETED SUCCESSFULLY!\n\n` +
        `• Signal Trades Settled: ${res.tradesSettled || 0}\n` +
        `• Total Profit Paid Out: $${res.totalProfitCredited?.toFixed(2) || '0.00'}\n` +
        `• Accounts Repaired: ${res.accountsRepaired || 0}\n` +
        `• Stuck Frozen Funds Recovered: $${res.totalFrozenRecovered?.toFixed(2) || '0.00'}\n` +
        `• Total Assets Aligned: ${res.totalAssetsAdjustedUsers || 0} user(s)`);
      if (window.loadAdminStats) window.loadAdminStats();
    } catch (err) {
      if (window.toast) window.toast('Master Repair error: ' + err.message, 'error');
      alert('❌ Master Repair Failed: ' + err.message);
    }
  };

  window.runDatabaseHardResetAdmin = async function () {
    if (!confirm('⚠️ WARNING: ARE YOU SURE YOU WANT TO HARD-RESET ALL USER BALANCES TO $0.00?\n\nThis will:\n• Reset all user balances, deposits, earnings, and free credits to $0.00.\n• Permanently wipe all past transaction, deposit, withdrawal, and trade histories.\n• KEEP all registered user accounts, passwords, emails, phones, and referral links intact so users can still log in.')) return;
    if (!confirm('🚨 FINAL CONFIRMATION: Type OK to proceed with database hard-reset to $0.00 balance.')) return;

    try {
      if (window.toast) window.toast('Executing database hard-reset across all accounts...', 'info');
      const res = await adminFetch('/reset-database', 'POST');
      if (window.toast) {
        window.toast(res.message || 'Database Reset Successful!', 'success');
      }
      alert(`💣 DATABASE HARD-RESET COMPLETED SUCCESSFULLY!\n\n` +
        `• User Accounts Preserved (Login intact): ${res.resetUserCount || 0}\n` +
        `• All Account Balances: Reset to $0.00\n` +
        `• All Transaction Histories: Wiped (0 records)`);
      if (window.loadAdminStats) window.loadAdminStats();
    } catch (err) {
      if (window.toast) window.toast('Database Reset error: ' + err.message, 'error');
      alert('❌ Database Reset Failed: ' + err.message);
    }
  };

  // Auto-load on init
  window.loadAdminStats();
}


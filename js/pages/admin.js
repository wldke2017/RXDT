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
        <button class="btn-outline" onclick="releaseFrozenFunds()" style="padding:8px 16px;font-size:13px;color:#f59e0b;border-color:#f59e0b;">🔓 Release In-Orders Funds</button>
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

    <!-- Tabs -->
    <div class="tabs-header" style="margin-bottom:20px;">
      <button class="tab-btn active" onclick="switchAdminTab('deposits',this)">💰 Deposits</button>
      <button class="tab-btn" onclick="switchAdminTab('withdrawals',this)">📤 Withdrawals</button>
      <button class="tab-btn" onclick="switchAdminTab('kyc',this)">🪪 KYC</button>
      <button class="tab-btn" onclick="switchAdminTab('users',this)">👥 Users</button>
      <button class="tab-btn" onclick="switchAdminTab('signals',this)">📡 Signals</button>
      <button class="tab-btn" onclick="switchAdminTab('earnings',this);loadEarningsView()">📊 Earnings</button>
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

    <!-- Earnings Panel -->
    <div id="admin-tab-earnings" style="display:none;">
      <div id="admin-earnings-list"></div>
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
          <select id="trigger-signal-duration" class="form-control" style="max-width:140px;height:40px;font-size:13px;">
            <option value="15">Active for 15 mins</option>
            <option value="30">Active for 30 mins</option>
            <option value="60">Active for 1 hour</option>
          </select>
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
    ['deposits', 'withdrawals', 'kyc', 'users', 'signals', 'earnings', 'chat'].forEach(t => {
      const el = document.getElementById(`admin-tab-${t}`);
      if (el) el.style.display = t === tab ? '' : 'none';
    });
    if (tab === 'users' && !allUsersCache.length) loadUsers();
    if (tab === 'signals') loadSignalTrades();
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
              <button class="btn-outline" style="padding:4px 10px;font-size:12px;color:#f59e0b;border-color:#f59e0b;margin-left:6px;" onclick="reconcileSignalTrades('${u.id}')">🔧 Reconcile</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

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

  window.triggerTestSignal = async function (action) {
    const signalId = document.getElementById('trigger-signal-id')?.value || '1';
    const duration = document.getElementById('trigger-signal-duration')?.value || '15';
    try {
      const res = await adminFetch('/trigger-signal', 'POST', { action, signalId, duration });
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
          <div style="font-size:12px;color:var(--text-sub);line-height:1.5;">Users can chat with the CEO Arthur Vance on BonChat: Sign up on BonChat, server <strong style="color:#fff;">q7777</strong>, search user <strong style="color:#fff;">vance7777</strong>, and send a friend request.</div>
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

  // Auto-load on init
  window.loadAdminStats();
}

import store from '../store.js';
import { COUNTRY_DIAL_CODES, getDefaultCountryCode } from '../countries.js';

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function render(page) {
  if (page === 'invite-friends') return renderInvite();
  if (page === 'security-settings') return renderSecurity();
  if (page === 'customer-service') return renderCustomerService();
  return renderInvite();
}

// ---- INVITE FRIENDS ----
function renderInvite() {
  const user = store.getUser();
  const domain = (window.location.hostname.includes('rxdt.site') || window.location.hostname === 'localhost') ? window.location.origin : 'https://rxdt.site';
  const inviteLink = `${domain}/#/register?invite=${user?.inviteCode || 'RXDT'}`;

  return `
  <div>
    <h1 class="page-title">Invite Friends & Earn</h1>

      <div class="invite-hero-card">
        <div class="invite-hero-text">
          <h2>Earn Up to <span class="highlight">7.5%</span> Commission</h2>
          <p>Invite friends to join RXDT. Earn commission on every order they place. Level 1: 7.5% · Level 2: 3.75%</p>
        </div>
        <div class="invite-icon-large">👥</div>
      </div>

    <div class="card">
      <div class="card-title">Your Referral Info</div>
      <div class="invite-code-block">
        <div class="invite-code-label">Your Unique Invite Code</div>
        <div class="invite-code-val" id="ref-invite-code">${user?.inviteCode || 'Loading...'}</div>
        <button class="btn-outline" onclick="copyText(document.getElementById('ref-invite-code').textContent,'Invite code copied!')">Copy Code</button>
      </div>
      <div class="invite-link-block">
        <div class="invite-code-label">Your Unique Invite Link</div>
        <div class="invite-link-val" id="ref-invite-link">${inviteLink}</div>
        <button class="btn-outline" onclick="copyText(document.getElementById('ref-invite-link').textContent,'Invite link copied!')">Copy Link</button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:20px;">
      <div class="card" style="text-align:center;margin-bottom:0;">
        <div style="font-size:28px;font-weight:700;color:var(--el-color-primary);" id="stat-total-members">0</div>
        <div style="font-size:13px;color:var(--text-sub);">Total Team Members</div>
      </div>
      <div class="card" style="text-align:center;margin-bottom:0;">
        <div style="font-size:28px;font-weight:700;color:var(--el-color-primary);" id="stat-direct-members">0</div>
        <div style="font-size:13px;color:var(--text-sub);">Direct Referrals (Level 1)</div>
      </div>
      <div class="card" style="text-align:center;margin-bottom:0;">
        <div style="font-size:28px;font-weight:700;color:var(--color-up);" id="stat-total-comm">$0.00</div>
        <div style="font-size:13px;color:var(--text-sub);">Total Commission Earned</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">👥 Referred Members List</div>
      <div id="referred-members-list">
        <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Loading referred members...</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">How It Works</div>
      <div class="how-steps">
        <div class="how-step">
          <div class="how-step-num">1</div>
          <div class="how-step-text"><strong>Share your link</strong><br/>Send your invite link or code to friends</div>
        </div>
        <div class="how-step">
          <div class="how-step-num">2</div>
          <div class="how-step-text"><strong>Friend registers</strong><br/>They sign up using your invite link</div>
        </div>
        <div class="how-step">
          <div class="how-step-num">3</div>
          <div class="how-step-text"><strong>Earn commissions</strong><br/>Get 7.5% of their copy trading profits automatically</div>
        </div>
      </div>
    </div>
  </div>`;
}

// ---- SECURITY SETTINGS ----
function renderSecurity() {
  return `
  <div>
    <h1 class="page-title">Security Settings</h1>

    <div class="card">
      <div class="security-item">
        <div class="security-item-info">
          <div class="si-title">🔒 Login Password</div>
          <div class="si-sub">Used to log in to your account</div>
        </div>
        <button class="btn-outline" style="padding:7px 16px;font-size:13px;" onclick="openChangePwd('login')">Modify</button>
      </div>

      <div class="security-divider"></div>

      <div class="security-item">
        <div class="security-item-info">
          <div class="si-title">🛡️ Transaction Password</div>
          <div class="si-sub">Used to authorize withdrawals and transactions</div>
        </div>
        <button class="btn-outline" style="padding:7px 16px;font-size:13px;" onclick="openChangePwd('transaction')">Set</button>
      </div>

      <div class="security-divider"></div>

      <div class="security-item">
        <div class="security-item-info">
          <div class="si-title">📱 Phone Verification</div>
          <div class="si-sub" id="phone-bind-status-sub">Bind a phone number for account security</div>
        </div>
        <div id="phone-bind-btn-container">
          <button class="btn-outline" style="padding:7px 16px;font-size:13px;" onclick="openBindPhoneModal()">Bind Phone</button>
        </div>
      </div>

      <div class="security-divider"></div>

      <div class="security-item">
        <div class="security-item-info">
          <div class="si-title">✉️ Email Verification</div>
          <div class="si-sub" id="email-bind-status-sub">Bind an email for security & password changes</div>
        </div>
        <div id="email-bind-btn-container">
          <button class="btn-outline" style="padding:7px 16px;font-size:13px;" onclick="openBindEmailModal()">Bind Email</button>
        </div>
      </div>

      <div class="security-divider"></div>

      <div class="security-item">
        <div class="security-item-info">
          <div class="si-title">🆔 KYC Verification</div>
          <div class="si-sub" id="kyc-status-sub">Identity verification status</div>
        </div>
        <div id="kyc-status-btn-container">
          <span class="badge" id="kyc-status-badge" style="background:rgba(255,255,255,0.1);color:var(--text-muted);">Loading...</span>
        </div>
      </div>
    </div>

    <!-- Bind Email Modal -->
    <div class="modal-overlay" id="bind-email-modal">
      <div class="modal-content" style="max-width:440px;background:var(--bg-card);border-radius:16px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;font-size:18px;font-weight:700;">✉️ Bind Email Address</h3>
          <button class="btn-outline" style="padding:4px 10px;" onclick="closeBindEmailModal()">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Your Email Address</label>
          <input type="email" id="bind-email-input" class="form-control" placeholder="name@example.com"/>
        </div>
        <div class="form-group">
          <label class="form-label">Verification Code</label>
          <div class="code-input-group" style="display:flex;gap:8px;">
            <input type="text" id="bind-email-code" class="form-control" placeholder="6-digit code"/>
            <button class="btn-primary" id="bind-email-send-btn" style="white-space:nowrap;padding:0 16px;" onclick="sendBindEmailOtp()">Send Code</button>
          </div>
        </div>
        <button class="btn-dark" style="width:100%;height:48px;font-size:16px;margin-top:12px;" onclick="submitBindEmail()">Confirm Email Binding</button>
      </div>
    </div>

    <!-- Bind Phone Modal -->
    <div class="modal-overlay" id="bind-phone-modal">
      <div class="modal-content" style="max-width:440px;background:var(--bg-card);border-radius:16px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;font-size:18px;font-weight:700;">📱 Bind Phone Number</h3>
          <button class="btn-outline" style="padding:4px 10px;" onclick="closeBindPhoneModal()">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Phone Number</label>
          <div style="display:flex;gap:8px;">
            <select id="bind-phone-country-code" class="form-control" style="width:130px;padding:8px;font-size:13px;background:var(--bg-input, #131926);color:var(--text-main,#fff);border:1px solid var(--border-color,rgba(255,255,255,0.15));border-radius:8px;">
              ${COUNTRY_DIAL_CODES.map(c => `<option value="${c.code}" ${c.code === getDefaultCountryCode() ? 'selected' : ''}>${c.flag} ${c.code}</option>`).join('')}
            </select>
            <input type="tel" id="bind-phone-input" class="form-control" placeholder="Phone number (digits only)" maxlength="15" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="flex:1;"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Verification Code</label>
          <div class="code-input-group" style="display:flex;gap:8px;">
            <input type="text" id="bind-phone-code" class="form-control" placeholder="6-digit code"/>
            <button class="btn-primary" id="bind-phone-send-btn" style="white-space:nowrap;padding:0 16px;" onclick="sendBindPhoneOtp()">Send Code</button>
          </div>
        </div>
        <button class="btn-dark" style="width:100%;height:48px;font-size:16px;margin-top:12px;" onclick="submitBindPhone()">Confirm Phone Binding</button>
      </div>
    </div>

    <!-- Change Password Modal -->
    <div class="modal-overlay" id="change-pwd-modal">
      <div class="modal-content" style="max-width:440px;background:var(--bg-card);border-radius:16px;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;font-size:18px;font-weight:700;" id="change-pwd-title">Change Password</h3>
          <button class="btn-outline" style="padding:4px 10px;" onclick="document.getElementById('change-pwd-modal').classList.remove('active')">✕</button>
        </div>
        <input type="hidden" id="sec-pwd-type" value="login"/>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <div class="input-suffix">
            <input type="password" id="sec-new-pwd" class="form-control" placeholder="Enter new password"/>
            <button class="pwd-toggle" onclick="togglePwd('sec-new-pwd')">👁</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <div class="input-suffix">
            <input type="password" id="sec-confirm-pwd" class="form-control" placeholder="Confirm new password"/>
            <button class="pwd-toggle" onclick="togglePwd('sec-confirm-pwd')">👁</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email Verification Code</label>
          <div class="code-input-group" style="display:flex;gap:8px;">
            <input type="text" id="sec-pwd-otp" class="form-control" placeholder="6-digit code"/>
            <button class="btn-primary" id="sec-pwd-send-btn" style="white-space:nowrap;padding:0 16px;" onclick="sendPwdChangeOtp()">Send Code</button>
          </div>
        </div>
        <div class="auth-warning" style="font-size:12px;color:#f59e0b;margin-bottom:12px;">⚠️ Code will be sent to your bound email address.</div>
        <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" onclick="submitChangePwd()">Confirm Change</button>
      </div>
    </div>
  </div>`;
}

// ---- CUSTOMER SERVICE ----
function renderCustomerService() {
  return `
  <div>
    <h1 class="page-title">Customer Service Center</h1>

    <div class="cs-channels">
      <div class="cs-channel-card" onclick="openChat()">
        <div class="csc-icon">💬</div>
        <div class="csc-info">
          <div class="csc-title">Live Chat Support</div>
          <div class="csc-sub">24/7 · Avg response: &lt;2 mins</div>
        </div>
        <span class="badge badge-success">Online</span>
      </div>
      <div class="cs-channel-card">
        <div class="csc-icon">📧</div>
        <div class="csc-info">
          <div class="csc-title">Email Support</div>
          <div class="csc-sub">support@rxdtex.com</div>
        </div>
      </div>
      <div class="cs-channel-card">
        <div class="csc-icon">📱</div>
        <div class="csc-info">
          <div class="csc-title">Telegram Support</div>
          <div class="csc-sub">@RXDT_Official</div>
        </div>
      </div>
      <div class="cs-channel-card" style="border-color:rgba(167,139,250,0.3);">
        <div class="csc-icon" style="background:rgba(121,40,202,0.2);">💬</div>
        <div class="csc-info">
          <div class="csc-title" style="color:#a78bfa;">Talk to the CEO on BonChat</div>
          <div class="csc-sub">Server: <strong>q7777</strong> · Search: <strong>vance7777</strong> · Send friend request</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Frequently Asked Questions</div>
      ${[
      ['How do I deposit funds?', 'Go to Assets → Deposit. Select your preferred cryptocurrency (USDT, BTC, ETH, USDC) and network. Copy the deposit address and send funds from your external wallet.'],
      ['How does copy trading work?', 'Browse our analyst list, select an analyst whose returns match your goals, choose a product, set your investment amount, and confirm. The system automatically mirrors their trades.'],
      ['How long does withdrawal take?', 'Withdrawal requests are processed within 1-24 hours during business hours (9:00-18:00 UTC-4). Crypto withdrawals typically arrive within 30 minutes of processing.'],
      ['What is KYC verification?', 'KYC (Know Your Customer) verifies your identity using a government-issued ID. It is required before making withdrawals and is completed in under 5 minutes.'],
      ['What cryptocurrencies do you support?', 'We support USDT (ERC-20, TRC-20), USDC (ERC-20), BTC, and ETH for deposits and withdrawals.'],
      ['Is there a minimum investment for copy trading?', 'Minimum investments vary by analyst and product, ranging from $100 to $500. Maximum amounts are listed on each product page.']
    ].map(([q, a]) => `
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-question">
            <span>${q}</span>
            <span class="faq-arrow">›</span>
          </div>
          <div class="faq-answer">${a}</div>
        </div>
      `).join('')}
    </div>

    <!-- Chat Drawer -->
    <div class="modal-overlay" id="chat-modal">
      <div class="modal-content" style="max-width:480px;height:80vh;display:flex;flex-direction:column;padding:0;">
        <div style="padding:20px;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
          <div class="modal-title">💬 RXDT Support</div>
          <button class="modal-close" onclick="document.getElementById('chat-modal').classList.remove('active')">✕</button>
        </div>
        <div id="chat-messages" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;">
          <div class="chat-msg support">
            <div class="chat-bubble">👋 Hello! Welcome to RXDT support. How can I help you today?</div>
            <div class="chat-time">Just now</div>
          </div>
        </div>
        <div style="padding:16px;border-top:1px solid var(--border-color);display:flex;gap:8px;">
          <input type="text" id="chat-input" class="form-control" placeholder="Type your message..."
            onkeydown="if(event.key==='Enter')sendChatMsg()"/>
          <button class="btn-primary" onclick="sendChatMsg()">Send</button>
        </div>
      </div>
    </div>
  </div>`;
}

export function init(page) {
  window.toast = toast;

  window.copyText = function (text, msg) {
    navigator.clipboard?.writeText(text).then(() => toast(msg || 'Copied!', 'success'))
      .catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast(msg || 'Copied!', 'success'); });
  };

  // Helper to fetch with bearer token
  const authFetch = async (url, opts = {}) => {
    const token = localStorage.getItem('rxdt_token');
    opts.headers = { ...opts.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch(url, opts);
    return res.json();
  };

  // Check email status on page load
  async function checkEmailStatus() {
    try {
      const data = await authFetch('/api/email/email-status');
      const sub = document.getElementById('email-bind-status-sub');
      const container = document.getElementById('email-bind-btn-container');
      if (data.emailBound) {
        if (sub) sub.textContent = `Bound: ${data.emailBound}`;
        if (container) container.innerHTML = `<span class="badge badge-success">Bound</span>`;
      }
    } catch (e) { }
  }
  // Load real referral stats from server
  async function loadReferralStats() {
    try {
      const data = await authFetch('/api/referrals/stats');
      if (data.success) {
        const totEl = document.getElementById('stat-total-members');
        const dirEl = document.getElementById('stat-direct-members');
        const commEl = document.getElementById('stat-total-comm');
        const codeEl = document.getElementById('ref-invite-code');
        const linkEl = document.getElementById('ref-invite-link');

        if (totEl) totEl.textContent = data.totalMembers || 0;
        if (dirEl) dirEl.textContent = data.directMembers || 0;
        if (commEl) commEl.textContent = `$${(data.totalCommission || 0).toFixed(2)}`;
        if (codeEl && data.inviteCode) codeEl.textContent = data.inviteCode;
        if (linkEl && data.inviteCode) linkEl.textContent = `${window.location.origin}/#/register?invite=${data.inviteCode}`;

        const listEl = document.getElementById('referred-members-list');
        if (listEl) {
          if (!data.members || data.members.length === 0) {
            listEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No referred members yet. Share your invite link to get started!</div>`;
          } else {
            listEl.innerHTML = `
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr><th>User</th><th>Joined Date</th><th>Assets</th><th>Level</th></tr>
                  </thead>
                  <tbody>
                    ${data.members.map(m => `
                      <tr>
                        <td><strong>${m.name}</strong> <span style="font-size:12px;color:var(--text-muted);">${m.phone || m.email}</span></td>
                        <td>${new Date(m.joinedAt).toLocaleDateString()}</td>
                        <td class="price-up">$${m.totalAssets.toFixed(2)}</td>
                        <td><span class="badge badge-info">Level ${m.level}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>`;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load referral stats:', e);
    }
  }

  // Check phone status on page load
  async function checkPhoneStatus() {
    try {
      const data = await authFetch('/api/auth/phone-status');
      const sub = document.getElementById('phone-bind-status-sub');
      const container = document.getElementById('phone-bind-btn-container');
      if (data.phoneBound) {
        if (sub) sub.textContent = `Bound: ${data.phoneBound}`;
        if (container) container.innerHTML = `<span class="badge badge-success">Bound</span>`;
      }
    } catch (e) { }
  }

  // Check KYC status on security settings load
  async function checkKycStatus() {
    try {
      const data = await authFetch('/api/kyc/status');
      const badge = document.getElementById('kyc-status-badge');
      const container = document.getElementById('kyc-status-btn-container');
      const sub = document.getElementById('kyc-status-sub');
      if (!badge || !container) return;

      const status = data.kycStatus || 'unverified';
      if (status === 'pass') {
        badge.className = 'badge badge-success';
        badge.textContent = 'Verified';
        badge.style = '';
        if (sub) sub.textContent = 'Your identity has been verified ✓';
      } else if (status === 'pending') {
        badge.className = 'badge badge-warning';
        badge.textContent = 'Pending Review';
        badge.style = 'background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b66;';
        if (sub) sub.textContent = 'KYC submitted — under review';
      } else {
        badge.remove();
        container.innerHTML = `<button class="btn-outline" style="padding:7px 16px;font-size:13px;" onclick="navigateTo('kyc')">Verify Now</button>`;
        if (sub) sub.textContent = 'Complete identity verification to unlock all features';
      }
    } catch (e) {
      const badge = document.getElementById('kyc-status-badge');
      if (badge) { badge.textContent = 'N/A'; }
    }
  }

  if (page === 'invite-friends') loadReferralStats();
  if (page === 'security-settings') {
    checkEmailStatus();
    checkPhoneStatus();
    checkKycStatus();
  }

  window.togglePwd = function (id) {
    const inp = document.getElementById(id);
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  window.openBindPhoneModal = function () {
    document.getElementById('bind-phone-modal')?.classList.add('active');
  };

  window.closeBindPhoneModal = function () {
    document.getElementById('bind-phone-modal')?.classList.remove('active');
  };

  window.sendBindPhoneOtp = async function () {
    const code = document.getElementById('bind-phone-country-code')?.value || '+1';
    const rawPhone = document.getElementById('bind-phone-input')?.value?.trim() || '';
    if (!rawPhone || rawPhone.length < 6 || rawPhone.length > 15) {
      toast('Please enter a valid phone number (6-15 digits)', 'error');
      return;
    }
    const phone = `${code}${rawPhone}`;

    const btn = document.getElementById('bind-phone-send-btn');
    if (btn) btn.disabled = true;

    try {
      const data = await authFetch('/api/auth/send-phone-otp', { method: 'POST', body: JSON.stringify({ phone }) });
      if (data.error) throw new Error(data.error);

      toast(data.message || 'Verification code sent to your phone!', 'success');

      let sec = 60;
      const timer = setInterval(() => {
        if (btn) btn.textContent = `${sec}s`;
        sec--;
        if (sec < 0) { clearInterval(timer); if (btn) { btn.disabled = false; btn.textContent = 'Send Code'; } }
      }, 1000);
    } catch (err) {
      toast(err.message, 'error');
      if (btn) btn.disabled = false;
    }
  };

  window.submitBindPhone = async function () {
    const code = document.getElementById('bind-phone-country-code')?.value || '+1';
    const rawPhone = document.getElementById('bind-phone-input')?.value?.trim() || '';
    const otp = document.getElementById('bind-phone-code')?.value;

    if (!rawPhone || !otp) { toast('Please enter phone number and verification code', 'error'); return; }
    const phone = `${code}${rawPhone}`;

    try {
      const data = await authFetch('/api/auth/bind-phone', { method: 'POST', body: JSON.stringify({ phone, otp }) });
      if (data.error) throw new Error(data.error);
      toast('✅ Phone number bound successfully!', 'success');
      closeBindPhoneModal();
      checkPhoneStatus();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  window.openBindEmailModal = function () {
    document.getElementById('bind-email-modal')?.classList.add('active');
  };

  window.closeBindEmailModal = function () {
    document.getElementById('bind-email-modal')?.classList.remove('active');
  };

  window.sendBindEmailOtp = async function () {
    const email = document.getElementById('bind-email-input')?.value;
    if (!email || !email.includes('@')) { toast('Please enter a valid email address', 'error'); return; }

    const btn = document.getElementById('bind-email-send-btn');
    if (btn) btn.disabled = true;

    try {
      const data = await authFetch('/api/email/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
      if (data.error) throw new Error(data.error);

      toast(data.message || 'Verification code sent to your email!', 'success');

      let sec = 60;
      const timer = setInterval(() => {
        if (btn) btn.textContent = `${sec}s`;
        sec--;
        if (sec < 0) { clearInterval(timer); if (btn) { btn.disabled = false; btn.textContent = 'Send Code'; } }
      }, 1000);
    } catch (err) {
      toast(err.message, 'error');
      if (btn) btn.disabled = false;
    }
  };

  window.submitBindEmail = async function () {
    const email = document.getElementById('bind-email-input')?.value;
    const otp = document.getElementById('bind-email-code')?.value;

    if (!email || !otp) { toast('Please enter email and verification code', 'error'); return; }

    try {
      const data = await authFetch('/api/email/bind-email', { method: 'POST', body: JSON.stringify({ email, otp }) });
      if (data.error) throw new Error(data.error);
      toast('✅ Email bound successfully!', 'success');
      closeBindEmailModal();
      checkEmailStatus();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  window.openChangePwd = async function (type) {
    // Check if email is bound first
    try {
      const statusData = await authFetch('/api/email/email-status');
      if (!statusData.emailBound) {
        toast('⚠️ Please bind an email address first before changing password', 'error');
        openBindEmailModal();
        return;
      }
    } catch (e) { }

    const titleEl = document.getElementById('change-pwd-title');
    const typeEl = document.getElementById('sec-pwd-type');
    if (titleEl) titleEl.textContent = type === 'login' ? 'Change Login Password' : 'Set Transaction Password';
    if (typeEl) typeEl.value = type;
    document.getElementById('change-pwd-modal')?.classList.add('active');
  };

  window.sendPwdChangeOtp = async function () {
    const btn = document.getElementById('sec-pwd-send-btn');
    if (btn) btn.disabled = true;

    try {
      const statusData = await authFetch('/api/email/email-status');
      if (!statusData.emailBound) throw new Error('No email bound');

      const data = await authFetch('/api/email/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: statusData.emailBound })
      });
      if (data.error) throw new Error(data.error);

      toast(`Code sent to ${statusData.emailBound}!`, 'success');

      let sec = 60;
      const timer = setInterval(() => {
        if (btn) btn.textContent = `${sec}s`;
        sec--;
        if (sec < 0) { clearInterval(timer); if (btn) { btn.disabled = false; btn.textContent = 'Send Code'; } }
      }, 1000);
    } catch (err) {
      toast(err.message, 'error');
      if (btn) btn.disabled = false;
    }
  };

  window.submitChangePwd = async function () {
    const type = document.getElementById('sec-pwd-type')?.value || 'login';
    const newPassword = document.getElementById('sec-new-pwd')?.value;
    const confirm = document.getElementById('sec-confirm-pwd')?.value;
    const otp = document.getElementById('sec-pwd-otp')?.value;

    if (!newPassword || !confirm || !otp) { toast('Please fill all fields', 'error'); return; }
    if (newPassword !== confirm) { toast('Passwords do not match', 'error'); return; }

    // Transaction password must be exactly 6 digits
    if (type === 'transaction') {
      if (!/^\d{6}$/.test(newPassword)) {
        toast('Transaction password must be exactly 6 digits', 'error');
        return;
      }
    } else {
      if (newPassword.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    }

    try {
      const data = await authFetch('/api/email/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword, otp, type })
      });
      if (data.error) throw new Error(data.error);

      toast(`✅ ${type === 'login' ? 'Login' : 'Transaction'} password changed successfully!`, 'success');
      document.getElementById('change-pwd-modal')?.classList.remove('active');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  window.toggleFaq = function (el) {
    const answer = el.querySelector('.faq-answer');
    const arrow = el.querySelector('.faq-arrow');
    if (answer) {
      const isOpen = answer.style.display === 'block';
      answer.style.display = isOpen ? 'none' : 'block';
      if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
    }
  };

  window.openChat = function () {
    const modal = document.getElementById('chat-modal');
    if (modal) modal.classList.add('active');
    // Load existing chat messages
    loadChatMessages();
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

  function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    // Keep the initial welcome message
    let html = `<div class="chat-msg support">
      <div class="chat-bubble">👋 Hello! Welcome to RXDT support. How can I help you today?</div>
      <div class="chat-time">Just now</div>
    </div>`;
    messages.forEach(m => {
      if (m.sender === 'admin') {
        html += `<div class="chat-msg support">
          <div class="chat-bubble">${m.message}</div>
          <div class="chat-time">Just now</div>
        </div>`;
      } else {
        html += `<div class="chat-msg user">
          <div class="chat-bubble">${m.message}</div>
          <div class="chat-time">Just now</div>
        </div>`;
      }
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  window.sendChatMsg = async function () {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';
    const messages = document.getElementById('chat-messages');
    if (!messages) return;

    // Add user message immediately
    const userEl = document.createElement('div');
    userEl.className = 'chat-msg user';
    userEl.innerHTML = `<div class="chat-bubble">${escapeHtml(msg)}</div><div class="chat-time">Just now</div>`;
    messages.appendChild(userEl);
    messages.scrollTop = messages.scrollHeight;

    // Send via API
    const token = localStorage.getItem('rxdt_token');
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      // Add auto-reply placeholder
      const supportEl = document.createElement('div');
      supportEl.className = 'chat-msg support';
      supportEl.innerHTML = `<div class="chat-bubble">✅ Message sent! Support will reply shortly.</div><div class="chat-time">Just now</div>`;
      messages.appendChild(supportEl);
      messages.scrollTop = messages.scrollHeight;
    } catch (err) {
      const errEl = document.createElement('div');
      errEl.className = 'chat-msg support';
      errEl.innerHTML = `<div class="chat-bubble" style="color:#ef4444;">⚠️ ${err.message}</div><div class="chat-time">Just now</div>`;
      messages.appendChild(errEl);
    }
  };

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
}

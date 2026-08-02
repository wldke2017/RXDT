import store from '../store.js';

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
  const inviteLink = `https://rxdtex.com/#/register?invite=${user?.inviteCode || 'RXDT0000'}`;
  const team = store.getTeam();

  return `
  <div>
    <h1 class="page-title">Invite Friends & Earn</h1>

    <div class="invite-hero-card">
      <div class="invite-hero-text">
        <h2>Earn Up to <span class="highlight">15%</span> Commission</h2>
        <p>Invite friends to join RXDT. Earn commission on every order they place. Level 1: 15% · Level 2: 7.5%</p>
      </div>
      <div class="invite-icon-large">👥</div>
    </div>

    <div class="card">
      <div class="card-title">Your Referral Info</div>
      <div class="invite-code-block">
        <div class="invite-code-label">Your Invite Code</div>
        <div class="invite-code-val">${user?.inviteCode || 'RXDT0000'}</div>
        <button class="btn-outline" onclick="copyText('${user?.inviteCode || 'RXDT0000'}','Invite code copied!')">Copy Code</button>
      </div>
      <div class="invite-link-block">
        <div class="invite-code-label">Your Invite Link</div>
        <div class="invite-link-val">${inviteLink}</div>
        <button class="btn-outline" onclick="copyText('${inviteLink}','Invite link copied!')">Copy Link</button>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom:20px;">
      <div class="card" style="text-align:center;margin-bottom:0;">
        <div style="font-size:28px;font-weight:700;color:var(--el-color-primary);">${team.totalMembers}</div>
        <div style="font-size:13px;color:var(--text-sub);">Total Invited</div>
      </div>
      <div class="card" style="text-align:center;margin-bottom:0;">
        <div style="font-size:28px;font-weight:700;color:var(--el-color-primary);">${team.directMembers}</div>
        <div style="font-size:13px;color:var(--text-sub);">Direct Referrals</div>
      </div>
      <div class="card" style="text-align:center;margin-bottom:0;">
        <div style="font-size:28px;font-weight:700;color:var(--color-up);">$${Number(team.totalCommission).toFixed(2)}</div>
        <div style="font-size:13px;color:var(--text-sub);">Total Commission</div>
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
          <div class="how-step-text"><strong>Earn commissions</strong><br/>Get 15% of their copy trading profits automatically</div>
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
          <div class="si-sub">9133038028 · Used for verification codes</div>
        </div>
        <span class="badge badge-success">Bound</span>
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
          <div class="si-sub">Identity verification status</div>
        </div>
        <span class="badge badge-success">Verified</span>
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
          <input type="password" id="sec-new-pwd" class="form-control" placeholder="Enter new password"/>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" id="sec-confirm-pwd" class="form-control" placeholder="Confirm new password"/>
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
          <div class="modal-title">RXDT Support</div>
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

  window.copyText = function(text, msg) {
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
    } catch (e) {}
  }
  if (page === 'security-settings') checkEmailStatus();

  window.openBindEmailModal = function() {
    document.getElementById('bind-email-modal')?.classList.add('active');
  };

  window.closeBindEmailModal = function() {
    document.getElementById('bind-email-modal')?.classList.remove('active');
  };

  window.sendBindEmailOtp = async function() {
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

  window.submitBindEmail = async function() {
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

  window.openChangePwd = async function(type) {
    // Check if email is bound first
    try {
      const statusData = await authFetch('/api/email/email-status');
      if (!statusData.emailBound) {
        toast('⚠️ Please bind an email address first before changing password', 'error');
        openBindEmailModal();
        return;
      }
    } catch (e) {}

    const titleEl = document.getElementById('change-pwd-title');
    const typeEl = document.getElementById('sec-pwd-type');
    if (titleEl) titleEl.textContent = type === 'login' ? 'Change Login Password' : 'Set Transaction Password';
    if (typeEl) typeEl.value = type;
    document.getElementById('change-pwd-modal')?.classList.add('active');
  };

  window.sendPwdChangeOtp = async function() {
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

  window.submitChangePwd = async function() {
    const type = document.getElementById('sec-pwd-type')?.value || 'login';
    const newPassword = document.getElementById('sec-new-pwd')?.value;
    const confirm = document.getElementById('sec-confirm-pwd')?.value;
    const otp = document.getElementById('sec-pwd-otp')?.value;

    if (!newPassword || !confirm || !otp) { toast('Please fill all fields', 'error'); return; }
    if (newPassword !== confirm) { toast('Passwords do not match', 'error'); return; }
    if (newPassword.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

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

  window.toggleFaq = function(el) {
    const answer = el.querySelector('.faq-answer');
    const arrow = el.querySelector('.faq-arrow');
    if (answer) {
      const isOpen = answer.style.display === 'block';
      answer.style.display = isOpen ? 'none' : 'block';
      if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
    }
  };

  window.openChat = function() {
    document.getElementById('chat-modal').classList.add('active');
  };

  window.sendChatMsg = function() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';
    const messages = document.getElementById('chat-messages');
    if (!messages) return;

    // User message
    const userEl = document.createElement('div');
    userEl.className = 'chat-msg user';
    userEl.innerHTML = `<div class="chat-bubble">${msg}</div><div class="chat-time">Just now</div>`;
    messages.appendChild(userEl);

    // Auto-reply
    setTimeout(() => {
      const replies = [
        'Thank you for your message! Our team will assist you shortly.',
        'I understand your concern. Let me check that for you.',
        'Please allow 1-2 minutes for our specialist to connect with you.',
        'For urgent matters, please contact us at support@rxdtex.com.'
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      const supportEl = document.createElement('div');
      supportEl.className = 'chat-msg support';
      supportEl.innerHTML = `<div class="chat-bubble">${reply}</div><div class="chat-time">Just now</div>`;
      messages.appendChild(supportEl);
      messages.scrollTop = messages.scrollHeight;
    }, 1200);

    messages.scrollTop = messages.scrollHeight;
  };
}

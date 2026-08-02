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
          <div class="si-sub">Bind an email for additional security</div>
        </div>
        <button class="btn-outline" style="padding:7px 16px;font-size:13px;" onclick="openBindEmail()">Bind</button>
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

    <!-- Change Password Modal -->
    <div class="modal-overlay" id="change-pwd-modal">
      <div class="modal-content" style="max-width:440px;">
        <div class="modal-header">
          <div class="modal-title" id="change-pwd-title">Change Password</div>
          <button class="modal-close" onclick="document.getElementById('change-pwd-modal').classList.remove('active')">✕</button>
        </div>
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input type="password" id="sec-current-pwd" class="form-control" placeholder="Enter current password"/>
        </div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" id="sec-new-pwd" class="form-control" placeholder="Enter new password"/>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" id="sec-confirm-pwd" class="form-control" placeholder="Confirm new password"/>
        </div>
        <div class="auth-warning">⚠️ After changing password, withdrawals are suspended for 24 hours.</div>
        <button class="btn-dark" style="width:100%;height:48px;font-size:16px;margin-top:12px;" onclick="submitChangePwd()">Confirm Change</button>
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

  window.openChangePwd = function(type) {
    document.getElementById('change-pwd-title').textContent = type === 'login' ? 'Change Login Password' : 'Set Transaction Password';
    document.getElementById('change-pwd-modal').classList.add('active');
  };

  window.submitChangePwd = function() {
    const current = document.getElementById('sec-current-pwd')?.value;
    const newPwd = document.getElementById('sec-new-pwd')?.value;
    const confirm = document.getElementById('sec-confirm-pwd')?.value;
    if (!current || !newPwd || !confirm) { toast('Please fill all fields', 'error'); return; }
    if (newPwd !== confirm) { toast('Passwords do not match', 'error'); return; }
    if (newPwd.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    document.getElementById('change-pwd-modal').classList.remove('active');
    toast('Password changed successfully!', 'success');
  };

  window.openBindEmail = function() {
    const email = prompt('Enter your email address to bind:');
    if (!email || !email.includes('@')) { if (email !== null) toast('Invalid email address', 'error'); return; }
    toast(`Email ${email} bound successfully!`, 'success');
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

import store from '../store.js';

// Utility: Show toast
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// Utility: Format number
function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function render(page) {
  if (page === 'login') return renderLogin();
  if (page === 'register') return renderRegister();
  if (page === 'forget-pwd') return renderForgetPwd();
  if (page === 'kyc') return renderKYC();
  return renderLogin();
}

// ---- LOGIN ----
function renderLogin() {
  return `
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <div class="auth-logo">RXDT</div>
        <div class="auth-tagline">Login to Your Account</div>
        <p class="auth-subtitle">Welcome back! Login with your phone or email</p>
      </div>

      <div class="tabs-header" style="justify-content:center;margin-bottom:24px;">
        <button class="tab-btn active" id="tab-phone" onclick="switchLoginTab('phone')">Phone</button>
        <button class="tab-btn" id="tab-email" onclick="switchLoginTab('email')">Email</button>
      </div>

      <div id="login-phone-group" class="form-group">
        <label class="form-label">Phone Number</label>
        <input type="tel" id="login-phone" class="form-control" placeholder="Please enter your phone number" value="9133038028"/>
      </div>
      <div id="login-email-group" class="form-group" style="display:none;">
        <label class="form-label">Email Address</label>
        <input type="email" id="login-email" class="form-control" placeholder="Please enter your email address"/>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div class="input-suffix">
          <input type="password" id="login-password" class="form-control" placeholder="Please enter your password" value="Raju@8028"/>
          <button class="pwd-toggle" onclick="togglePwd('login-password')">👁</button>
        </div>
      </div>

      <div class="auth-options">
        <label class="remember-me">
          <input type="checkbox" id="remember-pwd" checked/> Remember Password
        </label>
        <a href="#" onclick="navigateTo('forget-pwd')" class="link">Forgot Password?</a>
      </div>

      <button class="btn-dark auth-submit" onclick="doLogin()">Login</button>

      <div class="auth-divider">Or</div>
      <button class="btn-outline auth-google" onclick="toast('Google login coming soon','info')">
        <span>🅖</span> Login with Google
      </button>

      <div class="auth-footer-links">
        Don't have an account? <a onclick="navigateTo('register')" class="link">Register Now</a>
      </div>
    </div>
  </div>`;
}

// ---- REGISTER ----
function renderRegister() {
  return `
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <div class="auth-logo">RXDT</div>
        <div class="auth-tagline">Create Your Account</div>
      </div>

      <div class="tabs-header" style="justify-content:center;margin-bottom:24px;">
        <button class="tab-btn active" id="reg-tab-phone" onclick="switchRegTab('phone')">Phone</button>
        <button class="tab-btn" id="reg-tab-email" onclick="switchRegTab('email')">Email</button>
      </div>

      <div id="reg-phone-group" class="form-group">
        <label class="form-label">Phone Number</label>
        <input type="tel" id="reg-phone" class="form-control" placeholder="Please enter your phone number"/>
      </div>
      <div id="reg-email-group" class="form-group" style="display:none;">
        <label class="form-label">Email Address</label>
        <input type="email" id="reg-email" class="form-control" placeholder="Please enter your email address"/>
      </div>

      <div class="form-group">
        <label class="form-label">Verification Code</label>
        <div class="code-input-group">
          <input type="text" id="reg-code" class="form-control" placeholder="Please enter verification code"/>
          <button class="btn-primary code-btn" onclick="sendCode()" id="send-code-btn">Get Code</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="reg-password" class="form-control" placeholder="Please enter your password"/>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <input type="password" id="reg-confirm-pwd" class="form-control" placeholder="Please enter your password again"/>
      </div>
      <div class="form-group">
        <label class="form-label">Invite Code (Optional)</label>
        <input type="text" id="reg-invite-code" class="form-control" placeholder="Enter invite code"/>
      </div>

      <div class="form-group" style="display:flex;align-items:flex-start;gap:8px;">
        <input type="checkbox" id="agree-terms" style="margin-top:3px;"/>
        <label for="agree-terms" style="font-size:13px;color:var(--text-sub)">
          I have read and agree to the
          <a onclick="navigateTo('agreement')" class="link">User Agreement</a> and
          <a onclick="navigateTo('investment-agreement')" class="link">Copy Trading Agreement</a>
        </label>
      </div>

      <button class="btn-dark auth-submit" onclick="doRegister()">Complete Registration</button>

      <div class="auth-footer-links">
        Already have an account? <a onclick="navigateTo('login')" class="link">Login</a>
      </div>
    </div>
  </div>`;
}

// ---- FORGET PASSWORD ----
function renderForgetPwd() {
  return `
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <div class="auth-logo">RXDT</div>
        <div class="auth-tagline">Reset Password</div>
      </div>

      <div class="form-group">
        <label class="form-label">Phone Number</label>
        <input type="tel" id="fp-phone" class="form-control" placeholder="Please enter your phone number"/>
      </div>
      <div class="form-group">
        <label class="form-label">Verification Code</label>
        <div class="code-input-group">
          <input type="text" id="fp-code" class="form-control" placeholder="Please enter verification code"/>
          <button class="btn-primary code-btn" id="fp-send-btn" onclick="sendFpCode()">Get Code</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <input type="password" id="fp-new-pwd" class="form-control" placeholder="Please enter your new password"/>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <input type="password" id="fp-confirm-pwd" class="form-control" placeholder="Please enter your password again"/>
      </div>

      <div class="auth-warning">
        ⚠️ For asset security, transactions will be suspended for 24 hours after password reset.
      </div>

      <button class="btn-dark auth-submit" onclick="doResetPwd()">Reset Password</button>
      <div class="auth-footer-links">
        <a onclick="navigateTo('login')" class="link">Back to Login</a>
      </div>
    </div>
  </div>`;
}

// ---- KYC ----
function renderKYC() {
  const user = store.getUser();
  const status = user ? user.kycStatus : 'pending';

  if (status === 'pass') {
    return `
    <div class="auth-page">
      <div class="auth-card">
        <div style="text-align:center;padding:40px 0;">
          <div style="font-size:64px;margin-bottom:16px;">✅</div>
          <h2 style="font-size:22px;font-weight:600;color:var(--color-up);margin-bottom:8px;">Identity Verified</h2>
          <p style="color:var(--text-sub);">Your identity authentication has been approved.</p>
          <button class="btn-primary" style="margin-top:24px;" onclick="navigateTo('assets')">Go to Assets</button>
        </div>
      </div>
    </div>`;
  }

  return `
  <div class="auth-page">
    <div class="auth-card" style="max-width:560px;">
      <div class="auth-brand">
        <div class="auth-tagline">Identity Verification (KYC)</div>
      </div>

      <div class="form-group">
        <label class="form-label">Document Type</label>
        <select class="form-control" id="kyc-id-type">
          <option value="">Please select document type</option>
          <option value="idCard">ID Card</option>
          <option value="passport">Passport</option>
          <option value="driverLicense">Driver License</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nationality</label>
        <select class="form-control" id="kyc-nationality">
          <option value="">Please select nationality</option>
          <option value="India">India</option>
          <option value="USA">United States</option>
          <option value="China">China</option>
          <option value="UAE">United Arab Emirates</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Real Name</label>
        <input type="text" id="kyc-name" class="form-control" placeholder="Please enter your real name"/>
      </div>
      <div class="form-group">
        <label class="form-label">ID Number</label>
        <input type="text" id="kyc-id-number" class="form-control" placeholder="Please enter your ID number"/>
      </div>

      <div class="form-group">
        <label class="form-label">Front Photo of ID</label>
        <div class="upload-box" onclick="document.getElementById('kyc-front').click()">
          <div class="upload-icon">📄</div>
          <div>Upload front photo of your ID</div>
          <input type="file" id="kyc-front" accept="image/*" style="display:none;" onchange="previewUpload(this,'kyc-front-preview')"/>
          <img id="kyc-front-preview" style="display:none;max-width:100%;margin-top:8px;border-radius:4px;"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Back Photo of ID</label>
        <div class="upload-box" onclick="document.getElementById('kyc-back').click()">
          <div class="upload-icon">📄</div>
          <div>Upload back photo of your ID</div>
          <input type="file" id="kyc-back" accept="image/*" style="display:none;" onchange="previewUpload(this,'kyc-back-preview')"/>
          <img id="kyc-back-preview" style="display:none;max-width:100%;margin-top:8px;border-radius:4px;"/>
        </div>
      </div>

      <button class="btn-dark auth-submit" onclick="submitKYC()">Submit</button>
    </div>
  </div>`;
}

export function init(page) {
  // Expose helpers globally for inline handlers
  window.switchLoginTab = function(tab) {
    document.getElementById('tab-phone').classList.toggle('active', tab === 'phone');
    document.getElementById('tab-email').classList.toggle('active', tab === 'email');
    document.getElementById('login-phone-group').style.display = tab === 'phone' ? '' : 'none';
    document.getElementById('login-email-group').style.display = tab === 'email' ? '' : 'none';
  };

  window.switchRegTab = function(tab) {
    document.getElementById('reg-tab-phone').classList.toggle('active', tab === 'phone');
    document.getElementById('reg-tab-email').classList.toggle('active', tab === 'email');
    document.getElementById('reg-phone-group').style.display = tab === 'phone' ? '' : 'none';
    document.getElementById('reg-email-group').style.display = tab === 'email' ? '' : 'none';
  };

  window.togglePwd = function(id) {
    const inp = document.getElementById(id);
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  window.doLogin = function() {
    const phone = document.getElementById('login-phone')?.value || '';
    const email = document.getElementById('login-email')?.value || '';
    const pwd = document.getElementById('login-password')?.value || '';
    if (!phone && !email) { toast('Please enter phone or email', 'error'); return; }
    if (!pwd) { toast('Please enter your password', 'error'); return; }
    store.login({ phone, email, password: pwd });
    toast('Login successful!', 'success');
    setTimeout(() => { window.location.hash = '#/home'; }, 500);
  };

  window.doRegister = function() {
    const pwd = document.getElementById('reg-password')?.value || '';
    const confirm = document.getElementById('reg-confirm-pwd')?.value || '';
    if (!document.getElementById('agree-terms')?.checked) { toast('Please agree to the terms', 'error'); return; }
    if (pwd !== confirm) { toast('Passwords do not match', 'error'); return; }
    if (pwd.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
    store.login({});
    toast('Registration successful! Welcome to RXDT!', 'success');
    setTimeout(() => { window.location.hash = '#/kyc'; }, 500);
  };

  window.sendCode = function() {
    const btn = document.getElementById('send-code-btn');
    if (!btn) return;
    let sec = 60;
    btn.disabled = true;
    const timer = setInterval(() => {
      btn.textContent = `${sec}s`;
      sec--;
      if (sec < 0) { clearInterval(timer); btn.disabled = false; btn.textContent = 'Get Code'; }
    }, 1000);
    toast('Verification code sent!', 'success');
  };

  window.sendFpCode = function() {
    const btn = document.getElementById('fp-send-btn');
    if (!btn) return;
    let sec = 60;
    btn.disabled = true;
    const timer = setInterval(() => {
      btn.textContent = `${sec}s`;
      sec--;
      if (sec < 0) { clearInterval(timer); btn.disabled = false; btn.textContent = 'Get Code'; }
    }, 1000);
    toast('Verification code sent!', 'success');
  };

  window.doResetPwd = function() {
    const newPwd = document.getElementById('fp-new-pwd')?.value || '';
    const confirm = document.getElementById('fp-confirm-pwd')?.value || '';
    if (!newPwd || !confirm) { toast('Please fill all fields', 'error'); return; }
    if (newPwd !== confirm) { toast('Passwords do not match', 'error'); return; }
    toast('Password reset successfully!', 'success');
    setTimeout(() => { window.location.hash = '#/login'; }, 1000);
  };

  window.previewUpload = function(input, previewId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.getElementById(previewId);
      if (img) { img.src = e.target.result; img.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  };

  window.submitKYC = function() {
    const idType = document.getElementById('kyc-id-type')?.value;
    const name = document.getElementById('kyc-name')?.value;
    const idNum = document.getElementById('kyc-id-number')?.value;
    if (!idType || !name || !idNum) { toast('Please fill all required fields', 'error'); return; }
    toast('KYC submitted! Under review, please wait.', 'success');
    setTimeout(() => { window.location.hash = '#/assets'; }, 1200);
  };

  window.toast = toast;
}

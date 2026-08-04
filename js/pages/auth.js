import store from '../store.js';
import { COUNTRIES, COUNTRY_DIAL_CODES } from '../countries.js';

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

// Email format regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const countryOptions = COUNTRY_DIAL_CODES.map(c => `<option value="${c.code}">${c.flag} ${c.code} (${c.name})</option>`).join('');

  return `
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" class="auth-brand-logo-img"/>
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
        <div style="display:flex;gap:8px;">
          <select id="login-country-code" class="form-control" style="width:130px;padding:8px;font-size:13px;background:var(--bg-input, #131926);color:var(--text-main,#fff);border:1px solid var(--border-color,rgba(255,255,255,0.15));border-radius:8px;">
            ${countryOptions}
          </select>
          <input type="tel" id="login-phone" class="form-control" placeholder="Phone number (digits only)" maxlength="15" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="flex:1;"/>
        </div>
      </div>
      <div id="login-email-group" class="form-group" style="display:none;">
        <label class="form-label">Email Address</label>
        <input type="email" id="login-email" class="form-control" placeholder="Please enter your email address"/>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <div class="input-suffix">
          <input type="password" id="login-password" class="form-control" placeholder="Please enter your password"/>
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
  const hash = window.location.hash || '';
  const match = hash.match(/[?&]invite=([^&]+)/) || window.location.search.match(/[?&]invite=([^&]+)/);
  const defaultInvite = match ? decodeURIComponent(match[1]) : '';
  const countryOptions = COUNTRY_DIAL_CODES.map(c => `<option value="${c.code}">${c.flag} ${c.code} (${c.name})</option>`).join('');

  return `
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" class="auth-brand-logo-img"/>
        <div class="auth-logo">RXDT</div>
        <div class="auth-tagline">Create Your Account</div>
      </div>

      <div class="tabs-header" style="justify-content:center;margin-bottom:24px;">
        <button class="tab-btn active" id="reg-tab-phone" onclick="switchRegTab('phone')">Phone</button>
        <button class="tab-btn" id="reg-tab-email" onclick="switchRegTab('email')">Email</button>
      </div>

      <div id="reg-phone-group" class="form-group">
        <label class="form-label">Phone Number</label>
        <div style="display:flex;gap:8px;">
          <select id="reg-country-code" class="form-control" style="width:130px;padding:8px;font-size:13px;background:var(--bg-input, #131926);color:var(--text-main,#fff);border:1px solid var(--border-color,rgba(255,255,255,0.15));border-radius:8px;">
            ${countryOptions}
          </select>
          <input type="tel" id="reg-phone" class="form-control" placeholder="Phone number (digits only)" maxlength="15" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="flex:1;"/>
        </div>
      </div>
      <div id="reg-email-group" class="form-group" style="display:none;">
        <label class="form-label">Email Address</label>
        <input type="email" id="reg-email" class="form-control" placeholder="Please enter your email address"/>
      </div>

      <div class="form-group">
        <label class="form-label">Security Verification (CAPTCHA)</label>
        <div style="display:flex;gap:10px;align-items:center;">
          <div id="captcha-question" style="background:rgba(255,255,255,0.08);border:1px solid var(--border-color);border-radius:8px;padding:12px 18px;font-size:18px;font-weight:800;color:var(--el-color-primary);letter-spacing:2px;user-select:none;white-space:nowrap;">
            <!-- Math equation loaded in JS -->
          </div>
          <input type="number" id="reg-captcha-answer" class="form-control" placeholder="Enter answer" style="font-size:16px;text-align:center;"/>
          <button type="button" class="btn-outline" style="padding:10px 14px;white-space:nowrap;" onclick="generateCaptcha()">🔄</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Password</label>
        <div class="input-suffix">
          <input type="password" id="reg-password" class="form-control" placeholder="Please enter your password"/>
          <button class="pwd-toggle" onclick="togglePwd('reg-password')">👁</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <div class="input-suffix">
          <input type="password" id="reg-confirm-pwd" class="form-control" placeholder="Please enter your password again"/>
          <button class="pwd-toggle" onclick="togglePwd('reg-confirm-pwd')">👁</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Invite Code ${defaultInvite ? '<span style="color:#00f2fe;font-size:12px;">(Auto-filled)</span>' : '(Optional)'}</label>
        <input type="text" id="reg-invite-code" class="form-control" placeholder="Enter invite code" value="${defaultInvite}"/>
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
        <div class="auth-tagline">Reset Password via Email</div>
      </div>

      <div class="form-group">
        <label class="form-label">Bound Email Address</label>
        <input type="email" id="fp-email" class="form-control" placeholder="Please enter your bound email address"/>
      </div>
      <div class="form-group">
        <label class="form-label">Email Verification Code</label>
        <div class="code-input-group">
          <input type="text" id="fp-code" class="form-control" placeholder="6-digit verification code"/>
          <button class="btn-primary code-btn" id="fp-send-btn" onclick="sendFpEmailCode()">Get Code</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">New Password</label>
        <div class="input-suffix">
          <input type="password" id="fp-new-pwd" class="form-control" placeholder="Please enter your new password"/>
          <button class="pwd-toggle" onclick="togglePwd('fp-new-pwd')">👁</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Confirm Password</label>
        <div class="input-suffix">
          <input type="password" id="fp-confirm-pwd" class="form-control" placeholder="Please enter new password again"/>
          <button class="pwd-toggle" onclick="togglePwd('fp-confirm-pwd')">👁</button>
        </div>
      </div>

      <button class="btn-dark auth-submit" onclick="doResetPwd()">Confirm Reset</button>

      <div class="auth-footer-links">
        Remembered your password? <a onclick="navigateTo('login')" class="link">Back to Login</a>
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

  if (status === 'pending') {
    return `
    <div class="auth-page">
      <div class="auth-card">
        <div style="text-align:center;padding:40px 0;">
          <div style="font-size:64px;margin-bottom:16px;">⏳</div>
          <h2 style="font-size:22px;font-weight:600;color:#f59e0b;margin-bottom:8px;">Under Review</h2>
          <p style="color:var(--text-sub);">Your KYC identity verification has been submitted and is awaiting approval.</p>
          <p style="color:var(--text-muted);font-size:13px;margin-top:8px;">This usually takes less than 24 hours. You'll be able to withdraw once approved.</p>
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
        <label class="form-label">Country / Nationality</label>
        <div class="country-search-wrapper" style="position:relative;">
          <input type="text" id="kyc-country-search" class="form-control" placeholder="🔍 Search or select country..."
            oninput="filterKycCountries(this.value)" onfocus="showKycCountryDropdown()" autocomplete="off"/>
          <input type="hidden" id="kyc-nationality" value=""/>
          <div id="kyc-country-dropdown" class="country-dropdown-list" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:220px;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border-color);border-radius:8px;z-index:100;box-shadow:0 10px 25px rgba(0,0,0,0.5);margin-top:4px;">
            ${COUNTRIES.map(c => `
              <div class="country-item" onclick="selectKycCountry('${c.replace(/'/g, "\\'")}')" style="padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);color:var(--text-main);">
                ${c}
              </div>
            `).join('')}
          </div>
        </div>
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
      <div class="form-group">
        <label class="form-label">Selfie Holding Your ID Document</label>
        <div class="upload-box" onclick="document.getElementById('kyc-handheld').click()" style="border-color:var(--el-color-primary);">
          <div class="upload-icon">🤳</div>
          <div>Upload a clear photo of yourself holding your ID document</div>
          <div style="font-size:11px;color:var(--text-sub);margin-top:4px;">Ensure your face and ID details are clearly visible</div>
          <input type="file" id="kyc-handheld" accept="image/*" style="display:none;" onchange="previewUpload(this,'kyc-handheld-preview')"/>
          <img id="kyc-handheld-preview" style="display:none;max-width:100%;margin-top:8px;border-radius:4px;"/>
        </div>
      </div>

      <button class="btn-dark auth-submit" onclick="submitKYC()">Submit Verification</button>
      <button class="btn-outline" style="width:100%;height:44px;font-size:14px;margin-top:10px;border-radius:10px;color:var(--text-sub);border-color:rgba(255,255,255,0.15);" onclick="navigateTo('assets')">Skip for now →</button>
      <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:10px;">You can complete identity verification later from Security Settings.</p>
    </div>
  </div>`;
}

export function init(page) {
  // Expose helpers globally for inline handlers
  window.switchLoginTab = function (tab) {
    document.getElementById('tab-phone').classList.toggle('active', tab === 'phone');
    document.getElementById('tab-email').classList.toggle('active', tab === 'email');
    document.getElementById('login-phone-group').style.display = tab === 'phone' ? '' : 'none';
    document.getElementById('login-email-group').style.display = tab === 'email' ? '' : 'none';
  };

  window.switchRegTab = function (tab) {
    document.getElementById('reg-tab-phone').classList.toggle('active', tab === 'phone');
    document.getElementById('reg-tab-email').classList.toggle('active', tab === 'email');
    document.getElementById('reg-phone-group').style.display = tab === 'phone' ? '' : 'none';
    document.getElementById('reg-email-group').style.display = tab === 'email' ? '' : 'none';
  };

  window.togglePwd = function (id) {
    const inp = document.getElementById(id);
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  window.doLogin = async function () {
    const phoneGroup = document.getElementById('login-phone-group');
    const isPhone = phoneGroup && phoneGroup.style.display !== 'none';
    const code = document.getElementById('login-country-code')?.value || '+1';
    const rawPhone = document.getElementById('login-phone')?.value?.trim() || '';
    const email = !isPhone ? (document.getElementById('login-email')?.value?.trim() || '') : '';
    const pwd = document.getElementById('login-password')?.value || '';

    if (isPhone) {
      if (!rawPhone) { toast('Please enter your phone number', 'error'); return; }
      if (rawPhone.length < 6 || rawPhone.length > 15) { toast('Invalid phone number length (must be 6-15 digits)', 'error'); return; }
    } else {
      if (!email) { toast('Please enter your email address', 'error'); return; }
      if (!EMAIL_REGEX.test(email)) { toast('Please enter a valid email address (e.g. user@domain.com)', 'error'); return; }
    }
    if (!pwd) { toast('Please enter your password', 'error'); return; }

    const phone = isPhone ? `${code}${rawPhone}` : '';

    try {
      await store.login({ phone, email, password: pwd });
      toast('Login successful!', 'success');
      setTimeout(() => { window.location.hash = '#/home'; }, 500);
    } catch (err) {
      toast(err.message || 'Login failed', 'error');
    }
  };

  let currentCaptchaAns = 0;

  window.generateCaptcha = function () {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    currentCaptchaAns = a + b;
    const el = document.getElementById('captcha-question');
    if (el) el.textContent = `${a} + ${b} = ?`;
  };

  // Generate initial captcha on register load
  if (page === 'register') {
    setTimeout(() => window.generateCaptcha(), 100);
  }

  window.doRegister = async function () {
    const phoneGroup = document.getElementById('reg-phone-group');
    const isPhone = phoneGroup && phoneGroup.style.display !== 'none';
    const code = document.getElementById('reg-country-code')?.value || '+1';
    const rawPhone = document.getElementById('reg-phone')?.value?.trim() || '';
    const email = !isPhone ? (document.getElementById('reg-email')?.value?.trim() || '') : '';
    const captchaAns = parseInt(document.getElementById('reg-captcha-answer')?.value || '-1');
    const pwd = document.getElementById('reg-password')?.value || '';
    const confirm = document.getElementById('reg-confirm-pwd')?.value || '';
    const inviteCode = document.getElementById('reg-invite-code')?.value || '';

    if (isPhone) {
      if (!rawPhone) { toast('Please enter your phone number', 'error'); return; }
      if (rawPhone.length < 6 || rawPhone.length > 15) { toast('Invalid phone number length (must be 6-15 digits)', 'error'); return; }
    } else {
      if (!email) { toast('Please enter your email address', 'error'); return; }
      if (!EMAIL_REGEX.test(email)) { toast('Please enter a valid email address (e.g. user@domain.com)', 'error'); return; }
    }

    if (captchaAns !== currentCaptchaAns) {
      toast('❌ Incorrect CAPTCHA answer. Try again.', 'error');
      window.generateCaptcha();
      return;
    }
    if (!document.getElementById('agree-terms')?.checked) { toast('Please agree to the terms', 'error'); return; }
    if (pwd !== confirm) { toast('Passwords do not match', 'error'); return; }
    if (pwd.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

    const phone = isPhone ? `${code}${rawPhone}` : '';

    try {
      await store.register({ phone, email, password: pwd, inviteCode, name: isPhone ? `User_${rawPhone.slice(-4)}` : email.split('@')[0] });
      toast('Registration successful! Welcome to RXDT!', 'success');
      setTimeout(() => { window.location.hash = '#/kyc'; }, 500);
    } catch (err) {
      toast(err.message || 'Registration failed', 'error');
      window.generateCaptcha();
    }
  };

  window.sendFpEmailCode = async function () {
    const email = document.getElementById('fp-email')?.value;
    if (!email) { toast('Please enter your email address', 'error'); return; }

    const btn = document.getElementById('fp-send-btn');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch('/api/email/send-otp-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset code');

      toast(data.message || 'Verification code sent to your email!', 'success');

      let sec = 60;
      const timer = setInterval(() => {
        if (btn) btn.textContent = `${sec}s`;
        sec--;
        if (sec < 0) { clearInterval(timer); if (btn) { btn.disabled = false; btn.textContent = 'Get Code'; } }
      }, 1000);
    } catch (err) {
      toast(err.message, 'error');
      if (btn) btn.disabled = false;
    }
  };

  window.doResetPwd = async function () {
    const email = document.getElementById('fp-email')?.value;
    const otp = document.getElementById('fp-code')?.value;
    const newPassword = document.getElementById('fp-new-pwd')?.value;
    const confirm = document.getElementById('fp-confirm-pwd')?.value;

    if (!email || !otp || !newPassword) { toast('Please fill all required fields', 'error'); return; }
    if (newPassword !== confirm) { toast('Passwords do not match', 'error'); return; }

    try {
      const res = await fetch('/api/email/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      toast('✅ Password reset successfully! Please log in.', 'success');
      setTimeout(() => { window.location.hash = '#/login'; }, 1000);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  window.previewUpload = function (input, previewId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.getElementById(previewId);
      if (img) { img.src = e.target.result; img.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  };

  window.showKycCountryDropdown = function () {
    const dd = document.getElementById('kyc-country-dropdown');
    if (dd) dd.style.display = 'block';
  };

  window.filterKycCountries = function (query) {
    const q = query.toLowerCase();
    const dd = document.getElementById('kyc-country-dropdown');
    if (!dd) return;
    dd.style.display = 'block';
    const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(q));
    if (!filtered.length) {
      dd.innerHTML = `<div style="padding:12px;color:var(--text-muted);font-size:13px;text-align:center;">No matching country found</div>`;
      return;
    }
    dd.innerHTML = filtered.map(c => `
      <div class="country-item" onclick="selectKycCountry('${c.replace(/'/g, "\\'")}')" style="padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);color:var(--text-main);">
        ${c}
      </div>
    `).join('');
  };

  window.selectKycCountry = function (country) {
    const searchInput = document.getElementById('kyc-country-search');
    const hiddenInput = document.getElementById('kyc-nationality');
    const dd = document.getElementById('kyc-country-dropdown');
    if (searchInput) searchInput.value = country;
    if (hiddenInput) hiddenInput.value = country;
    if (dd) dd.style.display = 'none';
  };

  document.addEventListener('click', function (e) {
    const wrapper = e.target.closest('.country-search-wrapper');
    if (!wrapper) {
      const dd = document.getElementById('kyc-country-dropdown');
      if (dd) dd.style.display = 'none';
    }
  });

  window.submitKYC = async function () {
    const idType = document.getElementById('kyc-id-type')?.value;
    const nationality = document.getElementById('kyc-nationality')?.value || document.getElementById('kyc-country-search')?.value;
    const name = document.getElementById('kyc-name')?.value;
    const idNum = document.getElementById('kyc-id-number')?.value;

    const frontImg = document.getElementById('kyc-front-preview')?.src || '';
    const backImg = document.getElementById('kyc-back-preview')?.src || '';
    const handheldImg = document.getElementById('kyc-handheld-preview')?.src || '';

    if (!idType || !nationality || !name || !idNum) { toast('Please fill all required fields including Country', 'error'); return; }

    const btn = document.querySelector('.auth-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

    try {
      await store.submitKyc({ documentType: idType, nationality, realName: name, idNumber: idNum, frontImg, backImg, handheldImg });
      toast('KYC submitted! Under review, please wait.', 'success');
      setTimeout(() => { window.location.hash = '#/kyc'; }, 800);
    } catch (err) {
      toast(err.message || 'Failed to submit KYC', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit Verification'; }
    }
  };

  window.toast = toast;
}

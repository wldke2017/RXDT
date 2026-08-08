import store from '../store.js';
import { COUNTRIES, COUNTRY_DIAL_CODES, getDefaultCountryCode } from '../countries.js';

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
  if (page === 'earn-guide') return renderEarnGuide();
  return renderLogin();
}

// ---- LOGIN ----
function renderLogin() {
  const defaultCode = getDefaultCountryCode();
  const countryOptions = COUNTRY_DIAL_CODES.map(c => `<option value="${c.code}" ${c.code === defaultCode ? 'selected' : ''}>${c.flag} ${c.code} (${c.name})</option>`).join('');

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
  const defaultCode = getDefaultCountryCode();
  const countryOptions = COUNTRY_DIAL_CODES.map(c => `<option value="${c.code}" ${c.code === defaultCode ? 'selected' : ''}>${c.flag} ${c.code} (${c.name})</option>`).join('');

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
  // Always fetch live status from API and re-render accordingly
  const status = user ? (user.kycStatus || 'unverified') : 'unverified';

  // ── VERIFIED ─────────────────────────────────────────────────────────────
  if (status === 'pass') {
    return `
    <div class="auth-page">
      <div class="auth-card" style="max-width:520px;">

        <!-- Animated verified badge -->
        <div style="text-align:center;padding:32px 0 20px;">
          <div style="position:relative;display:inline-block;">
            <div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-size:44px;margin:0 auto 4px;box-shadow:0 0 0 12px rgba(16,185,129,0.12),0 0 0 24px rgba(16,185,129,0.06);">✅</div>
          </div>
          <h2 style="font-size:24px;font-weight:700;color:#10b981;margin:18px 0 6px;">Identity Verified</h2>
          <p style="color:var(--text-sub);font-size:14px;">Your RXDT account is fully verified and secure.</p>
        </div>

        <!-- Verified badge card -->
        <div style="background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.06));border:1px solid rgba(16,185,129,0.35);border-radius:14px;padding:18px 20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <div style="width:36px;height:36px;border-radius:8px;background:rgba(16,185,129,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;">🛡️</div>
            <div>
              <div style="font-weight:700;color:#10b981;font-size:14px;">KYC Verification Certificate</div>
              <div style="font-size:11px;color:var(--text-muted);">RXDT Exchange · Verified Identity</div>
            </div>
            <div style="margin-left:auto;background:#10b981;color:#000;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;letter-spacing:0.5px;">VERIFIED</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px 12px;">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">STATUS</div>
              <div style="font-size:13px;font-weight:700;color:#10b981;">✓ Approved</div>
            </div>
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px 12px;">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">PLATFORM</div>
              <div style="font-size:13px;font-weight:700;color:var(--text-main);">RXDT Exchange</div>
            </div>
          </div>
        </div>

        <!-- What's Unlocked -->
        <div style="margin-bottom:20px;">
          <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">🔓 What You've Unlocked</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);border-radius:10px;">
              <span style="font-size:18px;">💸</span>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-main);">Full Withdrawal Access</div>
                <div style="font-size:11px;color:var(--text-sub);">Withdraw your earnings anytime</div>
              </div>
              <span style="margin-left:auto;color:#10b981;font-size:16px;">✓</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);border-radius:10px;">
              <span style="font-size:18px;">🤖</span>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-main);">AI Trading Models</div>
                <div style="font-size:11px;color:var(--text-sub);">Full access to all quantitative models</div>
              </div>
              <span style="margin-left:auto;color:#10b981;font-size:16px;">✓</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);border-radius:10px;">
              <span style="font-size:18px;">🏆</span>
              <div>
                <div style="font-size:13px;font-weight:600;color:var(--text-main);">VIP Salary Rewards</div>
                <div style="font-size:11px;color:var(--text-sub);">Eligible for 10-day salary payouts</div>
              </div>
              <span style="margin-left:auto;color:#10b981;font-size:16px;">✓</span>
            </div>
          </div>
        </div>

        <button class="btn-primary" style="width:100%;" onclick="navigateTo('assets')">💸 Go to Assets & Withdraw</button>
        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo('profile')">← Back to Profile</button>
      </div>
    </div>`;
  }

  // ── PENDING ──────────────────────────────────────────────────────────────
  if (status === 'pending') {
    return `
    <div class="auth-page">
      <div class="auth-card" style="max-width:520px;">

        <!-- Header -->
        <div style="text-align:center;padding:28px 0 16px;">
          <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,rgba(245,158,11,0.25),rgba(180,83,9,0.15));border:2px solid rgba(245,158,11,0.5);display:flex;align-items:center;justify-content:center;font-size:38px;margin:0 auto 14px;animation:kyc-pulse 2s ease-in-out infinite;">⏳</div>
          <h2 style="font-size:22px;font-weight:700;color:#f59e0b;margin-bottom:6px;">Under Review</h2>
          <p style="color:var(--text-sub);font-size:13px;">Your KYC application is being reviewed by our compliance team.</p>
        </div>

        <!-- Review Timeline -->
        <div style="position:relative;padding:0 4px;margin-bottom:20px;">
          <!-- Line -->
          <div style="position:absolute;left:19px;top:20px;bottom:20px;width:2px;background:linear-gradient(to bottom,#10b981 40%,rgba(245,158,11,0.6) 40%,rgba(245,158,11,0.6) 70%,rgba(255,255,255,0.1) 70%);"></div>

          <!-- Step 1: Submitted -->
          <div style="display:flex;align-items:flex-start;gap:14px;padding:10px 0;">
            <div style="flex-shrink:0;width:38px;height:38px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:16px;z-index:1;">✓</div>
            <div style="padding-top:8px;">
              <div style="font-weight:700;font-size:14px;color:#10b981;">Submitted</div>
              <div style="font-size:12px;color:var(--text-sub);">Documents received successfully</div>
            </div>
          </div>

          <!-- Step 2: Under Review (active) -->
          <div style="display:flex;align-items:flex-start;gap:14px;padding:10px 0;">
            <div style="flex-shrink:0;width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:16px;z-index:1;box-shadow:0 0 12px rgba(245,158,11,0.5);animation:kyc-pulse 1.5s ease-in-out infinite;">👁</div>
            <div style="padding-top:8px;">
              <div style="font-weight:700;font-size:14px;color:#f59e0b;">Compliance Review <span style="font-size:11px;animation:kyc-dots 1.5s steps(3,end) infinite;">...</span></div>
              <div style="font-size:12px;color:var(--text-sub);">Our team is verifying your documents · Usually &lt;24h</div>
            </div>
          </div>

          <!-- Step 3: Decision -->
          <div style="display:flex;align-items:flex-start;gap:14px;padding:10px 0;opacity:0.4;">
            <div style="flex-shrink:0;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.08);border:2px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:16px;z-index:1;">🏁</div>
            <div style="padding-top:8px;">
              <div style="font-weight:700;font-size:14px;color:var(--text-sub);">Decision</div>
              <div style="font-size:12px;color:var(--text-muted);">Approval or additional info requested</div>
            </div>
          </div>
        </div>

        <!-- Submitted details card -->
        <div id="kyc-pending-details" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 16px;margin-bottom:18px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📋 Submitted Details</div>
          <div style="font-size:13px;color:var(--text-sub);">Loading your submission details...</div>
        </div>

        <!-- Info note -->
        <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:12px 14px;margin-bottom:20px;">
          <div style="font-size:12px;color:#fcd34d;line-height:1.7;">
            💡 <strong>What happens next?</strong> Once approved, you will have full withdrawal access. If additional information is needed, we will notify you here.
          </div>
        </div>

        <button class="btn-outline" style="width:100%;" onclick="navigateTo('assets')">← Continue to Assets</button>
      </div>
    </div>
    <style>
      @keyframes kyc-pulse { 0%,100%{opacity:1;} 50%{opacity:0.55;} }
      @keyframes kyc-dots { 0%{content:'';} 33%{content:'.';} 66%{content:'..';} 100%{content:'...';} }
    </style>`;
  }

  // ── REJECTED — show reason + fresh form to resubmit ──────────────────────
  if (status === 'rejected') {
    return `
    <div class="auth-page">
      <div class="auth-card" style="max-width:560px;">

        <!-- Rejection Banner -->
        <div style="background:linear-gradient(135deg,rgba(239,68,68,0.18),rgba(185,28,28,0.1));border:1px solid rgba(239,68,68,0.45);border-radius:14px;padding:18px 20px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <div style="width:40px;height:40px;border-radius:50%;background:rgba(239,68,68,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">❌</div>
            <div>
              <div style="font-weight:700;font-size:16px;color:#f87171;">Verification Not Approved</div>
              <div style="font-size:12px;color:var(--text-sub);">Please review the reason and resubmit below</div>
            </div>
          </div>
          <div style="background:rgba(0,0,0,0.25);border-radius:10px;padding:12px 14px;">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">REJECTION REASON</div>
            <div id="kyc-reject-reason-text" style="font-size:13px;color:#fca5a5;line-height:1.6;">Loading reason...</div>
          </div>
        </div>

        <!-- Divider with instruction -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.1);"></div>
          <div style="font-size:12px;color:var(--text-sub);white-space:nowrap;">📝 Resubmit Your Verification</div>
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.1);"></div>
        </div>

        <!-- Fresh form -->
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
          <label class="form-label">Front Photo of ID <span style="color:#f87171;font-size:11px;">(re-upload clear photo)</span></label>
          <div class="upload-box" onclick="document.getElementById('kyc-front').click()">
            <div class="upload-icon">📄</div><div>Upload front photo of your ID</div>
            <input type="file" id="kyc-front" accept="image/*" style="display:none;" onchange="previewUpload(this,'kyc-front-preview')"/>
            <img id="kyc-front-preview" style="display:none;max-width:100%;margin-top:8px;border-radius:4px;"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Back Photo of ID <span style="color:#f87171;font-size:11px;">(re-upload clear photo)</span></label>
          <div class="upload-box" onclick="document.getElementById('kyc-back').click()">
            <div class="upload-icon">📄</div><div>Upload back photo of your ID</div>
            <input type="file" id="kyc-back" accept="image/*" style="display:none;" onchange="previewUpload(this,'kyc-back-preview')"/>
            <img id="kyc-back-preview" style="display:none;max-width:100%;margin-top:8px;border-radius:4px;"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Selfie Holding Your ID <span style="color:#f87171;font-size:11px;">(face + ID must be clearly visible)</span></label>
          <div class="upload-box" onclick="document.getElementById('kyc-handheld').click()" style="border-color:var(--el-color-primary);">
            <div class="upload-icon">🤳</div><div>Upload a clear selfie holding your ID document</div>
            <input type="file" id="kyc-handheld" accept="image/*" style="display:none;" onchange="previewUpload(this,'kyc-handheld-preview')"/>
            <img id="kyc-handheld-preview" style="display:none;max-width:100%;margin-top:8px;border-radius:4px;"/>
          </div>
        </div>
        <button class="btn-dark auth-submit" style="background:linear-gradient(135deg,#f59e0b,#d97706);border:none;" onclick="submitKYC()">🔄 Resubmit Verification</button>
        <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:10px;">Make sure all photos are clear, well-lit, and unobstructed.</p>
      </div>
    </div>`;
  }

  // ── FORM (unverified / first time) ───────────────────────────────────────
  return `
  <div class="auth-page">
    <div class="auth-card" style="max-width:560px;">
      <div class="auth-brand">
        <div class="auth-tagline">🆔 Identity Verification (KYC)</div>
        <p class="auth-subtitle" style="font-size:13px;">Complete KYC to unlock full withdrawal access. Takes less than 5 minutes.</p>
      </div>

      <!-- Progress steps -->
      <div style="display:flex;align-items:center;gap:0;margin-bottom:24px;">
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--el-color-primary),#7c3aed);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">1</div>
          <div style="font-size:10px;color:var(--el-color-primary);font-weight:600;">Fill Details</div>
        </div>
        <div style="flex:1;height:2px;background:linear-gradient(to right,var(--el-color-primary),rgba(255,255,255,0.1));margin-bottom:16px;"></div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:2px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--text-muted);">2</div>
          <div style="font-size:10px;color:var(--text-muted);">Under Review</div>
        </div>
        <div style="flex:1;height:2px;background:rgba(255,255,255,0.1);margin-bottom:16px;"></div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.1);border:2px dashed rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--text-muted);">3</div>
          <div style="font-size:10px;color:var(--text-muted);">Verified</div>
        </div>
      </div>

      <button class="btn-outline" style="width:100%;height:40px;font-size:13px;margin-bottom:20px;border-radius:10px;color:var(--text-sub);border-color:rgba(255,255,255,0.12);" onclick="navigateTo('assets')">Skip for now →</button>

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

      <button class="btn-dark auth-submit" onclick="submitKYC()">🚀 Submit Verification</button>
      <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:10px;">Your data is encrypted and only used for compliance purposes.</p>
    </div>
  </div>`;
}

// ---- EARN GUIDE (shown after registration, before KYC) ----
function renderEarnGuide() {
  return `
  <div class="auth-page">
    <div class="auth-card" style="max-width:640px;">
      <div class="auth-brand">
        <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" class="auth-brand-logo-img"/>
        <div class="auth-logo">RXDT</div>
        <div class="auth-tagline">How to Earn on RXDT</div>
        <p class="auth-subtitle">Your step-by-step guide to earning on our AI Quantitative Trading Platform</p>
      </div>

      <!-- Step 1: Deposit -->
      <div class="earn-guide-step" style="display:flex;gap:14px;align-items:flex-start;padding:16px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:12px;margin-bottom:12px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(0,242,254,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--el-color-primary);">1</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);margin-bottom:4px;">💰 Deposit Funds</div>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.6;">
            Deposit USDT (ERC-20/TRC-20), BTC, ETH, or USDC via the Assets page. A minimum of <strong style="color:#fff;">$100</strong> unlocks <strong style="color:#fff;">Tier 1</strong> copy trading signals. Higher deposits unlock better tiers and more daily signals.
          </div>
        </div>
      </div>

      <!-- Step 2: AI Signal Copy Trading -->
      <div class="earn-guide-step" style="display:flex;gap:14px;align-items:flex-start;padding:18px;background:linear-gradient(135deg, rgba(0,242,254,0.06), rgba(167,139,250,0.03));border:1px solid rgba(0,242,254,0.3);border-radius:14px;margin-bottom:12px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(0,242,254,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--el-color-primary);">2</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);margin-bottom:4px;">📡 Join AI Signal Copy Trading & Official Strategy Plans</div>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.6;margin-bottom:14px;">
            Go to the <strong style="color:#fff;">Contract</strong> page and join live AI signals at <strong style="color:#00f2fe;">5:00 PM, 6:00 PM, or 7:00 PM EAT</strong>. Your deposit tier determines daily signals & compound return rates:
          </div>

          <!-- 3-Tier Strategy Cards Grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(210px, 1fr));gap:14px;margin-bottom:14px;">
            
            <!-- Tier 1 Card ($100 - $299) -->
            <div style="background:#090d16;border:1px solid #d97706;border-radius:12px;padding:12px;text-align:center;box-shadow:0 6px 16px rgba(0,0,0,0.4);">
              <div style="font-size:12px;font-weight:700;color:#f59e0b;text-transform:uppercase;margin-bottom:4px;">Tier 1 ($100 – $299)</div>
              <div style="font-size:11px;color:var(--text-sub);margin-bottom:8px;">1 Signal Daily (5:00 PM EAT) · <span style="color:#10b981;font-weight:700;">1.4% Daily</span></div>
              <img src="assets/images/rxdt_100_strategy.png" alt="RXDT $100 Strategy Poster" style="width:100%;border-radius:8px;cursor:pointer;border:1px solid rgba(245,158,11,0.3);" onclick="openStrategyModal('100')" />
              <button class="btn-outline" style="width:100%;margin-top:8px;font-size:11px;padding:4px 0;border-color:#f59e0b;color:#f59e0b;" onclick="openStrategyModal('100')">🔍 Zoom $100 Plan</button>
            </div>

            <!-- Tier 2 Card ($300 - $999) -->
            <div style="background:#090d16;border:1px solid #d97706;border-radius:12px;padding:12px;text-align:center;box-shadow:0 6px 16px rgba(0,0,0,0.4);">
              <div style="font-size:12px;font-weight:700;color:#f59e0b;text-transform:uppercase;margin-bottom:4px;">Tier 2 ($300 – $999)</div>
              <div style="font-size:11px;color:var(--text-sub);margin-bottom:8px;">2 Signals Daily (5 & 6 PM) · <span style="color:#10b981;font-weight:700;">2.4% Daily</span></div>
              <img src="assets/images/rxdt_300_strategy.png" alt="RXDT $300 Strategy Poster" style="width:100%;border-radius:8px;cursor:pointer;border:1px solid rgba(245,158,11,0.3);" onclick="openStrategyModal('300')" />
              <button class="btn-outline" style="width:100%;margin-top:8px;font-size:11px;padding:4px 0;border-color:#f59e0b;color:#f59e0b;" onclick="openStrategyModal('300')">🔍 Zoom $300 Plan</button>
            </div>

            <!-- Tier 3 Card ($1,000+) -->
            <div style="background:#090d16;border:1px solid #d97706;border-radius:12px;padding:12px;text-align:center;box-shadow:0 6px 16px rgba(0,0,0,0.4);">
              <div style="font-size:12px;font-weight:700;color:#f59e0b;text-transform:uppercase;margin-bottom:4px;">Tier 3 ($1,000+)</div>
              <div style="font-size:11px;color:var(--text-sub);margin-bottom:8px;">3 Signals Daily (5, 6 & 7 PM) · <span style="color:#10b981;font-weight:700;">3.1% Daily</span></div>
              <img src="assets/images/rxdt_1000_strategy.png" alt="RXDT $1000 Strategy Poster" style="width:100%;border-radius:8px;cursor:pointer;border:1px solid rgba(245,158,11,0.3);" onclick="openStrategyModal('1000')" />
              <button class="btn-outline" style="width:100%;margin-top:8px;font-size:11px;padding:4px 0;border-color:#f59e0b;color:#f59e0b;" onclick="openStrategyModal('1000')">🔍 Zoom $1,000 Plan</button>
            </div>

          </div>
        </div>
      </div>

      <!-- Strategy Zoom Modal -->
      <div class="modal-overlay" id="strategy-poster-modal" onclick="closeStrategyModal()" style="display:none;z-index:9999;">
        <div class="modal-content" style="max-width:850px;background:#090d16;border:1px solid #f59e0b;border-radius:16px;padding:20px;text-align:center;" onclick="event.stopPropagation()">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <strong style="color:#f59e0b;font-size:16px;" id="strategy-modal-title">RXDT 30-Day Investment Growth Strategy</strong>
            <button class="btn-outline" style="padding:4px 12px;" onclick="closeStrategyModal()">✕ Close</button>
          </div>
          <img id="strategy-modal-img" src="" style="width:100%;max-height:80vh;object-fit:contain;border-radius:8px;" />
        </div>
      </div>

      <!-- Step 3: AI Quantitative Models -->
      <div class="earn-guide-step" style="display:flex;gap:14px;align-items:flex-start;padding:16px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:12px;margin-bottom:12px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(0,242,254,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--el-color-primary);">3</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);margin-bottom:4px;">🤖 Allocate Capital to AI Quantitative Models</div>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.6;">
            Visit the <strong style="color:#fff;">AI Trading</strong> page to browse AI quantitative models. Allocate capital to a model and earn <strong style="color:var(--color-up);">1.8%–2.8% daily returns</strong>, with a doubling cycle of <strong style="color:#fff;">26–34 days</strong>.
          </div>
        </div>
      </div>

      <!-- Step 4: Referral -->
      <div class="earn-guide-step" style="display:flex;gap:14px;align-items:flex-start;padding:16px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:12px;margin-bottom:12px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(0,242,254,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--el-color-primary);">4</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);margin-bottom:4px;">👥 Refer Friends & Earn Commissions</div>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.6;">
            Share your invite link from the <strong style="color:#fff;">Refer & Earn</strong> page. Earn <strong style="color:var(--color-up);">7.5% commission</strong> on Level 1 referrals' trading profits, <strong style="color:var(--color-up);">3.75%</strong> on Level 2, and more up the chain. Each referral also grants you a <strong style="color:#00f2fe;">free 8:00 PM EAT signal</strong>!
          </div>
        </div>
      </div>

      <!-- Step 5: Lucky Wheel -->
      <div class="earn-guide-step" style="display:flex;gap:14px;align-items:flex-start;padding:16px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:12px;margin-bottom:12px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(0,242,254,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--el-color-primary);">5</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);margin-bottom:4px;">🎡 Spin the Lucky Wheel</div>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.6;">
            Every deposit earns you lucky wheel spin chances. Win up to <strong style="color:var(--color-up);">$88.88 USDT</strong> per spin. Visit the Lucky Wheel page to try your luck!
          </div>
        </div>
      </div>

      <!-- Step 6: VIP Monthly Salary & Promotion Rewards -->
      <div class="earn-guide-step" style="display:flex;gap:14px;align-items:flex-start;padding:18px;background:linear-gradient(135deg, rgba(245,158,11,0.1), rgba(180,83,9,0.05));border:1px solid #f59e0b;border-radius:14px;margin-bottom:12px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(245,158,11,0.25);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#f59e0b;">6</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:16px;color:#f59e0b;margin-bottom:6px;">🏆 Monthly Salary Reward & Promotion Reward (VIP 1 – VIP 9)</div>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.6;margin-bottom:12px;">
            Build a team to unlock recurring <strong>10-Day Salaries</strong> (automatically distributed on the <strong>3rd, 13th, and 23rd</strong> of each month) plus massive <strong>Promotion Rewards</strong>!
          </div>
          <div style="text-align:center;margin-bottom:8px;">
            <img src="assets/images/rxdt_vip_rewards.png" alt="RXDT Monthly Salary & Promotion Reward Matrix" style="width:100%;max-width:580px;border-radius:10px;border:1px solid rgba(245,158,11,0.4);" />
          </div>
          <div style="font-size:12px;color:#a5b4fc;background:rgba(0,0,0,0.3);padding:10px;border-radius:8px;">
            💡 <strong>Example:</strong> Reach VIP 1 with just 5 direct members to receive <strong>$30 every 10 days</strong> ($90/month) + <strong>$100 Promotion Reward</strong>! Reach VIP 9 for <strong>$3,000 every 10 days</strong> + <strong>$11,000 Promotion Reward</strong>.
          </div>
        </div>
      </div>

      <!-- Step 7: KYC -->
      <div class="earn-guide-step" style="display:flex;gap:14px;align-items:flex-start;padding:16px;background:rgba(0,242,254,0.05);border:1px solid rgba(0,242,254,0.3);border-radius:12px;margin-bottom:12px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(0,242,254,0.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:var(--el-color-primary);">7</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);margin-bottom:4px;">🆔 Complete KYC to Unlock Withdrawals</div>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.6;">
            Verify your identity to unlock withdrawals. KYC takes less than 5 minutes and is required before you can withdraw your earnings.
          </div>
        </div>
      </div>

      <!-- Talk to the CEO on Telegram -->
      <div class="earn-guide-step" style="display:flex;gap:14px;align-items:flex-start;padding:16px;background:rgba(121,40,202,0.12);border:1px solid rgba(167,139,250,0.35);border-radius:12px;margin-bottom:20px;">
        <div style="flex-shrink:0;width:40px;height:40px;border-radius:50%;background:rgba(121,40,202,0.25);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#a78bfa;">💬</div>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:16px;color:#a78bfa;margin-bottom:4px;">💬 Contact CEO on Telegram</div>
          <div style="font-size:13px;color:var(--text-sub);line-height:1.6;">
            Need help or want to speak directly with our CEO <strong style="color:#fff;">Arthur Vance?</strong> Message us on Telegram:
          </div>
          <div style="margin-top:10px;padding:12px;background:rgba(0,0,0,0.25);border-radius:10px;font-size:13px;line-height:2;">
            <div>🔹 <strong>1.</strong> Open Telegram and search for <strong style="color:#00f2fe;">@RXDT888</strong></div>
            <div>🔹 <strong>2.</strong> Or tap this link: <a href="https://t.me/RXDT888" target="_blank" style="color:#00f2fe;font-weight:700;text-decoration:underline;">@RXDT888</a></div>
            <div>🔹 <strong>3.</strong> Start chatting with us directly</div>
          </div>
        </div>
      </div>

      <button class="btn-dark auth-submit" onclick="navigateTo('kyc')">Complete KYC Now →</button>
      <button class="btn-outline" style="width:100%;height:44px;font-size:14px;margin-top:10px;border-radius:10px;color:var(--text-sub);border-color:rgba(255,255,255,0.15);" onclick="navigateTo('home')">Skip to Home →</button>
    </div>
  </div>`;
}

export function init(page) {
  window.openStrategyModal = function (tier) {
    const modal = document.getElementById('strategy-poster-modal');
    const title = document.getElementById('strategy-modal-title');
    const img = document.getElementById('strategy-modal-img');
    if (!modal || !img) return;

    if (tier === '100') {
      title.textContent = 'RXDT $100 Investment Strategy (1.4% Daily · 1 Signal/Day)';
      img.src = 'assets/images/rxdt_100_strategy.png';
    } else if (tier === '300') {
      title.textContent = 'RXDT $300 Investment Strategy (2.4% Daily · 2 Signals/Day)';
      img.src = 'assets/images/rxdt_300_strategy.png';
    } else if (tier === '1000') {
      title.textContent = 'RXDT $1,000 Investment Strategy (3.1% Daily · 3 Signals/Day)';
      img.src = 'assets/images/rxdt_1000_strategy.png';
    }
    modal.style.display = 'flex';
  };

  window.closeStrategyModal = function () {
    const modal = document.getElementById('strategy-poster-modal');
    if (modal) modal.style.display = 'none';
  };

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
      setTimeout(() => { window.location.hash = '#/earn-guide'; }, 500);
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

    // Compress and resize the image before storing as base64
    // This reduces payload size from ~5-10MB per image to ~100-300KB
    const reader = new FileReader();
    reader.onload = (e) => {
      const tempImg = new Image();
      tempImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Max dimension: 1200px (preserves quality while reducing size)
        const MAX_DIM = 1200;
        let { width, height } = tempImg;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(tempImg, 0, 0, width, height);

        // Export as JPEG with 80% quality (much smaller than PNG)
        const compressed = canvas.toDataURL('image/jpeg', 0.8);

        const previewImg = document.getElementById(previewId);
        if (previewImg) {
          previewImg.src = compressed;
          previewImg.style.display = 'block';
        }
      };
      tempImg.onerror = () => {
        // Fallback: use original if compression fails
        const previewImg = document.getElementById(previewId);
        if (previewImg) { previewImg.src = e.target.result; previewImg.style.display = 'block'; }
      };
      tempImg.src = e.target.result;
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

  // Fetch full KYC record (rejection reason + submitted details)
  async function loadKycDetails() {
    try {
      const token = localStorage.getItem('rxdt_token');
      if (!token) return;
      const res = await fetch('/api/kyc/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const record = data.record;

      // --- Rejection reason ---
      const reasonEl = document.getElementById('kyc-reject-reason-text');
      if (reasonEl) {
        reasonEl.textContent = record?.reject_reason ||
          'Documents were not clear enough. Please ensure all photos are well-lit and clearly readable.';
      }

      // --- Pending submitted details ---
      const detailsEl = document.getElementById('kyc-pending-details');
      if (detailsEl && record) {
        const docLabel = { idCard: 'ID Card', passport: 'Passport', driverLicense: "Driver's License" };
        const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
        detailsEl.innerHTML = `
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📋 Submitted Details</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:9px 12px;">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px;">FULL NAME</div>
              <div style="font-size:13px;color:var(--text-main);font-weight:600;">${record.real_name || '—'}</div>
            </div>
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:9px 12px;">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px;">DOCUMENT</div>
              <div style="font-size:13px;color:var(--text-main);font-weight:600;">${docLabel[record.document_type] || record.document_type || '—'}</div>
            </div>
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:9px 12px;">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px;">NATIONALITY</div>
              <div style="font-size:13px;color:var(--text-main);font-weight:600;">${record.nationality || '—'}</div>
            </div>
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:9px 12px;">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:2px;">SUBMITTED ON</div>
              <div style="font-size:13px;color:var(--text-main);font-weight:600;">${fmt(record.created_at)}</div>
            </div>
          </div>`;
      } else if (detailsEl) {
        detailsEl.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📋 Submitted Details</div><div style="font-size:13px;color:var(--text-sub);">Details not available.</div>`;
      }
    } catch (e) {
      console.warn('Failed to fetch KYC details:', e);
    }
  }

  // Load details on KYC page for pending and rejected states
  if (page === 'kyc') {
    const user = store.getUser();
    const kycStatus = user?.kycStatus;
    if (kycStatus === 'rejected' || kycStatus === 'pending') {
      loadKycDetails();
    }

    // ── LIVE KYC STATUS POLLING ──────────────────────────────────────────
    // While the user is on the KYC page with a pending submission, poll the
    // backend every 5 seconds. When the admin approves or rejects, the page
    // re-renders IN PLACE so the user sees the verified certificate or the
    // rejection + fresh resubmit form without needing to refresh/navigate.
    if (kycStatus === 'pending') {
      // Clear any previous poller (e.g. if the page was re-rendered)
      if (window.__kycPollTimer) { clearInterval(window.__kycPollTimer); window.__kycPollTimer = null; }

      window.__kycPollTimer = setInterval(async () => {
        try {
          const token = localStorage.getItem('rxdt_token');
          if (!token) return;
          const res = await fetch('/api/kyc/status', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          const liveStatus = data.kycStatus;

          // Only re-render if the status actually changed from pending
          if (liveStatus && liveStatus !== 'pending') {
            // Stop polling — status resolved
            if (window.__kycPollTimer) { clearInterval(window.__kycPollTimer); window.__kycPollTimer = null; }

            // Update local user state so the renderer shows the new status
            const u = store.getUser();
            if (u) {
              u.kycStatus = liveStatus;
              localStorage.setItem('rxdt_user', JSON.stringify(u));
            }

            // Re-render the KYC page in place
            const container = document.getElementById('page-content');
            if (container) {
              container.innerHTML = renderKYC();
              init(page);
            }

            // Notify the user of the status change
            if (liveStatus === 'pass') {
              toast('🎉 Congratulations! Your KYC has been approved.', 'success');
            } else if (liveStatus === 'rejected') {
              toast('Your KYC was not approved. Please review the reason and resubmit.', 'error');
            }
          }
        } catch (e) {
          // Silent — transient network errors shouldn't spam the user
        }
      }, 5000);
    }
  }

  // retryKYC is no longer needed (rejected state shows the form inline)
  // Kept as no-op for any lingering references
  window.retryKYC = function () {
    // No-op: rejected state already shows the resubmit form inline
  };

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
      toast('✅ KYC submitted! Our team is now reviewing your documents.', 'success');
      // Update local user state to pending so the pending view renders immediately
      const u = store.getUser();
      if (u) {
        u.kycStatus = 'pending';
        localStorage.setItem('rxdt_user', JSON.stringify(u));
      }
      // Re-render KYC page in place (stay on #/kyc, show pending state)
      const container = document.getElementById('page-content');
      if (container) {
        container.innerHTML = renderKYC();
        init(page);
      }
    } catch (err) {
      toast(err.message || 'Failed to submit KYC', 'error');
      if (btn) {
        btn.disabled = false;
        // Restore the correct label based on the current page state
        const u = store.getUser();
        btn.textContent = u?.kycStatus === 'rejected' ? '🔄 Resubmit Verification' : '🚀 Submit Verification';
      }
    }
  };

  window.toast = toast;
}

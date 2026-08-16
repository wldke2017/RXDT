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

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function auditBadge(status) {
  const map = { success: ['badge-success', 'Approved'], pending: ['badge-warning', 'Pending'], failed: ['badge-danger', 'Failed'], rejected: ['badge-danger', 'Rejected'], processing: ['badge-info', 'Processing'], completed: ['badge-success', 'Completed'] };
  const [cls, lbl] = map[status] || ['badge-info', status];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

export function render(page) {
  if (page === 'recharge') return renderRecharge();
  if (page === 'withdraw') return renderWithdraw();
  if (page === 'bind-address') return renderBindAddress();
  if (page === 'account-change') return renderAccountChange();
  return renderAssets();
}

// ---- ASSETS OVERVIEW ----
function renderAssets() {
  const user = store.getUser();

  return `
  <div>
    <h1 class="page-title">My Assets</h1>

    <!-- Assets Summary Card -->
    <div class="assets-summary-card">
      <div class="summary-label">Total Assets (USDT)</div>
      <div class="summary-total">$${fmt(user.totalAssets)}</div>
      <div class="summary-row">
        <div class="summary-item">
          <span class="si-label">Available Balance</span>
          <span class="si-val">$${fmt(user.availableBalance)}</span>
        </div>
        <div class="summary-item">
          <span class="si-label">In Orders</span>
          <span class="si-val">$${fmt(user.frozenBalance)}</span>
        </div>
        <div class="summary-item">
          <span class="si-label">Total Earnings</span>
          <span class="si-val price-up">+$${fmt(user.totalEarnings)}</span>
        </div>
      </div>
      <div class="assets-action-row">
        <button class="btn-dark" onclick="navigateTo('recharge')">⬆ Deposit</button>
        <button class="btn-outline" onclick="navigateTo('withdraw')">⬇ Withdraw</button>
      </div>
    </div>

    <!-- Quick Menu -->
    <div class="assets-menu-grid">
      <div class="amenu-item" onclick="navigateTo('account-change')">
        <div class="amenu-icon">📋</div>
        <div class="amenu-label">Account Change Log</div>
        <div class="amenu-arrow">›</div>
      </div>
      <div class="amenu-item" onclick="navigateTo('bind-address')">
        <div class="amenu-icon">🔗</div>
        <div class="amenu-label">Bind Withdrawal Address</div>
        <div class="amenu-arrow">›</div>
      </div>
      <div class="amenu-item" onclick="navigateTo('invite-friends')">
        <div class="amenu-icon">👥</div>
        <div class="amenu-label">Invite Friends</div>
        <div class="amenu-arrow">›</div>
      </div>
      <div class="amenu-item" onclick="navigateTo('lucky-wheel')">
        <div class="amenu-icon">🎡</div>
        <div class="amenu-label">Lucky Wheel</div>
        <div class="amenu-arrow">›</div>
      </div>
      <div class="amenu-item" onclick="navigateTo('security-settings')">
        <div class="amenu-icon">🔒</div>
        <div class="amenu-label">Security Settings</div>
        <div class="amenu-arrow">›</div>
      </div>
      <div class="amenu-item" onclick="navigateTo('customer-service')">
        <div class="amenu-icon">💬</div>
        <div class="amenu-label">Customer Service</div>
        <div class="amenu-arrow">›</div>
      </div>
    </div>

    <!-- KYC Notice -->
    ${user.kycStatus !== 'pass' ? `
    <div class="kyc-notice" onclick="navigateTo('kyc')">
      ⚠️ Please complete identity verification (KYC) before making withdrawals.
      <span class="link" style="margin-left:8px;">Verify Now →</span>
    </div>
    ` : ''}
  </div>`;
}

// ---- DEPOSIT (RECHARGE) ----
function renderRecharge() {
  const deposits = store.getDeposits();

  return `
  <div>
    <div class="page-header">
      <button class="btn-back" onclick="navigateTo('assets')">← Back</button>
      <h1 class="page-title">Deposit Crypto</h1>
    </div>

    <!-- Deposit Form Container -->
    <div class="card" style="max-width:580px;margin:0 auto 24px;">
      <div class="tabs-header" style="margin-bottom:20px;">
        <button class="tab-btn active" onclick="switchAssetTab('deposit',this)">Deposit</button>
        <button class="tab-btn" onclick="navigateTo('withdraw')">Withdraw</button>
      </div>

      <!-- Coin Selection Cards & Dropdown -->
      <div class="form-group">
        <label class="form-label" style="font-weight:700;">Select Crypto Asset</label>
        
        <div class="coin-selector-grid">
          <div class="crypto-coin-card active" id="coin-card-USDT" onclick="selectCryptoCoinCard('USDT')">
            <div class="crypto-coin-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path d="M17.922 17.383c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v-2.036h8.795c.164.78.257 1.637.257 2.528 0 1.258-.182 2.457-.514 3.553h-2.673c.189-.607.3-1.28.3-2.003 0-.74-.117-1.428-.312-2.042h-1.94v.004zM16.03 8c4.354 0 7.971 1.057 8.374 2.443h-16.748c.403-1.386 4.02-2.443 8.374-2.443zm8.38 3.52c-.413 1.343-4.004 2.37-8.38 2.37-4.376 0-7.967-1.027-8.38-2.37h16.76zm-8.38 3.427c1.378 0 2.651-.044 3.666-.12v1.884c-1.015.068-2.288.106-3.666.106-1.378 0-2.651-.038-3.666-.106v-1.884c1.015.076 2.288.12 3.666.12zm0-4.015c-3.14 0-5.908-.574-6.496-1.372h12.992c-.588.798-3.356 1.372-6.496 1.372z" fill="#FFF"/></svg>
            </div>
            <div>
              <div class="crypto-coin-symbol">USDT</div>
              <div class="crypto-coin-name">Tether</div>
            </div>
          </div>

          <div class="crypto-coin-card" id="coin-card-USDC" onclick="selectCryptoCoinCard('USDC')">
            <div class="crypto-coin-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#2775CA"/><path d="M16 6a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v2.1c1.5.3 2.5 1.4 2.5 2.9 0 1.6-1.2 2.6-3 3-1.4.3-1.8.6-1.8 1.2 0 .6.5 1.1 1.5 1.1 1.2 0 2.2-.6 2.6-1.5l1.6.7c-.6 1.5-2 2.5-3.8 2.7V23h-2v-2.1c-1.6-.3-2.6-1.5-2.6-3 0-1.7 1.3-2.6 3-3 1.3-.3 1.8-.6 1.8-1.2 0-.5-.5-1-1.3-1-1.1 0-2 .5-2.4 1.3l-1.6-.8c.7-1.4 2-2.3 3.6-2.6V11z" fill="#FFF"/></svg>
            </div>
            <div>
              <div class="crypto-coin-symbol">USDC</div>
              <div class="crypto-coin-name">USD Coin</div>
            </div>
          </div>

          <div class="crypto-coin-card" id="coin-card-BTC" onclick="selectCryptoCoinCard('BTC')">
            <div class="crypto-coin-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#F7931A"/><path d="M22.7 13.6c.3-2.1-1.3-3.2-3.5-4l.7-2.9-1.8-.4-.7 2.8c-.5-.1-1-.2-1.5-.3l.7-2.8-1.8-.4-.7 2.9-3.7-.9v2.4s1.3.3 1.3.3c.7.2.9.6.8 1l-.8 3.3c0 .1.1.2 0 .2l-1.2 4.7c-.1.3-.4.6-.9.5 0 0-1.3-.3-1.3-.3l-.4 2.8 3.5.9c.7.2 1.3.3 2 .5l-.7 2.9 1.8.4.7-2.8c.5.1 1 .2 1.5.3l-.7 2.8 1.8.4.7-2.9c3 .6 5.3.3 6.3-2.4.8-2.2 0-3.4-1.6-4.2 1.2-.3 2-1 2.3-2.5zm-4.1 5.3c-.6 2.3-4.3 1-5.5.7l1-4c1.2.3 5.1 1 4.5 3.3zm.5-5.4c-.5 2.1-3.6.9-4.6.7l.9-3.6c1 .3 4.3.8 3.7 2.9z" fill="#FFF"/></svg>
            </div>
            <div>
              <div class="crypto-coin-symbol">BTC</div>
              <div class="crypto-coin-name">Bitcoin</div>
            </div>
          </div>

          <div class="crypto-coin-card" id="coin-card-ETH" onclick="selectCryptoCoinCard('ETH')">
            <div class="crypto-coin-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#627EEA"/><path d="M16 4L9.5 14.8 16 18.6l6.5-3.8L16 4z" fill="#FFF" fill-opacity=".6"/><path d="M16 4l6.5 10.8L16 18.6V4z" fill="#FFF"/><path d="M16 19.9l-6.5-3.8L16 26.5l6.5-10.4-6.5 3.8z" fill="#FFF" fill-opacity=".6"/><path d="M16 19.9v6.6l6.5-10.4L16 19.9z" fill="#FFF"/><path d="M16 17.4L9.5 13.6 16 10.7l6.5 2.9-6.5 3.8z" fill="#FFF" fill-opacity=".2"/><path d="M16 10.7v6.7l6.5-3.8-6.5-2.9z" fill="#FFF" fill-opacity=".6"/></svg>
            </div>
            <div>
              <div class="crypto-coin-symbol">ETH</div>
              <div class="crypto-coin-name">Ethereum</div>
            </div>
          </div>
        </div>

        <div class="custom-select-box">
          <select class="form-control" id="dep-coin-select" onchange="selectCryptoCoinCard(this.value)">
            <option value="USDT">USDT (Tether)</option>
            <option value="USDC">USDC (USD Coin)</option>
            <option value="BTC">BTC (Bitcoin)</option>
            <option value="ETH">ETH (Ethereum)</option>
          </select>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text-sub);margin-top:8px;" id="dep-rate-display">
          Rate: <strong style="color:var(--text-main);">1 USDT = 1 USD</strong>
        </div>
      </div>

      <!-- Network Selection Dropdown -->
      <div class="card-glass" style="padding:16px;border-radius:12px;margin-bottom:20px;border:1px solid var(--border-color);">
        <label class="form-label" style="font-weight:700;">Select Network</label>
        <select class="form-control" id="dep-network-select" onchange="onDepNetworkChange(this.value)">
          <option value="TRC20">TRX — Tron (TRC20)</option>
          <option value="ERC20">ETH — Ethereum (ERC20)</option>
          <option value="BEP20">BSC — BNB Smart Chain (BEP20)</option>
        </select>
      </div>

      <!-- Amount Entry -->
      <div class="form-group">
        <label class="form-label" style="font-weight:700;">Amount (USD)</label>
        <input type="number" id="dep-amount-input" class="form-control" placeholder="Enter amount (USD)" oninput="updateDepCryptoApprox(this.value)"/>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:13px;">
          <span style="color:var(--text-sub);font-weight:600;" id="dep-approx-val">≈ 0.00000000 USDT</span>
          <span style="color:var(--text-muted);">Minimum: <strong style="color:var(--el-color-primary);">(10 USDT)</strong></span>
        </div>
      </div>

      <!-- Deposit Action Button -->
      <button class="btn-primary" style="width:100%;height:52px;font-size:17px;font-weight:800;border-radius:100px;margin-top:12px;" onclick="handleDepositSubmit()">
        Deposit
      </button>

      <!-- Important Notice Box -->
      <div style="margin-top:24px;border-top:1px solid var(--border-color);padding-top:16px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-sub);margin-bottom:8px;">Important Notice</div>
        <ul style="font-size:12px;color:var(--text-muted);line-height:1.7;padding-left:16px;">
          <li>Do not deposit any non-USDT assets, otherwise the assets cannot be recovered.</li>
          <li>USDT deposits only support simple send method. Deposits using other methods (send all) may not be credited temporarily.</li>
          <li>After depositing to the above address, it requires confirmation by the entire network nodes. The deposit will be credited after 6 network confirmations.</li>
          <li>Please ensure the security of your computer and browser to prevent information tampering or leakage.</li>
        </ul>
      </div>
    </div>

    <!-- Deposit History -->
    <div class="card">
      <div class="card-title">Deposit History</div>
      ${deposits.length === 0 ? `
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No deposit history found.</div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${deposits.map(d => `
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:12px;padding:14px 16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="font-weight:700;font-size:15px;color:var(--text-main);display:flex;align-items:center;gap:6px;">
                  <span>💳</span> ${d.coin} (${d.network})
                </div>
                <div>${auditBadge(d.auditStatus)}</div>
              </div>

              <div style="background:rgba(0,0,0,0.2);padding:10px 12px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <span style="color:var(--text-muted);font-size:12px;">Deposit Amount</span>
                <strong style="color:#00c49a;font-size:16px;">+$${fmt(d.amount)}</strong>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-muted);border-top:1px dashed var(--border-color);padding-top:6px;margin-top:4px;">
                <span>Order #${d.orderNumber}</span>
                <span>${d.time}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Checkout / Awaiting Payment Modal Overlay -->
    <div class="modal-overlay" id="checkout-modal">
      <div class="modal-content" style="max-width:520px;padding:24px;background:var(--bg-card);border-radius:16px;" id="checkout-modal-body">
        <!-- Rendered dynamically upon pressing Deposit -->
      </div>
    </div>
  </div>`;
}

function renderNetworkOptions(coinData) {
  return coinData.networks.map((net, i) => `
    <div class="network-option ${i === 0 ? 'active' : ''}" onclick="selectNetwork('${coinData.coin}','${net.name}',this)">
      <div class="network-name">${net.name}</div>
      <div class="network-meta">~${net.confirmations} confirmations · Rate: ${fmt(net.rate)}</div>
    </div>
  `).join('');
}

function renderDepositAddress(network, coin) {
  const shortAddr = network.address.slice(0, 20) + '...' + network.address.slice(-6);
  return `
    <div class="card-title">Deposit Address</div>
    <div style="text-align:center;padding:20px 0;">
      <div class="qr-placeholder" style="margin:0 auto 20px;">
        <div class="qr-mock" style="border:2px solid var(--border-color);padding:20px;border-radius:8px;display:inline-block;">
          <div style="font-size:40px;">📦</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">QR Code</div>
        </div>
      </div>
      <div class="address-box">
        <code id="dep-address">${shortAddr}</code>
        <button class="btn-outline" style="padding:6px 12px;font-size:12px;" onclick="copyAddress('${network.address}')">Copy</button>
      </div>
      <div style="margin-top:12px;font-size:13px;color:var(--text-muted);">Network: ${network.name} · ${network.confirmations} confirmations required</div>
    </div>
    <div class="deposit-notice">
      <strong>⚠️ Important Notes</strong><br/>
      • Only send <strong>${coin}</strong> to this address, or assets will not be recoverable.<br/>
      • Only supports <code>simple send</code> method.<br/>
      • Balance credited after all network confirmations.<br/>
      • Ensure browser and computer security.
    </div>`;
}

// ---- WITHDRAW ----
function renderWithdraw() {
  const user = store.getUser();
  const withdrawals = store.getWithdrawals();
  const addresses = store.getBindAddresses();
  const boundCrypto = addresses.find(a => a.method === 'crypto');
  const isBound = !!boundCrypto;
  const hasTxnPassword = !!user?.hasTransactionPassword;

  return `
  <div>
    <div class="page-header">
      <button class="btn-back" onclick="navigateTo('assets')">← Back</button>
      <h1 class="page-title">Withdraw Funds</h1>
    </div>

    <div class="card">
      <div class="card-title">Available Balance</div>
      <div style="font-size:32px;font-weight:700;color:var(--el-color-primary);margin-bottom:4px;">$${fmt(user.availableBalance)}</div>
      <div style="font-size:13px;color:var(--text-muted);">Withdrawal window: 09:00 – 18:00 (UTC-4) · No weekends</div>
    </div>

    <div class="card">
      <div class="card-title">Withdrawal Details</div>

      <div id="withdraw-crypto-panel">
        ${isBound ? `
          <div class="form-group">
            <label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">
              <span>Permanently Bound Wallet Address</span>
              <span class="badge badge-success" style="font-size:11px;">🔒 Bound & Locked</span>
            </label>
            <div style="background:rgba(0,196,154,0.08);border:1px solid rgba(0,196,154,0.3);border-radius:10px;padding:12px;margin-bottom:12px;">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">${boundCrypto.coin} (${boundCrypto.network})</div>
              <code style="font-size:14px;color:#00c49a;word-break:break-all;font-weight:600;">${boundCrypto.address}</code>
            </div>
            <input type="hidden" id="withdraw-address" value="${boundCrypto.address}"/>
            <input type="hidden" id="withdraw-coin" value="${boundCrypto.coin}"/>
            <input type="hidden" id="withdraw-network" value="${boundCrypto.network}"/>
          </div>
        ` : `
          <div class="form-group">
            <label class="form-label">Withdrawal Wallet Address</label>
            <input type="text" id="withdraw-address" class="form-control" placeholder="Click 'Bind Address' below to bind" readonly style="opacity:0.7;cursor:not-allowed;"/>
          </div>
        `}
      </div>

      <div class="form-group">
        <label class="form-label">Withdrawal Amount (USDT)</label>
        <div style="display:flex;gap:8px;">
          <input type="number" id="withdraw-amount" class="form-control" placeholder="Enter amount"
            oninput="calcWithdrawFee(this.value)"/>
          <button class="btn-outline" onclick="document.getElementById('withdraw-amount').value='${Math.floor(user.availableBalance)}'">Max</button>
        </div>
      </div>
      <div id="withdraw-fee-calc" style="font-size:13px;color:var(--text-muted);margin-bottom:16px;"></div>

      <div class="form-group">
        <label class="form-label">Transaction Password</label>
        <div class="input-suffix">
          <input type="password" id="withdraw-txn-pwd" class="form-control" placeholder="Enter 6-digit transaction password" maxlength="6" oninput="this.value = this.value.replace(/[^0-9]/g, '')"/>
          <button class="pwd-toggle" onclick="togglePwd('withdraw-txn-pwd')">👁</button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Required to authorize this withdrawal. Set it in Security Settings if not set.</div>
      </div>

      <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" ${!isBound ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="submitWithdrawal()">Submit Withdrawal</button>
    </div>

    <!-- Mandatory Bind Address Modal overlay when address is not bound -->
    ${!isBound ? `
      <div class="modal-overlay active" id="mandatory-bind-modal">
        <div class="modal-content" style="max-width:440px;background:var(--bg-card);border-radius:16px;padding:24px;">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:40px;margin-bottom:8px;">🔒</div>
            <h3 style="margin:0;font-size:18px;font-weight:700;">Withdrawal Address Not Bound</h3>
            <p style="font-size:13px;color:var(--text-muted);margin-top:6px;margin-bottom:0;">
              You must bind a withdrawal wallet address before withdrawing funds. Once bound, this address is permanently fixed for all withdrawals.
            </p>
          </div>

          <div id="bind-modal-step1">
            <div style="display:flex;gap:12px;margin-top:20px;">
              <button class="btn-outline" style="flex:1;height:44px;font-size:14px;" onclick="navigateTo('assets')">Cancel</button>
              <button class="btn-primary" style="flex:1;height:44px;font-size:14px;" onclick="showMandatoryBindForm()">Bind Now</button>
            </div>
          </div>

          <div id="bind-modal-step2" style="display:none;margin-top:16px;">
            <div class="form-group">
              <label class="form-label">Select Coin</label>
              <select class="form-control" id="modal-bind-coin" onchange="updateBindNetworkOptions('modal-bind-coin','modal-bind-network'); validateBindAddress('modal-bind-address','modal-bind-network','modal-bind-detect');">
                <option value="USDT">USDT</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Select Network</label>
              <select class="form-control" id="modal-bind-network" onchange="validateBindAddress('modal-bind-address','modal-bind-network','modal-bind-detect');">
                <option value="TRC-20">TRC-20 (Tron)</option>
                <option value="ERC-20">ERC-20 (Ethereum)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Wallet Address</label>
              <input type="text" id="modal-bind-address" class="form-control"
                placeholder="Paste your wallet address here"
                oninput="validateBindAddress('modal-bind-address','modal-bind-network','modal-bind-detect')"
                style="font-family:monospace;font-size:13px;"
              />
              <!-- Auto-detect feedback -->
              <div id="modal-bind-detect" style="margin-top:6px;font-size:12px;min-height:18px;"></div>
            </div>
            <div style="display:flex;gap:12px;margin-top:20px;">
              <button class="btn-outline" style="flex:1;height:44px;font-size:14px;" onclick="hideMandatoryBindForm()">Back</button>
              <button class="btn-primary" id="modal-bind-submit-btn" style="flex:1;height:44px;font-size:14px;" onclick="submitMandatoryBindAddress()">Confirm Binding</button>
            </div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Mandatory Set Transaction Password Modal overlay when address is bound but transaction password not set -->
    ${(isBound && !hasTxnPassword) ? `
      <div class="modal-overlay active" id="mandatory-txn-modal">
        <div class="modal-content" style="max-width:440px;background:var(--bg-card);border-radius:16px;padding:24px;">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:40px;margin-bottom:8px;">🛡️</div>
            <h3 style="margin:0;font-size:18px;font-weight:700;">Set Transaction Password Required</h3>
            <p style="font-size:13px;color:var(--text-muted);margin-top:8px;margin-bottom:0;line-height:1.5;">
              You have bound a withdrawal wallet address, but you must set a <strong>strictly 6-digit transaction password</strong> before submitting withdrawal requests.
            </p>
          </div>
          <div style="display:flex;gap:12px;margin-top:20px;">
            <button class="btn-outline" style="flex:1;height:44px;font-size:14px;" onclick="navigateTo('assets')">Cancel</button>
            <button class="btn-primary" style="flex:1;height:44px;font-size:14px;" onclick="navigateTo('profile'); setTimeout(() => window.openSetTxnPasswordModal &amp;&amp; window.openSetTxnPasswordModal(), 350);">Set Password Now</button>
          </div>
        </div>
      </div>
    ` : ''}


    <!-- Withdrawal History -->
    <div class="card">
      <div class="card-title">Withdrawal History</div>
      ${withdrawals.length === 0 ? `
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No withdrawal history found.</div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${withdrawals.map(w => `
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:12px;padding:14px 16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="font-weight:700;font-size:15px;color:var(--text-main);display:flex;align-items:center;gap:6px;">
                  <span>💸</span> ${w.coin} (${w.network})
                </div>
                <div>${auditBadge(w.status)}</div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:8px;background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;">
                <div>
                  <span style="color:var(--text-muted);font-size:11px;display:block;">Amount Requested</span>
                  <strong style="color:#00d4ff;font-size:14px;">$${fmt(w.amount)}</strong>
                </div>
                <div>
                  <span style="color:var(--text-muted);font-size:11px;display:block;">Fee</span>
                  <span style="color:var(--text-sub);font-size:13px;">$${fmt(w.fee)}</span>
                </div>
              </div>

              ${w.address ? `
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;word-break:break-all;">
                  <strong>To:</strong> <code style="color:var(--text-sub);">${w.address}</code>
                </div>
              ` : ''}

              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-muted);border-top:1px dashed var(--border-color);padding-top:6px;margin-top:4px;">
                <span>Order #${w.orderNumber}</span>
                <span>${w.time}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </div>`;

}

// ---- BIND ADDRESS ----
function renderBindAddress() {
  const addresses = store.getBindAddresses();
  return `
  <div>
    <div class="page-header">
      <button class="btn-back" onclick="navigateTo('withdraw')">← Back</button>
      <h1 class="page-title">Bind Withdrawal Address</h1>
    </div>

    <!-- Existing Addresses -->
    ${addresses.length ? `
    <div class="card">
      <div class="card-title">Saved Addresses</div>
      ${addresses.map(a => `
        <div class="bind-addr-card">
          <div class="bind-addr-icon">${a.method === 'crypto' ? '🔗' : '🏦'}</div>
          <div class="bind-addr-info">
            ${a.method === 'crypto'
      ? `<div class="bai-main">${a.coin} (${a.network})</div><div class="bai-sub">${a.address}</div>`
      : `<div class="bai-main">${a.bankName} · ${a.branchName}</div><div class="bai-sub">${a.cardNumber}</div>`
    }
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Add New Address -->
    <div class="card">
      <div class="card-title">Bind Crypto Wallet Address</div>

      <div id="bind-crypto-panel">
        <div class="form-group">
          <label class="form-label">Select Coin</label>
          <select class="form-control" id="bind-coin" onchange="updateBindNetworkOptions('bind-coin','bind-network'); validateBindAddress('bind-address-val','bind-network','bind-addr-detect');">
            <option value="USDT">USDT</option>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Select Network</label>
          <select class="form-control" id="bind-network" onchange="validateBindAddress('bind-address-val','bind-network','bind-addr-detect');">
            <option value="TRC-20">TRC-20 (Tron)</option>
            <option value="ERC-20">ERC-20 (Ethereum)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Wallet Address</label>
          <input type="text" id="bind-address-val" class="form-control"
            placeholder="Paste your wallet address here"
            oninput="validateBindAddress('bind-address-val','bind-network','bind-addr-detect')"
            style="font-family:monospace;font-size:13px;"
          />
          <!-- Auto-detect feedback -->
          <div id="bind-addr-detect" style="margin-top:6px;font-size:12px;min-height:18px;"></div>
        </div>
      </div>

      <button class="btn-dark" id="bind-submit-btn" style="width:100%;height:48px;font-size:16px;" onclick="submitBindAddress()">Bind Address</button>
    </div>

  </div>`;
}



// ---- ACCOUNT CHANGE LOG ----
function renderAccountChange() {
  const changes = store.getAccountChanges();
  return `
  <div>
    <div class="page-header">
      <button class="btn-back" onclick="navigateTo('assets')">← Back</button>
      <h1 class="page-title">Account Change Log</h1>
    </div>

    <div class="card">
      <div class="card-title">Transaction History</div>
      ${changes.length === 0 ? `
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No account changes found.</div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${changes.map(c => `
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:12px;padding:14px 16px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span class="badge ${c.amount >= 0 ? 'badge-success' : 'badge-danger'}" style="font-size:12px;">${c.type}</span>
                <span style="font-size:11px;color:var(--text-muted);">${c.time}</span>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:8px;background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;">
                <div>
                  <span style="color:var(--text-muted);font-size:11px;display:block;">Amount</span>
                  <strong class="${c.amount >= 0 ? 'price-up' : 'price-down'}" style="font-size:15px;">
                    ${c.amount >= 0 ? '+' : ''}$${fmt(Math.abs(c.amount))}
                  </strong>
                </div>
                <div>
                  <span style="color:var(--text-muted);font-size:11px;display:block;">Balance After</span>
                  <span style="color:var(--text-main);font-weight:600;font-size:14px;">$${fmt(c.balance || c.balanceAfter)}</span>
                </div>
              </div>

              ${c.remark ? `
                <div style="font-size:12px;color:var(--text-sub);border-top:1px dashed var(--border-color);padding-top:6px;margin-top:4px;">
                  💬 ${c.remark}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  </div>`;
}

export function init(page) {
  window.toast = toast;

  let depositTimerInterval = null;

  // ── Real Wallet Addresses per Coin + Network ──
  const DEPOSIT_ADDRESSES = {
    'USDT': {
      'TRC20': 'TAXazbRgUPdJvBkrRKZpzT8qD7erJAhaU1',
      'ERC20': '0xaff3696164faaa572018494701688b8c326c98de',
      'BEP20': '0xaff3696164faaa572018494701688b8c326c98de',
    },
    'USDC': {
      'ERC20': '0xaff3696164faaa572018494701688b8c326c98de',
      'BEP20': '0xaff3696164faaa572018494701688b8c326c98de',
    },
    'BTC': {
      'BTC': '1HaFqtZeHBa99Lvs884vURfTW9TLp7wTBZ',
    },
    'ETH': {
      'BEP20': '0xaff3696164faaa572018494701688b8c326c98de',
    },
  };

  // Networks available per coin
  const COIN_NETWORKS = {
    'USDT': [
      { value: 'TRC20', label: 'TRX — Tron (TRC20)' },
      { value: 'ERC20', label: 'ETH — Ethereum (ERC20)' },
      { value: 'BEP20', label: 'BSC — BNB Smart Chain (BEP20)' },
    ],
    'USDC': [
      { value: 'ERC20', label: 'ETH — Ethereum (ERC20)' },
      { value: 'BEP20', label: 'BSC — BNB Smart Chain (BEP20)' },
    ],
    'BTC': [
      { value: 'BTC', label: 'BTC — Bitcoin Network' },
    ],
    'ETH': [
      { value: 'BEP20', label: 'BSC — BNB Smart Chain (BEP20)' },
    ],
  };

  window.selectCryptoCoinCard = function (coin) {
    document.querySelectorAll('.crypto-coin-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`coin-card-${coin}`);
    if (activeCard) activeCard.classList.add('active');

    const selectEl = document.getElementById('dep-coin-select');
    if (selectEl && selectEl.value !== coin) {
      selectEl.value = coin;
    }
    window.onDepCoinChange(coin);
  };

  window.onDepCoinChange = function (coin) {
    // Update network options for selected coin
    const netSel = document.getElementById('dep-network-select');
    if (netSel) {
      const opts = COIN_NETWORKS[coin] || [];
      netSel.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    }
    // Update rate label
    const rateEl = document.getElementById('dep-rate-display');
    if (rateEl) {
      const rateMap = { USDT: '1 USDT = 1 USD', USDC: '1 USDC = 1 USD', BTC: '1 BTC ≈ market price', ETH: '1 ETH ≈ market price' };
      rateEl.innerHTML = `Rate: <strong style="color:var(--text-main);">${rateMap[coin] || ''}</strong>`;
    }
    const amountVal = document.getElementById('dep-amount-input')?.value || 0;
    window.updateDepCryptoApprox(amountVal);
  };

  window.onDepNetworkChange = function (network) {
    // nothing extra needed - address will be read on submit
  };

  window.updateDepCryptoApprox = function (val) {
    const el = document.getElementById('dep-approx-val');
    const coin = document.getElementById('dep-coin-select')?.value || 'USDT';
    const num = parseFloat(val) || 0;
    if (el) {
      el.textContent = `≈ ${num.toFixed(8)} ${coin}`;
    }
  };

  window.handleDepositSubmit = async function () {
    const coin = document.getElementById('dep-coin-select')?.value || 'USDT';
    const network = document.getElementById('dep-network-select')?.value || 'TRC20';
    const amount = parseFloat(document.getElementById('dep-amount-input')?.value || 0);

    if (!amount || amount < 10) {
      toast('Minimum deposit amount is $10 USDT', 'error');
      return;
    }

    // Resolve the correct wallet address
    const depositWalletAddress = (DEPOSIT_ADDRESSES[coin] && DEPOSIT_ADDRESSES[coin][network])
      ? DEPOSIT_ADDRESSES[coin][network]
      : null;

    if (!depositWalletAddress) {
      toast(`No wallet address configured for ${coin} on ${network}`, 'error');
      return;
    }

    // Store deposit details for later submission when user confirms payment
    pendingDeposit = { coin, network, amount, rate: 1.00 };

    try {
      // Open Awaiting Payment Checkout Screen Modal first.
      // The deposit is NOT submitted to the backend yet — it will be
      // submitted only when the user clicks "I Have Paid → View Status".
      const modal = document.getElementById('checkout-modal');
      const body = document.getElementById('checkout-modal-body');

      if (body && modal) {
        body.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--border-color);padding-bottom:12px;">
            <a onclick="closeCheckoutModal()" class="link" style="font-size:14px;display:flex;align-items:center;gap:4px;">
              ← return to merchant
            </a>
            <div style="font-size:18px;">🌐</div>
          </div>

          <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#f59e0b;">
              <span>🟡</span> Awaiting Payment
            </div>
            <div style="font-family:monospace;font-size:18px;font-weight:800;color:#f59e0b;" id="dep-timer">
              00:12:00
            </div>
          </div>

          <div style="margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-size:18px;font-weight:800;color:var(--el-color-primary);">
                ${coin} <span style="font-size:13px;color:var(--text-sub);">(${network})</span>
              </div>
              <div style="font-size:18px;font-weight:800;">${amount} <small style="font-size:12px;color:var(--text-sub);">${coin}</small></div>
            </div>

            <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">
              <span style="color:var(--text-sub);">🗄️ order amount</span>
              <strong style="color:var(--text-main);">${amount} USD</strong>
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;font-size:13px;">
              <span style="color:var(--text-sub);">🔐 exchange rate</span>
              <strong style="color:var(--text-main);">1 ${coin} = 1 USD</strong>
            </div>
          </div>

          <div style="text-align:center;padding:16px 0;">
            <div style="font-size:13px;font-weight:600;color:var(--text-main);margin-bottom:16px;">
              Please only send ${coin} coins to this address on the ${network} network
            </div>

            <div style="background:#fff;padding:16px;border-radius:12px;display:inline-block;box-shadow:0 0 20px rgba(0,0,0,0.5);margin-bottom:20px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${depositWalletAddress}" alt="Deposit QR Code" style="width:160px;height:160px;display:block;"/>
            </div>

            <div style="text-align:left;margin-bottom:16px;">
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px;">Amount</div>
              <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:8px;padding:10px 14px;">
                <span style="font-weight:700;font-size:16px;">${amount}</span>
                <button class="btn-outline" style="padding:4px 10px;font-size:12px;" onclick="copyText('${amount}','Amount copied!')">📋</button>
              </div>
            </div>

            <div style="text-align:left;margin-bottom:20px;">
              <div style="font-size:12px;color:var(--text-sub);margin-bottom:4px;">Wallet address</div>
              <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);border-radius:8px;padding:10px 14px;word-break:break-all;">
                <span style="font-family:monospace;font-size:13px;font-weight:700;color:var(--el-color-primary);">${depositWalletAddress}</span>
                <button class="btn-outline" style="padding:4px 10px;font-size:12px;margin-left:8px;" onclick="copyText('${depositWalletAddress}','Wallet address copied!')">📋</button>
              </div>
            </div>

            <button class="btn-dark" style="width:100%;height:48px;font-size:15px;font-weight:700;" onclick="closeCheckoutModal()">
              I Have Paid → View Status
            </button>
          </div>
        `;
        modal.classList.add('active');
        startDepositCountdown();
      }
    } catch (err) {
      toast(err.message || 'Failed to initialize deposit', 'error');
    }
  };

  // Store pending deposit details so they can be submitted when user confirms payment
  let pendingDeposit = null;

  window.closeCheckoutModal = async function () {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.remove('active');
    if (depositTimerInterval) clearInterval(depositTimerInterval);

    // Submit the deposit to the backend only now (when user confirms they've paid)
    if (pendingDeposit) {
      try {
        await store.addDeposit(pendingDeposit);
        toast('Deposit order submitted! Under review.', 'success');
        pendingDeposit = null; // clear after successful submission
      } catch (err) {
        toast(err.message || 'Failed to submit deposit', 'error');
        pendingDeposit = null;
      }
    }
  };

  function startDepositCountdown() {
    let secondsLeft = 12 * 60; // 12 minutes countdown
    if (depositTimerInterval) clearInterval(depositTimerInterval);

    const updateTimer = () => {
      const display = document.getElementById('dep-timer');
      if (!display) return;
      const h = Math.floor(secondsLeft / 3600);
      const m = Math.floor((secondsLeft % 3600) / 60);
      const s = secondsLeft % 60;
      display.textContent = `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    updateTimer(); // show initial 00:12:00
    depositTimerInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(depositTimerInterval);
        const display = document.getElementById('dep-timer');
        if (display) display.textContent = '00:00:00';
        return;
      }
      updateTimer();
    }, 1000);
  }

  window.copyAddress = function (addr) {
    navigator.clipboard?.writeText(addr).then(() => toast('Address copied!', 'success'))
      .catch(() => { const ta = document.createElement('textarea'); ta.value = addr; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('Address copied!', 'success'); });
  };

  // Note: submitDeposit was dead code referencing non-existent DOM elements — removed.
  // Note: switchWithdrawTab referenced non-existent withdraw-bank-panel — removed.

  window.calcWithdrawFee = function (val) {
    const el = document.getElementById('withdraw-fee-calc');
    if (!el || !val) return;
    const user = store.getUser();
    const hasDoubled = !!(user && user.doubledCapital);
    const feeRate = hasDoubled ? 0.10 : 0.25;
    const fee = parseFloat((parseFloat(val) * feeRate).toFixed(2));
    const actual = parseFloat(val) - fee;
    el.innerHTML = `Fee (${(feeRate * 100).toFixed(0)}%): $${fmt(fee)} · You receive: <strong>$${fmt(actual)}</strong>`;
  };

  window.fillWithdrawAddress = function (sel) {
    const addr = document.getElementById('withdraw-address');
    if (addr) addr.value = sel.value;
  };

  window.togglePwd = function (id) {
    const inp = document.getElementById(id);
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  window.submitWithdrawal = async function () {
    const user = store.getUser();
    const amount = parseFloat(document.getElementById('withdraw-amount')?.value || 0);
    const address = document.getElementById('withdraw-address')?.value || '';
    const transactionPassword = document.getElementById('withdraw-txn-pwd')?.value || '';
    const submitBtn = document.querySelector('button[onclick="submitWithdrawal()"]');

    if (!user?.hasTransactionPassword) {
      toast('⚠️ Please set your 6-digit transaction password first', 'error');
      navigateTo('profile');
      setTimeout(() => window.openSetTxnPasswordModal && window.openSetTxnPasswordModal(), 350);
      return;
    }
    if (!amount || amount < 10) { toast('Minimum withdrawal is $10 USDT', 'error'); return; }
    if (amount > user.availableBalance) { toast('Insufficient balance', 'error'); return; }
    if (!address) { toast('Please enter withdrawal address', 'error'); return; }
    if (!transactionPassword) { toast('Please enter your transaction password', 'error'); return; }
    if (!/^\d{6}$/.test(transactionPassword)) { toast('Transaction password must be exactly 6 digits', 'error'); return; }
    // Fee matches backend: 25% if not doubled, 10% if doubled
    const hasDoubled = !!(user && user.doubledCapital);
    const feeRate = hasDoubled ? 0.10 : 0.25;
    const fee = parseFloat((amount * feeRate).toFixed(2));

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Withdrawal...';
    }

    try {
      await store.addWithdrawal({ coin: 'USDT', network: 'TRC-20', amount, fee, actualAmount: amount - fee, address, transactionPassword });
      toast('Withdrawal submitted! Under review.', 'success');
      setTimeout(() => window.location.hash = '#/assets', 800);
    } catch (err) {
      toast(err.message || 'Failed to submit withdrawal', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Withdrawal';
      }
    }
  };


  // ── Address format rules per network ──────────────────────────────────────
  const ADDRESS_RULES = {
    'TRC-20': { label: 'Tron (TRC-20)', regex: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, hint: 'Must start with T and be 34 characters (Tron address).' },
    'ERC-20': { label: 'Ethereum (ERC-20)', regex: /^0x[0-9a-fA-F]{40}$/, hint: 'Must start with 0x and be 42 characters (Ethereum address).' },
    'BEP-20': { label: 'BNB Smart Chain (BEP-20)', regex: /^0x[0-9a-fA-F]{40}$/, hint: 'Must start with 0x and be 42 characters (BSC address).' },
    'BTC':    { label: 'Bitcoin', regex: /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,61}$/, hint: 'Must start with 1, 3, or bc1 (Bitcoin address).' },
  };

  // Coin → available networks for bind address
  const BIND_COIN_NETWORKS = {
    'USDT': ['TRC-20', 'ERC-20', 'BEP-20'],
    'ETH':  ['ERC-20'],
    'BTC':  ['BTC'],
  };

  // Update network dropdown when coin changes
  window.updateBindNetworkOptions = function (coinId, networkId) {
    const coin = document.getElementById(coinId)?.value;
    const netSel = document.getElementById(networkId);
    if (!coin || !netSel) return;
    const nets = BIND_COIN_NETWORKS[coin] || ['TRC-20', 'ERC-20'];
    netSel.innerHTML = nets.map(n => `<option value="${n}">${ADDRESS_RULES[n]?.label || n}</option>`).join('');
  };

  // Live address validation + auto-detect feedback
  window.validateBindAddress = function (addressId, networkId, detectId) {
    const address = document.getElementById(addressId)?.value?.trim() || '';
    const network = document.getElementById(networkId)?.value || '';
    const detectEl = document.getElementById(detectId);
    if (!detectEl) return true;

    if (!address) {
      detectEl.innerHTML = '';
      return false;
    }

    // Try to detect which chain this address belongs to
    let detectedChain = null;
    for (const [key, rule] of Object.entries(ADDRESS_RULES)) {
      if (rule.regex.test(address)) { detectedChain = key; break; }
    }

    const rule = ADDRESS_RULES[network];
    if (!rule) { detectEl.innerHTML = ''; return false; }

    const isValid = rule.regex.test(address);

    if (isValid) {
      detectEl.innerHTML = `<span style="color:#10b981;">✅ Valid ${rule.label} address detected.</span>`;
    } else if (detectedChain && detectedChain !== network) {
      const wrongRule = ADDRESS_RULES[detectedChain];
      detectEl.innerHTML = `<span style="color:#f59e0b;">⚠️ This looks like a <strong>${wrongRule.label}</strong> address, but you selected <strong>${rule.label}</strong>. Please check your network selection.</span>`;
    } else if (address.length > 5) {
      detectEl.innerHTML = `<span style="color:#ef4444;">❌ Invalid address for ${rule.label}. ${rule.hint}</span>`;
    } else {
      detectEl.innerHTML = `<span style="color:#64748b;">${rule.hint}</span>`;
    }
    return isValid;
  };

  // Note: switchBindTab referenced non-existent bind-bank-panel — removed.

  window.submitBindAddress = async function () {
    const coin = document.getElementById('bind-coin')?.value || 'USDT';
    const network = document.getElementById('bind-network')?.value || 'TRC-20';
    const address = (document.getElementById('bind-address-val')?.value || '').trim();
    const btn = document.getElementById('bind-submit-btn');

    if (!address) { toast('Please enter a wallet address', 'error'); return; }

    // Validate address format
    const isValid = window.validateBindAddress('bind-address-val', 'bind-network', 'bind-addr-detect');
    if (!isValid) {
      toast('Address format does not match the selected network. Please check and try again.', 'error');
      return;
    }

    // Check if user already bound an address on this network
    const saved = store.getBindAddresses();
    const existingNet = saved.find(a => a.coin === coin && a.network === network);
    if (existingNet) {
      toast(`Wallet address already bound for ${coin} (${network}). You cannot bind another.`, 'error');
      return;
    }

    const existingAddr = saved.find(a => a.address === address);
    if (existingAddr) {
      toast('Wallet address already bound!', 'error');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Binding...'; }

    try {
      await store.addBindAddress({ method: 'crypto', coin, network, address });
      toast('Address bound successfully!', 'success');
      setTimeout(() => window.location.hash = '#/bind-address', 500);
    } catch (err) {
      toast(err.message || 'Failed to bind address', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Bind Address'; }
    }
  };

  // Mandatory withdrawal binding modal helpers
  window.showMandatoryBindForm = function () {
    const step1 = document.getElementById('bind-modal-step1');
    const step2 = document.getElementById('bind-modal-step2');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
  };

  window.hideMandatoryBindForm = function () {
    const step1 = document.getElementById('bind-modal-step1');
    const step2 = document.getElementById('bind-modal-step2');
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
  };

  window.submitMandatoryBindAddress = async function () {
    const coin = document.getElementById('modal-bind-coin')?.value || 'USDT';
    const network = document.getElementById('modal-bind-network')?.value || 'TRC-20';
    const address = (document.getElementById('modal-bind-address')?.value || '').trim();
    const submitBtn = document.getElementById('modal-bind-submit-btn');

    if (!address) {
      toast('Please enter your wallet address', 'error');
      return;
    }

    // Validate address format against selected network
    const isValid = window.validateBindAddress('modal-bind-address', 'modal-bind-network', 'modal-bind-detect');
    if (!isValid) {
      toast('Address format does not match the selected network. Please check and try again.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Binding...';
    }

    try {
      await store.addBindAddress({ method: 'crypto', coin, network, address });
      toast('✅ Wallet address bound successfully!', 'success');
      // Refresh page state to show locked bound address
      if (store.checkAuth) await store.checkAuth();
      navigateTo('withdraw');
    } catch (err) {
      toast(err.message || 'Failed to bind wallet address', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Binding';
      }
    }
  };
}


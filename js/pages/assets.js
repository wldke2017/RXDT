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
  const orders = store.getActiveOrders();
  const earnings = orders.reduce((s, o) => s + o.totalProfitLoss, 0);

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

    <!-- Active Follow Orders Summary -->
    ${orders.length ? `
    <div class="card">
      <div class="card-title">Active Follow Orders</div>
      ${orders.map(o => `
        <div class="order-mini-card">
          <div>
            <div style="font-weight:600;">${o.productName}</div>
            <div style="font-size:12px;color:var(--text-muted);">${o.analystName}</div>
          </div>
          <div>
            <div style="font-weight:600;">$${fmt(o.amount)}</div>
            <div class="${o.totalProfitLoss >= 0 ? 'price-up' : 'price-down'}" style="font-size:13px;">
              ${o.totalProfitLoss >= 0 ? '+' : ''}$${fmt(o.totalProfitLoss)}
            </div>
          </div>
        </div>
      `).join('')}
      <button class="btn-outline" style="width:100%;margin-top:8px;" onclick="navigateTo('follow/note')">View All Orders →</button>
    </div>
    ` : ''}

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

      <!-- Coin Selection Dropdown -->
      <div class="form-group">
        <label class="form-label" style="font-weight:700;">Select Crypto Asset</label>
        <div class="custom-select-box">
          <select class="form-control" id="dep-coin-select" onchange="onDepCoinChange(this.value)">
            <option value="USDT">₮ USDT (Tether)</option>
            <option value="USDC">💲 USDC (USD Coin)</option>
            <option value="BTC">₿ BTC (Bitcoin)</option>
            <option value="ETH">Ξ ETH (Ethereum)</option>
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
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Order #</th><th>Coin</th><th>Amount</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>
            ${deposits.map(d => `
              <tr>
                <td style="font-size:12px;">${d.orderNumber}</td>
                <td>${d.coin} (${d.network})</td>
                <td>$${fmt(d.amount)}</td>
                <td>${auditBadge(d.auditStatus)}</td>
                <td style="font-size:12px;">${d.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
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
        <div class="form-group">
          <label class="form-label">Select Bound Wallet Address</label>
          <select class="form-control" id="withdraw-saved-addr" onchange="fillWithdrawAddress(this)">
            <option value="">-- Select bound address or enter below --</option>
            ${addresses.filter(a => a.method === 'crypto').map(a => `
              <option value="${a.address}">${a.coin} (${a.network}) · ${a.address}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Withdrawal Wallet Address</label>
          <input type="text" id="withdraw-address" class="form-control" placeholder="Enter crypto wallet address"/>
        </div>
        <div class="form-group">
          <label class="form-label">Coin & Network</label>
          <div style="display:flex;gap:8px;">
            <select class="form-control" id="withdraw-coin">
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
            <select class="form-control" id="withdraw-network">
              <option value="TRC-20">TRC-20</option>
              <option value="ERC-20">ERC-20</option>
            </select>
          </div>
        </div>
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

      <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" onclick="submitWithdrawal()">Submit Withdrawal</button>
      <div style="text-align:center;margin-top:12px;">
        <a onclick="navigateTo('bind-address')" class="link" style="font-size:13px;">+ Bind new withdrawal address</a>
      </div>
    </div>

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
          <select class="form-control" id="bind-coin">
            <option value="USDT">USDT</option>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Select Network</label>
          <select class="form-control" id="bind-network">
            <option value="TRC-20">TRC-20</option>
            <option value="ERC-20">ERC-20</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Wallet Address</label>
          <input type="text" id="bind-address-val" class="form-control" placeholder="Please enter withdrawal address"/>
        </div>
      </div>

      <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" onclick="submitBindAddress()">Bind Address</button>
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

    <div class="card" style="padding:0;">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr><th>Type</th><th>Amount</th><th>Balance After</th><th>Remark</th><th>Time</th></tr>
          </thead>
          <tbody>
            ${changes.map(c => `
              <tr>
                <td><span class="badge ${c.amount >= 0 ? 'badge-success' : 'badge-danger'}">${c.type}</span></td>
                <td class="${c.amount >= 0 ? 'price-up' : 'price-down'}" style="font-weight:600;">
                  ${c.amount >= 0 ? '+' : ''}$${fmt(Math.abs(c.amount))}
                </td>
                <td>$${fmt(c.balance)}</td>
                <td style="font-size:13px;">${c.remark}</td>
                <td style="font-size:12px;color:var(--text-muted);">${c.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
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


  // Note: switchBindTab referenced non-existent bind-bank-panel — removed.

  window.submitBindAddress = async function () {
    const coin = document.getElementById('bind-coin')?.value || 'USDT';
    const network = document.getElementById('bind-network')?.value || 'TRC-20';
    const address = document.getElementById('bind-address-val')?.value || '';

    if (!address) { toast('Please enter a wallet address', 'error'); return; }

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

    try {
      await store.addBindAddress({ method: 'crypto', coin, network, address });
      toast('Address bound successfully!', 'success');
      setTimeout(() => window.location.hash = '#/bind-address', 500);
    } catch (err) {
      toast(err.message || 'Failed to bind address', 'error');
    }
  };
}

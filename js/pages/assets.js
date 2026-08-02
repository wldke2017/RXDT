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
  const networks = store.getCryptoNetworks();
  const deposits = store.getDeposits();

  return `
  <div>
    <div class="page-header">
      <button class="btn-back" onclick="navigateTo('assets')">← Back</button>
      <h1 class="page-title">Crypto Deposit</h1>
    </div>

    <div class="card">
      <div class="card-title">Select Cryptocurrency</div>
      <div class="coin-selector" id="coin-selector">
        ${networks.map((n, i) => `
          <div class="coin-option ${i===0?'active':''}" onclick="selectCoin('${n.coin}',this)" data-coin="${n.coin}">
            ${n.coin}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card" id="network-card">
      <div class="card-title">Select Network</div>
      <div id="network-selector">
        ${renderNetworkOptions(networks[0])}
      </div>
    </div>

    <div class="card" id="deposit-address-card">
      ${renderDepositAddress(networks[0].networks[0], networks[0].coin)}
    </div>

    <!-- My Deposits History -->
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

    <!-- Submit Deposit Form -->
    <div class="card">
      <div class="card-title">Submit Deposit Record</div>
      <div class="form-group">
        <label class="form-label">Your Wallet Address / Card Number</label>
        <input type="text" id="dep-from-addr" class="form-control" placeholder="Enter your sending wallet address or card number"/>
      </div>
      <div class="form-group">
        <label class="form-label">Deposit Amount (USDT)</label>
        <input type="number" id="dep-amount" class="form-control" placeholder="Min: $100"/>
      </div>
      <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" onclick="submitDeposit()">Submit Deposit</button>
    </div>
  </div>`;
}

function renderNetworkOptions(coinData) {
  return coinData.networks.map((net, i) => `
    <div class="network-option ${i===0?'active':''}" onclick="selectNetwork('${coinData.coin}','${net.name}',this)">
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

      <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" onclick="submitWithdrawal()">Submit Withdrawal</button>
      <div style="text-align:center;margin-top:12px;">
        <a onclick="navigateTo('bind-address')" class="link" style="font-size:13px;">+ Bind new withdrawal address</a>
      </div>
    </div>

    <!-- Withdrawal History -->
    <div class="card">
      <div class="card-title">Withdrawal History</div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Order #</th><th>Coin</th><th>Amount</th><th>Fee</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>
            ${withdrawals.map(w => `
              <tr>
                <td style="font-size:12px;">${w.orderNumber}</td>
                <td>${w.coin} (${w.network})</td>
                <td>$${fmt(w.amount)}</td>
                <td>$${fmt(w.fee)}</td>
                <td>${auditBadge(w.status)}</td>
                <td style="font-size:12px;">${w.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
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

  window.selectCoin = function(coin, el) {
    document.querySelectorAll('.coin-option').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
    const networks = store.getCryptoNetworks();
    const coinData = networks.find(n => n.coin === coin);
    if (!coinData) return;
    const netSel = document.getElementById('network-selector');
    if (netSel) netSel.innerHTML = renderNetworkOptions(coinData);
    const addrCard = document.getElementById('deposit-address-card');
    if (addrCard) addrCard.innerHTML = renderDepositAddress(coinData.networks[0], coin);
  };

  window.selectNetwork = function(coin, networkName, el) {
    document.querySelectorAll('.network-option').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
    const networks = store.getCryptoNetworks();
    const coinData = networks.find(n => n.coin === coin);
    const net = coinData?.networks.find(n => n.name === networkName);
    if (!net) return;
    const addrCard = document.getElementById('deposit-address-card');
    if (addrCard) addrCard.innerHTML = renderDepositAddress(net, coin);
  };

  window.copyAddress = function(addr) {
    navigator.clipboard?.writeText(addr).then(() => toast('Address copied!', 'success'))
      .catch(() => { const ta = document.createElement('textarea'); ta.value = addr; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('Address copied!', 'success'); });
  };

  window.submitDeposit = function() {
    const addr = document.getElementById('dep-from-addr')?.value;
    const amount = parseFloat(document.getElementById('dep-amount')?.value || 0);
    if (!addr) { toast('Please enter your wallet address', 'error'); return; }
    if (!amount || amount < 100) { toast('Minimum deposit is $100', 'error'); return; }
    store.addDeposit({ coin: 'USDT', network: 'TRC-20', amount, rate: 1.002, actualAmount: amount * 0.998 });
    toast('Deposit submitted! Under review.', 'success');
    setTimeout(() => window.location.hash = '#/assets', 1000);
  };

  window.switchWithdrawTab = function(tab, btn) {
    document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('withdraw-crypto-panel').style.display = tab === 'crypto' ? '' : 'none';
    document.getElementById('withdraw-bank-panel').style.display = tab === 'bank' ? '' : 'none';
  };

  window.calcWithdrawFee = function(val) {
    const el = document.getElementById('withdraw-fee-calc');
    if (!el || !val) return;
    const fee = Math.max(2, parseFloat(val) * 0.005);
    const actual = parseFloat(val) - fee;
    el.innerHTML = `Fee: $${fmt(fee)} · You receive: <strong>$${fmt(actual)}</strong>`;
  };

  window.fillWithdrawAddress = function(sel) {
    const addr = document.getElementById('withdraw-address');
    if (addr) addr.value = sel.value;
  };

  window.submitWithdrawal = async function() {
    const user = store.getUser();
    const amount = parseFloat(document.getElementById('withdraw-amount')?.value || 0);
    const address = document.getElementById('withdraw-address')?.value || '';
    if (!amount || amount < 10) { toast('Minimum withdrawal is $10 USDT', 'error'); return; }
    if (amount > user.availableBalance) { toast('Insufficient balance', 'error'); return; }
    if (!address) { toast('Please enter withdrawal address', 'error'); return; }
    const fee = 1.00;
    try {
      await store.addWithdrawal({ coin: 'USDT', network: 'TRC-20', amount, fee, actualAmount: amount - fee, address });
      toast('Withdrawal submitted! Under review.', 'success');
      setTimeout(() => window.location.hash = '#/assets', 800);
    } catch (err) {
      toast(err.message || 'Failed to submit withdrawal', 'error');
    }
  };

  window.switchBindTab = function(tab, btn) {
    document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('bind-crypto-panel').style.display = tab === 'crypto' ? '' : 'none';
    document.getElementById('bind-bank-panel').style.display = tab === 'bank' ? '' : 'none';
  };

  window.submitBindAddress = async function() {
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

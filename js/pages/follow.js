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

function statusBadge(status) {
  const map = {
    pending: ['badge-warning', 'Pending AI Order'],
    buying: ['badge-success', 'Active AI Trading'],
    ended: ['badge-info', 'Cycle Complete'],
    withdrawn: ['badge-danger', 'Withdrawn']
  };
  const [cls, label] = map[status] || ['badge-info', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

export function render(page) {
  if (page === 'follow/note') return renderMyOrders();
  if (page === 'follow/team') return renderTeam();
  return renderAnalystList();
}

// ---- AI QUANTITATIVE MODELS LIST ----
function renderAnalystList() {
  const aiModels = store.getAnalysts();
  const doublingData = store.get('assetDoubling3Signals') || [];

  return `
  <div>
    <div class="page-header">
      <h1 class="page-title">RXDT AI Quantitative Trading</h1>
      <div class="follow-sub-nav">
        <button class="sub-nav-btn active" onclick="window.location.hash='#/follow'">AI Models</button>
        <button class="sub-nav-btn" onclick="window.location.hash='#/follow/note'">My AI Orders</button>
        <button class="sub-nav-btn" onclick="window.location.hash='#/follow/team'">VIP Team Dividends</button>
      </div>
    </div>

    <!-- Signal Entry -->
    <div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid rgba(0,242,254,0.3);">
      <div style="flex:1;min-width:200px;">
        <div style="font-weight:700;font-size:16px;color:var(--el-color-primary);margin-bottom:4px;">🔐 RXDT AI Signal Tracking</div>
        <div style="font-size:13px;color:var(--text-sub);">Enter exclusive AI quantitative signal codes to execute institutional algorithmic trades.</div>
      </div>
      <div style="display:flex;gap:8px;flex:1;min-width:240px;">
        <input type="text" id="signal-code" class="form-control" placeholder="Enter AI signal code..."/>
        <button class="btn-primary" onclick="trackSignal()">Track Signal</button>
      </div>
    </div>

    <!-- AI Models Grid -->
    <div class="analysts-grid">
      ${aiModels.map(a => renderAnalystCard(a)).join('')}
    </div>

    <!-- Asset Doubling Schedule Table (PDF Pages 11 & 12) -->
    <div class="card" style="margin-top:24px;">
      <div class="card-title">📈 Asset Doubling Growth Projection Table (3 Signals / Day)</div>
      <p style="font-size:13px;color:var(--text-sub);margin-bottom:16px;">Each AI signal yields an average daily return of 1.8% to 2.1%. Below is the exact progressive balance schedule from Day 1 to Day 34:</p>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr><th>Day</th><th>$520 Starting</th><th>$1,050 Starting</th><th>$2,100 Starting</th><th>$3,180 Starting</th><th>$5,200 Starting</th><th>$10,600 Starting</th></tr>
          </thead>
          <tbody>
            ${doublingData.map(d => `
              <tr>
                <td><strong>Day ${d.day}</strong></td>
                <td class="price-up">$${fmt(d.c520)}</td>
                <td class="price-up">$${fmt(d.c1050)}</td>
                <td class="price-up">$${fmt(d.c2100)}</td>
                <td class="price-up">$${fmt(d.c3180)}</td>
                <td class="price-up">$${fmt(d.c5200)}</td>
                <td style="font-weight:800;color:var(--el-color-primary);">$${fmt(d.c10600)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Follow Order Modal -->
    <div class="modal-overlay" id="follow-modal">
      <div class="modal-content" id="follow-modal-content"></div>
    </div>
  </div>`;
}

function renderAnalystCard(a) {
  return `
  <div class="analyst-card" style="border:1px solid var(--border-color);background:var(--bg-card);">
    <div class="analyst-card-header">
      <div class="analyst-avatar-lg" style="background:rgba(0,242,254,0.1);">${a.avatar}</div>
      <div class="analyst-card-info">
        <div class="analyst-card-name" style="color:var(--el-color-primary);">${a.name}</div>
        <div class="analyst-card-meta">
          Win Rate: <strong style="color:var(--color-up);">${a.winRate}%</strong> &nbsp;|&nbsp;
          ${a.totalFollowers.toLocaleString()} Active Investors
        </div>
        <div class="analyst-card-meta" style="margin-top:4px;color:var(--text-sub);">
          ${a.intro}
        </div>
      </div>
    </div>

    <div class="returns-grid">
      <div class="return-cell">
        <span class="rc-label">1D Profit</span>
        <span class="rc-val price-up">+${a.oneDayReturnRate.toFixed(2)}%</span>
      </div>
      <div class="return-cell">
        <span class="rc-label">7D Return</span>
        <span class="rc-val price-up">+${a.sevenDayReturnRate.toFixed(2)}%</span>
      </div>
      <div class="return-cell">
        <span class="rc-label">15D Return</span>
        <span class="rc-val price-up">+${a.fifteenDayReturnRate.toFixed(2)}%</span>
      </div>
      <div class="return-cell">
        <span class="rc-label">30D Return</span>
        <span class="rc-val price-up">+${a.thirtyDayReturnRate.toFixed(2)}%</span>
      </div>
    </div>

    <div class="analyst-products">
      ${a.products.map(p => `
        <div class="product-item" style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span class="product-name" style="font-size:16px;">${p.name}</span>
              <span class="badge badge-info" style="margin-left:6px;">${p.period} Days Cycle</span>
            </div>
            <button class="btn-primary" style="padding:7px 20px;font-size:13px;" onclick="openFollowModal('${a.id}','${p.id}')">
              Allocate AI Capital
            </button>
          </div>
          <div style="font-size:13px;color:var(--text-sub);margin-top:6px;">
            Min: $${fmt(p.minAmount)} · Max: $${fmt(p.maxAmount)} · Avg Daily AI Rate: <strong>${p.dailyRate}%</strong>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ---- MY ORDERS ----
function renderMyOrders() {
  const orders = store.getFollowOrders();
  return `
  <div>
    <div class="page-header">
      <h1 class="page-title">My AI Trading Orders</h1>
      <div class="follow-sub-nav">
        <button class="sub-nav-btn" onclick="window.location.hash='#/follow'">AI Models</button>
        <button class="sub-nav-btn active" onclick="window.location.hash='#/follow/note'">My AI Orders</button>
        <button class="sub-nav-btn" onclick="window.location.hash='#/follow/team'">VIP Team Dividends</button>
      </div>
    </div>

    ${orders.map(o => `
      <div class="order-card" style="background:var(--bg-card);border:1px solid var(--border-color);">
        <div class="order-card-header">
          <div>
            <div class="order-product-name" style="color:var(--el-color-primary);">${o.productName}</div>
            <div style="font-size:12px;color:var(--text-muted);">AI Model: ${o.analystName} · Order#: ${o.orderNumber}</div>
          </div>
          <div>${statusBadge(o.status)}</div>
        </div>
        <div class="order-stats">
          <div class="os-item"><span class="os-label">Invested Balance</span><span class="os-val">$${fmt(o.amount)}</span></div>
          <div class="os-item"><span class="os-label">Total AI P&L</span><span class="os-val price-up">+$${fmt(o.totalProfitLoss)}</span></div>
          <div class="os-item"><span class="os-label">Cycle Period</span><span class="os-val">${o.period} Days</span></div>
          <div class="os-item"><span class="os-label">Auto-Renew</span><span class="os-val">${o.autoRenew ? 'Enabled' : 'Disabled'}</span></div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ---- VIP TEAM DIVIDENDS (PDF Page 10) ----
function renderTeam() {
  const vipTiers = store.get('teamVipTiers') || [];
  const team = store.getTeam();

  return `
  <div>
    <div class="page-header">
      <h1 class="page-title">VIP Team Rewards & Dividends</h1>
      <div class="follow-sub-nav">
        <button class="sub-nav-btn" onclick="window.location.hash='#/follow'">AI Models</button>
        <button class="sub-nav-btn" onclick="window.location.hash='#/follow/note'">My AI Orders</button>
        <button class="sub-nav-btn active" onclick="window.location.hash='#/follow/team'">VIP Team Dividends</button>
      </div>
    </div>

    <!-- Team Level Rewards Table -->
    <div class="card">
      <div class="card-title">🏆 VIP Partner Team Level Rewards</div>
      <p style="font-size:13px;color:var(--text-sub);margin-bottom:16px;">Directly refer 5 members to unlock team rewards and receive stable weekly trading volume dividends!</p>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr><th>Team Level</th><th>Team Size Required</th><th>Promotion Cash Bonus</th><th>Trading Volume Dividend</th></tr>
          </thead>
          <tbody>
            ${vipTiers.map(v => `
              <tr ${v.tier === team.currentVip ? 'style="background:rgba(0,242,254,0.1);"' : ''}>
                <td><span class="badge badge-info">${v.tier}</span> ${v.tier === team.currentVip ? ' (Current)' : ''}</td>
                <td>${v.teamSize} Members</td>
                <td class="price-up">$${v.reward.toLocaleString()}</td>
                <td style="font-weight:700;color:var(--el-color-primary);">${v.dividendPct}% Dividend</td>
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

  window.trackSignal = function() {
    const code = document.getElementById('signal-code')?.value.trim();
    if (!code) { toast('Please enter an AI signal code', 'error'); return; }
    toast(`AI Signal "${code}" verified! Joining high-frequency execution pool.`, 'success');
  };

  window.openFollowModal = function(analystId, productId) {
    const analyst = store.getAnalystById(analystId);
    const product = analyst?.products.find(p => p.id === productId);
    if (!analyst || !product) return;
    const user = store.getUser();
    const available = user ? user.availableBalance : 0;

    const content = document.getElementById('follow-modal-content');
    if (!content) return;
    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">Allocate AI Capital</div>
        <button class="modal-close" onclick="closeModal('follow-modal')">✕</button>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:18px;color:var(--el-color-primary);">${product.name}</div>
        <div style="font-size:13px;color:var(--text-sub);">${analyst.name} · ${product.period}-Day Cycle · Daily Rate: ${product.dailyRate}%</div>
      </div>
      <div class="form-group">
        <label class="form-label">Capital Allocation Amount (USDT)</label>
        <input type="number" id="follow-amount" class="form-control" placeholder="Min: $${fmt(product.minAmount)}" value="${product.minAmount}"/>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Available Balance: $${fmt(available)}</div>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" id="follow-auto-renew" checked/>
        <label for="follow-auto-renew">Auto-Renew AI capital allocation upon cycle completion</label>
      </div>
      <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" onclick="submitFollowOrder('${analystId}','${productId}')">
        Confirm AI Allocation
      </button>`;

    document.getElementById('follow-modal').classList.add('active');
  };

  window.submitFollowOrder = function(analystId, productId) {
    const amount = parseFloat(document.getElementById('follow-amount')?.value || 0);
    const analyst = store.getAnalystById(analystId);
    const product = analyst?.products.find(p => p.id === productId);
    if (!amount || amount < product.minAmount) { toast(`Minimum allocation is $${fmt(product.minAmount)}`, 'error'); return; }

    store.addFollowOrder({
      analystId, analystName: analyst.name,
      productId, productName: product.name,
      amount, autoRenew: true, period: product.period,
      status: 'buying', totalProfitLoss: amount * (product.dailyRate / 100)
    });

    closeModal('follow-modal');
    toast('AI Capital allocated successfully!', 'success');
    setTimeout(() => { window.location.hash = '#/follow/note'; }, 600);
  };

  window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  };
}

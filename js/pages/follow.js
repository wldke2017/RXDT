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

    <!-- Asset Doubling Schedule Table & AI Graphic -->
    <div class="card" style="margin-top:24px;background:linear-gradient(180deg, #131926 0%, #0d121d 100%);border:1px solid rgba(0,242,254,0.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="assets/images/rxdt_logo.png" alt="RXDT Logo" style="width:36px;height:36px;filter:drop-shadow(0 0 8px #00f2fe);"/>
          <div>
            <div class="card-title" style="margin:0;font-size:18px;">📈 Asset Doubling Growth Projection Table</div>
            <div style="font-size:12px;color:#00f2fe;letter-spacing:1px;font-weight:600;">3 SIGNALS DAILY · AI QUANTITATIVE compounding</div>
          </div>
        </div>
        <div style="background:rgba(0,242,254,0.1);border:1px solid #00f2fe;padding:6px 12px;border-radius:20px;font-size:12px;color:#00f2fe;font-weight:600;">
          ⚡ Referral & Deposit Bonuses Accelerate Stake & Doubling Speed!
        </div>
      </div>

      <!-- Banner AI Visual -->
      <div style="position:relative;border-radius:12px;overflow:hidden;margin-bottom:20px;height:140px;background:url('assets/images/rxdt_home_hero_bg.png') center/cover no-repeat;display:flex;align-items:center;padding:0 24px;box-shadow:inset 0 0 40px rgba(0,0,0,0.8);">
        <div style="z-index:2;max-width:500px;">
          <span style="background:#7928ca;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">TIER RULES</span>
          <h4 style="margin:6px 0 4px 0;font-size:16px;color:#fff;font-weight:700;">Capital < $500: Testing Mode (34 Days Doubling)</h4>
          <p style="margin:0;font-size:13px;color:#cbd5e1;">Capital ≥ $500: Standard Mode (28 Days Doubling). Staking 10% per signal.</p>
        </div>
        <img src="assets/images/rxdt_hero_ship.png" alt="AI Trader" style="position:absolute;right:10px;height:160px;opacity:0.85;pointer-events:none;"/>
      </div>

      <p style="font-size:13px;color:var(--text-sub);margin-bottom:16px;">
        Each AI signal executes trades using 10% of your account balance. Below is the progressive growth model:
      </p>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>$100 Start <br/><span style="font-size:10px;color:#00f5a0;">(Testing - 34 Days)</span></th>
              <th>$200 Start <br/><span style="font-size:10px;color:#00f5a0;">(Testing - 34 Days)</span></th>
              <th>$500 Start <br/><span style="font-size:10px;color:#00f2fe;">(Standard - 28 Days)</span></th>
              <th>$1,000 Start <br/><span style="font-size:10px;color:#00f2fe;">(Standard - 28 Days)</span></th>
              <th>$2,000 Start <br/><span style="font-size:10px;color:#00f2fe;">(Standard - 28 Days)</span></th>
              <th>$5,000 Start <br/><span style="font-size:10px;color:#ff007a;">(Standard - 28 Days)</span></th>
            </tr>
          </thead>
          <tbody>
            ${doublingData.map(d => `
              <tr>
                <td><strong>Day ${d.day}</strong></td>
                <td class="price-up">$${fmt(d.c100 || d.c520)}</td>
                <td class="price-up">$${fmt(d.c200 || d.c1050)}</td>
                <td class="price-up">$${fmt(d.c500 || d.c2100)}</td>
                <td class="price-up">$${fmt(d.c1000 || d.c3180)}</td>
                <td class="price-up">$${fmt(d.c2000 || d.c5200)}</td>
                <td style="font-weight:800;color:var(--el-color-primary);">$${fmt(d.c5000 || d.c10600)}</td>
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

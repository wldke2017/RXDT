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

export function render() {
  return `
  <div class="contract-page">
    <!-- Header: Pair Selector + Live Price -->
    <div class="contract-header">
      <div class="contract-pair-row">
        <div class="contract-pair-selector" onclick="togglePairDropdown()">
          <span id="contract-pair-icon">₿</span>
          <span id="contract-pair-label">BTC/USDT</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </div>
        <div class="contract-live-price">
          <span id="contract-price" class="price-val">--</span>
          <span id="contract-change" class="price-change">--</span>
        </div>
      </div>

      <!-- Pair Search Dropdown -->
      <div class="contract-pair-dropdown" id="pair-dropdown" style="display:none;">
        <div class="pair-search-wrap">
          <input type="text" id="pair-search" class="pair-search-input" placeholder="🔍 Search pair..." oninput="filterPairs(this.value)"/>
        </div>
        <div class="pair-list" id="pair-list">
          <div class="pair-item-loading">Loading pairs...</div>
        </div>
      </div>
    </div>

    <!-- TradingView Chart -->
    <div class="contract-chart-wrap">
      <div id="tradingview-container" style="height:260px;border-radius:12px;overflow:hidden;"></div>
    </div>

    <!-- Stats Row -->
    <div class="contract-stats-row">
      <div class="cstat"><span class="cstat-lbl">24H High</span><span class="cstat-val color-up" id="cs-high">--</span></div>
      <div class="cstat"><span class="cstat-lbl">24H Low</span><span class="cstat-val color-down" id="cs-low">--</span></div>
      <div class="cstat"><span class="cstat-lbl">24H Vol</span><span class="cstat-val" id="cs-vol">--</span></div>
      <div class="cstat"><span class="cstat-lbl">Index Price</span><span class="cstat-val" id="cs-idx">--</span></div>
    </div>

    <!-- Trade Panel -->
    <div class="contract-trade-panel">
      <div class="ctp-section-title">⚡ Open Position</div>

      <!-- Leverage -->
      <div class="form-group">
        <label class="form-label">Leverage</label>
        <div class="leverage-selector">
          <button class="lev-btn active" data-lev="10" onclick="selectLeverage(10)">10x</button>
          <button class="lev-btn" data-lev="20" onclick="selectLeverage(20)">20x</button>
          <button class="lev-btn" data-lev="50" onclick="selectLeverage(50)">50x</button>
          <button class="lev-btn" data-lev="100" onclick="selectLeverage(100)">100x</button>
        </div>
      </div>

      <!-- Amount -->
      <div class="form-group">
        <label class="form-label">Margin (USDT)</label>
        <div style="position:relative;">
          <input type="number" id="contract-amount" class="form-control" placeholder="Min. $10 USDT" min="10" oninput="updateCalc()"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;">USDT</span>
        </div>
      </div>

      <!-- Calculated Info -->
      <div class="contract-calc-info" id="contract-calc">
        <div class="calc-row"><span>Notional Position</span><span id="calc-notional">--</span></div>
        <div class="calc-row"><span>Est. P&L (±1%)</span><span id="calc-pnl">--</span></div>
        <div class="calc-row"><span>Liquidation Price</span><span id="calc-liq" class="color-down">--</span></div>
      </div>

      <!-- Long / Short Buttons -->
      <div class="contract-action-btns">
        <button class="btn-long" onclick="openPosition('long')">
          <span>▲</span> Open Long
        </button>
        <button class="btn-short" onclick="openPosition('short')">
          <span>▼</span> Open Short
        </button>
      </div>
    </div>

    <!-- Open Positions -->
    <div class="card" style="margin-bottom:0;">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;">
        📋 Open Positions
        <button class="btn-outline" style="padding:4px 12px;font-size:12px;" onclick="loadPositions()">Refresh</button>
      </div>
      <div id="positions-list">
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:14px;">Loading positions...</div>
      </div>
    </div>

    <!-- History -->
    <div class="card">
      <div class="card-title">🕐 Recent History</div>
      <div id="history-list">
        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">No history yet</div>
      </div>
    </div>
  </div>`;
}

export function init() {
  let currentPair = 'BTCUSDT';
  let currentLeverage = 10;
  let currentPrice = 0;
  let currentChange = 0;
  let ws = null;
  let allPairs = [];
  let positionsInterval = null;

  const TOKEN = localStorage.getItem('rxdt_token');
  const authHeaders = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // ---- Binance WebSocket ----
  function connectWS(symbol) {
    if (ws) ws.close();
    const sym = symbol.toLowerCase();
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@ticker`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      currentPrice = parseFloat(data.c);
      currentChange = parseFloat(data.P);
      const high = parseFloat(data.h);
      const low = parseFloat(data.l);
      const vol = parseFloat(data.q);

      const priceEl = document.getElementById('contract-price');
      const changeEl = document.getElementById('contract-change');
      const highEl = document.getElementById('cs-high');
      const lowEl = document.getElementById('cs-low');
      const volEl = document.getElementById('cs-vol');
      const idxEl = document.getElementById('cs-idx');

      if (priceEl) {
        priceEl.textContent = `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
        priceEl.className = `price-val ${currentChange >= 0 ? 'color-up' : 'color-down'}`;
      }
      if (changeEl) {
        changeEl.textContent = `${currentChange >= 0 ? '+' : ''}${currentChange.toFixed(2)}%`;
        changeEl.className = `price-change ${currentChange >= 0 ? 'color-up' : 'color-down'}`;
      }
      if (highEl) highEl.textContent = `$${high.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
      if (lowEl) lowEl.textContent = `$${low.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
      if (volEl) volEl.textContent = vol > 1e9 ? `${(vol / 1e9).toFixed(2)}B` : `${(vol / 1e6).toFixed(1)}M`;
      if (idxEl) idxEl.textContent = priceEl?.textContent || '--';

      updateCalc();
      updatePositionsPnL();
    };

    ws.onerror = () => console.warn('WS error, reconnecting...');
    ws.onclose = () => { if (currentPair === symbol) setTimeout(() => connectWS(symbol), 3000); };
  }

  // ---- TradingView Widget ----
  function loadChart(symbol) {
    const container = document.getElementById('tradingview-container');
    if (!container) return;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.onload = () => {
      new TradingView.widget({
        container_id: 'tradingview-container',
        symbol: `BINANCE:${symbol}`,
        interval: '15',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0a0e1a',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        height: 260,
        width: '100%',
        studies: ['RSI@tv-basicstudies'],
        hide_side_toolbar: true,
        allow_symbol_change: false,
        backgroundColor: '#0a0e1a',
        gridColor: 'rgba(255,255,255,0.04)',
      });
    };
    document.body.appendChild(script);
  }

  // ---- Load All Pairs ----
  async function loadPairs() {
    try {
      const res = await fetch('/api/contract/pairs');
      const data = await res.json();
      allPairs = data.pairs || [];
      renderPairList(allPairs);
    } catch (e) {
      console.warn('Failed to load pairs:', e);
    }
  }

  function renderPairList(pairs) {
    const el = document.getElementById('pair-list');
    if (!el) return;
    el.innerHTML = pairs.slice(0, 80).map(p => `
      <div class="pair-item ${p.symbol === currentPair ? 'active' : ''}" onclick="selectPair('${p.symbol}')">
        <span class="pair-item-name">${p.base}/USDT</span>
        <span class="pair-item-price">$${p.price < 1 ? p.price.toFixed(6) : p.price.toFixed(2)}</span>
        <span class="pair-item-change ${p.change >= 0 ? 'color-up' : 'color-down'}">${p.change >= 0 ? '+' : ''}${p.change.toFixed(2)}%</span>
      </div>
    `).join('');
  }

  // ---- Pair Selection ----
  window.selectPair = function(symbol) {
    currentPair = symbol;
    const base = symbol.replace('USDT', '');
    const labelEl = document.getElementById('contract-pair-label');
    if (labelEl) labelEl.textContent = `${base}/USDT`;

    const icons = { BTC: '₿', ETH: 'Ξ', BNB: '🔶', SOL: '◎', XRP: '✕', DOGE: '🐕', PEPE: '🐸', ADA: '♦' };
    const iconEl = document.getElementById('contract-pair-icon');
    if (iconEl) iconEl.textContent = icons[base] || base[0];

    connectWS(symbol);
    loadChart(symbol);
    document.getElementById('pair-dropdown').style.display = 'none';
    updateCalc();
  };

  window.togglePairDropdown = function() {
    const dd = document.getElementById('pair-dropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  };

  window.filterPairs = function(q) {
    const filtered = allPairs.filter(p => p.symbol.toLowerCase().includes(q.toLowerCase()) || p.base.toLowerCase().includes(q.toLowerCase()));
    renderPairList(filtered);
  };

  // ---- Leverage Selection ----
  window.selectLeverage = function(lev) {
    currentLeverage = lev;
    document.querySelectorAll('.lev-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.lev) === lev);
    });
    updateCalc();
  };

  // ---- Calc Update ----
  window.updateCalc = function() {
    const amount = parseFloat(document.getElementById('contract-amount')?.value || '0');
    if (!amount || !currentPrice) return;

    const notional = amount * currentLeverage;
    const estPnL = notional * 0.01; // at 1% price move
    const liqLong = currentPrice * (1 - 0.9 / currentLeverage);
    const liqShort = currentPrice * (1 + 0.9 / currentLeverage);

    const notEl = document.getElementById('calc-notional');
    const pnlEl = document.getElementById('calc-pnl');
    const liqEl = document.getElementById('calc-liq');

    if (notEl) notEl.textContent = `$${fmt(notional)} USDT`;
    if (pnlEl) pnlEl.textContent = `±$${fmt(estPnL)}`;
    if (liqEl) liqEl.textContent = `Long: $${fmt(liqLong, 2)} | Short: $${fmt(liqShort, 2)}`;
  };

  // ---- Open Position ----
  window.openPosition = async function(direction) {
    if (!store.isLoggedIn()) { toast('Please login first', 'error'); window.location.hash = '#/login'; return; }
    const amount = parseFloat(document.getElementById('contract-amount')?.value || '0');
    if (!amount || amount < 10) { toast('Minimum position size is $10 USDT', 'error'); return; }

    const btn = direction === 'long' ? document.querySelector('.btn-long') : document.querySelector('.btn-short');
    if (btn) { btn.disabled = true; btn.textContent = 'Opening...'; }

    try {
      const res = await fetch('/api/contract/open', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ pair: currentPair, direction, leverage: currentLeverage, amount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open position');

      toast(`✅ ${data.message}`, 'success');
      document.getElementById('contract-amount').value = '';
      loadPositions();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = direction === 'long' ? '▲ Open Long' : '▼ Open Short'; }
    }
  };

  // ---- Close Position ----
  window.closePosition = async function(id) {
    if (!confirm('Close this position?')) return;
    try {
      const res = await fetch(`/api/contract/close/${id}`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close');
      const sign = data.pnl >= 0 ? '+' : '';
      toast(`✅ ${sign}$${data.pnl.toFixed(2)} P&L settled`, data.pnl >= 0 ? 'success' : 'error');
      loadPositions();
      loadHistory();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  // ---- Load Positions ----
  async function loadPositions() {
    if (!store.isLoggedIn()) {
      const el = document.getElementById('positions-list');
      if (el) el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:14px;"><a onclick="navigateTo('login')" class="link">Login to view positions</a></div>`;
      return;
    }
    try {
      const res = await fetch('/api/contract/positions', { headers: authHeaders });
      const data = await res.json();
      renderPositions(data.positions || []);
    } catch (e) {
      console.warn('Load positions error:', e);
    }
  }

  function renderPositions(positions) {
    const el = document.getElementById('positions-list');
    if (!el) return;
    if (!positions.length) {
      el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);">📭 No open positions. Start trading above!</div>`;
      return;
    }
    el.innerHTML = positions.map(p => {
      const entryPrice = parseFloat(p.entry_price);
      const liqPrice = parseFloat(p.liquidation_price);
      const margin = parseFloat(p.amount);
      const livePrice = currentPair === p.pair ? currentPrice : entryPrice;
      const pct = (livePrice - entryPrice) / entryPrice;
      const pnl = p.direction === 'long' ? margin * p.leverage * pct : margin * p.leverage * (-pct);
      const pnlSign = pnl >= 0 ? '+' : '';
      const isLong = p.direction === 'long';

      return `
      <div class="position-card" id="pos-${p.id}">
        <div class="pos-header">
          <span class="pos-pair">${p.pair.replace('USDT', '')}/USDT</span>
          <span class="pos-dir ${isLong ? 'dir-long' : 'dir-short'}">${isLong ? '▲ Long' : '▼ Short'} ${p.leverage}x</span>
        </div>
        <div class="pos-stats">
          <div class="pos-stat"><span>Margin</span><span>$${fmt(margin)}</span></div>
          <div class="pos-stat"><span>Entry Price</span><span>$${entryPrice.toLocaleString()}</span></div>
          <div class="pos-stat"><span>Liq. Price</span><span class="color-down">$${fmt(liqPrice)}</span></div>
          <div class="pos-stat"><span>Live P&L</span><span class="${pnl >= 0 ? 'color-up' : 'color-down'}" id="pnl-${p.id}">${pnlSign}$${fmt(pnl)} (${pnlSign}${(pct * p.leverage * 100).toFixed(2)}%)</span></div>
        </div>
        <button class="btn-close-pos" onclick="closePosition('${p.id}')">Close Position</button>
      </div>`;
    }).join('');
  }

  // ---- Update Positions P&L Live ----
  function updatePositionsPnL() {
    const posCards = document.querySelectorAll('[id^="pos-"]');
    posCards.forEach(card => {
      const id = card.id.replace('pos-', '');
      const pnlEl = document.getElementById(`pnl-${id}`);
      // Reload positions every 5s for live P&L
    });
  }

  // ---- Load History ----
  async function loadHistory() {
    if (!store.isLoggedIn()) return;
    try {
      const res = await fetch('/api/contract/history', { headers: authHeaders });
      const data = await res.json();
      const el = document.getElementById('history-list');
      if (!el) return;
      const history = data.history || [];
      if (!history.length) {
        el.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">No closed positions yet</div>`;
        return;
      }
      el.innerHTML = history.slice(0, 10).map(h => {
        const pnl = parseFloat(h.profit_loss);
        return `
        <div class="history-row">
          <span>${h.pair.replace('USDT', '')}/USDT <span class="pos-dir ${h.direction === 'long' ? 'dir-long' : 'dir-short'}" style="font-size:11px;">${h.direction === 'long' ? '▲L' : '▼S'} ${h.leverage}x</span></span>
          <span>Entry: $${parseFloat(h.entry_price).toLocaleString()}</span>
          <span>Close: $${parseFloat(h.close_price || 0).toLocaleString()}</span>
          <span class="${pnl >= 0 ? 'color-up' : 'color-down'}" style="font-weight:700;">${pnl >= 0 ? '+' : ''}$${fmt(pnl)}</span>
        </div>`;
      }).join('');
    } catch (e) {}
  }

  // ---- Close dropdown when clicking outside ----
  document.addEventListener('click', function(e) {
    const dd = document.getElementById('pair-dropdown');
    if (dd && !e.target.closest('.contract-pair-selector') && !e.target.closest('.contract-pair-dropdown')) {
      dd.style.display = 'none';
    }
  });

  // ---- Init ----
  connectWS(currentPair);
  loadChart(currentPair);
  loadPairs();
  loadPositions();
  loadHistory();

  // Auto-refresh positions live P&L every 5 seconds
  positionsInterval = setInterval(() => {
    loadPositions();
  }, 5000);

  // Cleanup WS and interval when navigating away
  window.addEventListener('hashchange', () => {
    if (ws) ws.close();
    if (positionsInterval) clearInterval(positionsInterval);
  }, { once: true });
}

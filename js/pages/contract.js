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
    <!-- Header: Pair Selector + Live Price + Contract Type Tabs -->
    <div class="contract-header">
      <!-- Contract Type Toggle: Perpetual / Delivery Contract -->
      <div class="contract-type-tabs">
        <button class="ctype-tab" id="ctype-perpetual" onclick="switchContractType('perpetual')" style="color:var(--text-sub);">Perpetual</button>
        <button class="ctype-tab active" id="ctype-delivery" onclick="switchContractType('delivery')">Delivery contract</button>
      </div>

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

    <!-- Kline Chart + Timeframe Tabs -->
    <div class="contract-chart-wrap">
      <div class="chart-tf-tabs">
        <button class="tf-tab active" data-tf="1m" onclick="switchChartTF('1m', this)">1m</button>
        <button class="tf-tab" data-tf="15m" onclick="switchChartTF('15m', this)">15m</button>
        <button class="tf-tab" data-tf="30m" onclick="switchChartTF('30m', this)">30m</button>
        <button class="tf-tab" data-tf="1h" onclick="switchChartTF('1h', this)">1h</button>
        <button class="tf-tab" data-tf="1d" onclick="switchChartTF('1d', this)">1D</button>
      </div>
      <div id="kline-chart" style="height:280px;width:100%;"></div>
    </div>

    <!-- Stats Row -->
    <div class="contract-stats-row">
      <div class="cstat"><span class="cstat-lbl">24H High</span><span class="cstat-val color-up" id="cs-high">--</span></div>
      <div class="cstat"><span class="cstat-lbl">24H Low</span><span class="cstat-val color-down" id="cs-low">--</span></div>
      <div class="cstat"><span class="cstat-lbl">24H Vol</span><span class="cstat-val" id="cs-vol">--</span></div>
      <div class="cstat"><span class="cstat-lbl">Funding Rate</span><span class="cstat-val color-up" id="cs-idx">0.01%</span></div>
    </div>

    <!-- Trading Form: Leverage, Amount, Open Long/Short -->
    <div class="contract-trade-panel">
      <div class="ctp-section-title">Place Order</div>
      <div class="trade-form-row">
        <span class="trade-label">Leverage</span>
        <div class="leverage-selector">
          <button class="lev-btn active" data-lev="10" onclick="selectLeverage(10)">10x</button>
          <button class="lev-btn" data-lev="20" onclick="selectLeverage(20)">20x</button>
          <button class="lev-btn" data-lev="50" onclick="selectLeverage(50)">50x</button>
          <button class="lev-btn" data-lev="100" onclick="selectLeverage(100)">100x</button>
        </div>
      </div>
      <div class="trade-form-row">
        <span class="trade-label">Amount (USDT)</span>
        <div class="quick-amounts">
          <button class="qa-btn" onclick="setQuickAmount(100)">100</button>
          <button class="qa-btn" onclick="setQuickAmount(500)">500</button>
          <button class="qa-btn" onclick="setQuickAmount(1000)">1000</button>
          <button class="qa-btn" onclick="setQuickAmount(5000)">5000</button>
        </div>
        <input type="number" id="contract-amount" class="form-control" placeholder="Enter amount (min $10)" min="10" oninput="updateCalc()"/>
      </div>
      <div class="contract-calc-info">
        <div class="calc-row"><span>Notional</span><span id="calc-notional">$0.00</span></div>
        <div class="calc-row"><span>Est. P&L (1%)</span><span id="calc-pnl">±$0.00</span></div>
        <div class="calc-row"><span>Liq. Price</span><span id="calc-liq">L:-- | S:--</span></div>
      </div>
      <div class="contract-action-btns">
        <button class="btn-long" id="btn-open-long" onclick="openPosition('long')">▲ Open Long</button>
        <button class="btn-short" id="btn-open-short" onclick="openPosition('short')">▼ Open Short</button>
      </div>
    </div>

    <!-- Open Positions List -->
    <div class="card">
      <div class="ctp-section-title" style="margin-bottom:12px;">Open Positions</div>
      <div id="positions-list">
        <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:14px;">Loading positions...</div>
      </div>
    </div>

    <!-- Position History List -->
    <div class="card">
      <div class="ctp-section-title" style="margin-bottom:12px;">Position History</div>
      <div id="history-list">
        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">Loading history...</div>
      </div>
    </div>

    <!-- Consume Record / Invited Me Tabs -->

    <div class="card signal-tabs-card">
      <div class="signal-main-tabs">
        <button class="signal-main-tab active" id="tab-consume" onclick="switchSignalTab('consume')">Consume Record</button>
        <button class="signal-main-tab" id="tab-invited" onclick="switchSignalTab('invited')">Invited Me</button>
      </div>

      <!-- Consume Record -->
      <div id="signal-panel-consume">
        <div id="consume-record-list">
          <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">Loading records...</div>
        </div>
      </div>

      <!-- Invited Me (Active Signal / Copy Trade) -->
      <div id="signal-panel-invited" style="display:none;">
        <div class="signal-subtabs">
          <button class="signal-subtab active" id="subtab-current" onclick="switchSignalSubTab('current')">Current Copy Trade</button>
          <button class="signal-subtab" id="subtab-history" onclick="switchSignalSubTab('history')">Copy Trade History</button>
        </div>

        <!-- Current Copy Trade Card -->
        <div id="signal-current-panel">
          <div id="signal-active-card">
            <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">Checking for active signal...</div>
          </div>
        </div>

        <!-- Copy Trade History -->
        <div id="signal-history-panel" style="display:none;">
          <!-- Submitted / Finished / Missed Sub-sub-tabs -->
          <div class="signal-history-tabs">
            <button class="sh-tab" id="shtab-submitted" onclick="switchHistoryTab('submitted')">Submitted</button>
            <button class="sh-tab active" id="shtab-finished" onclick="switchHistoryTab('finished')">Finished</button>
            <button class="sh-tab" id="shtab-missed" onclick="switchHistoryTab('missed')">Missed</button>
          </div>
          <div id="shtab-submitted-panel" style="display:none;">
            <div id="signal-submitted-list">
              <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">Loading submitted orders...</div>
            </div>
          </div>
          <div id="shtab-finished-panel">
            <div id="signal-history-list">
              <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">Loading history...</div>
            </div>
          </div>
          <div id="shtab-missed-panel" style="display:none;">
            <div id="signal-missed-list">
              <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">Loading missed signals...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Signal Execution Modal -->
  <div id="signal-execute-modal" class="signal-modal-overlay" style="display:none;">
    <div class="signal-modal-box">
      <div class="signal-modal-header">
        <span>Confirm Copy Trade</span>
        <button onclick="closeSignalModal()" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;">✕</button>
      </div>
      <div class="signal-modal-body">
        <div class="signal-modal-row"><span>Available balance:</span><span id="sm-balance">--</span></div>
        <div class="signal-modal-row"><span>Copy Trade Amount</span><span id="sm-amount-label">--</span></div>
        <input type="number" id="sm-amount-input" class="form-control" style="margin:12px 0;font-size:16px;text-align:center;" placeholder="Trade amount (USDT)"/>
        <div id="sm-estimated-profit" style="text-align:center;font-size:13px;color:#00f2fe;margin-bottom:12px;"></div>
        <button class="signal-confirm-btn" id="sm-confirm-btn" onclick="executeSignalTrade()">Confirm</button>
      </div>
    </div>
  </div>`;
}

// Load Lightweight Charts library dynamically
function loadLightweightCharts() {
  return new Promise((resolve) => {
    if (window.LightweightCharts) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js';
    script.onload = () => resolve();
    script.onerror = () => resolve(); // fail gracefully
    document.head.appendChild(script);
  });
}

export async function init() {
  let currentPair = 'BTCUSDT';
  let currentLeverage = 10;
  let currentPrice = 0;
  let currentTF = '1m';
  let ws = null;
  let klineWs = null;
  let allPairs = [];
  let positionsInterval = null;
  let chart = null;
  let candleSeries = null;

  const TOKEN = localStorage.getItem('rxdt_token');
  const authHeaders = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  // ---- Load Chart Library ----
  await loadLightweightCharts();
  initChart();

  // ---- Init Lightweight Chart ----
  function initChart() {
    const container = document.getElementById('kline-chart');
    if (!container || !window.LightweightCharts) return;

    chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 280,
      layout: {
        background: { color: '#0a0e1a' },
        textColor: '#9ba3b2',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: 'rgba(0,242,254,0.5)', width: 1, style: 2 },
        horzLine: { color: 'rgba(0,242,254,0.5)', width: 1, style: 2, labelBackgroundColor: '#00f2fe' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        textColor: '#9ba3b2',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    candleSeries = chart.addCandlestickSeries({
      upColor: '#00c49a',
      downColor: '#ff416c',
      borderUpColor: '#00c49a',
      borderDownColor: '#ff416c',
      wickUpColor: '#00c49a',
      wickDownColor: '#ff416c',
    });

    // Resize on window resize
    const ro = new ResizeObserver(() => {
      if (chart && container) chart.applyOptions({ width: container.clientWidth });
    });
    ro.observe(container);

    loadKlineData(currentPair, currentTF);
    connectKlineWS(currentPair, currentTF);
  }

  // ---- Fetch Historical Kline Data from Binance ----
  async function loadKlineData(symbol, interval) {
    if (!candleSeries) return;
    try {
      const limit = interval === '1d' ? 90 : interval === '1h' ? 100 : 120;
      const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      const data = await res.json();
      const candles = data.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      }));
      candleSeries.setData(candles);
      chart.timeScale().fitContent();
    } catch (e) {
      console.warn('Kline fetch error:', e);
    }
  }

  // ---- Kline WebSocket for Live Candle Updates ----
  function connectKlineWS(symbol, interval) {
    if (klineWs) klineWs.close();
    const sym = symbol.toLowerCase();
    klineWs = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@kline_${interval}`);
    klineWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const k = msg.k;
      if (!candleSeries) return;
      candleSeries.update({
        time: Math.floor(k.t / 1000),
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
      });
    };
    klineWs.onclose = () => {
      if (currentPair === symbol && currentTF === interval) {
        setTimeout(() => connectKlineWS(symbol, interval), 3000);
      }
    };
  }

  // ---- Ticker WebSocket for Live Price ----
  function connectTickerWS(symbol) {
    if (ws) ws.close();
    const sym = symbol.toLowerCase();
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym}@ticker`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      currentPrice = parseFloat(data.c);
      const change = parseFloat(data.P);
      const high = parseFloat(data.h);
      const low = parseFloat(data.l);
      const vol = parseFloat(data.q);

      const priceEl = document.getElementById('contract-price');
      const changeEl = document.getElementById('contract-change');
      if (priceEl) {
        priceEl.textContent = `$${currentPrice < 1 ? currentPrice.toFixed(6) : currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
        priceEl.className = `price-val ${change >= 0 ? 'color-up' : 'color-down'}`;
      }
      if (changeEl) {
        changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeEl.className = `price-change ${change >= 0 ? 'color-up' : 'color-down'}`;
      }
      const highEl = document.getElementById('cs-high');
      const lowEl = document.getElementById('cs-low');
      const volEl = document.getElementById('cs-vol');
      if (highEl) highEl.textContent = `$${high < 1 ? high.toFixed(6) : fmt(high)}`;
      if (lowEl) lowEl.textContent = `$${low < 1 ? low.toFixed(6) : fmt(low)}`;
      if (volEl) volEl.textContent = vol > 1e9 ? `${(vol / 1e9).toFixed(2)}B` : `${(vol / 1e6).toFixed(1)}M`;

      updateCalc();
    };

    ws.onclose = () => {
      if (currentPair === symbol) setTimeout(() => connectTickerWS(symbol), 3000);
    };
  }

  // ---- Switch Timeframe ----
  window.switchChartTF = function (tf, btn) {
    currentTF = tf;
    document.querySelectorAll('.tf-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (candleSeries) candleSeries.setData([]);
    loadKlineData(currentPair, tf);
    connectKlineWS(currentPair, tf);
  };

  // ---- Load All Pairs ----
  async function loadPairs() {
    try {
      const res = await fetch('/api/contract/pairs');
      const data = await res.json();
      allPairs = data.pairs || [];
      renderPairList(allPairs);
    } catch (e) { console.warn('Failed to load pairs:', e); }
  }

  function renderPairList(pairs) {
    const el = document.getElementById('pair-list');
    if (!el) return;
    el.innerHTML = pairs.slice(0, 80).map(p => {
      const logo = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${p.base.toLowerCase()}.png`;
      const fallback = `https://cryptoicons.org/api/icon/${p.base.toLowerCase()}/28`;
      return `
      <div class="pair-item ${p.symbol === currentPair ? 'active' : ''}" onclick="selectPair('${p.symbol}')">
        <span style="display:flex;align-items:center;gap:8px;" class="pair-item-name">
          <img src="${logo}" width="24" height="24" style="border-radius:50%;object-fit:cover;" 
               onerror="this.onerror=null;this.src='${fallback}';this.onerror=function(){this.style.display='none';}" />
          ${p.base}/USDT
        </span>
        <span class="pair-item-price">$${p.price < 1 ? p.price.toFixed(6) : p.price.toFixed(2)}</span>
        <span class="pair-item-change ${p.change >= 0 ? 'color-up' : 'color-down'}">${p.change >= 0 ? '+' : ''}${p.change.toFixed(2)}%</span>
      </div>
    `}).join('');
  }

  // ---- Pair Selection ----
  window.selectPair = function (symbol) {
    currentPair = symbol;
    const base = symbol.replace('USDT', '');
    const labelEl = document.getElementById('contract-pair-label');
    if (labelEl) labelEl.textContent = `${base}/USDT`;
    const icons = { BTC: '₿', ETH: 'Ξ', BNB: '🔶', SOL: '◎', XRP: '✕', DOGE: '🐕', PEPE: '🐸', ADA: '♦', AVAX: '🔺', MATIC: '🔷' };
    const iconEl = document.getElementById('contract-pair-icon');
    if (iconEl) iconEl.textContent = icons[base] || base[0];

    // Reset chart and reconnect everything
    if (candleSeries) candleSeries.setData([]);
    loadKlineData(symbol, currentTF);
    connectKlineWS(symbol, currentTF);
    connectTickerWS(symbol);
    document.getElementById('pair-dropdown').style.display = 'none';
    updateCalc();
  };

  window.togglePairDropdown = function () {
    const dd = document.getElementById('pair-dropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  };

  window.filterPairs = function (q) {
    const filtered = allPairs.filter(p =>
      p.symbol.toLowerCase().includes(q.toLowerCase()) ||
      p.base.toLowerCase().includes(q.toLowerCase())
    );
    renderPairList(filtered);
  };

  // ---- Leverage Selection ----
  window.selectLeverage = function (lev) {
    currentLeverage = lev;
    document.querySelectorAll('.lev-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.lev) === lev);
    });
    updateCalc();
  };

  // ---- Quick Amount ----
  window.setQuickAmount = function (amount) {
    const inp = document.getElementById('contract-amount');
    if (inp) { inp.value = amount; updateCalc(); }
  };

  // ---- Calc Update ----
  window.updateCalc = function () {
    const amount = parseFloat(document.getElementById('contract-amount')?.value || '0');
    if (!amount || !currentPrice) return;

    const notional = amount * currentLeverage;
    const estPnL = notional * 0.01;
    const liqLong = currentPrice * (1 - 0.9 / currentLeverage);
    const liqShort = currentPrice * (1 + 0.9 / currentLeverage);

    const notEl = document.getElementById('calc-notional');
    const pnlEl = document.getElementById('calc-pnl');
    const liqEl = document.getElementById('calc-liq');

    if (notEl) notEl.textContent = `$${fmt(notional)} USDT`;
    if (pnlEl) pnlEl.textContent = `±$${fmt(estPnL)}`;
    if (liqEl) liqEl.textContent = `L:$${fmt(liqLong, 2)} | S:$${fmt(liqShort, 2)}`;
  };

  // ---- Open Position ----
  window.openPosition = async function (direction) {
    if (!store.isLoggedIn()) { toast('Please login first', 'error'); window.location.hash = '#/login'; return; }
    const amount = parseFloat(document.getElementById('contract-amount')?.value || '0');
    if (!amount || amount < 10) { toast('Minimum position size is $10 USDT', 'error'); return; }

    const btnId = direction === 'long' ? 'btn-open-long' : 'btn-open-short';
    const btn = document.getElementById(btnId);
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
      // Refresh user balance so available/frozen reflect the new position
      if (store.checkAuth) await store.checkAuth();
      loadPositions();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = direction === 'long' ? '▲ Open Long' : '▼ Open Short';
      }
    }
  };

  // ---- Close Position ----
  window.closePosition = async function (id) {
    if (!confirm('Close this position at current market price?')) return;
    try {
      const res = await fetch(`/api/contract/close/${id}`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close');
      const sign = data.pnl >= 0 ? '+' : '';
      toast(`✅ ${sign}$${data.pnl.toFixed(2)} P&L settled`, data.pnl >= 0 ? 'success' : 'error');
      // Refresh user balance so available/frozen reflect the closed position
      if (store.checkAuth) await store.checkAuth();
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
      if (el) el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:14px;">Login to view positions</div>`;
      return;
    }
    try {
      const res = await fetch('/api/contract/positions', { headers: authHeaders });
      const data = await res.json();
      renderPositions(data.positions || []);
    } catch (e) { console.warn('Load positions error:', e); }
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
      const livePrice = (currentPair === p.pair && currentPrice > 0) ? currentPrice : entryPrice;
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
          <div class="pos-stat"><span>Live P&L</span><span class="${pnl >= 0 ? 'color-up' : 'color-down'}">${pnlSign}$${fmt(pnl)} (${pnlSign}${(pct * p.leverage * 100).toFixed(2)}%)</span></div>
        </div>
        <button class="btn-close-pos" onclick="closePosition('${p.id}')">Close Position at Market</button>
      </div>`;
    }).join('');
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
          <span>${h.pair.replace('USDT', '')}/USDT <span class="pos-dir ${h.direction === 'long' ? 'dir-long' : 'dir-short'}" style="font-size:11px;padding:2px 6px;">${h.direction === 'long' ? '▲L' : '▼S'} ${h.leverage}x</span></span>
          <span>Entry: $${parseFloat(h.entry_price).toLocaleString()}</span>
          <span>Close: $${parseFloat(h.close_price || 0).toLocaleString()}</span>
          <span class="${pnl >= 0 ? 'color-up' : 'color-down'}" style="font-weight:700;">${pnl >= 0 ? '+' : ''}$${fmt(pnl)}</span>
        </div>`;
      }).join('');
    } catch (e) { }
  }

  // ---- Close dropdown on outside click ----
  document.addEventListener('click', function handler(e) {
    const dd = document.getElementById('pair-dropdown');
    if (dd && !e.target.closest('.contract-pair-selector') && !e.target.closest('.contract-pair-dropdown')) {
      dd.style.display = 'none';
    }
  });

  // ---- Signal Tab Switching ----
  let activeSignalData = null;

  window.switchSignalTab = function (tab) {
    document.getElementById('signal-panel-consume').style.display = tab === 'consume' ? 'block' : 'none';
    document.getElementById('signal-panel-invited').style.display = tab === 'invited' ? 'block' : 'none';
    document.getElementById('tab-consume').classList.toggle('active', tab === 'consume');
    document.getElementById('tab-invited').classList.toggle('active', tab === 'invited');
    if (tab === 'invited') loadSignalCard();
    if (tab === 'consume') loadConsumeRecord();
  };

  window.switchSignalSubTab = function (sub) {
    document.getElementById('signal-current-panel').style.display = sub === 'current' ? 'block' : 'none';
    document.getElementById('signal-history-panel').style.display = sub === 'history' ? 'block' : 'none';
    document.getElementById('subtab-current').classList.toggle('active', sub === 'current');
    document.getElementById('subtab-history').classList.toggle('active', sub === 'history');
    if (sub === 'history') {
      // Default to Finished tab when opening history
      switchHistoryTab('finished');
    }
  };

  // ---- Contract Type Toggle (Perpetual / Delivery) ----
  window.switchContractType = function (type) {
    document.getElementById('ctype-perpetual').classList.toggle('active', type === 'perpetual');
    document.getElementById('ctype-delivery').classList.toggle('active', type === 'delivery');
    // Both modes use same delivery signal system; just UI indicator
    toast(type === 'perpetual' ? 'Perpetual trading mode (coming soon)' : 'Delivery contract mode active', 'info');
  };

  // ---- Submitted / Finished / Missed History Sub-sub-tab ----
  window.switchHistoryTab = function (tab) {
    const submittedPanel = document.getElementById('shtab-submitted-panel');
    const finishedPanel = document.getElementById('shtab-finished-panel');
    const missedPanel = document.getElementById('shtab-missed-panel');
    const submittedBtn = document.getElementById('shtab-submitted');
    const finishedBtn = document.getElementById('shtab-finished');
    const missedBtn = document.getElementById('shtab-missed');
    if (!submittedPanel || !finishedPanel) return;
    submittedPanel.style.display = tab === 'submitted' ? 'block' : 'none';
    finishedPanel.style.display = tab === 'finished' ? 'block' : 'none';
    if (missedPanel) missedPanel.style.display = tab === 'missed' ? 'block' : 'none';
    if (submittedBtn) submittedBtn.classList.toggle('active', tab === 'submitted');
    if (finishedBtn) finishedBtn.classList.toggle('active', tab === 'finished');
    if (missedBtn) missedBtn.classList.toggle('active', tab === 'missed');
    if (tab === 'finished') loadSignalHistory();
    if (tab === 'submitted') loadSubmittedOrders();
    if (tab === 'missed') loadMissedSignals();
  };

  // ---- Load Consume Record (account_changes) ----
  async function loadConsumeRecord() {
    if (!store.isLoggedIn()) {
      document.getElementById('consume-record-list').innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);">Login to view records</div>`;
      return;
    }
    try {
      const res = await fetch('/api/signals/consume-record', { headers: authHeaders });
      const data = await res.json();
      const list = document.getElementById('consume-record-list');
      if (!list) return;
      const records = data.records || [];
      if (!records.length) {
        list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">No transaction records yet</div>`;
        return;
      }
      list.innerHTML = records.map(r => {
        const amount = parseFloat(r.amount);
        const isPositive = amount >= 0;
        const typeMap = {
          signal_close: 'Contract',
          signal_open: 'Contract',
          deposit: 'Funding',
          withdrawal: 'Funding',
          commission: 'Commission',
        };
        const subtitleMap = {
          signal_close: 'Close Position (Futures)',
          signal_open: 'Open Position (Futures)',
          deposit: 'Deposit',
          withdrawal: 'Withdraw',
          commission: 'Referral Commission',
        };
        const typeName = typeMap[r.type] || 'Transaction';
        const subName = subtitleMap[r.type] || (r.remark || 'Transaction');
        const dt = new Date(r.created_at);
        const timeStr = dt.toISOString().replace('T', ' ').substring(0, 19);
        return `
        <div class="consume-record-item">
          <div class="cr-icon ${isPositive ? 'cr-icon-up' : 'cr-icon-down'}">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="${isPositive ? 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z' : 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z'}" fill="currentColor"/></svg>
          </div>
          <div class="cr-info">
            <div class="cr-title">${typeName}</div>
            <div class="cr-sub">${subName}</div>
            <div class="cr-time">🕐 ${timeStr}</div>
          </div>
          <div class="cr-amount ${isPositive ? 'cr-positive' : 'cr-negative'}">
            ${isPositive ? '+' : ''}${amount.toFixed(3)}
            <div class="cr-currency">USDT</div>
          </div>
        </div>`;
      }).join('');
    } catch (e) {
      console.warn('Consume record error:', e);
    }
  }

  // ---- Load Active Signal Card ----
  async function loadSignalCard() {
    if (!store.isLoggedIn()) {
      document.getElementById('signal-active-card').innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);">Login to view signals</div>`;
      return;
    }
    try {
      const res = await fetch('/api/signals/active', { headers: authHeaders });
      const data = await res.json();
      activeSignalData = data;
      const card = document.getElementById('signal-active-card');
      if (!card) return;

      if (!data.activeSignal) {
        const now = new Date();
        const h = now.getUTCHours();
        let nextSignal = h < 14 ? '5:00 PM' : h < 15 ? '6:00 PM' : h < 16 ? '7:00 PM' : 'tomorrow at 5:00 PM';
        card.innerHTML = `
        <div style="text-align:center;padding:32px;">
          <div style="font-size:40px;margin-bottom:12px;">⏰</div>
          <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:6px;">No Active Signal Right Now</div>
          <div style="font-size:13px;color:var(--text-muted);">Next signal window: <strong style="color:#00f2fe;">${nextSignal} EAT</strong></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Log in at 5pm, 6pm, or 7pm EAT to copy AI signals</div>
        </div>`;
        return;
      }

      const signal = data.activeSignal;
      const tier = data.tier;
      const qualified = data.qualified;
      const alreadyExecuted = data.alreadyExecuted;
      const freeSignalCredits = data.freeSignalCredits || 0;
      const openTime = new Date(signal.openTime);
      const timeStr = openTime.toISOString().replace('T', ' ').substring(0, 19);
      const minsLeft = signal.minutesRemaining;
      const isFreeSignal = !!signal.isFreeSignal;

      // Determine the operate button / message
      let operateHtml;
      if (alreadyExecuted) {
        operateHtml = `<span style="color:#00c49a;font-weight:700;">✅ Completed today</span>`;
      } else if (qualified) {
        operateHtml = `<button class="signal-confirm-cta" onclick="openSignalModal()">${isFreeSignal ? 'Join Free Signal' : 'Confirm Copy Trade'}</button>`;
      } else if (isFreeSignal) {
        operateHtml = `<span style="color:#ff4d4d;font-size:13px;">⚠️ No free signal credits. Refer a friend to earn a free 8pm signal.</span>`;
      } else if (!tier) {
        operateHtml = `<span style="color:#ff4d4d;font-size:13px;">⚠️ Minimum $100 deposit required for copy trading</span>`;
      } else {
        operateHtml = `<span style="color:#ff4d4d;font-size:13px;">⚠️ Signal ${signal.signalId} not included in your tier (${tier.label})</span>`;
      }

      const autoPref = data.autoSignalExec !== false;

      card.innerHTML = `
      <div class="signal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-size:12px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,0.15);padding:4px 10px;border-radius:20px;">${isFreeSignal ? '🎁 FREE SIGNAL' : '🟡 LIVE SIGNAL'}</span>
          <span style="font-size:12px;color:var(--text-muted);">⏱ ${minsLeft} min left</span>
        </div>
        <div class="signal-detail-row"><span class="sd-label">Title</span><span class="sd-val">Signal ${signal.signalId}${isFreeSignal ? ' (Free)' : ''}</span></div>
        <div class="signal-detail-row"><span class="sd-label">Trading pair</span><span class="sd-val">${signal.tradingPair}</span></div>
        <div class="signal-detail-row"><span class="sd-label">Purchase Duration</span><span class="sd-val">${signal.purchaseDuration}</span></div>
        <div class="signal-detail-row"><span class="sd-label">Opening time</span><span class="sd-val">${timeStr}</span></div>
        ${tier ? `<div class="signal-detail-row"><span class="sd-label">Your Tier</span><span class="sd-val" style="color:#00f2fe;">${tier.label} · ${tier.description}</span></div>` : ''}
        ${isFreeSignal ? `<div class="signal-detail-row"><span class="sd-label">Free Credits</span><span class="sd-val" style="color:#00f2fe;">${freeSignalCredits} available</span></div>` : ''}
        <div class="signal-detail-row">
          <span class="sd-label">Auto Execute</span>
          <span class="signal-auto-toggle-wrap">
            <label class="signal-toggle">
              <input type="checkbox" id="signal-auto-exec-toggle" ${autoPref ? 'checked' : ''} onchange="toggleSignalAutoExec(this.checked)"/>
              <span class="signal-toggle-slider"></span>
            </label>
            <span class="signal-toggle-label" id="signal-auto-exec-label" style="color:${autoPref ? '#00c49a' : '#f59e0b'};">${autoPref ? 'Auto' : 'Manual'}</span>
          </span>
        </div>
        <div class="signal-detail-row">
          <span class="sd-label">Operate</span>
          <span>${operateHtml}</span>
        </div>
        <div class="signal-detail-row manual-hint" id="signal-manual-hint" style="${autoPref ? 'display:none;' : ''}">
          <span class="sd-label" style="font-size:12px;color:#f59e0b;">Manual mode</span>
          <span style="font-size:12px;color:#f59e0b;text-align:right;max-width:220px;">You will be notified when a signal is active. Click "Confirm Copy Trade" to execute manually.</span>
        </div>
      </div>`;
    } catch (e) {
      console.warn('Signal load error:', e);
    }
  }

  // ---- Toggle Auto/Manual Signal Execution ----
  window.toggleSignalAutoExec = async function (checked) {
    const label = document.getElementById('signal-auto-exec-label');
    const hint = document.getElementById('signal-manual-hint');
    try {
      await store.setSignalPreference(checked);
      if (label) {
        label.textContent = checked ? 'Auto' : 'Manual';
        label.style.color = checked ? '#00c49a' : '#f59e0b';
      }
      if (hint) hint.style.display = checked ? 'none' : '';
      toast(checked ? '✅ Auto execution enabled — signals will be executed automatically' : 'ℹ️ Manual mode enabled — you will be notified and can execute signals manually', checked ? 'success' : 'info');
    } catch (err) {
      toast('Failed to update signal preference: ' + err.message, 'error');
      // Revert the toggle
      const toggle = document.getElementById('signal-auto-exec-toggle');
      if (toggle) toggle.checked = !checked;
    }
  };

  // ---- Open Confirm Modal ----
  window.openSignalModal = function () {
    if (!activeSignalData) return;
    const balance = parseFloat(activeSignalData.userBalance || 0);

    // Pre-check: block copy trade if the account balance is zero
    if (balance <= 0) {
      toast('Insufficient balance to join copy trade', 'error');
      return;
    }

    const tradeAmount = balance; // 100% of available balance allocated
    document.getElementById('sm-balance').textContent = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`;
    document.getElementById('sm-amount-label').textContent = `(100% Capital: $${balance.toFixed(2)} USDT)`;
    document.getElementById('sm-amount-input').value = tradeAmount.toFixed(2);
    document.getElementById('sm-estimated-profit').textContent = '';
    document.getElementById('signal-execute-modal').style.display = 'flex';
    updateSignalProfit();
  };

  window.closeSignalModal = function () {
    document.getElementById('signal-execute-modal').style.display = 'none';
  };

  // Listen to input changes to update estimated profit
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'sm-amount-input') updateSignalProfit();
  });

  function updateSignalProfit() {
    const balance = parseFloat(activeSignalData?.userBalance || 0);
    const amt = parseFloat(document.getElementById('sm-amount-input')?.value || 0);
    const el = document.getElementById('sm-estimated-profit');
    if (!el || amt <= 0) return;

    // Use the tier's per-signal profit rate from the server response
    const tier = activeSignalData?.tier;
    const isFreeSignal = !!activeSignalData?.activeSignal?.isFreeSignal;
    let perSignalRate;
    if (isFreeSignal) {
      perSignalRate = 0.014; // Free signal uses Tier 1 rate (1.4%)
    } else if (tier && tier.dailyProfitPercent) {
      const signalCount = (tier.signals && tier.signals.length) || 1;
      perSignalRate = tier.dailyProfitPercent / signalCount;
    } else {
      perSignalRate = 0.014; // fallback to Tier 1
    }

    const estProfit = amt * perSignalRate;
    el.textContent = `Estimated profit: +${estProfit.toFixed(4)} USDT (${(perSignalRate * 100).toFixed(2)}% per signal)`;
  }

  // ---- Execute Signal Trade ----
  window.executeSignalTrade = async function () {
    // Pre-check before submitting: block if account balance is zero
    const balance = parseFloat(activeSignalData?.userBalance || 0);
    if (balance <= 0) {
      toast('Insufficient balance to join copy trade', 'error');
      document.getElementById('signal-execute-modal').style.display = 'none';
      return;
    }

    const btn = document.getElementById('sm-confirm-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting Order...'; }

    try {
      const amountInput = document.getElementById('sm-amount-input');
      const tradeAmount = parseFloat(amountInput?.value || '0');
      if (!tradeAmount || tradeAmount > balance) {
        toast(tradeAmount > balance ? 'Amount exceeds available balance' : 'Please enter a valid trade amount', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Confirm'; }
        return;
      }
      const res = await fetch('/api/signals/execute', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount: tradeAmount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      document.getElementById('signal-execute-modal').style.display = 'none';
      toast(`✅ Order Submitted! Capital is In Order and will release at signal close with profit.`, 'success');

      // Refresh user balance & tabs
      if (store.checkAuth) await store.checkAuth();
      loadSignalCard();
      loadConsumeRecord();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirm'; }
    }
  };

  // ---- Load Signal Trade History (Finished Tab) ----
  async function loadSignalHistory() {
    if (!store.isLoggedIn()) return;
    try {
      const res = await fetch('/api/signals/history?status=completed', { headers: authHeaders });
      const data = await res.json();
      const el = document.getElementById('signal-history-list');
      if (!el) return;
      const trades = data.trades || [];
      if (!trades.length) {
        el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">No finished copy trades yet</div>`;
        return;
      }
      el.innerHTML = trades.map(t => {
        const pnl = parseFloat(t.profit || 0);
        const tradeAmount = parseFloat(t.trade_amount || 0);
        const purchasePrice = parseFloat(t.purchase_price || t.entry_price || 0);
        const settlementPrice = parseFloat(t.settlement_price || t.close_price || 0);
        // Delivery time is the signal's duration in seconds (e.g. 30s)
        const deliveryTime = t.delivery_seconds ? `${t.delivery_seconds}s` : (t.duration || '30s');
        // Expiration time
        const releaseAt = t.release_at || t.closed_at || t.created_at;
        const expTime = releaseAt ? new Date(releaseAt).toISOString().replace('T', ' ').substring(0, 19) : '--';
        const pairLabel = (t.pair || 'BTC/USDT').replace('USDT', '/USDT');
        const pnlSign = pnl >= 0 ? '+' : '';
        const pnlClass = pnl >= 0 ? 'color-up' : 'color-down';
        const status = t.status === 'open' ? 'In Progress' : 'Finished';

        return `
        <div class="ctrade-card">
          <div class="ctrade-row">
            <span class="ctrade-lbl">Trading pair</span>
            <span class="ctrade-val">${pairLabel}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Number</span>
            <span class="ctrade-val">${tradeAmount.toFixed(2)}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Delivery time</span>
            <span class="ctrade-val">${deliveryTime}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Purchase price</span>
            <span class="ctrade-val">${purchasePrice > 0 ? purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '--'}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Settlement price</span>
            <span class="ctrade-val">${settlementPrice > 0 ? settlementPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '--'}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">P/L</span>
            <span class="ctrade-val ${pnlClass}">${pnlSign}${pnl.toFixed(2)}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Expiration time</span>
            <span class="ctrade-val">${expTime}</span>
          </div>
          <div class="ctrade-row" style="margin-bottom:0;">
            <span class="ctrade-lbl">Status</span>
            <span class="ctrade-val ctrade-status-finished">${status}</span>
          </div>
        </div>`;
      }).join('');
    } catch (e) { console.warn('Signal history error:', e); }
  }

  // ---- Load Submitted Orders (In Progress Signal Trades) ----
  async function loadSubmittedOrders() {
    if (!store.isLoggedIn()) return;
    const el = document.getElementById('signal-submitted-list');
    if (!el) return;
    try {
      const res = await fetch('/api/signals/history?status=open', { headers: authHeaders });
      const data = await res.json();
      const trades = data.trades || [];
      if (!trades.length) {
        el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">No submitted orders currently active</div>`;
        return;
      }
      el.innerHTML = trades.map(t => {
        const tradeAmount = parseFloat(t.trade_amount || 0);
        const pairLabel = (t.pair || 'BTC/USDT').replace('USDT', '/USDT');
        const purchasePrice = parseFloat(t.purchase_price || t.entry_price || 0);
        const deliveryTime = t.delivery_seconds ? `${t.delivery_seconds}s` : (t.duration || '30s');
        const releaseAt = t.release_at ? new Date(t.release_at).toISOString().replace('T', ' ').substring(0, 19) : '--';
        return `
        <div class="ctrade-card">
          <div class="ctrade-row">
            <span class="ctrade-lbl">Trading pair</span>
            <span class="ctrade-val">${pairLabel}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Number</span>
            <span class="ctrade-val">${tradeAmount.toFixed(2)}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Delivery time</span>
            <span class="ctrade-val">${deliveryTime}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Purchase price</span>
            <span class="ctrade-val">${purchasePrice > 0 ? purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '--'}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Expiration time</span>
            <span class="ctrade-val">${releaseAt}</span>
          </div>
          <div class="ctrade-row" style="margin-bottom:0;">
            <span class="ctrade-lbl">Status</span>
            <span class="ctrade-val" style="color:#f59e0b;font-weight:700;">Submitted</span>
          </div>
        </div>`;
      }).join('');
    } catch (e) {
      if (el) el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);">No submitted orders</div>`;
    }
  }

  // ---- Load Missed Signals ----
  async function loadMissedSignals() {
    if (!store.isLoggedIn()) return;
    const el = document.getElementById('signal-missed-list');
    if (!el) return;
    try {
      const res = await fetch('/api/signals/missed', { headers: authHeaders });
      const data = await res.json();
      const missed = data.missed || [];
      if (!missed.length) {
        el.innerHTML = `<div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">🎉 No missed signals — you traded all your eligible windows!</div>`;
        return;
      }
      el.innerHTML = missed.map(m => {
        const isFree = !!m.isFreeSignal;
        return `
        <div class="ctrade-card ctrade-missed-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span class="ctrade-missed-badge">⚠️ Missed</span>
            <span class="ctrade-missed-date">${m.date}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Signal</span>
            <span class="ctrade-val">Signal ${m.signalId}${isFree ? ' (Free)' : ''}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Time (EAT)</span>
            <span class="ctrade-val">${m.timeEAT}</span>
          </div>
          <div class="ctrade-row">
            <span class="ctrade-lbl">Trading pair</span>
            <span class="ctrade-val">${m.tradingPair}</span>
          </div>
          <div class="ctrade-row" style="margin-bottom:0;">
            <span class="ctrade-lbl">Status</span>
            <span class="ctrade-val ctrade-missed-status">Missed — no trade executed</span>
          </div>
        </div>`;
      }).join('');
    } catch (e) {
      console.warn('Missed signals error:', e);
      el.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">Failed to load missed signals</div>`;
    }
  }

  // ---- Init ----
  connectTickerWS(currentPair);
  loadPairs();
  loadPositions();
  loadHistory();
  loadConsumeRecord(); // load consume record by default

  // Auto-refresh positions, balance & signal trade history every 4s for real-time 30s settlement
  positionsInterval = setInterval(() => {
    loadPositions();
    if (store.isLoggedIn()) {
      if (store.checkAuth) store.checkAuth();
      const activeTab = document.querySelector('.signal-main-tab.active')?.id;
      if (activeTab === 'tab-invited') {
        const activeSub = document.querySelector('.signal-subtab.active')?.id;
        if (activeSub === 'subtab-history') {
          const activeHist = document.querySelector('.sh-tab.active')?.id;
          if (activeHist === 'shtab-submitted') loadSubmittedOrders();
          if (activeHist === 'shtab-finished') loadSignalHistory();
        }
      } else if (activeTab === 'tab-consume') {
        loadConsumeRecord();
      }
    }
  }, 4000);

  // Cleanup on navigate away
  window.addEventListener('hashchange', () => {
    if (ws) { ws.onclose = null; ws.close(); }
    if (klineWs) { klineWs.onclose = null; klineWs.close(); }
    if (positionsInterval) clearInterval(positionsInterval);
    if (chart) { chart.remove(); chart = null; }
  }, { once: true });
}

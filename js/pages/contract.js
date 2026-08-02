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
        <!-- Quick amounts -->
        <div class="quick-amounts">
          <button class="qa-btn" onclick="setQuickAmount(10)">$10</button>
          <button class="qa-btn" onclick="setQuickAmount(50)">$50</button>
          <button class="qa-btn" onclick="setQuickAmount(100)">$100</button>
          <button class="qa-btn" onclick="setQuickAmount(500)">$500</button>
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
        <button class="btn-long" id="btn-open-long" onclick="openPosition('long')">
          ▲ Open Long
        </button>
        <button class="btn-short" id="btn-open-short" onclick="openPosition('short')">
          ▼ Open Short
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
          return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
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
  window.switchChartTF = function(tf, btn) {
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
  window.selectPair = function(symbol) {
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

  window.togglePairDropdown = function() {
    const dd = document.getElementById('pair-dropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
  };

  window.filterPairs = function(q) {
    const filtered = allPairs.filter(p =>
      p.symbol.toLowerCase().includes(q.toLowerCase()) ||
      p.base.toLowerCase().includes(q.toLowerCase())
    );
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

  // ---- Quick Amount ----
  window.setQuickAmount = function(amount) {
    const inp = document.getElementById('contract-amount');
    if (inp) { inp.value = amount; updateCalc(); }
  };

  // ---- Calc Update ----
  window.updateCalc = function() {
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
    if (liqEl) liqEl.textContent = `L:$${fmt(liqLong,2)} | S:$${fmt(liqShort,2)}`;
  };

  // ---- Open Position ----
  window.openPosition = async function(direction) {
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
  window.closePosition = async function(id) {
    if (!confirm('Close this position at current market price?')) return;
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
    } catch (e) {}
  }

  // ---- Close dropdown on outside click ----
  document.addEventListener('click', function handler(e) {
    const dd = document.getElementById('pair-dropdown');
    if (dd && !e.target.closest('.contract-pair-selector') && !e.target.closest('.contract-pair-dropdown')) {
      dd.style.display = 'none';
    }
  });

  // ---- Init ----
  connectTickerWS(currentPair);
  loadPairs();
  loadPositions();
  loadHistory();

  // Auto-refresh positions every 5s for live P&L
  positionsInterval = setInterval(() => loadPositions(), 5000);

  // Cleanup on navigate away
  window.addEventListener('hashchange', () => {
    if (ws) { ws.onclose = null; ws.close(); }
    if (klineWs) { klineWs.onclose = null; klineWs.close(); }
    if (positionsInterval) clearInterval(positionsInterval);
    if (chart) { chart.remove(); chart = null; }
  }, { once: true });
}

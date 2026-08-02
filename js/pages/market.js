import store from '../store.js';

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container')?.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// State
let allPairs = [];
let filteredPairs = [];
let currentTab = 'all';
let detailChart = null;
let detailCandleSeries = null;
let detailWs = null;
let marketTickerWs = null;
let priceMap = {}; // live price updates

export function render() {
  return `
  <div class="market-page">
    <!-- Header -->
    <div class="market-top-bar">
      <div>
        <h1 class="page-title" style="margin:0 0 2px;">Markets</h1>
        <div style="font-size:12px;color:var(--text-muted);">Live data via Binance · <span id="market-pair-count">Loading...</span> pairs</div>
      </div>
      <div class="market-search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" id="market-search" class="market-search-input" placeholder="Search coin..." oninput="filterMarket(this.value)"/>
      </div>
    </div>

    <!-- Tabs -->
    <div class="market-tabs">
      <button class="mkt-tab active" data-tab="all" onclick="switchMktTab('all',this)">⭐ All</button>
      <button class="mkt-tab" data-tab="gainers" onclick="switchMktTab('gainers',this)">🔥 Gainers</button>
      <button class="mkt-tab" data-tab="losers" onclick="switchMktTab('losers',this)">📉 Losers</button>
      <button class="mkt-tab" data-tab="volume" onclick="switchMktTab('volume',this)">💎 Top Vol</button>
      <button class="mkt-tab" data-tab="new" onclick="switchMktTab('new',this)">🆕 New</button>
    </div>

    <!-- Sort row -->
    <div class="market-sort-row">
      <span class="sort-col" onclick="sortMarket('name')">Coin ↕</span>
      <span class="sort-col" onclick="sortMarket('price')">Price ↕</span>
      <span class="sort-col" onclick="sortMarket('change')" style="color:#00f2fe;">24H % ↕</span>
      <span class="sort-col" onclick="sortMarket('volume')">Volume ↕</span>
      <span class="sort-col" style="text-align:right;">Action</span>
    </div>

    <!-- Market List -->
    <div id="market-list" class="market-list">
      <div class="market-loading">
        <div class="mkt-spinner"></div>
        <div>Fetching live market data from Binance...</div>
      </div>
    </div>
  </div>

  <!-- Coin Detail Modal -->
  <div class="modal-overlay" id="coin-detail-modal">
    <div class="modal-content coin-detail-modal-content" id="coin-detail-content"></div>
  </div>
  `;
}

// ---- Load Lightweight Charts ----
function loadLightweightCharts() {
  return new Promise((resolve) => {
    if (window.LightweightCharts) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js';
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

// ---- Fetch All Binance USDT Pairs ----
async function fetchBinancePairs() {
  const res = await fetch('https://api.binance.com/api/v3/ticker/24hr');
  const tickers = await res.json();

  // Filter to USDT pairs with decent volume
  const pairs = tickers
    .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 500000)
    .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, 120)
    .map(t => {
      const base = t.symbol.replace('USDT', '');
      const price = parseFloat(t.lastPrice);
      const change = parseFloat(t.priceChangePercent);
      const vol = parseFloat(t.quoteVolume);
      const high = parseFloat(t.highPrice);
      const low = parseFloat(t.lowPrice);
      return {
        symbol: t.symbol,
        base,
        name: getCoinName(base),
        price,
        change,
        high,
        low,
        volume: vol,
        volumeStr: formatVolume(vol),
        mcap: estimateMcap(base, price),
        icon: getCoinIcon(base),
        color: change >= 0 ? '#00c49a' : '#ff416c',
        isNew: isNewCoin(base),
      };
    });

  return pairs;
}

// ---- Fetch Mini Sparkline (7 points) ----
async function fetchSparkline(symbol) {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=14`);
    const data = await res.json();
    return data.map(k => parseFloat(k[4])); // close prices
  } catch { return []; }
}

// ---- Render Sparkline SVG ----
function renderSparkline(prices, color) {
  if (!prices || prices.length < 2) return `<svg width="80" height="36"></svg>`;
  const w = 80, h = 36;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const fillPts = `0,${h} ${pts} ${w},${h}`;
  return `
  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;">
    <defs>
      <linearGradient id="sg-${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="${fillPts}" fill="url(#sg-${color.replace('#','')})" />
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

// ---- Render Market Row ----
function renderMarketRow(pair) {
  const change = pair.change;
  const isUp = change >= 0;
  const sign = isUp ? '+' : '';
  const priceStr = pair.price < 0.01
    ? pair.price.toFixed(8)
    : pair.price < 1
    ? pair.price.toFixed(4)
    : pair.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `
  <div class="mkt-row" onclick="openCoinDetail('${pair.symbol}')">
    <div class="mkt-coin-info">
      <div class="mkt-coin-icon" style="background:${pair.color}22;color:${pair.color};border:1px solid ${pair.color}44;">
        ${pair.icon}
      </div>
      <div>
        <div class="mkt-coin-sym">${pair.base}<span class="mkt-usdt">/USDT</span></div>
        <div class="mkt-coin-name">${pair.name}</div>
      </div>
    </div>
    <div class="mkt-price-col">
      <div class="mkt-price" id="mp-${pair.symbol}" style="color:${pair.color};">$${priceStr}</div>
    </div>
    <div class="mkt-change ${isUp ? 'change-up' : 'change-down'}" id="mc-${pair.symbol}">
      ${sign}${change.toFixed(2)}%
    </div>
    <div class="mkt-spark" id="ms-${pair.symbol}">
      <div style="width:80px;height:36px;background:rgba(255,255,255,0.03);border-radius:4px;"></div>
    </div>
    <div class="mkt-actions" onclick="event.stopPropagation()">
      <button class="mkt-trade-btn" onclick="openContractFromMarket('${pair.symbol}')">Trade</button>
    </div>
  </div>`;
}

// ---- Render All Rows ----
function renderMarketList(pairs) {
  const el = document.getElementById('market-list');
  if (!el) return;
  if (!pairs.length) {
    el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">No coins found</div>`;
    return;
  }
  el.innerHTML = pairs.map(renderMarketRow).join('');

  // Load sparklines progressively for visible pairs
  pairs.slice(0, 30).forEach(async (pair) => {
    const prices = await fetchSparkline(pair.symbol);
    const el = document.getElementById(`ms-${pair.symbol}`);
    if (el) el.innerHTML = renderSparkline(prices, pair.color);
  });
}

// ---- Update count label ----
function updateCount() {
  const el = document.getElementById('market-pair-count');
  if (el) el.textContent = `${filteredPairs.length}`;
}

// ---- Binance All-Market Mini Ticker WebSocket ----
function connectMarketWS() {
  if (marketTickerWs) marketTickerWs.close();
  marketTickerWs = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
  marketTickerWs.onmessage = (event) => {
    const tickers = JSON.parse(event.data);
    tickers.forEach(t => {
      if (!t.s.endsWith('USDT')) return;
      priceMap[t.s] = { price: parseFloat(t.c), change: parseFloat(t.P) };

      // Update DOM directly for performance
      const priceEl = document.getElementById(`mp-${t.s}`);
      const changeEl = document.getElementById(`mc-${t.s}`);
      if (priceEl) {
        const p = parseFloat(t.c);
        const isUp = parseFloat(t.P) >= 0;
        priceEl.style.color = isUp ? '#00c49a' : '#ff416c';
        priceEl.textContent = `$${p < 0.01 ? p.toFixed(8) : p < 1 ? p.toFixed(4) : p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (changeEl) {
        const ch = parseFloat(t.P);
        const isUp = ch >= 0;
        changeEl.className = `mkt-change ${isUp ? 'change-up' : 'change-down'}`;
        changeEl.textContent = `${isUp ? '+' : ''}${ch.toFixed(2)}%`;
      }
    });
  };
  marketTickerWs.onclose = () => setTimeout(connectMarketWS, 5000);
}

// ---- Coin Detail Modal ----
async function openCoinDetail(symbol) {
  await loadLightweightCharts();
  const pair = allPairs.find(p => p.symbol === symbol);
  if (!pair) return;

  const modal = document.getElementById('coin-detail-modal');
  const content = document.getElementById('coin-detail-content');
  if (!modal || !content) return;

  const isUp = pair.change >= 0;
  const priceStr = pair.price < 0.01 ? pair.price.toFixed(8) : pair.price < 1 ? pair.price.toFixed(4) : pair.price.toLocaleString('en-US', { minimumFractionDigits: 2 });

  content.innerHTML = `
  <div class="coin-detail-header">
    <div style="display:flex;align-items:center;gap:12px;">
      <div class="mkt-coin-icon" style="width:44px;height:44px;font-size:20px;background:${pair.color}22;color:${pair.color};border:1px solid ${pair.color}44;">${pair.icon}</div>
      <div>
        <div style="font-size:20px;font-weight:900;">${pair.base}/USDT</div>
        <div style="font-size:12px;color:var(--text-muted);">${pair.name}</div>
      </div>
    </div>
    <button class="modal-close" onclick="closeCoinDetail()">✕</button>
  </div>

  <div style="display:flex;align-items:baseline;gap:12px;padding:16px 0 8px;">
    <span id="detail-price" style="font-size:32px;font-weight:900;color:${isUp ? '#00c49a' : '#ff416c'};">$${priceStr}</span>
    <span id="detail-change" style="font-size:16px;font-weight:700;color:${isUp ? '#00c49a' : '#ff416c'};">${isUp ? '+' : ''}${pair.change.toFixed(2)}%</span>
  </div>

  <!-- Chart TF tabs -->
  <div class="chart-tf-tabs" style="margin-bottom:0;background:#0d1120;border-radius:10px 10px 0 0;">
    <button class="tf-tab active" onclick="switchDetailTF('1m',this)">1m</button>
    <button class="tf-tab" onclick="switchDetailTF('15m',this)">15m</button>
    <button class="tf-tab" onclick="switchDetailTF('30m',this)">30m</button>
    <button class="tf-tab" onclick="switchDetailTF('1h',this)">1h</button>
    <button class="tf-tab" onclick="switchDetailTF('1d',this)">1D</button>
  </div>
  <div id="detail-chart" style="height:260px;background:#0a0e1a;border-radius:0 0 10px 10px;overflow:hidden;margin-bottom:16px;"></div>

  <!-- Stats Grid -->
  <div class="coin-stats-grid">
    <div class="coin-stat"><span class="cs-lbl">24H High</span><span class="cs-val color-up">$${pair.high < 1 ? pair.high.toFixed(4) : pair.high.toLocaleString()}</span></div>
    <div class="coin-stat"><span class="cs-lbl">24H Low</span><span class="cs-val color-down">$${pair.low < 1 ? pair.low.toFixed(4) : pair.low.toLocaleString()}</span></div>
    <div class="coin-stat"><span class="cs-lbl">24H Volume</span><span class="cs-val">${pair.volumeStr}</span></div>
    <div class="coin-stat"><span class="cs-lbl">Market Cap</span><span class="cs-val">${pair.mcap}</span></div>
  </div>

  <!-- Action Buttons -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">
    <button class="btn-dark" style="height:48px;font-size:15px;font-weight:700;" onclick="openFollowFromMarket('${symbol}');closeCoinDetail()">
      ⚡ Follow AI Order
    </button>
    <button class="btn-trade-modal" onclick="openContractFromMarket('${symbol}');closeCoinDetail()">
      📊 Trade Contract
    </button>
  </div>
  `;

  modal.classList.add('active');

  // Init chart in detail
  setTimeout(() => initDetailChart(symbol, '1m'), 50);

  // Connect ticker WS for live price in detail
  if (detailWs) detailWs.close();
  detailWs = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);
  detailWs.onmessage = (e) => {
    const d = JSON.parse(e.data);
    const p = parseFloat(d.c);
    const ch = parseFloat(d.P);
    const isUp = ch >= 0;
    const pe = document.getElementById('detail-price');
    const ce = document.getElementById('detail-change');
    if (pe) { pe.textContent = `$${p < 0.01 ? p.toFixed(8) : p < 1 ? p.toFixed(4) : p.toLocaleString('en-US', { minimumFractionDigits: 2 })}`; pe.style.color = isUp ? '#00c49a' : '#ff416c'; }
    if (ce) { ce.textContent = `${isUp ? '+' : ''}${ch.toFixed(2)}%`; ce.style.color = isUp ? '#00c49a' : '#ff416c'; }
    // Update candle
    if (detailCandleSeries) {
      detailCandleSeries.update({ time: Math.floor(Date.now() / 1000 / 60) * 60, open: p, high: p, low: p, close: p });
    }
  };
}

async function initDetailChart(symbol, interval) {
  const container = document.getElementById('detail-chart');
  if (!container || !window.LightweightCharts) return;

  if (detailChart) { detailChart.remove(); detailChart = null; }

  detailChart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: 260,
    layout: { background: { color: '#0a0e1a' }, textColor: '#9ba3b2' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal, horzLine: { labelBackgroundColor: '#00f2fe' } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: false },
    handleScroll: true,
    handleScale: true,
  });

  detailCandleSeries = detailChart.addCandlestickSeries({
    upColor: '#00c49a', downColor: '#ff416c',
    borderUpColor: '#00c49a', borderDownColor: '#ff416c',
    wickUpColor: '#00c49a', wickDownColor: '#ff416c',
  });

  try {
    const limit = interval === '1d' ? 90 : 120;
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const data = await res.json();
    detailCandleSeries.setData(data.map(k => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    })));
    detailChart.timeScale().fitContent();
  } catch (e) {}

  const ro = new ResizeObserver(() => {
    if (detailChart && container) detailChart.applyOptions({ width: container.clientWidth });
  });
  ro.observe(container);
}

// ---- Helper Functions ----
function formatVolume(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}

function estimateMcap(base, price) {
  const supply = { BTC: 19.7e6, ETH: 120e6, BNB: 140e6, SOL: 580e6, XRP: 55e9, ADA: 35e9, DOGE: 145e9, TRX: 87e9, MATIC: 9e9, DOT: 1.4e9 };
  const s = supply[base];
  if (!s) return '--';
  const cap = price * s;
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  return `$${(cap / 1e6).toFixed(0)}M`;
}

function isNewCoin(base) {
  const newCoins = ['PEPE', 'SHIB', 'FLOKI', 'WIF', 'BONK', 'TURBO', 'BOME', 'MEME', 'NOT', 'DOGS', 'HMSTR', 'CATI'];
  return newCoins.includes(base);
}

function getCoinName(base) {
  const names = {
    BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', SOL: 'Solana', XRP: 'Ripple',
    DOGE: 'Dogecoin', ADA: 'Cardano', TRX: 'TRON', AVAX: 'Avalanche', DOT: 'Polkadot',
    LINK: 'Chainlink', MATIC: 'Polygon', LTC: 'Litecoin', BCH: 'Bitcoin Cash',
    UNI: 'Uniswap', ATOM: 'Cosmos', XLM: 'Stellar', NEAR: 'NEAR Protocol',
    FTM: 'Fantom', ALGO: 'Algorand', VET: 'VeChain', FIL: 'Filecoin',
    ICP: 'Internet Computer', HBAR: 'Hedera', APT: 'Aptos', ARB: 'Arbitrum',
    OP: 'Optimism', INJ: 'Injective', SUI: 'Sui', PEPE: 'Pepe',
    SHIB: 'Shiba Inu', FLOKI: 'Floki', WIF: 'Dogwifhat', BONK: 'Bonk',
    WLD: 'Worldcoin', PYTH: 'Pyth Network', JUP: 'Jupiter', RENDER: 'Render',
    TON: 'Toncoin', SAND: 'The Sandbox', MANA: 'Decentraland', AXS: 'Axie Infinity',
    GALA: 'Gala', ENJ: 'Enjin', AAVE: 'Aave', MKR: 'Maker', COMP: 'Compound',
    CRV: 'Curve', SNX: 'Synthetix', LDO: 'Lido DAO', SUSHI: 'SushiSwap',
    YFI: 'Yearn Finance', ZRX: '0x Protocol', BAT: 'Basic Attention', GRT: 'The Graph',
    OCEAN: 'Ocean Protocol', AGIX: 'SingularityNET', FET: 'Fetch.ai',
  };
  return names[base] || base;
}

function getCoinIcon(base) {
  const icons = {
    BTC: '₿', ETH: 'Ξ', BNB: '◆', SOL: '◎', XRP: '✕', DOGE: '🐕',
    ADA: '♦', TRX: '⚡', AVAX: '🔺', DOT: '●', LINK: '🔗', MATIC: '🔷',
    LTC: 'Ł', SHIB: '🐕', PEPE: '🐸', UNI: '🦄', ATOM: '⚛', NEAR: '◉',
    FTM: '👻', SAND: '🏖', MANA: '🌐', AXS: '🎮', GALA: '🎲', AAVE: '👻',
    APT: '⬡', ARB: '🔵', OP: '🔴', SUI: '💧', INJ: '💉', WIF: '🎩',
    BONK: '🪄', FLOKI: '⚔', TON: '💎', WLD: '🌍', NOT: '🔔', TURBO: '🚀',
  };
  return icons[base] || base[0];
}

// ---- Sort State ----
let sortKey = 'volume';
let sortDir = -1;

export function init() {
  window.toast = toast;

  // Filter
  window.filterMarket = function(q) {
    const ql = q.toLowerCase();
    filteredPairs = allPairs.filter(p =>
      p.base.toLowerCase().includes(ql) || p.name.toLowerCase().includes(ql)
    );
    renderMarketList(filteredPairs);
    updateCount();
  };

  // Tab switch
  window.switchMktTab = function(tab, btn) {
    currentTab = tab;
    document.querySelectorAll('.mkt-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyTabFilter();
  };

  function applyTabFilter() {
    if (currentTab === 'gainers') filteredPairs = [...allPairs].sort((a, b) => b.change - a.change).slice(0, 50);
    else if (currentTab === 'losers') filteredPairs = [...allPairs].sort((a, b) => a.change - b.change).slice(0, 50);
    else if (currentTab === 'volume') filteredPairs = [...allPairs].sort((a, b) => b.volume - a.volume).slice(0, 50);
    else if (currentTab === 'new') filteredPairs = allPairs.filter(p => p.isNew);
    else filteredPairs = [...allPairs];
    renderMarketList(filteredPairs);
    updateCount();
  }

  // Sort
  window.sortMarket = function(key) {
    if (sortKey === key) sortDir *= -1;
    else { sortKey = key; sortDir = -1; }
    const keyMap = { name: 'base', price: 'price', change: 'change', volume: 'volume' };
    filteredPairs.sort((a, b) => sortDir * (a[keyMap[key]] > b[keyMap[key]] ? 1 : -1));
    renderMarketList(filteredPairs);
  };

  // Coin detail
  window.openCoinDetail = openCoinDetail;

  window.closeCoinDetail = function() {
    const modal = document.getElementById('coin-detail-modal');
    if (modal) modal.classList.remove('active');
    if (detailWs) { detailWs.close(); detailWs = null; }
    if (detailChart) { detailChart.remove(); detailChart = null; }
  };

  window.switchDetailTF = function(tf, btn) {
    document.querySelectorAll('#coin-detail-content .tf-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Find the symbol from the detail header
    const sym = document.querySelector('#coin-detail-content .mkt-coin-sym')?.textContent?.replace('/USDT', '') + 'USDT';
    initDetailChart(sym, tf);
  };

  // Contract from market
  window.openContractFromMarket = function(symbol) {
    if (!store.checkAuth()) { window.location.hash = '#/login'; return; }
    if (!symbol.endsWith('USDT')) { toast('Contract only available for USDT pairs', 'error'); return; }
    window.location.hash = '#/contract';
    setTimeout(() => { if (typeof window.selectPair === 'function') window.selectPair(symbol); }, 400);
  };

  window.openFollowFromMarket = function() {
    if (!store.checkAuth()) { window.location.hash = '#/login'; return; }
    window.location.hash = '#/follow';
  };

  // Close modal on overlay click
  document.getElementById('coin-detail-modal')?.addEventListener('click', function(e) {
    if (e.target === this) window.closeCoinDetail();
  });

  // ---- Initial Load ----
  loadMarketData();

  async function loadMarketData() {
    try {
      allPairs = await fetchBinancePairs();
      filteredPairs = [...allPairs];
      renderMarketList(filteredPairs);
      updateCount();
      connectMarketWS();
    } catch (e) {
      const el = document.getElementById('market-list');
      if (el) el.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted);">Failed to load market data. Please refresh.</div>`;
    }
  }

  // Cleanup on navigate away
  window.addEventListener('hashchange', () => {
    if (marketTickerWs) { marketTickerWs.onclose = null; marketTickerWs.close(); }
    if (detailWs) { detailWs.onclose = null; detailWs.close(); }
    if (detailChart) { detailChart.remove(); detailChart = null; }
  }, { once: true });
}

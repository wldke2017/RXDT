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

let currentMarketData = [];
let selectedItem = null;

export function render() {
  currentMarketData = store.getMarketData();
  return `
  <div>
    <div class="page-header">
      <h1 class="page-title">Market Conditions</h1>
      <div class="market-search">
        <input type="text" id="market-search" class="form-control" placeholder="Search symbol or name..."
          oninput="filterMarket(this.value)"/>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="tabs-header" style="padding:0 20px;">
        <button class="tab-btn active" onclick="switchMarketTab('all',this)">All</button>
        <button class="tab-btn" onclick="switchMarketTab('hot',this)">🔥 Hot</button>
        <button class="tab-btn" onclick="switchMarketTab('stocks',this)">Stocks</button>
        <button class="tab-btn" onclick="switchMarketTab('crypto',this)">Crypto</button>
      </div>

      <div class="table-container">
        <table class="data-table" id="market-table">
          <thead>
            <tr>
              <th>Symbol / Name</th>
              <th>Price (USD)</th>
              <th>24H Change</th>
              <th>24H High</th>
              <th>24H Low</th>
              <th>Volume</th>
              <th>Market Cap</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="market-tbody">
            ${renderMarketRows(currentMarketData)}
          </tbody>
        </table>
      </div>
    </div>

  <!--Market Detail Drawer-->
  <div class="modal-overlay" id="market-detail-modal">
    <div class="modal-content" style="max-width:min(660px,95vw);" id="market-detail-content">
    </div>
  </div>
  </div>`;
}

function renderMarketRows(data) {
  if (!data.length) return `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">No results found</td></tr>`;
  return data.map(item => `
  <tr onclick="openMarketDetail('${item.symbol}')" style="cursor:pointer;">
      <td>
        <div style="font-weight:600;">${item.symbol}</div>
        <div style="font-size:12px;color:var(--text-muted);">${item.name}</div>
      </td>
      <td style="font-weight:600;">$${fmt(item.price)}</td>
      <td class="${item.changeRate >= 0 ? 'price-up' : 'price-down'}">
        ${item.changeRate >= 0 ? '▲' : '▼'} ${Math.abs(item.changeRate).toFixed(2)}%
        <div style="font-size:12px;">${item.changeRate >= 0 ? '+' : ''}$${fmt(item.change)}</div>
      </td>
      <td>$${fmt(item.high)}</td>
      <td>$${fmt(item.low)}</td>
      <td>${item.volume}</td>
      <td>${item.marketCap}</td>
      <td><button class="btn-primary" style="padding:6px 14px;font-size:13px;" onclick="event.stopPropagation();openFollowFromMarket('${item.symbol}')">Follow</button></td>
    </tr >
  `).join('');
}

function renderDetailContent(item) {
  const sparkline = generateSparkline(item);
  return `
  < div class="modal-header" >
      <div>
        <div class="modal-title">${item.symbol} · ${item.name}</div>
        <div style="font-size:13px;color:var(--text-muted);">Listed: ${item.listDate || 'NASDAQ'} · ${item.marketCap} Market Cap</div>
      </div>
      <button class="modal-close" onclick="closeModal('market-detail-modal')">✕</button>
    </div >

    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <span style="font-size:clamp(24px,6vw,36px);font-weight:700;">$${fmt(item.price)}</span>
      <span class="${item.changeRate >= 0 ? 'price-up' : 'price-down'}" style="font-size:clamp(14px,4vw,18px);">
        ${item.changeRate >= 0 ? '▲' : '▼'} ${Math.abs(item.changeRate).toFixed(2)}%
      </span>
    </div>

    <!--Simulated Chart-- >
    <div class="market-chart" id="detail-chart">
      ${sparkline}
    </div>

    <!--Time Frames-- >
    <div class="timeframe-tabs" style="margin-bottom:20px;">
      ${['1m','5m','15m','1h','1d','1w','1M'].map((tf,i) =>
        `<button class="tf-btn ${i===4?'active':''}" onclick="switchTF(this,'${tf}')">${tf}</button>`
      ).join('')}
    </div>

    <div class="grid-2" style="gap:12px;margin-bottom:20px;">
      <div class="detail-stat"><span class="ds-label">24H High</span><span class="ds-val">$${fmt(item.high)}</span></div>
      <div class="detail-stat"><span class="ds-label">24H Low</span><span class="ds-val">$${fmt(item.low)}</span></div>
      <div class="detail-stat"><span class="ds-label">Volume</span><span class="ds-val">${item.volume}</span></div>
      <div class="detail-stat"><span class="ds-label">Market Cap</span><span class="ds-val">${item.marketCap}</span></div>
    </div>

    <div style="margin-bottom:16px;">
      <h4 style="font-weight:600;margin-bottom:8px;">Company Description</h4>
      <p style="font-size:14px;color:var(--text-sub);line-height:1.6;">${item.description || getStockDescription(item.symbol)}</p>
    </div>

    <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" onclick="openFollowFromMarket('${item.symbol}');closeModal('market-detail-modal')">
      Follow This Order
    </button>`;
}

function generateSparkline(item) {
  const up = item.changeRate >= 0;
  const color = up ? '#00b979' : '#f87171';
  const fill = up ? 'rgba(0,185,121,0.1)' : 'rgba(248,113,113,0.1)';
  // Generate random-ish path around the price
  const w = 600, h = 120;
  const pts = [];
  let y = 60;
  for (let i = 0; i <= 40; i++) {
    y = Math.max(10, Math.min(110, y + (Math.random() - 0.5) * 12));
    pts.push(`${ (i / 40) * w },${ y } `);
  }
  const polyline = pts.join(' ');
  const firstPt = pts[0];
  const lastPt = pts[pts.length-1];
  const pathFill = `M${ firstPt } ${ pts.map((p, i) => i === 0 ? '' : p).join(' ') } L${ w },${ h } L0, ${ h } Z`;
  return `
  < svg viewBox = "0 0 ${w} ${h}" style = "width:100%;height:120px;margin-bottom:8px;" >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M${polyline.split(' ').reduce((acc,p,i)=>{
        return acc + (i===0 ? `M${p}` : ` L${p}`);
      },'')} L${w},${h} L0,${h} Z" fill="url(#sparkFill)"/>
      <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2"/>
    </svg > `;
}

function getStockDescription(symbol) {
  const descs = {
    'AAPL': 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    'TSLA': 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles and energy generation and storage systems.',
    'NVDA': 'NVIDIA Corporation provides graphics, and compute and networking solutions in the United States, Taiwan, China, and internationally.',
    'MSFT': 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
    'AMZN': 'Amazon.com, Inc. engages in the retail sale of consumer products, advertising, and subscriptions service through online and physical stores.',
    'BTC/USDT': 'Bitcoin is the first decentralized cryptocurrency. It operates on a peer-to-peer network without a central bank or administrator.',
    'ETH/USDT': 'Ethereum is a decentralized, open-source blockchain with smart contract functionality. Ether is the native cryptocurrency.'
  };
  return descs[symbol] || 'A publicly traded company listed on major US exchanges offering investment opportunities through the RXDT platform.';
}

export function init(page) {
  window.toast = toast;

  window.filterMarket = function(query) {
    const q = query.toLowerCase();
    const filtered = currentMarketData.filter(m =>
      m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
    const tbody = document.getElementById('market-tbody');
    if (tbody) tbody.innerHTML = renderMarketRows(filtered);
  };

  window.switchMarketTab = function(tab, btn) {
    document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    let data;
    if (tab === 'hot') data = currentMarketData.filter(m => m.hot);
    else if (tab === 'stocks') data = currentMarketData.filter(m => !m.symbol.includes('/'));
    else if (tab === 'crypto') data = currentMarketData.filter(m => m.symbol.includes('/'));
    else data = currentMarketData;
    const tbody = document.getElementById('market-tbody');
    if (tbody) tbody.innerHTML = renderMarketRows(data);
  };

  window.openMarketDetail = function(symbol) {
    const item = currentMarketData.find(m => m.symbol === symbol);
    if (!item) return;
    selectedItem = item;
    const content = document.getElementById('market-detail-content');
    if (content) content.innerHTML = renderDetailContent(item);
    const overlay = document.getElementById('market-detail-modal');
    if (overlay) overlay.classList.add('active');
  };

  window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  };

  window.switchTF = function(btn, tf) {
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Re-render sparkline with new "random" data
    const chart = document.getElementById('detail-chart');
    if (chart && selectedItem) chart.innerHTML = generateSparkline(selectedItem);
  };

  window.openFollowFromMarket = function(symbol) {
    if (!store.checkAuth()) { window.location.hash = '#/login'; return; }
    window.location.hash = '#/follow';
  };

  // Close modal on overlay click
  const overlay = document.getElementById('market-detail-modal');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  }
}

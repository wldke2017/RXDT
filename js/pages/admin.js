// Admin Dashboard Page
import store from '../store.js';

const ADMIN_SECRET = 'rxdt_admin_secret_key_2026';
const BASE = '/api/admin';

async function adminFetch(endpoint, method = 'GET', body = null) {
  const url = `${BASE}${endpoint}?admin_secret=${ADMIN_SECRET}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

export function render() {
  return `
  <div style="max-width:900px;margin:0 auto;padding:16px;">

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0;">🛡️ Admin Dashboard</h1>
        <div style="font-size:13px;color:var(--text-sub);margin-top:4px;">Manage pending requests</div>
      </div>
      <button class="btn-outline" onclick="loadAdminData()" id="admin-refresh-btn">
        🔄 Refresh
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs-header" style="margin-bottom:20px;">
      <button class="tab-btn active" onclick="switchAdminTab('deposits',this)">💰 Deposits</button>
      <button class="tab-btn" onclick="switchAdminTab('withdrawals',this)">📤 Withdrawals</button>
      <button class="tab-btn" onclick="switchAdminTab('kyc',this)">🪪 KYC</button>
    </div>

    <!-- Deposits Panel -->
    <div id="admin-tab-deposits">
      <div id="admin-deposits-list">
        <div class="admin-loading">Loading deposits...</div>
      </div>
    </div>

    <!-- Withdrawals Panel -->
    <div id="admin-tab-withdrawals" style="display:none;">
      <div id="admin-withdrawals-list">
        <div class="admin-loading">Loading withdrawals...</div>
      </div>
    </div>

    <!-- KYC Panel -->
    <div id="admin-tab-kyc" style="display:none;">
      <div id="admin-kyc-list">
        <div class="admin-loading">Loading KYC submissions...</div>
      </div>
    </div>

    <!-- KYC Image Preview Modal -->
    <div class="modal-overlay" id="kyc-img-modal" onclick="closeKycImgModal()">
      <div class="modal-content" style="max-width:600px;background:var(--bg-card);border-radius:16px;padding:20px;" onclick="event.stopPropagation()">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <strong id="kyc-img-modal-title">KYC Documents</strong>
          <button class="btn-outline" style="padding:4px 10px;" onclick="closeKycImgModal()">✕</button>
        </div>
        <div id="kyc-img-modal-body" style="display:flex;flex-direction:column;gap:16px;"></div>
      </div>
    </div>
  </div>`;
}

export function init() {
  window.toast = window.toast || ((m, t) => alert(m));

  window.switchAdminTab = function(tab, btn) {
    document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['deposits', 'withdrawals', 'kyc'].forEach(t => {
      const el = document.getElementById(`admin-tab-${t}`);
      if (el) el.style.display = t === tab ? '' : 'none';
    });
  };

  window.loadAdminData = async function() {
    const btn = document.getElementById('admin-refresh-btn');
    if (btn) btn.textContent = '⏳ Loading...';

    try {
      const data = await adminFetch('/pending');

      // Render deposits
      const dList = document.getElementById('admin-deposits-list');
      if (dList) {
        const deps = data.pendingDeposits || [];
        if (deps.length === 0) {
          dList.innerHTML = `<div class="empty-state">✅ No pending deposits</div>`;
        } else {
          dList.innerHTML = deps.map(d => `
            <div class="admin-card" id="dep-card-${d.id}">
              <div class="admin-card-header">
                <div>
                  <div class="admin-card-title">💰 Deposit — ${d.coin || 'USDT'} (${d.network || 'TRC20'})</div>
                  <div class="admin-card-sub">Order: <strong>${d.order_number}</strong> · User: <code>${d.user_id}</code></div>
                </div>
                <div class="admin-card-amount">$${parseFloat(d.amount || 0).toFixed(2)}</div>
              </div>
              <div class="admin-card-meta">
                <span>🕐 ${d.created_at ? new Date(d.created_at).toLocaleString() : 'N/A'}</span>
              </div>
              <div class="admin-card-actions">
                <button class="btn-success" onclick="adminApproveDeposit('${d.id}')">✅ Approve</button>
                <button class="btn-danger" onclick="adminRejectDeposit('${d.id}')">❌ Reject</button>
              </div>
            </div>
          `).join('');
        }
      }

      // Render withdrawals
      const wList = document.getElementById('admin-withdrawals-list');
      if (wList) {
        const withs = data.pendingWithdrawals || [];
        if (withs.length === 0) {
          wList.innerHTML = `<div class="empty-state">✅ No pending withdrawals</div>`;
        } else {
          wList.innerHTML = withs.map(w => `
            <div class="admin-card" id="wit-card-${w.id}">
              <div class="admin-card-header">
                <div>
                  <div class="admin-card-title">📤 Withdrawal — ${w.coin || 'USDT'} (${w.network || 'TRC20'})</div>
                  <div class="admin-card-sub">Order: <strong>${w.order_number}</strong> · User: <code>${w.user_id}</code></div>
                  <div class="admin-card-sub" style="word-break:break-all;">Address: <code style="color:var(--el-color-primary);font-size:11px;">${w.address || 'N/A'}</code></div>
                </div>
                <div class="admin-card-amount">$${parseFloat(w.amount || 0).toFixed(2)}</div>
              </div>
              <div class="admin-card-meta">
                <span>🕐 ${w.created_at ? new Date(w.created_at).toLocaleString() : 'N/A'}</span>
              </div>
              <div class="admin-card-actions">
                <button class="btn-success" onclick="adminApproveWithdrawal('${w.id}')">✅ Approve</button>
                <button class="btn-danger" onclick="adminRejectWithdrawal('${w.id}')">❌ Reject</button>
              </div>
            </div>
          `).join('');
        }
      }

      // Render KYC
      const kList = document.getElementById('admin-kyc-list');
      if (kList) {
        const kycs = data.pendingKyc || [];
        if (kycs.length === 0) {
          kList.innerHTML = `<div class="empty-state">✅ No pending KYC submissions</div>`;
        } else {
          kList.innerHTML = kycs.map(k => `
            <div class="admin-card" id="kyc-card-${k.id}">
              <div class="admin-card-header">
                <div>
                  <div class="admin-card-title">🪪 KYC — ${k.full_name || 'Unknown'}</div>
                  <div class="admin-card-sub">User: <code>${k.user_id}</code> · Nationality: <strong>${k.nationality || 'N/A'}</strong></div>
                  <div class="admin-card-sub">ID Type: <strong>${k.id_type || 'N/A'}</strong> · ID No: <strong>${k.id_number || 'N/A'}</strong></div>
                </div>
                <button class="btn-outline" style="padding:6px 14px;font-size:13px;" onclick="viewKycImages('${k.id}', \`${encodeURIComponent(JSON.stringify({ front: k.front_img, back: k.back_img, handheld: k.handheld_img }))}\`)">
                  🖼️ View Photos
                </button>
              </div>
              <div class="admin-card-meta">
                <span>🕐 ${k.created_at ? new Date(k.created_at).toLocaleString() : 'N/A'}</span>
              </div>
              <div class="admin-card-actions">
                <button class="btn-success" onclick="adminApproveKyc('${k.id}')">✅ Approve</button>
                <button class="btn-danger" onclick="adminRejectKyc('${k.id}')">❌ Reject</button>
              </div>
            </div>
          `).join('');
        }
      }

    } catch (err) {
      console.error('Admin load error:', err);
      toast('Failed to load pending data: ' + err.message, 'error');
    }

    if (btn) btn.textContent = '🔄 Refresh';
  };

  // ---- Action Handlers ----
  window.adminApproveDeposit = async function(id) {
    if (!confirm('Approve this deposit?')) return;
    try {
      const res = await adminFetch('/deposits/approve', 'POST', { depositId: id });
      if (res.error) throw new Error(res.error);
      toast('✅ Deposit approved! User balance credited.', 'success');
      document.getElementById(`dep-card-${id}`)?.remove();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  window.adminRejectDeposit = async function(id) {
    if (!confirm('Reject this deposit?')) return;
    try {
      const res = await adminFetch('/deposits/reject', 'POST', { depositId: id });
      if (res.error) throw new Error(res.error);
      toast('❌ Deposit rejected.', 'success');
      document.getElementById(`dep-card-${id}`)?.remove();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  window.adminApproveWithdrawal = async function(id) {
    if (!confirm('Approve this withdrawal?')) return;
    try {
      const res = await adminFetch('/withdrawals/approve', 'POST', { withdrawalId: id });
      if (res.error) throw new Error(res.error);
      toast('✅ Withdrawal approved!', 'success');
      document.getElementById(`wit-card-${id}`)?.remove();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  window.adminRejectWithdrawal = async function(id) {
    if (!confirm('Reject this withdrawal? Funds will be refunded to user.')) return;
    try {
      const res = await adminFetch('/withdrawals/reject', 'POST', { withdrawalId: id });
      if (res.error) throw new Error(res.error);
      toast('❌ Withdrawal rejected. Funds refunded.', 'success');
      document.getElementById(`wit-card-${id}`)?.remove();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  window.adminApproveKyc = async function(id) {
    if (!confirm('Approve this KYC submission?')) return;
    try {
      const res = await adminFetch('/kyc/approve', 'POST', { kycId: id });
      if (res.error) throw new Error(res.error);
      toast('✅ KYC approved!', 'success');
      document.getElementById(`kyc-card-${id}`)?.remove();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  window.adminRejectKyc = async function(id) {
    if (!confirm('Reject this KYC submission?')) return;
    try {
      const res = await adminFetch('/kyc/reject', 'POST', { kycId: id });
      if (res.error) throw new Error(res.error);
      toast('❌ KYC rejected.', 'success');
      document.getElementById(`kyc-card-${id}`)?.remove();
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  window.viewKycImages = function(id, encodedData) {
    const data = JSON.parse(decodeURIComponent(encodedData));
    const modal = document.getElementById('kyc-img-modal');
    const body = document.getElementById('kyc-img-modal-body');
    if (!modal || !body) return;

    const imgSection = (label, src) => {
      if (!src) return `<div style="color:var(--text-muted);font-size:13px;">📷 ${label}: Not provided</div>`;
      const isBase64 = src.startsWith('data:');
      const imgSrc = isBase64 ? src : src;
      return `
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text-sub);margin-bottom:6px;">📷 ${label}</div>
          <img src="${imgSrc}" style="width:100%;border-radius:10px;border:1px solid var(--border-color);" alt="${label}" onerror="this.style.display='none'"/>
        </div>`;
    };

    body.innerHTML = imgSection('Front of ID', data.front) + imgSection('Back of ID', data.back) + imgSection('Selfie Holding ID', data.handheld);
    modal.classList.add('active');
  };

  window.closeKycImgModal = function() {
    document.getElementById('kyc-img-modal')?.classList.remove('active');
  };

  // Auto-load on init
  window.loadAdminData();
}

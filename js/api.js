// RXDT Exchange API Client Helper
const BASE_URL = '';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('rxdt_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error occurred');
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/api/auth/login', { method: 'POST', body: credentials }),
  register: (data) => request('/api/auth/register', { method: 'POST', body: data }),
  getMe: () => request('/api/auth/me'),

  // Trading / AI Models
  getAiModels: () => request('/api/ai-models'),
  getOrders: () => request('/api/orders'),
  createOrder: (orderData) => request('/api/orders/create', { method: 'POST', body: orderData }),
  toggleAutoRenew: (orderId) => request('/api/orders/toggle-autorenew', { method: 'POST', body: { orderId } }),

  // Wallet
  getDeposits: () => request('/api/wallet/deposits'),
  createDeposit: (depositData) => request('/api/wallet/deposits', { method: 'POST', body: depositData }),
  getWithdrawals: () => request('/api/wallet/withdrawals'),
  createWithdrawal: (withdrawalData) => request('/api/wallet/withdrawals', { method: 'POST', body: withdrawalData }),
  getAccountChanges: () => request('/api/wallet/account-changes'),
  getBindAddresses: () => request('/api/wallet/bind-addresses'),
  addBindAddress: (data) => request('/api/wallet/bind-addresses', { method: 'POST', body: data }),

  // Gamification & KYC
  spinLuckyWheel: () => request('/api/lucky-wheel/spin', { method: 'POST' }),
  getLuckyWheelLogs: () => request('/api/lucky-wheel/logs'),
  submitKyc: (kycData) => request('/api/kyc/submit', { method: 'POST', body: kycData }),
  getKycStatus: () => request('/api/kyc/status')
};

export default api;

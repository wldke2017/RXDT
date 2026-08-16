// Central Reactive State Store
import MOCK_DATA from './mockData.js';
import api from './api.js';

const hasToken = !!localStorage.getItem('rxdt_token');
const savedUserRaw = localStorage.getItem('rxdt_user');
let savedUser = null;
try { savedUser = savedUserRaw ? JSON.parse(savedUserRaw) : null; } catch (e) { }

const state = {
  user: hasToken ? (savedUser || { ...MOCK_DATA.user }) : null,
  isLoggedIn: hasToken,
  currentPage: 'home',
  marketData: [...(MOCK_DATA.marketData || [])],
  depositPromotions: [...(MOCK_DATA.depositPromotions || [])],
  teamVipTiers: [...(MOCK_DATA.teamVipTiers || [])],
  assetDoubling3Signals: [...(MOCK_DATA.assetDoubling3Signals || [])],
  deposits: [...(MOCK_DATA.deposits || [])],
  withdrawals: [...(MOCK_DATA.withdrawals || [])],
  accountChanges: [...(MOCK_DATA.accountChanges || [])],
  coupons: [...(MOCK_DATA.coupons || [])],
  luckyWheel: { ...(MOCK_DATA.luckyWheel || {}) },
  team: { ...(MOCK_DATA.team || {}) },
  cryptoNetworks: [...(MOCK_DATA.cryptoNetworks || [])],
  language: 'en',
  bindAddresses: [
    { id: 'BA001', method: 'crypto', coin: 'USDT', network: 'TRC-20', address: 'TQn5gt9JfVE...RkzV' }
  ]
};

const listeners = {};

function subscribe(event, fn) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(fn);
}

function emit(event, data) {
  if (listeners[event]) listeners[event].forEach(fn => fn(data));
}

const store = {
  // ---- Auth ----
  async login(credentials) {
    try {
      const res = await api.login(credentials);
      state.user = res.user;
      state.isLoggedIn = true;
      localStorage.setItem('rxdt_token', res.token);
      if (res.user) localStorage.setItem('rxdt_user', JSON.stringify(res.user));
      emit('auth', { isLoggedIn: true });
      emit('user', state.user);
      this.syncAllUserData();
      return true;
    } catch (err) {
      throw err;
    }
  },

  async register(data) {
    try {
      const res = await api.register(data);
      state.user = res.user;
      state.isLoggedIn = true;
      localStorage.setItem('rxdt_token', res.token);
      if (res.user) localStorage.setItem('rxdt_user', JSON.stringify(res.user));
      emit('auth', { isLoggedIn: true });
      emit('user', state.user);
      return true;
    } catch (err) {
      throw err;
    }
  },

  logout() {
    state.user = null;
    state.isLoggedIn = false;
    localStorage.removeItem('rxdt_token');
    localStorage.removeItem('rxdt_user');
    emit('auth', { isLoggedIn: false });
    emit('user', null);
  },

  async checkAuth() {
    const token = localStorage.getItem('rxdt_token');
    if (token) {
      try {
        const res = await api.getMe();
        state.user = res.user;
        state.isLoggedIn = true;
        if (res.user) localStorage.setItem('rxdt_user', JSON.stringify(res.user));
        emit('auth', { isLoggedIn: true });
        emit('user', state.user);
        this.syncAllUserData();
        return true;
      } catch (err) {
        // Token invalid or backend unreachable - clear stale token
        console.warn('Auth check failed:', err.message);
        localStorage.removeItem('rxdt_token');
        localStorage.removeItem('rxdt_user');
        state.user = null;
        state.isLoggedIn = false;
        emit('auth', { isLoggedIn: false });
        emit('user', null);
        return false;
      }
    }
    return false;
  },

  async syncAllUserData() {
    if (!state.isLoggedIn) return;
    try {
      const [depRes, witRes, accRes, addrRes] = await Promise.allSettled([
        api.getDeposits(),
        api.getWithdrawals(),
        api.getAccountChanges(),
        api.getBindAddresses()
      ]);

      if (depRes.status === 'fulfilled' && depRes.value?.deposits) {
        state.deposits = depRes.value.deposits;
        emit('deposits', state.deposits);
      }
      if (witRes.status === 'fulfilled' && witRes.value?.withdrawals) {
        state.withdrawals = witRes.value.withdrawals;
        emit('withdrawals', state.withdrawals);
      }
      if (accRes.status === 'fulfilled' && accRes.value?.changes) {
        state.accountChanges = accRes.value.changes;
        emit('accountChanges', state.accountChanges);
      }
      if (addrRes.status === 'fulfilled' && addrRes.value?.addresses) {
        state.bindAddresses = addrRes.value.addresses;
        emit('bindAddresses', state.bindAddresses);
      }
    } catch (e) {
      console.warn('Sync error:', e);
    }
  },

  // ---- Getters ----
  get(key) {
    return state[key];
  },

  getUser() {
    return state.user;
  },

  updateUser(userFields) {
    if (state.user) {
      state.user = { ...state.user, ...userFields };
      localStorage.setItem('rxdt_user', JSON.stringify(state.user));
      emit('user', state.user);
    }
  },

  isLoggedIn() {
    return state.isLoggedIn;
  },

  getMarketData() {
    return state.marketData;
  },

  getDeposits() {
    return state.deposits;
  },

  getWithdrawals() {
    return state.withdrawals;
  },

  getAccountChanges() {
    return state.accountChanges;
  },

  getCoupons() {
    return state.coupons;
  },

  getAvailableCoupons() {
    return state.coupons.filter(c => c.status === 'unused');
  },

  getLuckyWheel() {
    return state.luckyWheel;
  },

  getTeam() {
    return state.team;
  },

  getCryptoNetworks() {
    return state.cryptoNetworks;
  },

  getBindAddresses() {
    return state.bindAddresses;
  },

  // ---- Actions ----

  async addDeposit(deposit) {
    // No local fallback — server validation errors must propagate to the caller.
    const res = await api.createDeposit(deposit);
    state.deposits.unshift(res.deposit);
    emit('deposits', state.deposits);
    return res.deposit;
  },

  async addWithdrawal(withdrawal) {
    // IMPORTANT: No local fallback here. If the server rejects the withdrawal
    // (e.g. wrong transaction password, insufficient balance, invalid address),
    // the error MUST propagate to the caller so the user sees the real reason.
    // A fake local "success" would let a withdrawal appear to succeed even when
    // the server rejected it — a critical security bug.
    const res = await api.createWithdrawal(withdrawal);
    state.withdrawals.unshift(res.withdrawal);
    if (state.user && res.newAvailableBalance !== undefined) {
      state.user.availableBalance = res.newAvailableBalance;
    }
    emit('withdrawals', state.withdrawals);
    emit('user', state.user);
    return res.withdrawal;
  },

  async addBindAddress(addr) {
    try {
      const res = await api.addBindAddress(addr);
      state.bindAddresses.push(res.address);
      emit('bindAddresses', state.bindAddresses);
      return res.address;
    } catch (err) {
      const newAddr = { id: 'BA' + Date.now(), ...addr };
      state.bindAddresses.push(newAddr);
      emit('bindAddresses', state.bindAddresses);
      return newAddr;
    }
  },

  async spendLuckyWheelChance() {
    if (state.user && state.user.spinChances !== undefined) {
      if (state.user.spinChances <= 0) return null;
      state.user.spinChances--;
    } else {
      if (state.luckyWheel.remainingChances <= 0) return null;
      state.luckyWheel.remainingChances--;
    }
    try {
      const res = await api.spinLuckyWheel();
      const won = res.prize;
      if (state.user) {
        if (res.newAvailableBalance !== undefined) state.user.availableBalance = res.newAvailableBalance;
        if (res.remainingSpins !== undefined) state.user.spinChances = res.remainingSpins;
        localStorage.setItem('rxdt_user', JSON.stringify(state.user));
        emit('user', state.user);
      }
      state.luckyWheel.winLog.unshift({
        prize: won.name,
        user: state.user?.name || 'You',
        time: new Date().toISOString().replace('T', ' ').slice(0, 19)
      });
      emit('luckyWheel', state.luckyWheel);
      return won;
    } catch (err) {
      // IMPORTANT: Do NOT fall back to client-side prize calculation.
      // The server is the single source of truth for winnings. Crediting
      // locally on failure would let a user block the API and still get
      // credited winnings, or worse, exploit the client to grant themselves
      // arbitrary balances. Re-throw so the caller can show the error.
      throw err;
    }
  },

  async submitKyc(kycData) {
    const res = await api.submitKyc(kycData);
    if (state.user) {
      state.user.kycStatus = 'pending';
      localStorage.setItem('rxdt_user', JSON.stringify(state.user));
      emit('user', state.user);
    }
    return res;
  },

  async setSignalPreference(autoSignalExec) {
    const res = await api.setSignalPreference(autoSignalExec);
    if (state.user) {
      state.user.autoSignalExec = res.autoSignalExec;
      localStorage.setItem('rxdt_user', JSON.stringify(state.user));
      emit('user', state.user);
    }
    return res;
  },

  navigateTo(page) {
    state.currentPage = page;
    emit('navigate', page);
  },

  subscribe,
  emit
};

export default store;


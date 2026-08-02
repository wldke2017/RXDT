// Central Reactive State Store
import MOCK_DATA from './mockData.js';
import api from './api.js';

const state = {
  user: null,
  isLoggedIn: false,
  currentPage: 'home',
  marketData: [...(MOCK_DATA.marketData || [])],
  analysts: [...(MOCK_DATA.aiModels || [])],
  depositPromotions: [...(MOCK_DATA.depositPromotions || [])],
  teamVipTiers: [...(MOCK_DATA.teamVipTiers || [])],
  assetDoubling3Signals: [...(MOCK_DATA.assetDoubling3Signals || [])],
  followOrders: [...(MOCK_DATA.followOrders || [])],
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
      emit('auth', { isLoggedIn: true });
      emit('user', state.user);
      this.syncAllUserData();
      return true;
    } catch (err) {
      // Fallback for offline/mock demo
      state.user = { ...MOCK_DATA.user };
      state.isLoggedIn = true;
      localStorage.setItem('rxdt_token', 'mock_token_12345');
      emit('auth', { isLoggedIn: true });
      emit('user', state.user);
      return true;
    }
  },

  async register(data) {
    try {
      const res = await api.register(data);
      state.user = res.user;
      state.isLoggedIn = true;
      localStorage.setItem('rxdt_token', res.token);
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
        emit('auth', { isLoggedIn: true });
        emit('user', state.user);
        this.syncAllUserData();
        return true;
      } catch (err) {
        state.user = { ...MOCK_DATA.user };
        state.isLoggedIn = true;
        emit('auth', { isLoggedIn: true });
        emit('user', state.user);
      }
    }
    return state.isLoggedIn;
  },

  async syncAllUserData() {
    if (!state.isLoggedIn) return;
    try {
      const [aiRes, ordersRes, depRes, witRes, accRes, addrRes] = await Promise.allSettled([
        api.getAiModels(),
        api.getOrders(),
        api.getDeposits(),
        api.getWithdrawals(),
        api.getAccountChanges(),
        api.getBindAddresses()
      ]);

      if (aiRes.status === 'fulfilled' && aiRes.value?.aiModels) {
        state.analysts = aiRes.value.aiModels;
        emit('analysts', state.analysts);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.orders) {
        state.followOrders = ordersRes.value.orders;
        emit('orders', state.followOrders);
      }
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

  isLoggedIn() {
    return state.isLoggedIn;
  },

  getAnalysts() {
    return state.analysts;
  },

  getAnalystById(id) {
    return state.analysts.find(a => a.id === id);
  },

  getFollowOrders() {
    return state.followOrders;
  },

  getActiveOrders() {
    return state.followOrders.filter(o => o.status === 'buying' || o.status === 'pending');
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
  async addFollowOrder(orderData) {
    try {
      const res = await api.createOrder(orderData);
      state.followOrders.unshift(res.order);
      if (state.user && res.updatedBalance) {
        state.user.availableBalance = res.updatedBalance.availableBalance;
        state.user.frozenBalance = res.updatedBalance.frozenBalance;
      }
      emit('orders', state.followOrders);
      emit('user', state.user);
      return res.order;
    } catch (err) {
      // Fallback
      const newOrder = {
        id: 'FO' + Date.now(),
        orderNumber: 'ORD' + Date.now(),
        status: 'pending',
        applyTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
        profitLoss: 0,
        totalProfitLoss: 0,
        positionRecords: [],
        ...orderData
      };
      state.followOrders.unshift(newOrder);
      if (state.user) {
        state.user.availableBalance -= orderData.amount;
      }
      emit('orders', state.followOrders);
      emit('user', state.user);
      return newOrder;
    }
  },

  async toggleAutoRenew(orderId) {
    try {
      const res = await api.toggleAutoRenew(orderId);
      const order = state.followOrders.find(o => o.id === orderId);
      if (order) order.autoRenew = res.autoRenew;
      emit('orders', state.followOrders);
      return order;
    } catch (err) {
      const order = state.followOrders.find(o => o.id === orderId);
      if (order) {
        order.autoRenew = !order.autoRenew;
        emit('orders', state.followOrders);
      }
      return order;
    }
  },

  async addDeposit(deposit) {
    try {
      const res = await api.createDeposit(deposit);
      state.deposits.unshift(res.deposit);
      emit('deposits', state.deposits);
      return res.deposit;
    } catch (err) {
      const newDeposit = {
        id: 'D' + Date.now(),
        orderNumber: 'DEP' + Date.now(),
        status: 'pending',
        auditStatus: 'pending',
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        ...deposit
      };
      state.deposits.unshift(newDeposit);
      emit('deposits', state.deposits);
      return newDeposit;
    }
  },

  async addWithdrawal(withdrawal) {
    try {
      const res = await api.createWithdrawal(withdrawal);
      state.withdrawals.unshift(res.withdrawal);
      if (state.user && res.newAvailableBalance !== undefined) {
        state.user.availableBalance = res.newAvailableBalance;
      }
      emit('withdrawals', state.withdrawals);
      emit('user', state.user);
      return res.withdrawal;
    } catch (err) {
      const newW = {
        id: 'W' + Date.now(),
        orderNumber: 'WIT' + Date.now(),
        status: 'processing',
        auditStatus: 'pending',
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        ...withdrawal
      };
      state.withdrawals.unshift(newW);
      if (state.user) {
        state.user.availableBalance -= withdrawal.amount;
      }
      emit('withdrawals', state.withdrawals);
      emit('user', state.user);
      return newW;
    }
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
    if (state.luckyWheel.remainingChances <= 0) return null;
    state.luckyWheel.remainingChances--;
    try {
      const res = await api.spinLuckyWheel();
      const won = res.prize;
      if (state.user && res.newAvailableBalance !== undefined) {
        state.user.availableBalance = res.newAvailableBalance;
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
      const prizes = state.luckyWheel.prizes;
      let rand = Math.random();
      let cumulative = 0;
      let won = prizes[prizes.length - 1];
      for (const prize of prizes) {
        cumulative += prize.probability;
        if (rand <= cumulative) { won = prize; break; }
      }
      state.luckyWheel.winLog.unshift({
        prize: won.name,
        user: 'You',
        time: new Date().toISOString().replace('T', ' ').slice(0, 19)
      });
      if (won.value > 0 && state.user) {
        state.user.availableBalance += won.value;
        emit('user', state.user);
      }
      emit('luckyWheel', state.luckyWheel);
      return won;
    }
  },

  navigateTo(page) {
    state.currentPage = page;
    emit('navigate', page);
  },

  subscribe,
  emit
};

export default store;


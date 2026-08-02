// RXDT Exchange - AI Quantitative Data Store
const MOCK_DATA = {
  platform: {
    name: 'RXDT Exchange',
    tagline: 'AI-Powered Quantitative Trading Platform',
    entityId: '20261325716',
    jurisdiction: 'State of Colorado, USA',
    foundedYear: 2026,
    founder: 'Warren Pennington',
    parentCompany: 'Vanguard Alternative Investments / Voyage Investment',
    secRegistration: 'Registered Investment Advisor (SEC RIA / FinCEN MSB)',
    searchUrl: 'https://www.coloradosos.gov/biz/BusinessEntityCriteriaExt.do'
  },

  user: {
    id: 'U880192',
    name: 'Raju',
    phone: '9133038028',
    email: 'raju@rxdt.com',
    avatar: null,
    totalAssets: 12540.00,
    availableBalance: 8320.50,
    frozenBalance: 4219.50,
    totalEarnings: 2840.25,
    inviteCode: 'RXDT8028',
    kycStatus: 'pass',
    membershipTier: 'Basic', // Basic (3 signals/day) | Team Leader (4 signals/day)
    dailySignalCount: 3,
    avgDailyReturn: '1.8% - 2.1%',
    doublingDays: 34,
    language: 'en'
  },

  aiModels: [
    {
      id: 'AI001', name: 'RXDT Quant VI Model Alpha', avatar: '🤖',
      oneDayProfit: 2450.5, oneDayReturnRate: 2.10,
      sevenDayProfit: 16800.0, sevenDayReturnRate: 14.50,
      fifteenDayProfit: 38200.0, fifteenDayReturnRate: 32.80,
      thirtyDayProfit: 89500.0, thirtyDayReturnRate: 72.40,
      totalFollowers: 14210, totalFunds: 28500000,
      commission: 5, minOrder: 500, maxOrder: 500000,
      winRate: 94.8, intro: 'Proprietary Quantitative AI Model VI developed by Warren Pennington (Ex-Vanguard FinTech Head). High-precision algorithmic execution on BTC, ETH, and NASDAQ-100.',
      products: [
        { id: 'P001', name: '3-Signal Daily Quantitative Pool', period: 34, minAmount: 500, maxAmount: 100000, dailyRate: 1.95, status: 'active' },
        { id: 'P002', name: '4-Signal VIP Team Leader Pool', period: 26, minAmount: 1000, maxAmount: 500000, dailyRate: 2.60, status: 'active' }
      ]
    },
    {
      id: 'AI002', name: 'RXDT Neural Arbitrage v4', avatar: '⚡',
      oneDayProfit: 1890.0, oneDayReturnRate: 1.85,
      sevenDayProfit: 12630.0, sevenDayReturnRate: 12.80,
      fifteenDayProfit: 29100.0, fifteenDayReturnRate: 28.50,
      thirtyDayProfit: 68500.0, thirtyDayReturnRate: 64.00,
      totalFollowers: 9820, totalFunds: 18200000,
      commission: 5, minOrder: 500, maxOrder: 200000,
      winRate: 92.3, intro: 'Sub-millisecond cross-exchange liquidity arbitrage AI algorithm operating on KORE / Voyage infrastructure.',
      products: [
        { id: 'P003', name: 'Cross-Exchange Crypto Arbitrage', period: 34, minAmount: 500, maxAmount: 200000, dailyRate: 1.85, status: 'active' }
      ]
    },
    {
      id: 'AI003', name: 'RXDT High-Freq Trend AI', avatar: '📈',
      oneDayProfit: 3100.0, oneDayReturnRate: 2.45,
      sevenDayProfit: 21700.0, sevenDayReturnRate: 17.20,
      fifteenDayProfit: 48500.0, fifteenDayReturnRate: 38.60,
      thirtyDayProfit: 112000.0, thirtyDayReturnRate: 88.00,
      totalFollowers: 21102, totalFunds: 45000000,
      commission: 5, minOrder: 1000, maxOrder: 1000000,
      winRate: 96.1, intro: 'Institutional-grade high frequency AI momentum engine targeting top 20 crypto assets.',
      products: [
        { id: 'P004', name: 'Institutional HFT Pool', period: 26, minAmount: 1000, maxAmount: 1000000, dailyRate: 2.70, status: 'active' }
      ]
    }
  ],

  // Global Promotion Tier Data (from PDF Page 9)
  depositPromotions: [
    { range: '$500 – $999', newUserBonus: 20, referrerBonus: 40, rewardPct: 'Fixed $' },
    { range: '$1,000 – $1,999', newUserBonus: 50, referrerBonus: 70, rewardPct: 'Fixed $' },
    { range: '$2,000 – $2,999', newUserBonus: 100, referrerBonus: 150, rewardPct: 'Fixed $' },
    { range: '$3,000 – $4,999', newUserBonus: 180, referrerBonus: 270, rewardPct: 'Fixed $' },
    { range: '$5,000 – $9,999', newUserBonus: '4%', referrerBonus: '8%', rewardPct: 'Percentage' },
    { range: '$10,000+', newUserBonus: '6%', referrerBonus: '12%', rewardPct: 'Percentage' }
  ],

  // Team VIP Tier Rewards Table (from PDF Page 10)
  teamVipTiers: [
    { tier: 'VIP1', teamSize: '5 – 29', reward: 100, dividendPct: 1.0 },
    { tier: 'VIP2', teamSize: '30 – 99', reward: 300, dividendPct: 1.5 },
    { tier: 'VIP3', teamSize: '100 – 399', reward: 500, dividendPct: 2.0 },
    { tier: 'VIP4', teamSize: '400 – 999', reward: 800, dividendPct: 2.5 },
    { tier: 'VIP5', teamSize: '1,000 – 1,999', reward: 1200, dividendPct: 3.0 },
    { tier: 'VIP6', teamSize: '2,000 – 2,999', reward: 2000, dividendPct: 3.5 },
    { tier: 'VIP7', teamSize: '3,000 – 3,999', reward: 3000, dividendPct: 4.0 },
    { tier: 'VIP8', teamSize: '5,000 – 5,999', reward: 6000, dividendPct: 4.5 },
    { tier: 'VIP9', teamSize: '6,000 – 9,999', reward: 10000, dividendPct: 5.0 },
    { tier: 'VIP10', teamSize: '10,000+', reward: 20000, dividendPct: 6.0 }
  ],

  // Asset Doubling Schedules (from PDF Pages 11 & 12)
  assetDoubling3Signals: [
    { day: 1, c520: 530.2, c1050: 1070.6, c2100: 2141.2, c3180: 3242.4, c5200: 5302.1, c10600: 10808.0 },
    { day: 7, c520: 595.8, c1050: 1203.0, c2100: 2406.1, c3180: 3643.5, c5200: 5957.9, c10600: 12144.9 },
    { day: 14, c520: 682.6, c1050: 1378.4, c2100: 2756.8, c3180: 4174.5, c5200: 6826.2, c10600: 13915.0 },
    { day: 21, c520: 782.1, c1050: 1579.3, c2100: 3158.5, c3180: 4782.9, c5200: 7821.2, c10600: 15943.1 },
    { day: 28, c520: 896.1, c1050: 1809.5, c2100: 3618.9, c3180: 5480.1, c5200: 8961.1, c10600: 18266.8 },
    { day: 34, c520: 1007.0, c1050: 2033.3, c2100: 4066.5, c3180: 6157.9, c5200: 10069.5, c10600: 20526.3 }
  ],

  followOrders: [
    {
      id: 'FO001', analystId: 'AI001', analystName: 'RXDT Quant VI Model Alpha',
      productName: '3-Signal Daily Quantitative Pool', productId: 'P001',
      orderNumber: 'ORD20260710001', amount: 1000,
      status: 'buying',
      applyTime: '2026-07-10 09:32:00',
      buyPrice: 98420.00, buyQuantity: 0.01016, buyTime: '2026-07-10 10:00:00',
      currentValue: 1184.50,
      profitLoss: 184.50, totalProfitLoss: 184.50,
      analystCommission: 9.22, platformCommission: 4.61,
      autoRenew: true, period: 34,
      positionRecords: [
        { date: '2026-07-10', profit: 21.00 },
        { date: '2026-07-11', profit: 20.80 },
        { date: '2026-07-12', profit: 21.50 },
        { date: '2026-07-13', profit: 19.80 },
        { date: '2026-07-14', profit: 22.10 }
      ]
    }
  ],

  marketData: [
    { symbol: 'BTC/USDT', name: 'Bitcoin AI Pool', price: 98420.00, change: 1250.00, changeRate: 1.29, high: 99800.00, low: 96500.00, volume: '$42.1B', marketCap: '$1.94T', hot: true },
    { symbol: 'ETH/USDT', name: 'Ethereum AI Pool', price: 3421.50, change: -45.20, changeRate: -1.30, high: 3510.00, low: 3380.00, volume: '$18.6B', marketCap: '$411.2B', hot: true },
    { symbol: 'AAPL', name: 'Apple Inc.', price: 213.45, change: 2.31, changeRate: 1.09, high: 215.00, low: 210.20, volume: '82.4M', marketCap: '$3.21T', hot: true },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 118.22, change: 4.12, changeRate: 3.61, high: 120.00, low: 113.80, volume: '432.1M', marketCap: '$2.89T', hot: true },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 262.30, change: -5.80, changeRate: -2.16, high: 270.10, low: 258.50, volume: '121.7M', marketCap: '$834.2B', hot: true },
    { symbol: 'SOL/USDT', name: 'Solana AI Pool', price: 184.20, change: 8.40, changeRate: 4.78, high: 188.00, low: 174.50, volume: '$6.2B', marketCap: '$85.4B', hot: true }
  ],

  deposits: [
    { id: 'D001', orderNumber: 'DEP202607150001', coin: 'USDT', network: 'TRC-20', amount: 1000, actualAmount: 1000.00, bonus: 50, rate: 1.000, status: 'success', auditStatus: 'success', time: '2026-07-15 10:32:00' }
  ],

  withdrawals: [],

  accountChanges: [
    { id: 'AC001', type: 'Deposit', amount: +1000.00, balance: 8320.50, remark: 'USDT Deposit Approved + $50 Bonus', time: '2026-07-15 10:35:00' },
    { id: 'AC002', type: 'AI Trade Profit', amount: +184.50, balance: 8320.50, remark: 'RXDT Quant VI Model Signal Earnings', time: '2026-07-18 08:00:00' }
  ],

  luckyWheel: {
    remainingChances: 3,
    prizes: [
      { id: 1, name: 'USDT 50', value: 50, color: '#00f2fe', probability: 0.05 },
      { id: 2, name: 'USDT 10', value: 10, color: '#00f5a0', probability: 0.15 },
      { id: 3, name: 'AI Signal Pass', value: 20, color: '#7928ca', probability: 0.10 },
      { id: 4, name: 'USDT 5', value: 5, color: '#1e293b', probability: 0.35 },
      { id: 5, name: 'Try Again', value: 0, color: '#f87171', probability: 0.15 },
      { id: 6, name: 'USDT 100', value: 100, color: '#ff007a', probability: 0.02 },
      { id: 7, name: 'USDT 2', value: 2, color: '#38bdf8', probability: 0.18 }
    ],
    winLog: [
      { prize: 'USDT 50', user: 'U***92', time: '2026-08-02 14:20:00' },
      { prize: 'AI Signal Pass', user: 'U***11', time: '2026-08-02 14:35:12' }
    ]
  },

  team: {
    totalMembers: 8,
    directMembers: 5,
    totalCommission: 850.00,
    shareRate: 15,
    currentVip: 'VIP1',
    members: [
      { id: 'T001', name: 'User***892', level: 1, joinTime: '2026-07-12', contribution: 240.00 },
      { id: 'T002', name: 'User***105', level: 1, joinTime: '2026-07-15', contribution: 180.00 },
      { id: 'T003', name: 'User***334', level: 1, joinTime: '2026-07-18', contribution: 150.00 },
      { id: 'T004', name: 'User***512', level: 1, joinTime: '2026-07-20', contribution: 160.00 },
      { id: 'T005', name: 'User***990', level: 1, joinTime: '2026-07-25', contribution: 120.00 }
    ]
  },

  cryptoNetworks: [
    { coin: 'USDT', networks: [
      { name: 'TRC-20', address: 'TQn5gt9JfVE4RXzGh8kYr2wH8mPLRkzV', confirmations: 12, rate: 1.00 },
      { name: 'ERC-20', address: '0x1ab4f28D7F8a9CdF901e3a5B4C9ef2FF1D2d9', confirmations: 12, rate: 1.00 }
    ]},
    { coin: 'USDC', networks: [
      { name: 'ERC-20', address: '0x3bc9aA1F2B87e43dC0fA234d9ef1CC289F7Pb12', confirmations: 12, rate: 1.00 }
    ]},
    { coin: 'BTC', networks: [
      { name: 'BTC', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf', confirmations: 3, rate: 98420 }
    ]},
    { coin: 'ETH', networks: [
      { name: 'ERC-20', address: '0x742d35Cc6634C0532925a3b8D4C9ef13A5B7Fe1', confirmations: 12, rate: 3421.50 }
    ]}
  ]
};

export default MOCK_DATA;

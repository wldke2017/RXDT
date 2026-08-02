// Hash-based SPA Router
import store from './store.js';

const routes = {
  'home':                 () => import('./pages/home.js'),
  'market':               () => import('./pages/market.js'),
  'follow':               () => import('./pages/follow.js'),
  'follow/note':          () => import('./pages/follow.js'),
  'follow/team':          () => import('./pages/follow.js'),
  'assets':               () => import('./pages/assets.js'),
  'recharge':             () => import('./pages/assets.js'),
  'withdraw':             () => import('./pages/assets.js'),
  'bind-address':         () => import('./pages/assets.js'),
  'account-change':       () => import('./pages/assets.js'),
  'login':                () => import('./pages/auth.js'),
  'register':             () => import('./pages/auth.js'),
  'forget-pwd':           () => import('./pages/auth.js'),
  'kyc':                  () => import('./pages/auth.js'),
  'lucky-wheel':          () => import('./pages/luckyWheel.js'),
  'invite-friends':       () => import('./pages/profile.js'),
  'security-settings':    () => import('./pages/profile.js'),
  'customer-service':     () => import('./pages/profile.js'),
  'about':                () => import('./pages/about.js'),
  'agreement':            () => import('./pages/about.js'),
  'investment-agreement': () => import('./pages/about.js'),
  'admin':                () => import('./pages/admin.js'),
};

// Pages that require a logged-in user
const authRequired = [
  'follow', 'follow/note', 'follow/team',
  'assets', 'recharge', 'withdraw', 'bind-address', 'account-change',
  'lucky-wheel', 'invite-friends', 'security-settings', 'kyc'
];

// Pages only for guests (logged-in users get redirected away)
const guestOnly = ['login', 'register'];

let currentModule = null;

async function navigate(path) {
  const page = path.replace(/^\//, '').split('?')[0] || 'home';

  // Synchronous auth check via localStorage token
  const isLoggedIn = !!localStorage.getItem('rxdt_token');

  // Redirect unauthenticated users to login
  if (authRequired.includes(page) && !isLoggedIn) {
    window.location.hash = '#/login';
    return;
  }

  // Redirect already logged-in users away from login/register
  if (guestOnly.includes(page) && isLoggedIn) {
    window.location.hash = '#/home';
    return;
  }

  // Update active nav
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    el.classList.remove('active');
    const navPage = el.dataset.page;
    if (navPage && page.startsWith(navPage)) el.classList.add('active');
  });

  // Load and render page module
  const loader = routes[page] || routes['home'];
  try {
    const mod = await loader();
    currentModule = mod;
    const container = document.getElementById('page-content');
    if (container && mod.render) {
      container.innerHTML = mod.render(page);
      if (mod.init) mod.init(page);
    }
  } catch (e) {
    console.error('Router error:', e);
  }

  store.navigateTo(page);
  window.scrollTo(0, 0);
}

function init() {
  // Listen for hash changes (in-app navigation)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#/', '') || 'home';
    navigate(hash);
  });

  // On refresh: always respect the current URL hash
  // The auth guard inside navigate() handles redirects if needed
  const initialHash = window.location.hash.replace('#/', '') || 'home';
  navigate(initialHash);
}


// Expose global navigation helper used throughout all page files
window.navigateTo = function(page) {
  window.location.hash = '#/' + page;
};

export default { init, navigate };

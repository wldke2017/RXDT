// Hash-based SPA Router
import store from './store.js';

// Static imports to prevent network dynamic-import MIME/HTML 404 errors
import * as homePage from './pages/home.js';
import * as marketPage from './pages/market.js';
import * as followPage from './pages/follow.js';
import * as assetsPage from './pages/assets.js';
import * as authPage from './pages/auth.js';
import * as luckyWheelPage from './pages/luckyWheel.js';
import * as profilePage from './pages/profile.js';
import * as aboutPage from './pages/about.js';
import * as adminPage from './pages/admin.js';

const routes = {
  'home':                 homePage,
  'market':               marketPage,
  'follow':               followPage,
  'follow/note':          followPage,
  'follow/team':          followPage,
  'assets':               assetsPage,
  'recharge':             assetsPage,
  'withdraw':             assetsPage,
  'bind-address':         assetsPage,
  'account-change':       assetsPage,
  'login':                authPage,
  'register':             authPage,
  'forget-pwd':           authPage,
  'kyc':                  authPage,
  'lucky-wheel':          luckyWheelPage,
  'invite-friends':       profilePage,
  'security-settings':    profilePage,
  'customer-service':     profilePage,
  'about':                aboutPage,
  'agreement':            aboutPage,
  'investment-agreement': aboutPage,
  'admin':                adminPage,
};

// Pages that require a logged-in user
const authRequired = [
  'follow', 'follow/note', 'follow/team',
  'assets', 'recharge', 'withdraw', 'bind-address', 'account-change',
  'lucky-wheel', 'invite-friends', 'security-settings', 'kyc'
];

async function navigate(path) {
  const page = path.replace(/^\//, '').split('?')[0] || 'home';

  // Synchronous auth check via localStorage token
  const isLoggedIn = !!localStorage.getItem('rxdt_token');

  // Redirect unauthenticated users to login
  if (authRequired.includes(page) && !isLoggedIn) {
    window.location.hash = '#/login';
    return;
  }

  // Update active nav links
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    el.classList.remove('active');
    const navPage = el.dataset.page;
    if (navPage && page.startsWith(navPage)) el.classList.add('active');
  });

  // Load and render page module
  const mod = routes[page] || routes['home'];
  try {
    const container = document.getElementById('page-content');
    if (container && mod && mod.render) {
      container.innerHTML = mod.render(page);
      if (mod.init) mod.init(page);
    }
  } catch (e) {
    console.error('Router render error:', e);
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

  // On refresh: respect current URL hash
  const initialHash = window.location.hash.replace('#/', '') || 'home';
  navigate(initialHash);
}

// Expose global navigation helper used throughout all page files
window.navigateTo = function(page) {
  window.location.hash = '#/' + page;
};

export default { init, navigate };

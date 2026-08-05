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

let isSpinning = false;
let spinDeg = 0;

export function render() {
  const wheel = store.getLuckyWheel();
  const user = store.getUser();
  const remainingSpins = user && user.spinChances !== undefined ? user.spinChances : wheel.remainingChances;
  return `
  <div>
    <h1 class="page-title" style="text-align:center;">🎡 Lucky Wheel</h1>

    <div class="lucky-wheel-container">
      <!-- Deposit Qualification Banner -->
      <div style="background:linear-gradient(135deg,rgba(0,242,254,0.15),rgba(121,40,202,0.2));border:1px solid #00f2fe;border-radius:12px;padding:12px 18px;margin-bottom:16px;text-align:center;font-size:13px;color:#fff;">
        🎁 <strong>Deposit Reward:</strong> Every approved deposit automatically unlocks <strong>Lucky Wheel Spin Chances</strong> (Under $500: 1 spin · $500+: 2 spins · $1,000+: 3+ spins, up to 10)!
      </div>

      <!-- Prize Ring Info -->
      <div class="prize-banner">
        <span>Remaining Spins: <strong id="remaining-spins-count">${remainingSpins}</strong></span>
      </div>

      <!-- Wheel Canvas -->
      <div class="wheel-wrapper">
        <div class="wheel-pointer">▼</div>
        <canvas id="lucky-canvas" width="340" height="340"></canvas>
      </div>

      <button class="btn-dark lucky-spin-btn" id="spin-btn" onclick="spinWheel()">
        🎰 Start Lottery
      </button>

      <!-- Prize List -->
      <div class="card" style="margin-top:24px;">
        <div class="card-title">🏆 Prize List</div>
        <div class="prize-grid">
          ${wheel.prizes.map(p => `
            <div class="prize-item" style="border-left:3px solid ${p.color};">
              <span class="prize-name">${p.name}</span>
              <span class="prize-odds">${(p.probability * 100).toFixed(0)}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Win Log -->
      <div class="card">
        <div class="card-title">🎉 Recent Winners</div>
        <div id="win-log-list">
          ${renderWinLog(wheel.winLog)}
        </div>
      </div>
    </div>

    <!-- Win Notification Modal -->
    <div class="modal-overlay" id="win-modal">
      <div class="modal-content" style="text-align:center;max-width:360px;">
        <div style="font-size:64px;margin-bottom:16px;">🎊</div>
        <h2 style="font-size:24px;font-weight:700;margin-bottom:8px;">Congratulations!</h2>
        <p id="win-message" style="font-size:18px;color:var(--text-sub);margin-bottom:24px;"></p>
        <button class="btn-dark" style="width:100%;height:48px;font-size:16px;" onclick="closeWinModal()">Awesome!</button>
      </div>
    </div>
  </div>`;
}

function renderWinLog(log) {
  if (!log.length) return '<div style="text-align:center;color:var(--text-muted);padding:20px;">No winners yet</div>';
  return log.slice(0, 8).map(w => `
    <div class="win-log-item">
      <span class="wl-user">${w.user}</span>
      <span class="wl-prize">won <strong>${w.prize}</strong></span>
      <span class="wl-time">${w.time}</span>
    </div>
  `).join('');
}

export function init() {
  window.toast = toast;

  // Draw wheel
  const wheel = store.getLuckyWheel();
  drawWheel(wheel.prizes);

  window.spinWheel = async function () {
    const user = store.getUser();
    const wheel = store.getLuckyWheel();
    const availableSpins = user && user.spinChances !== undefined ? user.spinChances : wheel.remainingChances;
    if (isSpinning) return;
    if (availableSpins <= 0) {
      toast('No remaining spin chances! Make a deposit to unlock more spins.', 'error');
      return;
    }
    isSpinning = true;
    document.getElementById('spin-btn').disabled = true;

    // Spin animation
    const extraDeg = 1440 + Math.random() * 360; // 4 full rotations + random
    const targetDeg = spinDeg + extraDeg;
    const canvas = document.getElementById('lucky-canvas');

    let start = null;
    const duration = 3500;

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    async function animate(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const currentDeg = spinDeg + (extraDeg * easeOut(progress));

      drawWheel(wheel.prizes, currentDeg);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        spinDeg = targetDeg % 360;
        isSpinning = false;

        // Get result from backend/store
        const won = await store.spendLuckyWheelChance();

        // Update remaining spins display
        const updatedUser = store.getUser();
        const newCount = updatedUser && updatedUser.spinChances !== undefined ? updatedUser.spinChances : store.getLuckyWheel().remainingChances;
        const banner = document.getElementById('remaining-spins-count');
        if (banner) banner.textContent = newCount;

        // Update win log
        const logEl = document.getElementById('win-log-list');
        if (logEl) logEl.innerHTML = renderWinLog(store.getLuckyWheel().winLog);

        // Show result modal
        if (won) {
          document.getElementById('win-message').textContent = `You won: ${won.name}!${won.value > 0 ? ` ($${won.value} added to your wallet)` : ''}`;
          document.getElementById('win-modal').classList.add('active');
        }

        document.getElementById('spin-btn').disabled = false;
      }
    }

    requestAnimationFrame(animate);
  };

  window.closeWinModal = function () {
    document.getElementById('win-modal').classList.remove('active');
  };
}

function drawWheel(prizes, rotation = 0) {
  const canvas = document.getElementById('lucky-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) - 10;
  const sliceAngle = (2 * Math.PI) / prizes.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  prizes.forEach((prize, i) => {
    const startAngle = i * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;

    // Slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = prize.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.fillText(prize.name, radius - 10, 5);
    ctx.restore();
  });

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e5e6eb';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

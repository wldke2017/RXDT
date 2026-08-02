export function render(page) {
  if (page === 'agreement') return renderAgreement();
  if (page === 'investment-agreement') return renderInvestmentAgreement();
  return renderAbout();
}

function renderAbout() {
  return `
  <div>
    <h1 class="page-title">About RXDT Exchange & Voyage Investment</h1>

    <div class="card about-header-card" style="background:linear-gradient(135deg,#0d1322,#161e31);border:1px solid rgba(0,242,254,0.3);">
      <div style="font-size:36px;font-weight:800;color:var(--el-color-primary);letter-spacing:3px;">RXDT EXCHANGE</div>
      <div style="font-size:14px;color:var(--text-sub);margin-top:4px;">Powered by Voyage Investment & Quantitative AI VI Model</div>
      <p style="color:var(--text-muted);font-size:13px;margin-top:8px;">U.S. Headquartered in Colorado · Entity ID: <strong>20261325716</strong> · Founded by Warren Pennington</p>
    </div>

    <div class="card">
      <div class="card-title">🏛️ Founder Leadership: Warren Pennington</div>
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:16px;">
        <img src="assets/images/warren_pennington.png" alt="Warren Pennington" style="width:140px;height:140px;object-fit:cover;border-radius:12px;border:2px solid var(--el-color-primary);"/>
        <div style="flex:1;min-width:260px;">
          <h3 style="font-size:18px;font-weight:700;color:var(--el-color-primary);margin-bottom:4px;">Warren Pennington — Founder</h3>
          <p style="font-size:14px;color:var(--text-sub);line-height:1.6;margin-bottom:8px;">
            Former Global Head of the Office of Investment Management FinTech Strategies at <strong>Vanguard Group</strong>, where his division managed nearly <strong>$50 Trillion</strong> in assets across global financial sectors.
          </p>
          <p style="font-size:13px;color:var(--text-muted);line-height:1.6;">
            Held senior leadership roles at Macquarie Group and Department Controller at Wells Fargo. Holds B.S. in Aerospace Engineering & M.S. in Telecommunications (CU Boulder), CPA certified, and serves on advisory committees for SIFMA & Ben Franklin FinTech Accelerator.
          </p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📜 Official State of Colorado Registration & Compliance</div>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
        <div style="flex:1;min-width:280px;">
          <p style="font-size:14px;color:var(--text-sub);line-height:1.7;margin-bottom:12px;">
            KORE / RXDT Exchange Inc (Entity ID: <strong>20261325716</strong>) is a U.S.-based cryptocurrency exchange and quantitative trading service company officially authorized and registered by the State of Colorado, USA.
          </p>
          <h4 style="font-size:14px;font-weight:700;color:var(--el-color-primary);margin-bottom:8px;">Steps to Verify Official Status:</h4>
          <ol style="padding-left:20px;font-size:13px;color:var(--text-sub);line-height:1.8;">
            <li>Visit the Colorado Secretary of State Business Entity Search system.</li>
            <li>In the search box, enter Entity ID: <code>20261325716</code></li>
            <li>Click Search to view official corporate registration details.</li>
          </ol>
        </div>
        <img src="assets/images/compliance_trophy.png" alt="Colorado SOS Registration" style="width:180px;border-radius:10px;border:1px solid var(--border-color);"/>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🤖 Quantitative Analysis VI Model & AI Signals</div>
      <div class="about-content">
        <p>Our proprietary Quantitative Analysis VI AI program allows investors to participate in algorithmic market gains with zero prior technical knowledge. With just 3 to 4 daily signals requiring minutes each day, RXDT automated algorithms target a steady 1.8% to 2.8% daily yield.</p>
      </div>
    </div>
  </div>`;
}

function renderAgreement() {
  return `
  <div>
    <div class="page-header">
      <button class="btn-back" onclick="history.back()">← Back</button>
      <h1 class="page-title">RXDT User Agreement</h1>
    </div>
    <div class="card">
      <p style="font-size:14px;color:var(--text-sub);line-height:1.8;">
        Welcome to RXDT Exchange Inc. By accessing or using our services, you agree to be bound by our terms of service, regulatory disclosures under Colorado State Entity ID 20261325716, and AI quantitative trading guidelines.
      </p>
    </div>
  </div>`;
}

function renderInvestmentAgreement() {
  return `
  <div>
    <div class="page-header">
      <button class="btn-back" onclick="history.back()">← Back</button>
      <h1 class="page-title">AI Quantitative Trading Agreement</h1>
    </div>
    <div class="card">
      <p style="font-size:14px;color:var(--text-sub);line-height:1.8;">
        Trading cryptocurrency assets involves market volatility risks. RXDT Exchange AI Models execute signals automatically based on quantitative algorithms developed by Voyage Investment research.
      </p>
    </div>
  </div>`;
}

export function init() {}

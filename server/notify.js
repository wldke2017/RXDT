// Admin notification helper.
// Sends an email alert via Resend whenever a new pending deposit, withdrawal,
// or KYC submission is created. Emails go to process.env.ADMIN_NOTIFY_EMAIL.
//
// To avoid duplicate emails on serverless cold-start retries, the most recent
// notification keys are tracked in-memory. This is best-effort — it is not a
// durable queue, but prevents the common double-send on Vercel retries.

const recentlyNotified = new Map(); // key -> timestamp
const DEDUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isDuplicate(key) {
  const last = recentlyNotified.get(key);
  const now = Date.now();
  if (last && now - last < DEDUPE_WINDOW_MS) return true;
  recentlyNotified.set(key, now);
  // Keep the map small
  if (recentlyNotified.size > 500) {
    const oldestKey = recentlyNotified.keys().next().value;
    recentlyNotified.delete(oldestKey);
  }
  return false;
}

/**
 * Send an admin alert email for a new pending item.
 * @param {object} opts
 * @param {string} opts.type - 'deposit' | 'withdrawal' | 'kyc'
 * @param {string} opts.id - unique item id (used for dedupe)
 * @param {string} opts.amount - formatted amount (optional)
 * @param {string} opts.userLabel - e.g. "John (0712****34)"
 * @param {string} opts.detail - extra line(s) shown in the email
 */
export async function notifyAdminOfPendingItem({ type, id, amount = '', userLabel = '', detail = '' }) {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) return; // Not configured — skip silently
  if (isDuplicate(`pending:${type}:${id}`)) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[notify] RESEND_API_KEY missing — cannot email admin notification.');
    return;
  }

  const typeLabels = {
    deposit: '💰 New Pending Deposit',
    withdrawal: '📤 New Pending Withdrawal',
    kyc: '🪪 New KYC Submission',
    chat: '💬 New Support Message',
    user: '👤 New User Registration',
  };
  const emojis = { deposit: '💰', withdrawal: '📤', kyc: '🪪', chat: '💬', user: '👤' };
  const title = typeLabels[type] || '🔔 New Pending Admin Item';

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0a0e1a;border-radius:16px;border:1px solid #1e2a3a;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#00d4ff;font-size:26px;margin:0;">${emojis[type] || '🔔'} ${title}</h1>
      <p style="color:#8899aa;font-size:14px;margin-top:6px;">RXDT Exchange — Action Required</p>
    </div>
    <div style="background:#111827;border:1px solid #1e2a3a;border-radius:12px;padding:20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#cbd5e1;">
        ${amount ? `<tr><td style="padding:6px 0;color:#8899aa;">Amount</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#00f2fe;">${amount}</td></tr>` : ''}
        ${userLabel ? `<tr><td style="padding:6px 0;color:#8899aa;">User</td><td style="padding:6px 0;text-align:right;font-weight:700;">${userLabel}</td></tr>` : ''}
        ${id ? `<tr><td style="padding:6px 0;color:#8899aa;">Reference</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#00c49a;">${id}</td></tr>` : ''}
        ${detail ? `<tr><td style="padding:6px 0;color:#8899aa;">Details</td><td style="padding:6px 0;text-align:right;">${detail}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#8899aa;">Time</td><td style="padding:6px 0;text-align:right;">${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</td></tr>
      </table>
    </div>
    <div style="background:rgba(0,242,254,0.08);border:1px solid rgba(0,242,254,0.3);border-radius:12px;padding:14px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#00f2fe;">Please review this item in the <strong>RXDT Admin Dashboard</strong>.</p>
    </div>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e2a3a;text-align:center;">
      <p style="color:#556677;font-size:11px;">© 2026 RXDT Exchange · rxdtex.com</p>
    </div>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RXDT Exchange Admin Alerts <noreply@rxdt.site>',
        to: [adminEmail],
        subject: `${title} — ${amount || id || ''}`.trim(),
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[notify] Resend admin alert failed:', err);
    } else {
      console.log(`[notify] Admin alert sent for ${type} ${id}`);
    }
  } catch (e) {
    console.warn('[notify] Failed to send admin alert:', e.message);
  }
}
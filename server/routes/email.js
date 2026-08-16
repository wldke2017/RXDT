import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Send OTP to a given email address (for binding OR for password change)
router.post('/send-otp', requireAuth, async (req, res) => {
  const { email } = req.body;
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Valid email address required' });
  }

  try {
    // Rate-limit: reject if an OTP was issued within the last 60 seconds
    const otpCheck = await query(`SELECT email_otp_expires FROM users WHERE id = $1`, [req.userId]);
    if (otpCheck.rows[0]?.email_otp_expires) {
      const otpIssuedAt = new Date(otpCheck.rows[0].email_otp_expires).getTime() - 10 * 60 * 1000;
      if (Date.now() - otpIssuedAt < 60 * 1000) {
        return res.status(429).json({ error: 'Please wait 60 seconds before requesting a new code.' });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in users table
    await query(
      `UPDATE users SET email_otp = $1, email_otp_expires = $2 WHERE id = $3`,
      [otp, expires, req.userId]
    );
    console.log(`[send-otp] userId=${req.userId} generated_otp="${otp}" to="${cleanEmail}" expires=${expires.toISOString()}`);


    // Attempt to send email via Resend
    let resendFailed = false;
    let resendErrMsg = '';
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'RXDT Exchange <noreply@rxdt.site>',
          to: [cleanEmail],
          subject: 'Your RXDT Verification Code',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0e1a;border-radius:16px;border:1px solid #1e2a3a;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="color:#00d4ff;font-size:28px;margin:0;">RXDT Exchange</h1>
                <p style="color:#8899aa;font-size:14px;margin-top:4px;">AI Quantitative Crypto Trading</p>
              </div>
              <h2 style="color:#ffffff;font-size:18px;margin-bottom:8px;">Verification Code</h2>
              <p style="color:#8899aa;font-size:14px;margin-bottom:24px;">Use the code below to verify your action. It expires in <strong style="color:#ffffff;">10 minutes</strong>.</p>
              <div style="background:#111827;border:2px solid #00d4ff;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#00d4ff;">${otp}</span>
              </div>
              <p style="color:#8899aa;font-size:12px;">If you did not request this code, please ignore this email. Never share your verification code with anyone.</p>
              <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e2a3a;text-align:center;">
                <p style="color:#556677;font-size:11px;">© 2026 RXDT Exchange · rxdtex.com</p>
              </div>
            </div>
          `,
        }),
      });

      if (!resendRes.ok) {
        const err = await resendRes.json();
        console.warn('Resend send warning:', err);
        resendFailed = true;
        resendErrMsg = err.message || 'Resend error';
      }
    } catch (e) {
      console.warn('Resend fetch failed:', e.message);
      resendFailed = true;
      resendErrMsg = e.message;
    }

    // If Resend couldn't deliver, do NOT leak the OTP to the client.
    // In production the user must rely on the email. Log for debugging only.
    if (resendFailed) {
      console.warn(`OTP delivery failed for user ${req.userId}: ${resendErrMsg}`);
      return res.status(502).json({ success: false, error: 'Failed to send verification email. Please try again later.' });
    }

    res.json({ success: true, message: `Verification code sent to ${email}` });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify OTP (without consuming it — used to check before action)
// Bind email — verifies OTP and sets email_bound
router.post('/bind-email', requireAuth, async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanOtp = String(otp).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Valid email address required' });
  }

  try {
    // Step 1: Verify OTP FIRST — correct error messaging
    const result = await query(
      `SELECT email_otp, email_otp_expires FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Debug log to trace OTP mismatch issues
    console.log(`[bind-email] userId=${req.userId} stored_otp="${user.email_otp}" submitted_otp="${cleanOtp}" expires=${user.email_otp_expires}`);

    if (!user.email_otp) {
      return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
    }

    // Normalize stored OTP the same way as the submitted one
    const storedOtp = String(user.email_otp).trim();
    if (storedOtp !== cleanOtp) {
      return res.status(400).json({ error: 'Incorrect verification code. Please check and try again.' });
    }

    if (new Date() > new Date(user.email_otp_expires)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Step 2: Check if email is already bound to another account (after OTP passes)
    const existingCheck = await query(
      `SELECT id FROM users WHERE (email_bound = $1 OR (email = $1 AND email_bound IS NOT NULL)) AND id != $2`,
      [cleanEmail, req.userId]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This email address is already bound to another account.' });
    }

    // Step 3: Bind the email and clear OTP
    await query(
      `UPDATE users SET email_bound = $1, email = COALESCE(email, $1), email_otp = NULL, email_otp_expires = NULL WHERE id = $2`,
      [cleanEmail, req.userId]
    );

    res.json({ success: true, message: 'Email bound successfully', emailBound: cleanEmail });
  } catch (err) {
    console.error('Bind email error:', err);
    res.status(500).json({ error: err.message || 'Failed to bind email' });
  }
});


// Change password with OTP verification (login or transaction password)
router.post('/change-password', requireAuth, async (req, res) => {
  const { newPassword, otp, type } = req.body; // type: 'login' | 'transaction'
  if (!newPassword || !otp || !type) return res.status(400).json({ error: 'Missing required fields' });

  // Transaction password must be exactly 6 digits
  if (type === 'transaction' && !/^\d{6}$/.test(newPassword)) {
    return res.status(400).json({ error: 'Transaction password must be exactly 6 digits.' });
  }

  try {
    const result = await query(
      `SELECT email_bound, email_otp, email_otp_expires FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.email_bound) return res.status(400).json({ error: 'Please bind an email first' });

    if (!user.email_otp || user.email_otp !== otp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }
    if (new Date() > new Date(user.email_otp_expires)) {
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    let updateSql;
    let params;

    if (type === 'login') {
      const hash = await bcrypt.hash(newPassword, 10);
      updateSql = `UPDATE users SET password_hash = $1, email_otp = NULL, email_otp_expires = NULL WHERE id = $2`;
      params = [hash, req.userId];
    } else {
      // Transaction password must also be hashed — never store plain text
      const hash = await bcrypt.hash(newPassword, 10);
      updateSql = `UPDATE users SET transaction_password = $1, email_otp = NULL, email_otp_expires = NULL WHERE id = $2`;
      params = [hash, req.userId];
    }

    await query(updateSql, params);
    res.json({
      success: true,
      message: `${type === 'login' ? 'Login' : 'Transaction'} password changed successfully`,
      hasTransactionPassword: true
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Reset password via email (forget password flow)
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const result = await query(
      `SELECT id, email_otp, email_otp_expires FROM users WHERE email_bound = $1 OR email = $1`,
      [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'No account found with this email' });

    if (!user.email_otp || user.email_otp !== otp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }
    if (new Date() > new Date(user.email_otp_expires)) {
      return res.status(400).json({ error: 'Code expired. Please request a new one.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, email_otp = NULL, email_otp_expires = NULL WHERE id = $2`,
      [hash, user.id]
    );

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Send OTP to email without auth (for forget password)
router.post('/send-otp-public', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await query(
      `SELECT id FROM users WHERE email_bound = $1 OR email = $1`, [email]
    );
    const user = result.rows[0];
    // Do NOT reveal whether an account exists (email enumeration).
    // Return the same success message regardless so attackers can't probe
    // which emails are registered on the platform.
    if (!user) {
      return res.json({ success: true, message: `If an account exists, a reset code has been sent to ${email}` });
    }

    // Rate-limit: reject if an OTP was issued within the last 60 seconds
    const rateCheck = await query(`SELECT email_otp_expires FROM users WHERE id = $1`, [user.id]);
    if (rateCheck.rows[0]?.email_otp_expires) {
      const otpIssuedAt = new Date(rateCheck.rows[0].email_otp_expires).getTime() - 10 * 60 * 1000;
      if (Date.now() - otpIssuedAt < 60 * 1000) {
        return res.status(429).json({ error: 'Please wait 60 seconds before requesting a new code.' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await query(`UPDATE users SET email_otp = $1, email_otp_expires = $2 WHERE id = $3`, [otp, expires, user.id]);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'RXDT Exchange <noreply@rxdt.site>',
        to: [email],
        subject: 'Your RXDT Password Reset Code',
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0e1a;border-radius:16px;border:1px solid #1e2a3a;"><h1 style="color:#00d4ff;">RXDT Exchange</h1><p style="color:#8899aa;">Your password reset code:</p><div style="background:#111827;border:2px solid #00d4ff;border-radius:12px;padding:24px;text-align:center;"><span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#00d4ff;">${otp}</span></div><p style="color:#8899aa;font-size:12px;margin-top:16px;">Expires in 10 minutes. Do not share this code.</p></div>`,
      }),
    });
    if (!resendRes.ok) {
      console.warn('Resend password reset send warning:', await resendRes.json().catch(() => ({})));
    }

    res.json({ success: true, message: `Reset code sent to ${email}` });
  } catch (err) {
    console.error('Send public OTP error:', err);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// Get current user's bound email status
router.get('/email-status', requireAuth, async (req, res) => {
  try {
    const result = await query(`SELECT email_bound FROM users WHERE id = $1`, [req.userId]);
    const user = result.rows[0];
    res.json({ emailBound: user?.email_bound || null });
  } catch (err) {
    console.error('Email status error:', err.message);
    res.json({ emailBound: null });
  }
});

/**
 * Broadcasts Daily Trading Signal Reminders to all users with emails.
 */
export async function sendTradingSignalReminderEmails() {
  const usersRes = await query(`
    SELECT id, name, COALESCE(NULLIF(email_bound, ''), email) AS user_email, available_balance, total_deposits, free_signal_credits, auto_signal_exec
    FROM users
    WHERE (email IS NOT NULL AND email != '') OR (email_bound IS NOT NULL AND email_bound != '')
  `);

  const users = usersRes.rows.filter(u => u.user_email && u.user_email.includes('@'));
  if (!users.length) {
    return { success: true, message: 'No users with email found to notify.', count: 0 };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables.');
  }

  let sentCount = 0;
  let failCount = 0;
  const sentEmails = [];

  for (const u of users) {
    const userName = u.name || `Trader_${u.id.slice(-4)}`;
    const email = u.user_email.trim().toLowerCase();
    const balance = parseFloat(u.available_balance || 0).toFixed(2);
    const freeCredits = parseInt(u.free_signal_credits || 0);

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #0a0e1a; border-radius: 16px; border: 1px solid #1e2a3a; color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #00d4ff; font-size: 28px; margin: 0; letter-spacing: 1px;">RXDT EXCHANGE</h1>
        <p style="color: #8899aa; font-size: 14px; margin-top: 4px;">AI Quantitative Crypto Trading Platform</p>
      </div>

      <div style="background: linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(121, 40, 202, 0.15) 100%); border: 1px solid rgba(0, 212, 255, 0.4); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 8px 0;">📈 Today's AI Trading Signal Reminder!</h2>
        <p style="color: #8899aa; font-size: 14px; margin: 0;">Hello <strong style="color: #00d4ff;">${userName}</strong>, don't forget to participate in today's verified high-yield AI Quantitative Signal trades.</p>
      </div>

      <!-- Account Summary -->
      <div style="background: #111827; border: 1px solid #1e2a3a; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="color: #8899aa; font-size: 12px; display: block;">Available Balance</span>
          <strong style="color: #00c49a; font-size: 18px;">$${balance} USDT</strong>
        </div>
        ${freeCredits > 0 ? `
        <div style="text-align: right;">
          <span style="color: #8899aa; font-size: 12px; display: block;">Free 8pm Signal Credits</span>
          <strong style="color: #f59e0b; font-size: 18px;">${freeCredits} Credit(s) 🎁</strong>
        </div>` : ''}
      </div>

      <!-- Daily Schedule -->
      <h3 style="color: #ffffff; font-size: 16px; margin-bottom: 12px;">⏰ Today's Official Signal Schedule (EAT / UTC+3):</h3>
      
      <div style="background: #111827; border: 1px solid #1e2a3a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #1e2a3a;">
          <div>
            <strong style="color: #00d4ff; font-size: 15px;">📡 Signal 1 (Tier 1, 2, 3)</strong>
            <div style="color: #8899aa; font-size: 12px;">Deposit $100+ · 1.4% Return</div>
          </div>
          <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); padding: 4px 10px; border-radius: 20px; color: #00d4ff; font-size: 13px; font-weight: 700;">
            5:00 PM EAT
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #1e2a3a;">
          <div>
            <strong style="color: #00d4ff; font-size: 15px;">📡 Signal 2 (Tier 2, 3)</strong>
            <div style="color: #8899aa; font-size: 12px;">Deposit $300+ · 2.4% Daily Yield</div>
          </div>
          <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); padding: 4px 10px; border-radius: 20px; color: #00d4ff; font-size: 13px; font-weight: 700;">
            6:00 PM EAT
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #1e2a3a;">
          <div>
            <strong style="color: #00d4ff; font-size: 15px;">📡 Signal 3 (Tier 3)</strong>
            <div style="color: #8899aa; font-size: 12px;">Deposit $1,000+ · 3.1% Daily Yield</div>
          </div>
          <div style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); padding: 4px 10px; border-radius: 20px; color: #00d4ff; font-size: 13px; font-weight: 700;">
            7:00 PM EAT
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
          <div>
            <strong style="color: #f59e0b; font-size: 15px;">🎁 Signal 4 (FREE Referral Signal)</strong>
            <div style="color: #8899aa; font-size: 12px;">Available to referrers · 5-minute window</div>
          </div>
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 10px; border-radius: 20px; color: #f59e0b; font-size: 13px; font-weight: 700;">
            8:00 PM EAT
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="https://www.rxdt.site/#/signals" style="display: inline-block; background: linear-gradient(135deg, #00f2fe 0%, #0284c7 100%); color: #060b19; font-weight: 800; font-size: 16px; padding: 14px 32px; border-radius: 100px; text-decoration: none; box-shadow: 0 4px 20px rgba(0, 242, 254, 0.4);">
          🚀 OPEN TRADING DESK & JOIN SIGNALS
        </a>
      </div>

      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; font-size: 12px; color: #8899aa; line-height: 1.6; margin-bottom: 24px;">
        💡 <strong>Pro Tip:</strong> Enable <strong>Auto-Execute Signals</strong> in your account settings so verified AI signal trades execute automatically for your account even when you are busy or offline!
      </div>

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #1e2a3a; text-align: center; color: #556677; font-size: 11px;">
        © 2026 RXDT Exchange · USA Colorado Compliant Quantitative Exchange · rxdt.site
      </div>
    </div>`;

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'RXDT Exchange Signal Desk <noreply@rxdt.site>',
          to: [email],
          subject: `📈 Today's AI Trading Signals Alert — Don't Miss Your Daily Return!`,
          html,
        }),
      });

      if (resendRes.ok) {
        sentCount++;
        sentEmails.push(email);
      } else {
        failCount++;
        console.warn(`[signal-reminder] Resend error for ${email}:`, await resendRes.json().catch(() => ({})));
      }
    } catch (e) {
      failCount++;
      console.warn(`[signal-reminder] Fetch error for ${email}:`, e.message);
    }
  }

  return {
    success: true,
    message: `Broadcast complete! Sent ${sentCount} signal reminder email(s).`,
    sentCount,
    failCount,
    sentEmails
  };
}

// NOTE: The /send-signal-reminders endpoint is intentionally NOT exposed here.
// It is available via the protected admin route: POST /api/admin/send-signal-reminders
// (see server/routes/admin.js). Exposing it publicly would let anyone trigger
// mass emails to all users, exhausting the Resend quota and spamming users.

/**
 * Sends a welcome email to a newly registered user.
 * @param {{ email: string, name: string, inviteCode: string }} user
 */
export async function sendWelcomeEmail({ email, name, inviteCode }) {
  if (!email || !email.includes('@')) return; // No email address — skip silently

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[sendWelcomeEmail] RESEND_API_KEY not set — skipping welcome email.');
    return;
  }

  const displayName = name || email.split('@')[0] || 'Trader';
  const inviteLink = `https://www.rxdt.site/#/register?invite=${inviteCode}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#00f2fe,#4facfe);padding:2px;border-radius:16px;">
        <div style="background:#0a0f1e;border-radius:14px;padding:16px 32px;">
          <span style="font-size:24px;font-weight:900;letter-spacing:2px;background:linear-gradient(135deg,#00f2fe,#4facfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">RXDT</span>
          <span style="font-size:13px;color:#64748b;margin-left:8px;display:block;margin-top:2px;">Exchange &amp; AI Signals</span>
        </div>
      </div>
    </div>

    <!-- Welcome Card -->
    <div style="background:linear-gradient(135deg,#0f172a,#1a2744);border:1px solid rgba(0,242,254,0.2);border-radius:20px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">🎉</div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">Welcome to RXDT, ${displayName}!</h1>
      <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">Your account is ready. You've joined a professional AI-powered quantitative trading community trusted by traders worldwide.</p>
    </div>

    <!-- Invite Code -->
    <div style="background:#0f172a;border:1px solid rgba(245,158,11,0.3);border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:13px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Your Referral Invite Code</div>
      <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:6px;font-family:monospace;">${inviteCode}</div>
      <div style="font-size:12px;color:#64748b;margin-top:8px;">Share this code to earn free signal credits when friends join!</div>
      <a href="${inviteLink}" style="display:inline-block;margin-top:12px;font-size:12px;color:#00f2fe;">🔗 ${inviteLink}</a>
    </div>

    <!-- Signal Schedule -->
    <div style="background:#0f172a;border:1px solid rgba(0,242,254,0.15);border-radius:16px;padding:20px;margin-bottom:24px;">
      <div style="font-size:14px;font-weight:800;color:#00f2fe;margin-bottom:16px;text-align:center;">📡 Daily AI Signal Schedule (EAT / UTC+3)</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:10px 8px;font-size:13px;color:#94a3b8;">📡 Signal 1 <span style="font-size:11px;background:rgba(99,102,241,0.2);color:#818cf8;padding:2px 8px;border-radius:20px;">Tier 1,2,3</span></td>
          <td style="padding:10px 8px;font-size:13px;color:#ffffff;font-weight:700;text-align:right;">5:00 PM EAT</td>
          <td style="padding:10px 8px;font-size:13px;color:#10b981;font-weight:700;text-align:right;">+1.4%</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:10px 8px;font-size:13px;color:#94a3b8;">📡 Signal 2 <span style="font-size:11px;background:rgba(99,102,241,0.2);color:#818cf8;padding:2px 8px;border-radius:20px;">Tier 2,3</span></td>
          <td style="padding:10px 8px;font-size:13px;color:#ffffff;font-weight:700;text-align:right;">6:00 PM EAT</td>
          <td style="padding:10px 8px;font-size:13px;color:#10b981;font-weight:700;text-align:right;">+2.4%</td>
        </tr>
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:10px 8px;font-size:13px;color:#94a3b8;">📡 Signal 3 <span style="font-size:11px;background:rgba(99,102,241,0.2);color:#818cf8;padding:2px 8px;border-radius:20px;">Tier 3</span></td>
          <td style="padding:10px 8px;font-size:13px;color:#ffffff;font-weight:700;text-align:right;">7:00 PM EAT</td>
          <td style="padding:10px 8px;font-size:13px;color:#10b981;font-weight:700;text-align:right;">+3.1%</td>
        </tr>
        <tr>
          <td style="padding:10px 8px;font-size:13px;color:#94a3b8;">🎁 Free Signal <span style="font-size:11px;background:rgba(16,185,129,0.15);color:#10b981;padding:2px 8px;border-radius:20px;">All Users</span></td>
          <td style="padding:10px 8px;font-size:13px;color:#ffffff;font-weight:700;text-align:right;">8:00 PM EAT</td>
          <td style="padding:10px 8px;font-size:13px;color:#f59e0b;font-weight:700;text-align:right;">FREE</td>
        </tr>
      </table>
    </div>

    <!-- Quick Steps -->
    <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin-bottom:24px;">
      <div style="font-size:14px;font-weight:800;color:#ffffff;margin-bottom:14px;">🚀 Get Started in 3 Steps</div>
      <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
        <span style="background:linear-gradient(135deg,#00f2fe,#4facfe);color:#000;font-weight:800;font-size:12px;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">1</span>
        <span style="font-size:13px;color:#94a3b8;line-height:1.5;"><strong style="color:#fff;">Deposit Funds</strong> — Go to Assets → Deposit. Minimum $100 USDT to unlock Tier 1 signals.</span>
      </div>
      <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
        <span style="background:linear-gradient(135deg,#00f2fe,#4facfe);color:#000;font-weight:800;font-size:12px;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">2</span>
        <span style="font-size:13px;color:#94a3b8;line-height:1.5;"><strong style="color:#fff;">Enable Auto-Execute</strong> — In Profile → Auto Execute Signals → ON. Trades will run automatically at signal time.</span>
      </div>
      <div style="display:flex;align-items:flex-start;">
        <span style="background:linear-gradient(135deg,#00f2fe,#4facfe);color:#000;font-weight:800;font-size:12px;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0;">3</span>
        <span style="font-size:13px;color:#94a3b8;line-height:1.5;"><strong style="color:#fff;">Watch Your Profits</strong> — Profits credit automatically. Withdraw anytime after KYC verification.</span>
      </div>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://www.rxdt.site/#/home" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#00f2fe,#4facfe);color:#000;font-weight:800;font-size:15px;text-decoration:none;border-radius:12px;letter-spacing:0.5px;">🚀 Start Trading Now →</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
      <p style="font-size:12px;color:#475569;margin:0 0 8px;">RXDT Exchange | support@rxdtex.com</p>
      <p style="font-size:11px;color:#334155;margin:0;">This is an automated message. Do not reply to this email.</p>
    </div>

  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RXDT Exchange <noreply@rxdt.site>',
        to: [email],
        subject: `🎉 Welcome to RXDT Exchange, ${displayName}! Your account is ready`,
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[sendWelcomeEmail] Resend error:', err);
    } else {
      console.log(`[sendWelcomeEmail] Welcome email sent to ${email}`);
    }
  } catch (err) {
    console.warn('[sendWelcomeEmail] fetch error:', err.message);
  }
}

export default router;

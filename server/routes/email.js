import express from 'express';
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
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.default.hash(newPassword, 10);
      updateSql = `UPDATE users SET password_hash = $1, email_otp = NULL, email_otp_expires = NULL WHERE id = $2`;
      params = [hash, req.userId];
    } else {
      // Transaction password must also be hashed — never store plain text
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.default.hash(newPassword, 10);
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

    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash(newPassword, 10);
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
    if (!user) return res.status(404).json({ error: 'No account found with this email address' });

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

export default router;

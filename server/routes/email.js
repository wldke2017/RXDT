import express from 'express';
import { query } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify JWT
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.slice(7), process.env.JWT_SECRET || 'rxdt_jwt_secret_2026');
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Send OTP to a given email address (for binding OR for password change)
router.post('/send-otp', requireAuth, async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email address required' });
  }

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in users table
    await query(
      `UPDATE users SET email_otp = $1, email_otp_expires = $2 WHERE id = $3`,
      [otp, expires, req.userId]
    );

    // Send email via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RXDT Exchange <onboarding@resend.dev>',
        to: [email],
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
      console.error('Resend error:', err);
      return res.status(400).json({ error: err.message || 'Failed to send email. Check your email address.' });
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

  try {
    const result = await query(
      `SELECT email_otp, email_otp_expires FROM users WHERE id = $1`,
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.email_otp || user.email_otp !== otp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }
    if (new Date() > new Date(user.email_otp_expires)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Bind the email and clear OTP
    await query(
      `UPDATE users SET email_bound = $1, email_otp = NULL, email_otp_expires = NULL WHERE id = $2`,
      [email, req.userId]
    );

    res.json({ success: true, message: 'Email bound successfully', emailBound: email });
  } catch (err) {
    console.error('Bind email error:', err);
    res.status(500).json({ error: 'Failed to bind email' });
  }
});

// Change password with OTP verification (login or transaction password)
router.post('/change-password', requireAuth, async (req, res) => {
  const { newPassword, otp, type } = req.body; // type: 'login' | 'transaction'
  if (!newPassword || !otp || !type) return res.status(400).json({ error: 'Missing required fields' });

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
      // Transaction password stored as separate field
      updateSql = `UPDATE users SET transaction_password = $1, email_otp = NULL, email_otp_expires = NULL WHERE id = $2`;
      params = [newPassword, req.userId];
    }

    await query(updateSql, params);
    res.json({ success: true, message: `${type === 'login' ? 'Login' : 'Transaction'} password changed successfully` });
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await query(`UPDATE users SET email_otp = $1, email_otp_expires = $2 WHERE id = $3`, [otp, expires, user.id]);

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'RXDT Exchange <onboarding@resend.dev>',
        to: [email],
        subject: 'Your RXDT Password Reset Code',
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0e1a;border-radius:16px;border:1px solid #1e2a3a;"><h1 style="color:#00d4ff;">RXDT Exchange</h1><p style="color:#8899aa;">Your password reset code:</p><div style="background:#111827;border:2px solid #00d4ff;border-radius:12px;padding:24px;text-align:center;"><span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#00d4ff;">${otp}</span></div><p style="color:#8899aa;font-size:12px;margin-top:16px;">Expires in 10 minutes. Do not share this code.</p></div>`,
      }),
    });

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

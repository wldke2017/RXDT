import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdminSecret } from './admin.js';
import webpush from 'web-push';
import { autoReplyIfNeeded } from './autoReply.js';

// Configure VAPID (keys stored in .env)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.ADMIN_EMAIL || 'admin@rxdt.site'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const router = express.Router();


// ---- USER: Send a message ----
router.post('/send', requireAuth, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const id = 'CHAT' + Date.now() + Math.random().toString(36).substring(2, 6);
        await query(
            `INSERT INTO chat_messages (id, user_id, message, sender, is_read) VALUES ($1, $2, $3, 'user', FALSE)`,
            [id, req.userId, message.trim()]
        );

        // Notify admin via email about new message (if configured)
        try {
            const { notifyAdminOfPendingItem } = await import('../notify.js');
            const userRes = await query(
                `SELECT name, phone, email FROM users WHERE id = $1`, [req.userId]
            );
            const user = userRes.rows[0];
            const userLabel = user?.name || user?.phone || user?.email || req.userId;
            notifyAdminOfPendingItem({
                type: 'chat',
                id,
                amount: '',
                userLabel,
                detail: `New support message from ${userLabel}: "${message.trim().substring(0, 100)}..."`,
            });
        } catch (e) { /* email notification is best-effort */ }

        // Push notification to admin devices
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            try {
                const userRes2 = await query(`SELECT name, phone, email FROM users WHERE id = $1`, [req.userId]);
                const u = userRes2.rows[0];
                const label = u?.name || u?.phone || u?.email || req.userId;
                const adminSubs = await query(`SELECT subscription FROM admin_push_subscriptions`);
                const payload = JSON.stringify({
                    title: `💬 New Message from ${label}`,
                    body: message.trim().length > 100 ? message.trim().slice(0, 97) + '...' : message.trim(),
                    tag: 'rxdt-admin-chat',
                    url: '/rxdt-mgmt-9x7k.html',
                    isAdmin: true
                });
                for (const row of adminSubs.rows) {
                    const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
                    webpush.sendNotification(sub, payload).catch(async (err) => {
                        if (err.statusCode === 410) {
                            await query(`DELETE FROM admin_push_subscriptions WHERE subscription->>'endpoint' = $1`, [sub.endpoint]).catch(() => {});
                        }
                    });
                }
            } catch (e) { /* push to admin is best-effort */ }
        }

        res.json({ success: true, message: 'Message sent!', id });

        // Fire auto-reply agent asynchronously — never blocks or throws to the user
        autoReplyIfNeeded(req.userId, message.trim()).catch(() => {});
    } catch (err) {
        console.error('Chat send error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ---- USER: Get their messages ----
router.get('/messages', requireAuth, async (req, res) => {
    try {
        const result = await query(
            `SELECT id, message, sender, is_read, is_auto_reply, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC`,
            [req.userId]
        );
        res.json({ messages: result.rows });
    } catch (err) {
        console.error('Chat messages error:', err);
        res.status(500).json({ error: 'Failed to load messages' });
    }
});

// ---- ADMIN: Get all conversations (unique users with unread count) ----
router.get('/admin/conversations', requireAdminSecret, async (req, res) => {
    try {
        const result = await query(`
      SELECT 
        cm.user_id,
        u.name as user_name,
        u.phone as user_phone,
        COUNT(*) FILTER (WHERE cm.is_read = FALSE AND cm.sender = 'user') as unread_count,
        MAX(cm.created_at) as last_message_at,
        (SELECT message FROM chat_messages WHERE user_id = cm.user_id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM chat_messages cm
      LEFT JOIN users u ON cm.user_id = u.id
      GROUP BY cm.user_id, u.name, u.phone
      ORDER BY last_message_at DESC
    `);
        res.json({ conversations: result.rows });
    } catch (err) {
        console.error('Admin conversations error:', err);
        res.status(500).json({ error: 'Failed to load conversations' });
    }
});

// ---- ADMIN: Get messages for a specific user conversation ----
router.get('/admin/messages/:userId', requireAdminSecret, async (req, res) => {
    try {
        const result = await query(
            `SELECT id, message, sender, is_read, is_auto_reply, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC`,
            [req.params.userId]
        );

        // Mark all user messages as read
        await query(
            `UPDATE chat_messages SET is_read = TRUE WHERE user_id = $1 AND sender = 'user' AND is_read = FALSE`,
            [req.params.userId]
        );

        const userRes = await query(
            `SELECT name, phone, email FROM users WHERE id = $1`, [req.params.userId]
        );

        res.json({
            messages: result.rows,
            user: userRes.rows[0] || null
        });
    } catch (err) {
        console.error('Admin messages error:', err);
        res.status(500).json({ error: 'Failed to load messages' });
    }
});

// ---- USER: Get unread admin replies ----
router.get('/unread-replies', requireAuth, async (req, res) => {
    try {
        const result = await query(
            `SELECT id, message, created_at FROM chat_messages WHERE user_id = $1 AND sender = 'admin' AND is_read = FALSE ORDER BY created_at ASC`,
            [req.userId]
        );
        res.json({ unreadCount: result.rows.length, messages: result.rows });
    } catch (err) {
        console.error('Unread replies error:', err);
        res.status(500).json({ error: 'Failed to load unread replies' });
    }
});

// ---- USER: Mark admin replies as read ----
router.post('/mark-read', requireAuth, async (req, res) => {
    try {
        await query(
            `UPDATE chat_messages SET is_read = TRUE WHERE user_id = $1 AND sender = 'admin' AND is_read = FALSE`,
            [req.userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ error: 'Failed to mark messages read' });
    }
});

// ---- USER: Save push subscription ----
router.post('/push-subscribe', requireAuth, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        // Upsert: replace existing subscription for same endpoint
        const existing = await query(
            `SELECT id FROM push_subscriptions WHERE user_id = $1 AND subscription->>'endpoint' = $2`,
            [req.userId, subscription.endpoint]
        );

        if (existing.rows.length > 0) {
            await query(
                `UPDATE push_subscriptions SET subscription = $1 WHERE user_id = $2 AND subscription->>'endpoint' = $3`,
                [JSON.stringify(subscription), req.userId, subscription.endpoint]
            );
        } else {
            const id = 'PUSH' + Date.now();
            await query(
                `INSERT INTO push_subscriptions (id, user_id, subscription) VALUES ($1, $2, $3)`,
                [id, req.userId, JSON.stringify(subscription)]
            );
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Push subscribe error:', err);
        res.status(500).json({ error: 'Failed to save push subscription' });
    }
});

// ---- USER: Remove push subscription (logout) ----
router.post('/push-unsubscribe', requireAuth, async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (endpoint) {
            await query(
                `DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription->>'endpoint' = $2`,
                [req.userId, endpoint]
            );
        } else {
            await query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [req.userId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove push subscription' });
    }
});

// ---- ADMIN: Reply to a user ----
router.post('/admin/reply', requireAdminSecret, async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message || !message.trim()) {
            return res.status(400).json({ error: 'userId and message are required' });
        }

        const id = 'CHAT' + Date.now() + 'A';
        await query(
            `INSERT INTO chat_messages (id, user_id, message, sender, is_read) VALUES ($1, $2, $3, 'admin', FALSE)`,
            [id, userId, message.trim()]
        );

        // Send Web Push notification to all of user's subscribed devices
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            try {
                const subsRes = await query(
                    `SELECT subscription FROM push_subscriptions WHERE user_id = $1`,
                    [userId]
                );
                const payload = JSON.stringify({
                    title: '💬 RXDT Support',
                    body: message.trim().length > 100 ? message.trim().slice(0, 97) + '...' : message.trim(),
                    tag: 'rxdt-chat-reply',
                    url: '/#/home'
                });
                for (const row of subsRes.rows) {
                    const sub = typeof row.subscription === 'string'
                        ? JSON.parse(row.subscription)
                        : row.subscription;
                    webpush.sendNotification(sub, payload).catch(async (err) => {
                        // 410 Gone = subscription expired, clean it up
                        if (err.statusCode === 410) {
                            await query(
                                `DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription->>'endpoint' = $2`,
                                [userId, sub.endpoint]
                            ).catch(() => {});
                        }
                    });
                }
            } catch (pushErr) {
                console.warn('Push notification error (non-fatal):', pushErr.message);
            }
        }

        res.json({ success: true, message: 'Reply sent!', id });
    } catch (err) {
        console.error('Admin reply error:', err);
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

// ---- ADMIN: Get unread message count ----
router.get('/admin/pending-count', requireAdminSecret, async (req, res) => {
    try {
        const result = await query(
            `SELECT COUNT(*) as count FROM chat_messages WHERE sender = 'user' AND is_read = FALSE`
        );
        res.json({ unreadCount: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('Admin pending count error:', err);
        res.status(500).json({ error: 'Failed to load count' });
    }
});

// ---- ADMIN: Save push subscription for admin device ----
router.post('/admin/push-subscribe', requireAdminSecret, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }
        const existing = await query(
            `SELECT id FROM admin_push_subscriptions WHERE subscription->>'endpoint' = $1`,
            [subscription.endpoint]
        );
        if (existing.rows.length > 0) {
            await query(
                `UPDATE admin_push_subscriptions SET subscription = $1 WHERE subscription->>'endpoint' = $2`,
                [JSON.stringify(subscription), subscription.endpoint]
            );
        } else {
            const id = 'APUSH' + Date.now();
            await query(
                `INSERT INTO admin_push_subscriptions (id, subscription) VALUES ($1, $2)`,
                [id, JSON.stringify(subscription)]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Admin push subscribe error:', err);
        res.status(500).json({ error: 'Failed to save admin push subscription' });
    }
});

// ---- ADMIN: Remove push subscription (admin logout) ----
router.post('/admin/push-unsubscribe', requireAdminSecret, async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (endpoint) {
            await query(`DELETE FROM admin_push_subscriptions WHERE subscription->>'endpoint' = $1`, [endpoint]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove admin push subscription' });
    }
});

export default router;
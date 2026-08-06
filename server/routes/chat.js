import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdminSecret } from './admin.js';

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

        res.json({ success: true, message: 'Message sent!', id });
    } catch (err) {
        console.error('Chat send error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// ---- USER: Get their messages ----
router.get('/messages', requireAuth, async (req, res) => {
    try {
        const result = await query(
            `SELECT id, message, sender, is_read, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC`,
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
            `SELECT id, message, sender, is_read, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC`,
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

// ---- ADMIN: Reply to a user ----
router.post('/admin/reply', requireAdminSecret, async (req, res) => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message || !message.trim()) {
            return res.status(400).json({ error: 'userId and message are required' });
        }

        const id = 'CHAT' + Date.now() + 'A';
        await query(
            `INSERT INTO chat_messages (id, user_id, message, sender, is_read) VALUES ($1, $2, $3, 'admin', TRUE)`,
            [id, userId, message.trim()]
        );

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

export default router;
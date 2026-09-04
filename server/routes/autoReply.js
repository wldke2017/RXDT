/**
 * Auto-Reply Agent — History-Based Similarity Matching
 *
 * Mines past admin replies from the chat_messages table to build a Q&A
 * knowledge base. When a new user message arrives, it finds the closest
 * matching past user question using Jaccard word-overlap similarity and
 * sends the corresponding admin reply automatically.
 *
 * No external API required — runs entirely in Node.js.
 * Designed to be non-blocking: called fire-and-forget from chat /send.
 *
 * Cooldown rules:
 *  - If the global "auto_reply_enabled" system setting is false => skip.
 *  - If admin replied to this user in the last 3 minutes => skip (admin is online).
 *  - If this user already received an auto-reply in the last 60 seconds => skip.
 *  - If no match found above the similarity threshold => skip (let admin handle it).
 */

import { query } from '../db.js';
import webpush from 'web-push';

// Configure VAPID keys (shared with chat.js)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.ADMIN_EMAIL || 'admin@rxdt.site'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Similarity threshold: 0 (no match) to 1 (identical).
// 0.45 catches paraphrased questions while avoiding false positives.
const SIMILARITY_THRESHOLD = 0.45;

// If admin replied within this many seconds, assume admin is online => skip.
const ADMIN_COOLDOWN_SECONDS = 180; // 3 minutes

// Avoid double auto-replying the same user within this window.
const USER_COOLDOWN_SECONDS = 60;

/**
 * Jaccard word-overlap similarity between two strings.
 * Returns a score between 0 and 1.
 */
function similarity(a, b) {
  const tokenise = (str) =>
    new Set(
      str
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2)
    );
  const setA = tokenise(a);
  const setB = tokenise(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/**
 * Fetch up to 300 Q&A pairs from chat history.
 * A pair = user message immediately followed by the next admin message in the
 * same conversation (no other user message in between).
 */
async function buildKnowledgeBase() {
  const res = await query(`
    SELECT u.message AS question, a.message AS answer
    FROM chat_messages u
    JOIN chat_messages a
      ON  a.user_id   = u.user_id
      AND a.sender    = 'admin'
      AND a.created_at > u.created_at
    WHERE u.sender = 'user'
      AND NOT EXISTS (
        SELECT 1 FROM chat_messages x
        WHERE x.user_id   = u.user_id
          AND x.sender    = 'user'
          AND x.created_at > u.created_at
          AND x.created_at < a.created_at
      )
    ORDER BY u.created_at DESC
    LIMIT 300
  `).catch(() => ({ rows: [] }));

  return res.rows;
}

/**
 * Find the best matching answer for a user message.
 * Returns { answer, score } or null if no match exceeds the threshold.
 */
function findBestMatch(userMessage, knowledgeBase) {
  if (!knowledgeBase.length) return null;

  let bestScore = 0;
  let bestAnswer = null;

  for (const pair of knowledgeBase) {
    const score = similarity(userMessage, pair.question);
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = pair.answer;
    }
  }

  if (bestScore >= SIMILARITY_THRESHOLD) {
    return { answer: bestAnswer, score: bestScore };
  }
  return null;
}

/**
 * Main entry point. Called after a user sends a message.
 * All errors are swallowed — this must never break the user-facing /send endpoint.
 */
export async function autoReplyIfNeeded(userId, userMessage) {
  try {
    // 1. Check global toggle
    const settingRes = await query(
      `SELECT value FROM system_settings WHERE key = 'auto_reply_enabled'`
    ).catch(() => ({ rows: [] }));
    const enabled = settingRes.rows[0]?.value !== 'false';
    if (!enabled) return;

    // 2. Admin cooldown — if admin replied recently, they are online
    const adminCooldownRes = await query(
      `SELECT created_at FROM chat_messages
       WHERE user_id = $1 AND sender = 'admin'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    ).catch(() => ({ rows: [] }));
    if (adminCooldownRes.rows.length > 0) {
      const lastAdminReplyMs = new Date(adminCooldownRes.rows[0].created_at).getTime();
      const secondsAgo = (Date.now() - lastAdminReplyMs) / 1000;
      if (secondsAgo < ADMIN_COOLDOWN_SECONDS) return;
    }

    // 3. User cooldown — avoid rapid duplicate auto-replies
    const userCooldownRes = await query(
      `SELECT created_at FROM chat_messages
       WHERE user_id = $1 AND sender = 'admin' AND is_auto_reply = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    ).catch(() => ({ rows: [] }));
    if (userCooldownRes.rows.length > 0) {
      const lastAutoMs = new Date(userCooldownRes.rows[0].created_at).getTime();
      const secondsAgo = (Date.now() - lastAutoMs) / 1000;
      if (secondsAgo < USER_COOLDOWN_SECONDS) return;
    }

    // 4. Build knowledge base and find a match
    const kb = await buildKnowledgeBase();
    const match = findBestMatch(userMessage, kb);
    if (!match) return;

    // 5. Insert the auto-reply as sender = 'admin', is_auto_reply = TRUE
    const replyId = 'CHAT' + Date.now() + 'AR';
    await query(
      `INSERT INTO chat_messages (id, user_id, message, sender, is_read, is_auto_reply)
       VALUES ($1, $2, $3, 'admin', FALSE, TRUE)`,
      [replyId, userId, match.answer]
    );

    // 6. Push notification to user (best-effort)
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const subsRes = await query(
        `SELECT subscription FROM push_subscriptions WHERE user_id = $1`,
        [userId]
      ).catch(() => ({ rows: [] }));

      const payload = JSON.stringify({
        title: 'RXDT Support',
        body: match.answer.length > 100 ? match.answer.slice(0, 97) + '...' : match.answer,
        tag: 'rxdt-chat-reply',
        url: '/#/home',
      });

      for (const row of subsRes.rows) {
        const sub =
          typeof row.subscription === 'string'
            ? JSON.parse(row.subscription)
            : row.subscription;
        webpush.sendNotification(sub, payload).catch(async (err) => {
          if (err.statusCode === 410) {
            await query(
              `DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription->>'endpoint' = $2`,
              [userId, sub.endpoint]
            ).catch(() => {});
          }
        });
      }
    }

    console.log(`Auto-replied to user ${userId} (score: ${match.score.toFixed(2)})`);
  } catch (err) {
    console.warn('Auto-reply agent error (non-fatal):', err.message);
  }
}

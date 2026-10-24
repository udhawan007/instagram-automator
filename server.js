const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3750;
const DB_PATH = path.join(__dirname, 'automator.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite database
const db = new DatabaseSync(DB_PATH);

// Create focused tables for Instagram Reels & Posts Comment Automation
db.exec(`
  CREATE TABLE IF NOT EXISTS automations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    post_scope TEXT DEFAULT 'any_post_or_reel',
    specific_post_url TEXT DEFAULT '',
    keyword_type TEXT DEFAULT 'specific',
    trigger_keywords TEXT DEFAULT '["link","guide","send"]',
    excluded_keywords TEXT DEFAULT '["scam","fake","hate"]',
    public_reply_enabled INTEGER DEFAULT 1,
    public_replies TEXT DEFAULT '["Check your DMs! 📩","Sent you the details directly in inbox! 🚀","Just sent it to your DMs ✨"]',
    tag_user INTEGER DEFAULT 1,
    dm_enabled INTEGER DEFAULT 1,
    dm_message TEXT DEFAULT 'Hey {username}! Here is the resource you requested: https://yourbrand.com/access 🎉 Let me know what you think!',
    dm_delay_seconds INTEGER DEFAULT 0,
    require_follow INTEGER DEFAULT 0,
    follow_check_message TEXT DEFAULT 'Hey {username}! 👋 One quick step before we unlock your link:\n\nFollow our Instagram profile, then tap \"I am following\" below to receive your instant access! 🚀',
    follow_check_public_reply TEXT DEFAULT 'Please follow our profile first and check your DMs to unlock the link! 🔒✨',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'simulator',
    username TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    post_id TEXT DEFAULT '',
    rule_name TEXT DEFAULT '',
    public_reply TEXT DEFAULT '',
    dm_message TEXT DEFAULT '',
    status TEXT DEFAULT 'success',
    details TEXT DEFAULT '',
    reason TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Safe migrations for newly added columns
const automationsCols = db.prepare('PRAGMA table_info(automations)').all().map(c => c.name);
if (!automationsCols.includes('require_follow')) {
  try { db.exec("ALTER TABLE automations ADD COLUMN require_follow INTEGER DEFAULT 0"); } catch {}
}
if (!automationsCols.includes('follow_check_message')) {
  try { db.exec("ALTER TABLE automations ADD COLUMN follow_check_message TEXT DEFAULT 'Hey {username}! 👋 One quick step before we unlock your link:\n\nFollow our Instagram profile, then tap \"I am following\" below to receive your instant access! 🚀'"); } catch {}
}
if (!automationsCols.includes('follow_check_public_reply')) {
  try { db.exec("ALTER TABLE automations ADD COLUMN follow_check_public_reply TEXT DEFAULT 'Please follow our profile first and check your DMs to unlock the link! 🔒✨'"); } catch {}
}

const logsCols = db.prepare('PRAGMA table_info(activity_logs)').all().map(c => c.name);
if (!logsCols.includes('reason')) {
  try { db.exec("ALTER TABLE activity_logs ADD COLUMN reason TEXT DEFAULT ''"); } catch {}
}

// Helpers for settings
function getSetting(key, defaultValue = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

if (!getSetting('mode')) {
  setSetting('mode', 'sandbox');
  setSetting('page_access_token', '');
  setSetting('meta_app_id', '');
  setSetting('webhook_verify_token', 'ig_verify_' + Math.random().toString(36).substring(2, 9));
}

// Seed default sample automations if empty
const count = db.prepare('SELECT COUNT(*) as count FROM automations').get().count;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO automations (
      name, active, post_scope, specific_post_url, keyword_type,
      trigger_keywords, excluded_keywords, public_reply_enabled,
      public_replies, tag_user, dm_enabled, dm_message, dm_delay_seconds,
      require_follow, follow_check_message, follow_check_public_reply
    ) VALUES (?, 1, ?, ?, ?, ?, ?, 1, ?, 1, 1, ?, ?, ?, ?, ?)
  `);

  insert.run(
    'Reel: Send Link (Follow First Gate)',
    'any_post_or_reel',
    '',
    'specific',
    JSON.stringify(['link', 'guide', 'send', 'info', 'access']),
    JSON.stringify(['scam', 'fake', 'bot', 'spam']),
    JSON.stringify([
      'Check your DMs! I just dropped the link there 📩',
      'Sent to your inbox! Check your message requests 🚀',
      'Just sent the full link to your DMs! Enjoy ✨'
    ]),
    'Hey {username}! Here is the direct link from the reel: https://yourbrand.com/special-link 🚀\n\nLet me know if you have any questions!',
    0,
    1, // require_follow = true
    'Hey {username}! 👋 One quick step before we unlock your link:\n\nFollow our Instagram profile, then tap "I am following" below to receive your instant access! 🚀',
    'Please follow our profile first and check your DMs to unlock the link! 🔒✨'
  );

  insert.run(
    'Promo / Discount Code Reply',
    'any_post_or_reel',
    '',
    'specific',
    JSON.stringify(['discount', 'price', 'code', 'coupon', 'cost']),
    JSON.stringify(['refund', 'bad', 'expensive']),
    JSON.stringify([
      'Sent you the 20% discount code in your DMs! 🎁',
      'Check your inbox for the VIP promo code ⚡',
      'DM sent! Use the code at checkout 🙌'
    ]),
    'Hey {username}! Thanks for watching the reel! Use code REEL20 at checkout for 20% OFF: https://yourbrand.com/shop 🛒 Enjoy!',
    5,
    0, // require_follow = false
    '',
    ''
  );
}

// Core Evaluation Engine for Instagram Comments with Follow-Gate Support
function evaluateComment(commentText, postId = '', username = 'user', isFollowing = true) {
  const automations = db.prepare('SELECT * FROM automations WHERE active = 1 ORDER BY id DESC').all();
  const cleanComment = commentText.trim().toLowerCase();

  for (const item of automations) {
    // 1. Post Scope Check
    if (item.post_scope === 'specific_post' && item.specific_post_url) {
      const target = item.specific_post_url.trim().toLowerCase();
      if (postId && !postId.toLowerCase().includes(target) && !target.includes(postId.toLowerCase())) {
        continue;
      }
    }

    // 2. Excluded Keywords Check (Negative filter from Hypello)
    let excluded = [];
    try { excluded = JSON.parse(item.excluded_keywords || '[]'); } catch { excluded = []; }
    const hasExcluded = excluded.some(kw => {
      const cleanKw = kw.trim().toLowerCase();
      return cleanKw && cleanComment.includes(cleanKw);
    });

    if (hasExcluded) {
      return {
        matched: false,
        reason: 'Comment contained an excluded keyword filter.'
      };
    }

    // 3. Trigger Keywords Check
    let isMatch = false;
    if (item.keyword_type === 'any_comment') {
      isMatch = true;
    } else {
      let keywords = [];
      try { keywords = JSON.parse(item.trigger_keywords || '[]'); } catch { keywords = []; }
      isMatch = keywords.some(kw => {
        const cleanKw = kw.trim().toLowerCase();
        if (!cleanKw) return false;
        const regex = new RegExp(`\\b${escapeRegExp(cleanKw)}\\b`, 'i');
        return regex.test(cleanComment) || cleanComment.includes(cleanKw);
      });
    }

    if (isMatch) {
      // 4. Follow-Gate Check (Hypello Follow-Check feature)
      if (Boolean(item.require_follow) && !isFollowing) {
        // User must follow first!
        const followPublic = item.follow_check_public_reply || 'Please follow our profile first and check your DMs to unlock the link! 🔒✨';
        const publicReply = item.tag_user ? `@${username} ${followPublic}` : followPublic;
        const dmMessage = (item.follow_check_message || 'Hey {username}! 👋 One quick step before we unlock your link: Follow our profile, then tap "I am following" below to receive your instant access! 🚀').replace(/\{username\}/gi, username);

        return {
          matched: true,
          automation: item,
          isFollowGate: true,
          publicReply,
          dmMessage,
          delaySeconds: 0,
          buttons: [
            { text: '👉 Visit Profile', action: 'visit_profile' },
            { text: "I'm following ✅", action: 'confirm_follow' }
          ]
        };
      }

      // User is following or follow check is disabled: dispatch the unlocked content
      let publicReply = '';
      if (item.public_reply_enabled) {
        let replies = [];
        try { replies = JSON.parse(item.public_replies || '[]'); } catch { replies = []; }
        if (replies.length > 0) {
          const chosen = replies[Math.floor(Math.random() * replies.length)];
          publicReply = item.tag_user ? `@${username} ${chosen}` : chosen;
        }
      }

      let dmMessage = '';
      if (item.dm_enabled && item.dm_message) {
        dmMessage = item.dm_message.replace(/\{username\}/gi, username);
      }

      return {
        matched: true,
        automation: item,
        isFollowGate: false,
        publicReply,
        dmMessage,
        delaySeconds: item.dm_delay_seconds || 0
      };
    }
  }

  return { matched: false, reason: 'No keyword match' };
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Meta Instagram API Live Action
async function dispatchLiveAction(commentId, commenterId, publicReply, dmMessage) {
  const mode = getSetting('mode', 'sandbox');
  const token = getSetting('page_access_token', '');

  if (mode !== 'live' || !token) {
    return { dispatched: false, reason: 'Sandbox mode or missing access token' };
  }

  const results = {};

  if (publicReply && commentId) {
    try {
      const resp = await fetch(`https://graph.facebook.com/v19.0/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: publicReply, access_token: token })
      });
      results.publicReply = await resp.json();
    } catch (e) {
      results.publicReplyError = e.message;
    }
  }

  if (dmMessage && commenterId) {
    try {
      const resp = await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: commenterId },
          message: { text: dmMessage },
          access_token: token
        })
      });
      results.dm = await resp.json();
    } catch (e) {
      results.dmError = e.message;
    }
  }

  return { dispatched: true, results };
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // REST API
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    // GET /api/status
    if (pathname === '/api/status' && req.method === 'GET') {
      const total = db.prepare('SELECT COUNT(*) as c FROM automations').get().c;
      const active = db.prepare('SELECT COUNT(*) as c FROM automations WHERE active = 1').get().c;
      const logs = db.prepare('SELECT COUNT(*) as c FROM activity_logs').get().c;
      const matched = db.prepare("SELECT COUNT(*) as c FROM activity_logs WHERE status = 'success'").get().c;
      const mode = getSetting('mode', 'sandbox');

      res.writeHead(200);
      res.end(JSON.stringify({ status: 'online', mode, total, active, logs, matched, port: PORT }));
      return;
    }

    // GET /api/automations
    if (pathname === '/api/automations' && req.method === 'GET') {
      const rows = db.prepare('SELECT * FROM automations ORDER BY id DESC').all();
      const list = rows.map(r => ({
        ...r,
        active: Boolean(r.active),
        public_reply_enabled: Boolean(r.public_reply_enabled),
        tag_user: Boolean(r.tag_user),
        dm_enabled: Boolean(r.dm_enabled),
        require_follow: Boolean(r.require_follow),
        trigger_keywords: JSON.parse(r.trigger_keywords || '[]'),
        excluded_keywords: JSON.parse(r.excluded_keywords || '[]'),
        public_replies: JSON.parse(r.public_replies || '[]')
      }));
      res.writeHead(200);
      res.end(JSON.stringify({ automations: list }));
      return;
    }

    // POST /api/automations
    if (pathname === '/api/automations' && req.method === 'POST') {
      try {
        const b = await parseBody(req);
        const stmt = db.prepare(`
          INSERT INTO automations (
            name, active, post_scope, specific_post_url, keyword_type,
            trigger_keywords, excluded_keywords, public_reply_enabled,
            public_replies, tag_user, dm_enabled, dm_message, dm_delay_seconds,
            require_follow, follow_check_message, follow_check_public_reply
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
          b.name || 'New Reel / Post Automation',
          b.active === false ? 0 : 1,
          b.post_scope || 'any_post_or_reel',
          b.specific_post_url || '',
          b.keyword_type || 'specific',
          JSON.stringify(b.trigger_keywords || []),
          JSON.stringify(b.excluded_keywords || []),
          b.public_reply_enabled === false ? 0 : 1,
          JSON.stringify(b.public_replies || []),
          b.tag_user === false ? 0 : 1,
          b.dm_enabled === false ? 0 : 1,
          b.dm_message || '',
          Number(b.dm_delay_seconds) || 0,
          b.require_follow ? 1 : 0,
          b.follow_check_message || '',
          b.follow_check_public_reply || ''
        );

        res.writeHead(201);
        res.end(JSON.stringify({ success: true, id: result.lastInsertRowid }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // PUT /api/automations/:id
    const idMatch = pathname.match(/^\/api\/automations\/(\d+)$/);
    if (idMatch && req.method === 'PUT') {
      try {
        const id = idMatch[1];
        const b = await parseBody(req);
        const stmt = db.prepare(`
          UPDATE automations SET
            name = ?, active = ?, post_scope = ?, specific_post_url = ?,
            keyword_type = ?, trigger_keywords = ?, excluded_keywords = ?,
            public_reply_enabled = ?, public_replies = ?, tag_user = ?,
            dm_enabled = ?, dm_message = ?, dm_delay_seconds = ?,
            require_follow = ?, follow_check_message = ?, follow_check_public_reply = ?
          WHERE id = ?
        `);

        stmt.run(
          b.name,
          b.active ? 1 : 0,
          b.post_scope || 'any_post_or_reel',
          b.specific_post_url || '',
          b.keyword_type || 'specific',
          JSON.stringify(b.trigger_keywords || []),
          JSON.stringify(b.excluded_keywords || []),
          b.public_reply_enabled ? 1 : 0,
          JSON.stringify(b.public_replies || []),
          b.tag_user ? 1 : 0,
          b.dm_enabled ? 1 : 0,
          b.dm_message || '',
          Number(b.dm_delay_seconds) || 0,
          b.require_follow ? 1 : 0,
          b.follow_check_message || '',
          b.follow_check_public_reply || '',
          id
        );

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // POST /api/automations/:id/toggle
    const toggleMatch = pathname.match(/^\/api\/automations\/(\d+)\/toggle$/);
    if (toggleMatch && req.method === 'POST') {
      const id = toggleMatch[1];
      db.prepare('UPDATE automations SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
      const row = db.prepare('SELECT active FROM automations WHERE id = ?').get(id);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, active: Boolean(row?.active) }));
      return;
    }

    // DELETE /api/automations/:id
    if (idMatch && req.method === 'DELETE') {
      const id = idMatch[1];
      db.prepare('DELETE FROM automations WHERE id = ?').run(id);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // POST /api/simulate (Interactive Post & Reel Tester with Follow-Gate support)
    if (pathname === '/api/simulate' && req.method === 'POST') {
      try {
        const b = await parseBody(req);
        const username = (b.username || 'alex_travels').replace(/^@/, '');
        const comment = b.comment || '';
        const postId = b.postId || 'reel_101';
        const isFollowing = b.isFollowing !== false; // default to true unless unchecked

        const evalResult = evaluateComment(comment, postId, username, isFollowing);

        // Record log
        const logStmt = db.prepare(`
          INSERT INTO activity_logs (source, username, comment_text, post_id, rule_name, public_reply, dm_message, status, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        if (evalResult.matched) {
          const statusText = evalResult.isFollowGate ? 'follow_gate' : 'success';
          const reasonText = evalResult.isFollowGate ? 
            'Follower gate triggered: User is not following yet' : 
            'Matched keywords on ' + evalResult.automation.post_scope;

          logStmt.run(
            'simulator',
            username,
            comment,
            postId,
            evalResult.automation.name,
            evalResult.publicReply,
            evalResult.dmMessage,
            statusText,
            reasonText
          );
        } else {
          logStmt.run(
            'simulator',
            username,
            comment,
            postId,
            'None',
            '',
            '',
            'no_match',
            evalResult.reason || 'No match'
          );
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, evaluation: evalResult }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // GET & DELETE /api/logs
    if (pathname === '/api/logs' && req.method === 'GET') {
      const logs = db.prepare('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 50').all();
      res.writeHead(200);
      res.end(JSON.stringify({ logs }));
      return;
    }

    if (pathname === '/api/logs' && req.method === 'DELETE') {
      db.prepare('DELETE FROM activity_logs').run();
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // GET & POST /api/settings
    if (pathname === '/api/settings' && req.method === 'GET') {
      const rows = db.prepare('SELECT key, value FROM settings').all();
      const settings = {};
      rows.forEach(r => { settings[r.key] = r.value; });
      res.writeHead(200);
      res.end(JSON.stringify({ settings }));
      return;
    }

    if (pathname === '/api/settings' && req.method === 'POST') {
      try {
        const b = await parseBody(req);
        Object.entries(b).forEach(([k, v]) => setSetting(k, String(v)));
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // Meta Webhooks
    if (pathname === '/api/webhook' && req.method === 'GET') {
      const mode = parsedUrl.searchParams.get('hub.mode');
      const token = parsedUrl.searchParams.get('hub.verify_token');
      const challenge = parsedUrl.searchParams.get('hub.challenge');
      const configuredToken = getSetting('webhook_verify_token');

      if (mode === 'subscribe' && token === configuredToken) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(challenge);
      } else {
        res.writeHead(403);
        res.end('Verification failed');
      }
      return;
    }

    if (pathname === '/api/webhook' && req.method === 'POST') {
      try {
        const body = await parseBody(req);
        if (body.object === 'instagram' && Array.isArray(body.entry)) {
          for (const entry of body.entry) {
            if (Array.isArray(entry.changes)) {
              for (const change of entry.changes) {
                if (change.field === 'comments') {
                  const val = change.value;
                  const commentId = val.id;
                  const commentText = val.text || '';
                  const commenterId = val.from?.id;
                  const username = val.from?.username || 'user';
                  const mediaId = val.media?.id || '';

                  // For live check, assume follower unless webhook payload provides is_user_follow
                  const evalResult = evaluateComment(commentText, mediaId, username, true);

                  if (evalResult.matched) {
                    const dispatch = await dispatchLiveAction(commentId, commenterId, evalResult.publicReply, evalResult.dmMessage);
                    db.prepare(`
                      INSERT INTO activity_logs (source, username, comment_text, post_id, rule_name, public_reply, dm_message, status, reason)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                      'live_webhook',
                      username,
                      commentText,
                      mediaId,
                      evalResult.automation.name,
                      evalResult.publicReply,
                      evalResult.dmMessage,
                      'success',
                      JSON.stringify(dispatch)
                    );
                  } else {
                    db.prepare(`
                      INSERT INTO activity_logs (source, username, comment_text, post_id, rule_name, public_reply, dm_message, status, reason)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run('live_webhook', username, commentText, mediaId, 'None', '', '', 'no_match', evalResult.reason);
                  }
                }
              }
            }
          }
        }
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'EVENT_RECEIVED' }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }

  // Static File Serving
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(PUBLIC_DIR, relativePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Instagram Automator running at http://localhost:${PORT}`);
});

'use strict';

const { query } = require('../db/pool');

/**
 * Protects routes: reads the session token from the HttpOnly cookie,
 * validates it against the DB, and attaches req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.session_token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { rows } = await query(
      `SELECT s.id AS session_id, s.expires_at,
              u.id, u.name, u.email, u.created_at
       FROM   sessions s
       JOIN   users    u ON u.id = s.user_id
       WHERE  s.token = $1
         AND  s.expires_at > NOW()`,
      [token],
    );

    if (rows.length === 0) {
      // Token not found or expired — clear the stale cookie
      res.clearCookie('session_token');
      return res.status(401).json({ success: false, message: 'Session expired or invalid' });
    }

    req.user = {
      id: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      createdAt: rows[0].created_at,
      sessionId: rows[0].session_id,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;

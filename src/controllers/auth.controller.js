'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { setSessionCookie, clearSessionCookie } = require('../utils/cookie');

const BCRYPT_ROUNDS = 12;
const SESSION_EXPIRY_HOURS = parseInt(process.env.SESSION_EXPIRY_HOURS, 10) || 24;

// ── POST /auth/register ────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Reject if email already in use
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, password_hash],
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /auth/login ───────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1',
      [email],
    );

    // Constant-time comparison to prevent user enumeration
    const dummyHash = '$2b$12$invalidhashfortimingprotectiononly00000000000000000000';
    const user = rows[0];
    const hashToCompare = user ? user.password_hash : dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Invalidate any previous sessions for this user (single-session policy)
    // Remove this if you want multi-device support
    await query('DELETE FROM sessions WHERE user_id = $1', [user.id]);

    // Create new session
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 3_600_000);

    await query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt],
    );

    setSessionCookie(res, token, SESSION_EXPIRY_HOURS);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { id: user.id, name: user.name, email: user.email, createdAt: user.created_at },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /auth/verify ──────────────────────────────────────────────────────────

async function verify(req, res) {
  // requireAuth middleware has already validated the session and attached req.user
  return res.status(200).json({
    success: true,
    message: 'Session is valid',
    data: req.user,
  });
}

// ── POST /auth/logout ─────────────────────────────────────────────────────────

async function logout(req, res, next) {
  try {
    const token = req.cookies?.session_token;
    if (token) {
      await query('DELETE FROM sessions WHERE token = $1', [token]);
    }
    clearSessionCookie(res);
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, verify, logout };

'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');

const { register, login, verify, logout } = require('../controllers/auth.controller');
const { registerRules, loginRules } = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');

// Stricter rate-limit specifically for login to defend against brute-force
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max:      parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  skipSuccessfulRequests: true,   // only count failed attempts
});

router.post('/register', registerRules, validate, register);
router.post('/login',    loginLimiter, loginRules, validate, login);
router.get('/verify',    requireAuth, verify);
router.post('/logout',   requireAuth, logout);

module.exports = router;

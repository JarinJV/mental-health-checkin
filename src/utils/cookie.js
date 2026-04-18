'use strict';

const SESSION_COOKIE = 'session_token';

/**
 * Set the session cookie on the response.
 * @param {import('express').Response} res
 * @param {string} token
 * @param {number} expiryHours
 */
function setSessionCookie(res, token, expiryHours = 24) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,                                           // not readable by JS
    secure: process.env.COOKIE_SECURE === 'true',            // HTTPS-only in production
    sameSite: process.env.COOKIE_SAME_SITE || 'strict',      // CSRF mitigation
    maxAge: expiryHours * 60 * 60 * 1000,                    // ms
    path: '/',
  });
}

/**
 * Clear the session cookie.
 */
function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

module.exports = { setSessionCookie, clearSessionCookie, SESSION_COOKIE };

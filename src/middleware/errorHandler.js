'use strict';

/**
 * Centralised error handler.
 * Must be registered LAST in Express (4 params).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Postgres unique-violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Resource already exists' });
  }

  // Postgres check-constraint violation
  if (err.code === '23514') {
    return res.status(422).json({ success: false, message: 'A field value is out of the allowed range' });
  }

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (statusCode === 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = errorHandler;

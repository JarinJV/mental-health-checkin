'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  // Connection pool settings
  max: 20,               // max pool size
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterized query.
 * @param {string} text   - SQL string with $1, $2 … placeholders
 * @param {Array}  params - Parameter values
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('[DB]', { query: text, duration: `${duration}ms`, rows: res.rowCount });
  }

  return res;
}

/** Grab a dedicated client for transactions. Always release in a finally block. */
function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };

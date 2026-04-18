'use strict';

require('dotenv').config();

const app  = require('./app');
const { pool } = require('./db/pool');

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function start() {
  // Verify DB connectivity before binding
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Connected ✓');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await pool.end();
      console.log('[Server] Exited cleanly');
      process.exit(0);
    });

    // Force exit after 10 s if connections hang
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start();

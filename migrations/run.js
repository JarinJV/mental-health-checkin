'use strict';

require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
});

// ─── Schema DDL ───────────────────────────────────────────────────────────────

const UP = `
-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── users ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── sessions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE,   -- cryptographically-random token stored in cookie
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token      ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- ── checkins ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  mood        SMALLINT    NOT NULL CHECK (mood   BETWEEN 1 AND 10),
  stress      SMALLINT    NOT NULL CHECK (stress BETWEEN 1 AND 10),
  sleep_hours NUMERIC(4,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 24),
  energy      SMALLINT    NOT NULL CHECK (energy BETWEEN 1 AND 10),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ          DEFAULT NULL   -- soft-delete sentinel
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_id   ON checkins (user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins (created_at DESC);

-- Automatically update updated_at on row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_checkins_updated_at ON checkins;
CREATE TRIGGER trg_checkins_updated_at
  BEFORE UPDATE ON checkins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

const DOWN = `
DROP TRIGGER  IF EXISTS trg_checkins_updated_at ON checkins;
DROP FUNCTION IF EXISTS set_updated_at();
DROP TABLE    IF EXISTS checkins CASCADE;
DROP TABLE    IF EXISTS sessions CASCADE;
DROP TABLE    IF EXISTS users    CASCADE;
`;

// ─── Runner ───────────────────────────────────────────────────────────────────

async function migrate(direction = 'up') {
  const client = await pool.connect();
  try {
    console.log(`[migrate] Running ${direction.toUpperCase()} migration…`);
    await client.query(direction === 'up' ? UP : DOWN);
    console.log('[migrate] Done ✓');
  } finally {
    client.release();
    await pool.end();
  }
}

const arg = process.argv[2];
migrate(arg === 'rollback' ? 'down' : 'up').catch((err) => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});

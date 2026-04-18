# 🧠 Daily Mental Health Check-in API

A production-ready REST API for tracking daily mental health metrics — mood, stress, sleep, and energy — built with **Node.js**, **Express.js**, and **PostgreSQL** using secure cookie-based authentication.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [Security](#security)
- [Production Checklist](#production-checklist)

---

## Features

- 🔐 Secure HttpOnly cookie-based session authentication
- 🔑 Password hashing with bcrypt (12 rounds)
- 🛡️ Helmet security headers, CORS, rate limiting
- ✅ Input validation with express-validator
- 🗄️ Raw SQL with parameterised queries (SQL-injection safe)
- 🗑️ Soft-delete for check-ins (`deleted_at`)
- 📊 Dashboard with weekly averages and trends
- 🌐 Graceful shutdown & DB connection pooling

---

## Tech Stack

| Layer        | Technology               |
|-------------|--------------------------|
| Runtime      | Node.js ≥ 18             |
| Framework    | Express.js 4             |
| Database     | PostgreSQL 14+           |
| Auth         | Cookie sessions (no JWT) |
| Hashing      | bcrypt                   |
| Validation   | express-validator        |
| Security     | helmet, cors, express-rate-limit |

---

## Project Structure

```
mental-health-checkin/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js      # Register, login, verify, logout
│   │   └── checkin.controller.js   # CRUD + dashboard
│   ├── db/
│   │   └── pool.js                 # pg connection pool
│   ├── middleware/
│   │   ├── auth.js                 # Session verification
│   │   ├── validate.js             # express-validator error formatter
│   │   └── errorHandler.js        # Centralised error handling
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── checkin.routes.js
│   │   └── dashboard.routes.js
│   ├── utils/
│   │   └── cookie.js               # Cookie helpers
│   ├── validators/
│   │   ├── auth.validator.js
│   │   └── checkin.validator.js
│   ├── app.js                      # Express app factory
│   └── index.js                    # Entry point + graceful shutdown
├── migrations/
│   └── run.js                      # Schema UP / DOWN migrations
├── docs/
│   └── postman_collection.json     # Importable Postman collection
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL 14+

### 1 — Clone & install

```bash
git clone https://github.com/your-username/mental-health-checkin.git
cd mental-health-checkin
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

### 3 — Create the database

```bash
psql -U postgres -c "CREATE DATABASE mental_health_db;"
```

```linux
sudo -u postgres psql -c "CREATE DATABASE mental_health_db;"
```

### 4 — Run migrations

```bash
npm run migrate
```

### 5 — Start the server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` / `production` | `development` |
| `PORT` | HTTP port | `3000` |
| `DB_HOST` | Postgres host | `localhost` |
| `DB_PORT` | Postgres port | `5432` |
| `DB_NAME` | Database name | — |
| `DB_USER` | Database user | — |
| `DB_PASSWORD` | Database password | — |
| `DB_SSL` | Enable SSL (`true`/`false`) | `false` |
| `SESSION_SECRET` | Random secret ≥ 64 chars | — |
| `SESSION_EXPIRY_HOURS` | Session TTL in hours | `24` |
| `COOKIE_SECURE` | HTTPS-only cookie | `false` |
| `COOKIE_SAME_SITE` | SameSite policy | `strict` |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` |
| `LOGIN_RATE_LIMIT_MAX` | Max login attempts per window | `10` |

---

## Database Setup

### Schema

```sql
-- users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sessions
CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- checkins
CREATE TABLE checkins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood        SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 10),
  stress      SMALLINT NOT NULL CHECK (stress BETWEEN 1 AND 10),
  sleep_hours NUMERIC(4,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 24),
  energy      SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 10),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ DEFAULT NULL
);
```

### Rollback

```bash
npm run migrate:rollback
```

---

## API Reference

All responses follow this envelope:

```json
{
  "success": true | false,
  "message": "...",
  "data": { ... }
}
```

---

### Authentication

#### `POST /auth/register`

Register a new user.

**Request body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "SecurePass1"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": { "id": "uuid", "name": "Alice", "email": "alice@example.com", "created_at": "..." }
}
```

---

#### `POST /auth/login`

Authenticate and receive a session cookie.

**Request body:**
```json
{
  "email": "alice@example.com",
  "password": "SecurePass1"
}
```

**Response `200`** — sets `Set-Cookie: session_token=...; HttpOnly; Secure; SameSite=Strict`

---

#### `GET /auth/verify`

Check if the current session is valid. Requires cookie.

**Response `200`:**
```json
{
  "success": true,
  "message": "Session is valid",
  "data": { "id": "uuid", "name": "Alice", "email": "alice@example.com" }
}
```

---

#### `POST /auth/logout`

Invalidate session and clear cookie.

**Response `200`:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

### Check-ins

All routes require a valid session cookie.

#### `POST /checkins`

Create a new check-in.

**Request body:**
```json
{
  "mood": 7,
  "stress": 4,
  "sleepHours": 7.5,
  "energy": 6,
  "note": "Feeling good today"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "mood": 7,
    "stress": 4,
    "sleepHours": 7.5,
    "energy": 6,
    "note": "Feeling good today",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

#### `GET /checkins`

List check-ins with optional pagination and filters.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |
| `from` | ISO 8601 date | Filter from date |
| `to` | ISO 8601 date | Filter to date |
| `mood` | integer 1–10 | Filter by exact mood |

**Response `200`:**
```json
{
  "success": true,
  "data": [...],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

#### `GET /checkins/:id`

Get a single check-in by UUID.

---

#### `PUT /checkins/:id`

Update a check-in. Same body as `POST /checkins`. All fields required.

---

#### `DELETE /checkins/:id`

Soft-delete a check-in (sets `deleted_at`).

---

### Dashboard

#### `GET /dashboard`

Returns aggregated stats and a 7-day trend.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "avg_mood": "6.80",
      "avg_stress": "4.20",
      "avg_energy": "6.50",
      "avg_sleep": "7.10",
      "entries_this_week": "5",
      "total_entries": "42"
    },
    "weeklyTrend": [
      { "day": "2025-04-12", "avg_mood": "7.00", "avg_stress": "3.50", "avg_energy": "7.00", "entries": "2" }
    ]
  }
}
```

---

### Health Check

#### `GET /health`

```json
{ "success": true, "status": "ok", "timestamp": "..." }
```

---

## Security

| Concern | Approach |
|---|---|
| Passwords | bcrypt with 12 rounds |
| Sessions | Cryptographically random 96-hex-char token stored in HttpOnly cookie |
| SQL Injection | Parameterised queries throughout — no string interpolation |
| XSS | HttpOnly cookie; Helmet CSP headers |
| CSRF | SameSite=Strict cookie policy |
| Brute-force | express-rate-limit on `/auth/login` (10 attempts / 15 min) |
| Timing attacks | Dummy hash comparison on login even when user not found |
| Input | express-validator on every route |
| Headers | helmet sets HSTS, X-Frame-Options, etc. |

---

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_SECURE=true` (requires HTTPS)
- [ ] Set `DB_SSL=true` with a valid certificate
- [ ] Use a strong, random `SESSION_SECRET` (≥ 64 chars)
- [ ] Put the app behind a reverse proxy (nginx / Caddy)
- [ ] Set up log aggregation (e.g. Winston + Datadog)
- [ ] Enable automatic session cleanup cron:
  ```sql
  DELETE FROM sessions WHERE expires_at < NOW();
  ```
- [ ] Add database backups
- [ ] Set `ALLOWED_ORIGINS` to your frontend domain

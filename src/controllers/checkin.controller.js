'use strict';

const { query } = require('../db/pool');

// ── POST /checkins ─────────────────────────────────────────────────────────────

async function createCheckin(req, res, next) {
  try {
    const { mood, stress, sleepHours, energy, note } = req.body;
    const userId = req.user.id;

    const { rows } = await query(
      `INSERT INTO checkins (user_id, mood, stress, sleep_hours, energy, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, mood, stress, sleep_hours, energy, note, created_at, updated_at`,
      [userId, mood, stress, sleepHours, energy, note || null],
    );

    return res.status(201).json({
      success: true,
      message: 'Check-in created',
      data: formatCheckin(rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /checkins ──────────────────────────────────────────────────────────────

async function listCheckins(req, res, next) {
  try {
    const userId = req.user.id;
    const page  = req.query.page  || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;

    // Optional filters
    const conditions = ['user_id = $1', 'deleted_at IS NULL'];
    const params = [userId];
    let idx = 2;

    if (req.query.from) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(req.query.from);
    }
    if (req.query.to) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(req.query.to);
    }
    if (req.query.mood) {
      conditions.push(`mood = $${idx++}`);
      params.push(req.query.mood);
    }

    const where = conditions.join(' AND ');

    // Total count for pagination meta
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM checkins WHERE ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Paginated data
    params.push(limit, offset);
    const { rows } = await query(
      `SELECT id, mood, stress, sleep_hours, energy, note, created_at, updated_at
       FROM   checkins
       WHERE  ${where}
       ORDER  BY created_at DESC
       LIMIT  $${idx++} OFFSET $${idx++}`,
      params,
    );

    return res.status(200).json({
      success: true,
      data: rows.map(formatCheckin),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /checkins/:id ──────────────────────────────────────────────────────────

async function getCheckin(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, mood, stress, sleep_hours, energy, note, created_at, updated_at
       FROM   checkins
       WHERE  id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Check-in not found' });
    }

    return res.status(200).json({ success: true, data: formatCheckin(rows[0]) });
  } catch (err) {
    next(err);
  }
}

// ── PUT /checkins/:id ──────────────────────────────────────────────────────────

async function updateCheckin(req, res, next) {
  try {
    const { mood, stress, sleepHours, energy, note } = req.body;

    const { rows } = await query(
      `UPDATE checkins
       SET    mood = $1, stress = $2, sleep_hours = $3, energy = $4, note = $5
       WHERE  id = $6 AND user_id = $7 AND deleted_at IS NULL
       RETURNING id, mood, stress, sleep_hours, energy, note, created_at, updated_at`,
      [mood, stress, sleepHours, energy, note ?? null, req.params.id, req.user.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Check-in not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Check-in updated',
      data: formatCheckin(rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /checkins/:id (soft delete) ────────────────────────────────────────

async function deleteCheckin(req, res, next) {
  try {
    const { rowCount } = await query(
      `UPDATE checkins
       SET    deleted_at = NOW()
       WHERE  id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.user.id],
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Check-in not found' });
    }

    return res.status(200).json({ success: true, message: 'Check-in deleted' });
  } catch (err) {
    next(err);
  }
}

// ── GET /dashboard ─────────────────────────────────────────────────────────────

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    const { rows } = await query(
      `SELECT
         ROUND(AVG(mood)::numeric,   2) AS avg_mood,
         ROUND(AVG(stress)::numeric, 2) AS avg_stress,
         ROUND(AVG(energy)::numeric, 2) AS avg_energy,
         ROUND(AVG(sleep_hours)::numeric, 2) AS avg_sleep,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS entries_this_week,
         COUNT(*) AS total_entries
       FROM checkins
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    // Last 7 days trend (daily average mood)
    const { rows: trend } = await query(
      `SELECT
         DATE(created_at AT TIME ZONE 'UTC') AS day,
         ROUND(AVG(mood)::numeric,   2) AS avg_mood,
         ROUND(AVG(stress)::numeric, 2) AS avg_stress,
         ROUND(AVG(energy)::numeric, 2) AS avg_energy,
         COUNT(*) AS entries
       FROM checkins
       WHERE user_id = $1
         AND deleted_at IS NULL
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY day
       ORDER BY day ASC`,
      [userId],
    );

    return res.status(200).json({
      success: true,
      data: {
        summary: rows[0],
        weeklyTrend: trend,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function formatCheckin(row) {
  return {
    id:         row.id,
    mood:       row.mood,
    stress:     row.stress,
    sleepHours: parseFloat(row.sleep_hours),
    energy:     row.energy,
    note:       row.note,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

module.exports = { createCheckin, listCheckins, getCheckin, updateCheckin, deleteCheckin, getDashboard };

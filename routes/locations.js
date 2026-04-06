/**
 * HTTP handlers for states and testing locations.
 *
 * WHY separate aggregates in SQL: the map needs counts and pass rates per pin
 * without issuing one request per location (avoids N+1 latency on mobile).
 */

const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

/**
 * GET /api/states
 * Returns all jurisdictions for dropdowns on the homepage, map, quiz, and handbook.
 */
router.get('/states', (req, res) => {
  try {
    const rows = db.prepare(`SELECT id, code, name, dmv_name, handbook_url, test_question_count, passing_score FROM states ORDER BY name`).all();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load states' });
  }
});

/**
 * GET /api/locations?state=XX
 * Lists every exam location in a state plus community stats for map popups.
 */
router.get('/locations', (req, res) => {
  const code = (req.query.state || '').toUpperCase().trim();
  if (!code) {
    return res.status(400).json({ error: 'Missing state query parameter' });
  }
  try {
    const sql = `
      SELECT
        l.id,
        l.state_id,
        l.name,
        l.address,
        l.city,
        l.lat,
        l.lng,
        l.hours,
        l.phone,
        COUNT(r.id) AS route_count,
        ROUND(
          100.0 * SUM(CASE WHEN r.result = 'pass' THEN 1 ELSE 0 END) / NULLIF(COUNT(r.id), 0)
        ) AS pass_rate
      FROM locations l
      JOIN states s ON s.id = l.state_id
      LEFT JOIN routes r ON r.location_id = l.id
      WHERE s.code = ?
      GROUP BY l.id
      ORDER BY l.city, l.name
    `;
    const rows = db.prepare(sql).all(code);
    const normalized = rows.map((row) => ({
      ...row,
      route_count: row.route_count ?? 0,
      pass_rate: row.pass_rate == null ? null : Number(row.pass_rate),
    }));
    res.json(normalized);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load locations' });
  }
});

/**
 * GET /api/locations/:id
 * Single location for page titles and centering the route viewer map.
 */
router.get('/locations/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid location id' });
  }
  try {
    const row = db.prepare(`
      SELECT l.*, s.code AS state_code, s.name AS state_name, s.dmv_name
      FROM locations l
      JOIN states s ON s.id = l.state_id
      WHERE l.id = ?
    `).get(id);
    if (!row) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(row);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load location' });
  }
});

module.exports = router;

/**
 * Community route submissions and upvotes.
 *
 * WHY store GeoJSON as TEXT: SQLite has no native geometry type; we validate JSON
 * on write and parse on read so Leaflet can consume Feature geometry client-side.
 */

const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

/**
 * Parse stored GeoJSON safely for API consumers.
 */
function parseGeoJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Accepts Leaflet.Draw output (Feature or LineString) for storage validation.
 */
function isValidRouteGeoJson(o) {
  if (!o || typeof o !== 'object') return false;
  if (o.type === 'LineString') return Array.isArray(o.coordinates);
  if (o.type === 'Feature' && o.geometry && o.geometry.type === 'LineString') {
    return Array.isArray(o.geometry.coordinates);
  }
  return false;
}

/**
 * POST /api/routes/:routeId/vote — registered before /:locationId POST so paths stay unambiguous.
 * Body: { voter_id: string, vote: 'up' | 'down' }
 * Toggling the same vote twice removes it (one-vote-per-voter, changeable).
 * WHY voter_id from client: no auth in this MVP; we issue a UUID via localStorage so
 * votes persist across page reloads without requiring login.
 */
router.post('/:routeId/vote', express.json(), (req, res) => {
  const routeId = Number(req.params.routeId);
  if (!Number.isInteger(routeId) || routeId < 1) {
    return res.status(400).json({ error: 'Invalid route id' });
  }
  const { voter_id, vote } = req.body || {};
  if (!voter_id || typeof voter_id !== 'string' || voter_id.length > 128) {
    return res.status(400).json({ error: 'voter_id is required' });
  }
  if (vote !== 'up' && vote !== 'down') {
    return res.status(400).json({ error: 'vote must be "up" or "down"' });
  }

  try {
    const existing = db.prepare(`SELECT vote FROM route_votes WHERE route_id = ? AND voter_id = ?`).get(routeId, voter_id);

    // WHY transaction: counts on routes and the votes log must stay in sync atomically.
    db.transaction(() => {
      if (!existing) {
        // First vote from this user
        db.prepare(`INSERT INTO route_votes (route_id, voter_id, vote) VALUES (?, ?, ?)`).run(routeId, voter_id, vote);
        db.prepare(`UPDATE routes SET thumbs_${vote} = thumbs_${vote} + 1 WHERE id = ?`).run(routeId);
      } else if (existing.vote === vote) {
        // Same vote again — remove it (toggle off)
        db.prepare(`DELETE FROM route_votes WHERE route_id = ? AND voter_id = ?`).run(routeId, voter_id);
        db.prepare(`UPDATE routes SET thumbs_${vote} = MAX(0, thumbs_${vote} - 1) WHERE id = ?`).run(routeId);
      } else {
        // Changed vote — swap counts
        db.prepare(`UPDATE route_votes SET vote = ? WHERE route_id = ? AND voter_id = ?`).run(vote, routeId, voter_id);
        db.prepare(`UPDATE routes SET thumbs_${existing.vote} = MAX(0, thumbs_${existing.vote} - 1), thumbs_${vote} = thumbs_${vote} + 1 WHERE id = ?`).run(routeId);
      }
    })();

    const after = db.prepare(`SELECT thumbs_up, thumbs_down FROM routes WHERE id = ?`).get(routeId);
    const userVote = db.prepare(`SELECT vote FROM route_votes WHERE route_id = ? AND voter_id = ?`).get(routeId, voter_id);
    if (!after) return res.status(404).json({ error: 'Route not found' });

    res.json({ thumbs_up: after.thumbs_up, thumbs_down: after.thumbs_down, user_vote: userVote?.vote ?? null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save vote' });
  }
});

/**
 * GET /api/routes/:locationId?sort=recent|upvotes|passes
 * Returns all community routes for one BMV location, ordered for the sidebar filters.
 */
router.get('/:locationId', (req, res) => {
  const locationId = Number(req.params.locationId);
  if (!Number.isInteger(locationId) || locationId < 1) {
    return res.status(400).json({ error: 'Invalid location id' });
  }
  const sort = (req.query.sort || 'recent').toLowerCase();
  const loc = db.prepare(`SELECT id FROM locations WHERE id = ?`).get(locationId);
  if (!loc) {
    return res.status(404).json({ error: 'Location not found' });
  }

  let orderSql = 'ORDER BY r.date_taken DESC, r.id DESC';
  let where = 'r.location_id = ?';
  const params = [locationId];

  if (sort === 'upvotes') {
    orderSql = 'ORDER BY r.thumbs_up DESC, r.date_taken DESC, r.id DESC';
  } else if (sort === 'passes') {
    where += " AND r.result = 'pass'";
  } else if (sort !== 'recent') {
    return res.status(400).json({ error: 'Invalid sort parameter' });
  }

  try {
    const rows = db.prepare(`
      SELECT r.id, r.location_id, r.result, r.route_geojson, r.description, r.tips, r.date_taken, r.thumbs_up, r.thumbs_down, r.created_at
      FROM routes r
      WHERE ${where}
      ${orderSql}
    `).all(...params);

    const payload = rows.map((r) => ({
      id: r.id,
      location_id: r.location_id,
      result: r.result,
      route_geojson: parseGeoJson(r.route_geojson),
      description: r.description,
      tips: r.tips,
      date_taken: r.date_taken,
      thumbs_up: r.thumbs_up ?? 0,
      thumbs_down: r.thumbs_down ?? 0,
      created_at: r.created_at,
    }));

    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load routes' });
  }
});

/**
 * POST /api/routes/:locationId
 * Persists a drawn route plus narrative fields from the submit form.
 */
router.post('/:locationId', express.json({ limit: '2mb' }), (req, res) => {
  const locationId = Number(req.params.locationId);
  if (!Number.isInteger(locationId) || locationId < 1) {
    return res.status(400).json({ error: 'Invalid location id' });
  }
  const loc = db.prepare(`SELECT id FROM locations WHERE id = ?`).get(locationId);
  if (!loc) {
    return res.status(404).json({ error: 'Location not found' });
  }

  const { result, route_geojson, description, tips, date_taken } = req.body || {};
  if (result !== 'pass' && result !== 'fail') {
    return res.status(400).json({ error: 'result must be pass or fail' });
  }
  if (!route_geojson) {
    return res.status(400).json({ error: 'route_geojson is required' });
  }
  const geoStr = typeof route_geojson === 'string' ? route_geojson : JSON.stringify(route_geojson);
  let parsed;
  try {
    parsed = JSON.parse(geoStr);
  } catch {
    return res.status(400).json({ error: 'route_geojson must be valid JSON' });
  }
  if (!isValidRouteGeoJson(parsed)) {
    return res.status(400).json({ error: 'route_geojson must be a LineString (or Feature containing one)' });
  }
  /** Description is optional for submitters; empty values store as '' so NOT NULL stays satisfied. */
  const descriptionStored = description != null && String(description).trim() !== '' ? String(description).trim() : '';
  if (!date_taken) {
    return res.status(400).json({ error: 'date_taken is required' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO routes (location_id, result, route_geojson, description, tips, date_taken, upvotes)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(locationId, result, geoStr, descriptionStored, tips ? String(tips).trim() : null, String(date_taken).trim());

    const row = db.prepare(`SELECT * FROM routes WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json({
      ...row,
      route_geojson: parseGeoJson(row.route_geojson),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save route' });
  }
});

module.exports = router;

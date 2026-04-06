/**
 * Driver handbook chapter summaries by state.
 *
 * WHY summaries in DB: lets the accordion stay data-driven when more states are added later
 * without redeploying static HTML.
 */

const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

/**
 * GET /api/handbook/:stateCode
 * Returns official handbook link plus chapter blurbs for the accordion UI.
 */
router.get('/:stateCode', (req, res) => {
  const code = (req.params.stateCode || '').toUpperCase().trim();
  if (!code) {
    return res.status(400).json({ error: 'Invalid state code' });
  }
  try {
    const state = db.prepare(`
      SELECT id, code, name, dmv_name, handbook_url
      FROM states WHERE code = ?
    `).get(code);
    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }
    const chapters = db.prepare(`
      SELECT id, chapter_number, title, summary, official_url
      FROM handbook_chapters
      WHERE state_id = ?
      ORDER BY chapter_number
    `).all(state.id);

    res.json({ state, chapters });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load handbook' });
  }
});

module.exports = router;

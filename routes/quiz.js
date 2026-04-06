/**
 * Permit practice test API.
 *
 * WHY return correct_answer in the payload: the original spec lists only GET /api/quiz/:stateCode.
 * A production app would split grading to the server to hide answers; here we document the tradeoff
 * so teens get instant feedback offline-friendly for a local demo.
 */

const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

/**
 * GET /api/quiz/:stateCode
 * Returns a shuffled exam-sized question set for the state's knowledge test format.
 */
router.get('/:stateCode', (req, res) => {
  const code = (req.params.stateCode || '').toUpperCase().trim();
  if (!code) {
    return res.status(400).json({ error: 'Invalid state code' });
  }
  try {
    const state = db.prepare(`
      SELECT id, code, name, dmv_name, test_question_count, passing_score
      FROM states WHERE code = ?
    `).get(code);
    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }
    const limit = Math.max(1, Math.min(state.test_question_count || 40, 200));
    const questions = db.prepare(`
      SELECT id, state_id, question, option_a, option_b, option_c, option_d,
             correct_answer, explanation, category
      FROM questions
      WHERE state_id = ?
      ORDER BY RANDOM()
      LIMIT ?
    `).all(state.id, limit);

    res.json({
      state,
      questions,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load quiz' });
  }
});

module.exports = router;

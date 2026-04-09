/**
 * DriveReady HTTP server — Express serves the API and static front-end assets.
 *
 * WHY one process: keeps deployment simple for students; SQLite file lives beside the app.
 */

require('dotenv').config();
const path = require('path');
const express = require('express');

// WHY: check for a missing or stale seed on every boot.
// Railway and similar platforms use ephemeral filesystems — the SQLite file is
// created fresh on every deploy. We also re-seed when question count is low
// (< 1000) so that deploys after new state question batches are added will
// automatically pick up the fresh data without a manual step.
const { db } = require('./db/database');
const stateCount = db.prepare('SELECT COUNT(*) AS n FROM states').get().n;
const questionCount = db.prepare('SELECT COUNT(*) AS n FROM questions').get().n;
if (stateCount === 0 || questionCount < 1000) {
  console.log(`Stale or empty database detected (${questionCount} questions) — running seed...`);
  require('./db/seed');
}

const locationsRouter = require('./routes/locations');
const routesRouter = require('./routes/routes');
const quizRouter = require('./routes/quiz');
const handbookRouter = require('./routes/handbook');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * JSON bodies for route submissions can include long GeoJSON strings.
 * Limit stays modest to reduce abuse on shared classroom machines.
 */
app.use(express.json({ limit: '2mb' }));

/**
 * Contract: browser pages call same-origin /api/* — no CORS needed for MVP.
 */
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Mount feature routers under predictable URL prefixes for the vanilla JS clients.
 */
app.use('/api', locationsRouter);
app.use('/api/routes', routesRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/handbook', handbookRouter);

/**
 * SPA-style fallback not required — each page is its own HTML file.
 */

const server = app.listen(PORT, () => {
  console.log(`DriveReady listening on http://localhost:${PORT}`);
});

/**
 * WHY handle listen errors: a stray `node server.js` (or another app) on the same port
 * otherwise throws an unhandled "EADDRINUSE" and confuses first-time runs.
 */
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the other process (e.g. \`lsof -i :${PORT}\` then kill that PID) or run with PORT=3001 node server.js`
    );
    process.exit(1);
  }
  throw err;
});

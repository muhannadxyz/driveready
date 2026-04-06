/**
 * DriveReady SQLite access layer (better-sqlite3).
 *
 * We use a single shared Database instance because better-sqlite3 is synchronous
 * and Express handles one request at a time per process efficiently for this app's scale.
 * The WHY: predictable file-based storage with zero external services for local/dev use.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'driveready.db');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Apply schema once at startup. Idempotent via IF NOT EXISTS so deploys and tests
 * can re-run server.js without manual migrations for this MVP.
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS states (
      id INTEGER PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      dmv_name TEXT NOT NULL,
      handbook_url TEXT,
      test_question_count INTEGER,
      passing_score INTEGER
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY,
      state_id INTEGER REFERENCES states(id),
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      hours TEXT,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY,
      location_id INTEGER REFERENCES locations(id),
      result TEXT NOT NULL,
      route_geojson TEXT NOT NULL,
      description TEXT NOT NULL,
      tips TEXT,
      date_taken DATE NOT NULL,
      upvotes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      state_id INTEGER REFERENCES states(id),
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS handbook_chapters (
      id INTEGER PRIMARY KEY,
      state_id INTEGER REFERENCES states(id),
      chapter_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      official_url TEXT
    );

    CREATE TABLE IF NOT EXISTS route_votes (
      route_id INTEGER NOT NULL REFERENCES routes(id),
      voter_id TEXT NOT NULL,
      vote     TEXT NOT NULL CHECK(vote IN ('up','down')),
      PRIMARY KEY (route_id, voter_id)
    );

    CREATE INDEX IF NOT EXISTS idx_locations_state ON locations(state_id);
    CREATE INDEX IF NOT EXISTS idx_routes_location ON routes(location_id);
    CREATE INDEX IF NOT EXISTS idx_questions_state ON questions(state_id);
    CREATE INDEX IF NOT EXISTS idx_handbook_state ON handbook_chapters(state_id);
    CREATE INDEX IF NOT EXISTS idx_route_votes_route ON route_votes(route_id);
  `);

  // WHY ALTER TABLE guard: these columns may not exist on older DB files that were
  // created before this feature was added. SQLite has no ADD COLUMN IF NOT EXISTS,
  // so we swallow the "duplicate column" error instead.
  for (const col of ['thumbs_up INTEGER DEFAULT 0', 'thumbs_down INTEGER DEFAULT 0']) {
    try { db.exec(`ALTER TABLE routes ADD COLUMN ${col}`); } catch { /* already exists */ }
  }
}

initSchema();

module.exports = { db, initSchema };

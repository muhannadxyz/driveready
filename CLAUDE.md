# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

DriveReady is a community-powered web app that helps teens prepare for their driver's license. Two problems it solves:
1. **Permit (temps) test** — state-specific practice questions with explanations
2. **Road test** — crowdsourced routes drawn on a map by past test-takers so future teens can practice the exact route at their specific BMV/DMV location

## Commands

```bash
npm install          # install dependencies
npm run seed         # wipe and re-seed the SQLite database with demo data
npm start            # production: node server.js
npm run dev          # development: nodemon server.js (auto-restart on changes)
```

There are no tests or linting scripts configured.

If port 3000 is already in use: `PORT=3001 node server.js`

## Architecture

DriveReady is a teen driver's license prep platform. Single-process Express app serving both a REST API (`/api/*`) and static front-end assets from `public/`. No build step — vanilla JS in the browser, no framework.

**Data layer:** `better-sqlite3` (synchronous). One shared `db` instance exported from `db/database.js`, which also runs `initSchema()` on startup (idempotent `CREATE TABLE IF NOT EXISTS`). The SQLite file lives at `data/driveready.db` (or `$DB_PATH`).

**Seeding:** `db/seed.js` (run via `npm run seed`) wipes all tables and re-inserts. Currently only Ohio has full content (questions, locations, handbook chapters). All 50 states exist in the `states` table for dropdowns.

**API routes** (all mounted under `/api` in `server.js`):

| Router file | Mount | Key endpoints |
|---|---|---|
| `routes/locations.js` | `/api` | `GET /states`, `GET /locations?state=XX`, `GET /locations/:id` |
| `routes/routes.js` | `/api/routes` | `GET /:locationId?sort=recent\|upvotes\|passes`, `POST /:locationId`, `POST /:routeId/upvote` |
| `routes/quiz.js` | `/api/quiz` | `GET /:stateCode` — returns shuffled questions sized to that state's exam |
| `routes/handbook.js` | `/api/handbook` | `GET /:stateCode` — returns state metadata + ordered chapters |

**Front-end pages** (`public/*.html` + `public/js/*.js`): each page is standalone HTML (no SPA router). Pages fetch from `/api/*` on load. Shared utilities live in `public/js/common.js`. Map pages use Leaflet.js; route drawing uses Leaflet.Draw and submits GeoJSON LineStrings to `POST /api/routes/:locationId`.

**GeoJSON storage:** routes are stored as TEXT in SQLite (`route_geojson` column). The API accepts either a bare `LineString` or a `Feature` wrapping one (Leaflet.Draw output), validates it in `isValidRouteGeoJson`, and returns it parsed back to JSON.

## Coding Preferences

- **Vanilla JS only** — no React, Vue, or any frontend framework
- **Tailwind CSS via CDN** — loaded in each HTML file's `<head>`, not npm
- **Heavily commented code** — every function needs a comment explaining the WHY, not just what it does:

```js
// WHY: browser fetch() rejects only on network failure, not HTTP error status,
// so we must check res.ok manually to surface API errors to the user.
async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
```

# DriveReady

A community-powered web app that helps teens prepare for their driver's license.

**Two things it solves:**
1. **Permit (temps) test** — state-specific practice questions with explanations *(coming soon for all states)*
2. **Road test** — crowdsourced routes drawn on a map by past test-takers, so future teens can practice the exact route at their specific BMV/DMV location

---

## Features

- Find your BMV or DMV on an interactive map
- View community-submitted road test routes with step-by-step direction summaries
- Submit your own route after your test to help others
- Thumbs up / thumbs down voting on routes (one vote per browser)
- State driver's handbook links

---

## Tech stack

- **Backend:** Node.js + Express
- **Database:** SQLite via `better-sqlite3` (single file, zero config)
- **Frontend:** Vanilla JS, no framework
- **Maps:** Leaflet.js + Leaflet.Draw + OpenStreetMap tiles
- **Styles:** Tailwind CSS via CDN

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Seed the database with demo data (Ohio locations + questions)
npm run seed

# 3. Start the dev server (auto-restarts on file changes)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> If port 3000 is in use: `PORT=3001 node server.js`

---

## Project structure

```
server.js          # Express entry point
routes/
  locations.js     # GET /api/states, /api/locations
  routes.js        # GET/POST /api/routes, voting
  quiz.js          # GET /api/quiz/:stateCode
  handbook.js      # GET /api/handbook/:stateCode
db/
  database.js      # SQLite connection + schema init
  seed.js          # Wipe & re-seed demo data
public/
  *.html           # One HTML file per page
  js/              # Per-page vanilla JS + common.js
  favicon.svg
```

---

## Contributing

Pull requests are welcome! A few things to know:

- Vanilla JS only on the frontend — no React/Vue
- Every function needs a comment explaining the **why**, not just the what
- Only Ohio has full content (questions + locations) right now — adding other states is a great first contribution
- The SQLite database file is excluded from the repo; run `npm run seed` to create it locally

---

## License

MIT

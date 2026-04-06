/**
 * Per-location route viewer: overlays community LineStrings and lists metadata + votes.
 *
 * WHY refetch on sort: keeps ordering identical to server rules and avoids duplicating SQL in the browser.
 */

(function () {
  const { initNav, initFooter } = window.DriveReadyCommon;

  const ROUTE_STYLE = { color: '#ef4444', weight: 4, opacity: 0.9 };

  let map;
  let routeLayers = [];
  let currentSort = 'recent';
  let locationId;

  /**
   * Reads locationId from the query string — primary entry from map popups.
   */
  function getLocationIdFromQuery() {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('locationId');
    return id ? parseInt(id, 10) : NaN;
  }

  // ── Waypoint icons ────────────────────────────────────────────────────────

  /**
   * Numbered circle icon for each plotted point on the route.
   * WHY green for 1, red for the rest: green = "go from here", red matches the route line color.
   */
  function waypointIcon(n) {
    const bg = n === 1 ? '#16a34a' : '#ef4444';
    return L.divIcon({
      className: '',
      html: `<div style="background:${bg};color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)">${n}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
  }

  /**
   * Extracts coordinate array ([[lng,lat]…]) from a GeoJSON Feature or LineString.
   */
  function getCoords(geo) {
    if (!geo) return null;
    if (geo.type === 'Feature') return geo.geometry?.coordinates ?? null;
    if (geo.type === 'LineString') return geo.coordinates ?? null;
    return null;
  }

  // ── Route summary helpers ─────────────────────────────────────────────────

  function toRad(deg) { return deg * Math.PI / 180; }

  /**
   * Compass bearing in degrees (0–360) from coord c1 to c2 ([lng, lat] pairs).
   */
  function bearing(c1, c2) {
    const lat1 = toRad(c1[1]), lat2 = toRad(c2[1]);
    const dLng = toRad(c2[0] - c1[0]);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  function bearingToCardinal(b) {
    return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(b / 45) % 8];
  }

  /**
   * Distance in metres between two [lng, lat] coords (Haversine).
   */
  function distanceMeters(c1, c2) {
    const R = 6371000;
    const dLat = toRad(c2[1] - c1[1]);
    const dLng = toRad(c2[0] - c1[0]);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(c1[1])) * Math.cos(toRad(c2[1])) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDist(m) {
    const ft = m * 3.28084;
    return ft < 500 ? `${Math.round(ft / 10) * 10} ft` : `${(ft / 5280).toFixed(1)} mi`;
  }

  /**
   * Returns 'left', 'right', 'U-turn', or null (straight) based on change in heading.
   * WHY: lets us write human-readable "turn right" instead of just repeating the cardinal.
   */
  function turnLabel(prevB, nextB) {
    const diff = ((nextB - prevB) + 360) % 360;
    if (diff < 25 || diff > 335) return null;
    if (diff <= 170) return 'Turn right';
    if (diff >= 190) return 'Turn left';
    return 'U-turn';
  }

  /**
   * Builds an array of human-readable step strings from a coordinate list.
   * Each step covers the segment FROM point n TO point n+1.
   */
  function buildSummary(coords) {
    if (!coords || coords.length < 2) return [];
    const steps = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const b = bearing(coords[i], coords[i + 1]);
      const dir = bearingToCardinal(b);
      const dist = formatDist(distanceMeters(coords[i], coords[i + 1]));
      if (i === 0) {
        steps.push(`Head ${dir} for ${dist}`);
      } else {
        const prevB = bearing(coords[i - 1], coords[i]);
        const turn = turnLabel(prevB, b);
        steps.push(turn ? `${turn}, head ${dir} for ${dist}` : `Continue ${dir} for ${dist}`);
      }
    }
    steps.push('Arrive at end');
    return steps;
  }

  // ── Map layer management ──────────────────────────────────────────────────

  /**
   * Adds a route polyline plus numbered waypoint markers for every plotted point.
   * WHY numbered markers: makes it easy to follow the route step-by-step using
   * the matching numbered list in the sidebar card.
   */
  function addRouteLayer(geo) {
    if (!geo) return;
    const layer = L.geoJSON(geo, { style: () => ROUTE_STYLE });
    layer.addTo(map);
    routeLayers.push(layer);

    const coords = getCoords(geo);
    if (!coords) return;
    coords.forEach((c, i) => {
      const marker = L.marker([c[1], c[0]], { icon: waypointIcon(i + 1) }).addTo(map);
      routeLayers.push(marker);
    });
  }

  /**
   * Clears prior overlays before re-rendering filtered lists.
   */
  function clearRouteLayers() {
    for (const l of routeLayers) map.removeLayer(l);
    routeLayers = [];
  }

  /**
   * Fits every route into view so first paint shows full context.
   */
  function fitAllRoutes(routes) {
    const bounds = L.latLngBounds([]);
    let any = false;
    for (const r of routes) {
      const g = r.route_geojson;
      if (!g) continue;
      L.geoJSON(g, { style: () => ROUTE_STYLE }).eachLayer((ly) => {
        const b = ly.getBounds?.();
        if (b && b.isValid()) { bounds.extend(b); any = true; }
      });
    }
    if (any) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }

  // ── Voting helpers ────────────────────────────────────────────────────────

  function getVoterId() {
    let id = localStorage.getItem('dr_voter_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('dr_voter_id', id); }
    return id;
  }

  function getLocalVote(routeId) {
    try { return JSON.parse(localStorage.getItem('dr_votes') || '{}')[routeId] ?? null; }
    catch { return null; }
  }

  function setLocalVote(routeId, vote) {
    try {
      const votes = JSON.parse(localStorage.getItem('dr_votes') || '{}');
      if (vote === null) delete votes[routeId]; else votes[routeId] = vote;
      localStorage.setItem('dr_votes', JSON.stringify(votes));
    } catch { /* storage full — non-fatal */ }
  }

  // ── Card rendering ────────────────────────────────────────────────────────

  /**
   * Renders sidebar cards. Each card includes:
   *  - Pass/Fail badge + date
   *  - Description / tips
   *  - Numbered step-by-step summary matching the map waypoint numbers
   *  - Thumbs up / down vote buttons
   */
  function renderCards(routes) {
    const container = document.getElementById('route-cards');
    container.innerHTML = '';
    if (!routes.length) {
      container.innerHTML = '<p class="text-slate-500 text-sm">No routes yet — be the first to submit one for this site.</p>';
      return;
    }

    for (const r of routes) {
      const card = document.createElement('article');
      card.className = 'rounded-xl border border-slate-200 p-4 shadow-sm';
      const pass = r.result === 'pass';
      const userVote = getLocalVote(String(r.id));
      const upActive   = userVote === 'up';
      const downActive = userVote === 'down';

      // Build step summary from stored GeoJSON
      const coords = getCoords(r.route_geojson);
      const steps  = buildSummary(coords);
      const stepsHtml = steps.length
        ? `<ol class="mt-2 space-y-0.5 text-xs text-slate-600 list-none pl-0">
            ${steps.map((s, i) => `
              <li class="flex gap-2 items-baseline">
                <span class="shrink-0 inline-flex items-center justify-center rounded-full w-5 h-5 text-white font-bold text-[10px] ${i === 0 ? 'bg-emerald-600' : i === steps.length - 1 ? 'bg-slate-400' : 'bg-red-500'}">${i === steps.length - 1 ? '★' : i + 1}</span>
                <span>${escapeHtml(s)}</span>
              </li>`).join('')}
           </ol>`
        : '';

      card.innerHTML = `
        <div class="flex justify-between items-start gap-2 mb-2">
          <span class="text-xs font-medium uppercase tracking-wide ${pass ? 'text-emerald-600' : 'text-amber-700'}">${pass ? 'Pass' : 'Fail'}</span>
          <time class="text-xs text-slate-500" datetime="${r.date_taken}">${escapeHtml(r.date_taken)}</time>
        </div>
        <p class="text-sm text-slate-800 whitespace-pre-wrap">${r.description && String(r.description).trim() ? escapeHtml(r.description) : '<span class="text-slate-500 italic">No written description — the map line still helps others.</span>'}</p>
        ${r.tips ? `<p class="text-sm text-slate-600 mt-2"><strong class="text-slate-700">Tips:</strong> ${escapeHtml(r.tips)}</p>` : ''}
        ${stepsHtml ? `
        <details class="mt-3">
          <summary class="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800 select-none">Route steps (${steps.length - 1} segments)</summary>
          ${stepsHtml}
        </details>` : ''}
        <div class="mt-3 flex items-center gap-3">
          <button type="button" class="vote-btn inline-flex items-center gap-1 text-sm font-medium rounded-full px-3 py-1 border transition
            ${upActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-500 hover:text-emerald-700'}"
            data-route-id="${r.id}" data-vote="up">
            👍 <span class="vote-up-count">${r.thumbs_up}</span>
          </button>
          <button type="button" class="vote-btn inline-flex items-center gap-1 text-sm font-medium rounded-full px-3 py-1 border transition
            ${downActive ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-300 hover:border-rose-400 hover:text-rose-600'}"
            data-route-id="${r.id}" data-vote="down">
            👎 <span class="vote-down-count">${r.thumbs_down}</span>
          </button>
        </div>
      `;
      container.appendChild(card);
    }

    container.querySelectorAll('.vote-btn').forEach((btn) => {
      btn.addEventListener('click', () => castVote(String(btn.dataset.routeId), btn.dataset.vote, btn.closest('article')));
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  }

  /**
   * POSTs a vote and refreshes the button state from the server response.
   */
  async function castVote(routeId, vote, card) {
    try {
      const res = await fetch(`/api/routes/${encodeURIComponent(routeId)}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: getVoterId(), vote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'vote');
      setLocalVote(routeId, data.user_vote);
      card.querySelector('.vote-up-count').textContent   = data.thumbs_up;
      card.querySelector('.vote-down-count').textContent = data.thumbs_down;
      const upBtn   = card.querySelector('[data-vote="up"]');
      const downBtn = card.querySelector('[data-vote="down"]');
      upBtn.className   = upBtn.className.replace(/bg-emerald-600 text-white border-emerald-600|bg-white text-slate-600 border-slate-300 hover:border-emerald-500 hover:text-emerald-700/, data.user_vote === 'up'   ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-500 hover:text-emerald-700');
      downBtn.className = downBtn.className.replace(/bg-rose-600 text-white border-rose-600|bg-white text-slate-600 border-slate-300 hover:border-rose-400 hover:text-rose-600/, data.user_vote === 'down' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-300 hover:border-rose-400 hover:text-rose-600');
    } catch {
      alert('Could not save vote.');
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  /**
   * Loads location header + routes, redraws map and list.
   */
  async function loadAll() {
    const resLoc = await fetch(`/api/locations/${locationId}`);
    if (!resLoc.ok) { document.querySelector('#loc-header h1').textContent = 'Location not found'; return; }
    const loc = await resLoc.json();
    document.querySelector('#loc-header h1').textContent = loc.name;
    document.getElementById('loc-sub').textContent = `${loc.address}, ${loc.city} · ${loc.dmv_name}`;
    document.getElementById('loc-submit-link').href = `/submit.html?state=${encodeURIComponent(loc.state_code)}`;

    const resRoutes = await fetch(`/api/routes/${encodeURIComponent(locationId)}?sort=${encodeURIComponent(currentSort)}`);
    if (!resRoutes.ok) throw new Error('routes');
    const routes = await resRoutes.json();

    clearRouteLayers();
    for (const r of routes) addRouteLayer(r.route_geojson);
    fitAllRoutes(routes);
    renderCards(routes);
  }

  function updateSortButtons() {
    document.querySelectorAll('.sort-btn').forEach((btn) => {
      const on = btn.getAttribute('data-sort') === currentSort;
      btn.className = on
        ? 'sort-btn px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-600 text-white'
        : 'sort-btn px-3 py-1.5 rounded-full text-sm font-medium bg-slate-200 text-slate-800';
    });
  }

  initNav('map');
  initFooter();

  locationId = getLocationIdFromQuery();
  if (!Number.isInteger(locationId) || locationId < 1) {
    document.querySelector('#loc-header h1').textContent = 'Missing location';
    document.getElementById('route-cards').innerHTML = '<p class="text-sm text-slate-600">Open this page from the map\'s "View routes" button.</p>';
  } else {
    map = L.map('loc-map').setView([39.95, -82.94], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);

    document.querySelectorAll('.sort-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentSort = btn.getAttribute('data-sort') || 'recent';
        updateSortButtons();
        loadAll().catch(() => alert('Could not refresh routes.'));
      });
    });
    updateSortButtons();
    loadAll().catch(() => { document.querySelector('#loc-header h1').textContent = 'Error loading data'; });
  }
})();

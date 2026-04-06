/**
 * Leaflet map: loads aggregated location pins for the selected state.
 *
 * WHY fitBounds only when a state has pins: empty queries should not zoom the US away confusingly.
 */

(function () {
  const { initNav, initFooter, getQueryState } = window.DriveReadyCommon;

  /** US center — readable at a glance for "pick your state" workflows */
  const US_CENTER = [39.8, -98.5];
  const US_ZOOM = 4;

  let map;
  let markerLayer;

  /** All locations for the current state — kept in memory so search can filter without re-fetching. */
  let currentRows = [];

  /**
   * Initializes the map once; reuses the same instance when the state changes.
   */
  function ensureMap() {
    if (map) return;
    map = L.map('map').setView(US_CENTER, US_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
  }

  /**
   * Clears markers and draws one per API row with popup + deep link to route viewer.
   */
  function renderMarkers(rows) {
    markerLayer.clearLayers();
    const emptyEl = document.getElementById('map-empty');
    if (!rows.length) {
      emptyEl.classList.remove('hidden');
      map.setView(US_CENTER, US_ZOOM);
      return;
    }
    emptyEl.classList.add('hidden');
    const bounds = [];
    for (const loc of rows) {
      const rate =
        loc.pass_rate == null || Number.isNaN(loc.pass_rate)
          ? '—'
          : `${loc.pass_rate}%`;
      const popupHtml = `
        <div class="min-w-[200px]">
          <p class="font-semibold text-slate-900">${escapeHtml(loc.name)}</p>
          <p class="text-xs text-slate-600 mt-1">${escapeHtml(loc.address)}, ${escapeHtml(loc.city)}</p>
          <p class="text-xs mt-2"><strong>${loc.route_count}</strong> route(s) · Pass rate: <strong>${rate}</strong></p>
          <a class="mt-3 inline-block w-full text-center rounded-lg bg-emerald-600 text-white text-sm font-medium py-2 px-3 hover:bg-emerald-700"
             href="/location.html?locationId=${loc.id}">View routes</a>
        </div>
      `;
      const m = L.marker([loc.lat, loc.lng]).bindPopup(popupHtml);
      markerLayer.addLayer(m);
      bounds.push([loc.lat, loc.lng]);
    }
    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /**
   * Filters currentRows by the search box value and re-renders markers.
   * WHY: filtering in-memory avoids a round-trip to the server on every keystroke.
   */
  function applySearch() {
    const q = document.getElementById('map-search').value.trim().toLowerCase();
    if (!q) {
      renderMarkers(currentRows);
      return;
    }
    const filtered = currentRows.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.city.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q)
    );
    renderMarkers(filtered);
  }

  /**
   * Fetches locations for the dropdown value and refreshes markers.
   */
  async function loadState(code) {
    ensureMap();
    // WHY: clear search box when state changes so stale filter doesn't hide new pins.
    document.getElementById('map-search').value = '';
    if (!code) {
      currentRows = [];
      markerLayer.clearLayers();
      map.setView(US_CENTER, US_ZOOM);
      document.getElementById('map-empty').classList.add('hidden');
      return;
    }
    const res = await fetch(`/api/locations?state=${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error('locations');
    currentRows = await res.json();
    renderMarkers(currentRows);
  }

  initNav('map');
  initFooter();

  document.getElementById('map-search').addEventListener('input', applySearch);

  fetch('/api/states')
    .then((r) => r.json())
    .then((states) => {
      const sel = document.getElementById('map-state');
      for (const s of states) {
        const opt = document.createElement('option');
        opt.value = s.code;
        opt.textContent = `${s.name} (${s.code})`;
        sel.appendChild(opt);
      }
      const preset = getQueryState();
      if (preset) sel.value = preset;
      else sel.value = 'OH';

      sel.addEventListener('change', () => {
        loadState(sel.value).catch(() => alert('Could not load locations.'));
      });

      return loadState(sel.value);
    })
    .catch(() => alert('Could not load map data.'));
})();

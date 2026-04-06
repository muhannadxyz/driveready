/**
 * Route submission: Leaflet.Draw captures a red polyline; we POST GeoJSON + form fields.
 *
 * WHY Feature GeoJSON: Leaflet's toGeoJSON() wraps lines in a Feature, which our API accepts.
 */

(function () {
  const { initNav, initFooter, getQueryState } = window.DriveReadyCommon;

  let map;
  let drawnItems;
  let drawControl;
  let locationMarker; // WHY: track the BMV pin so we can remove it before placing a new one

  /**
   * Numbered circle icon matching what viewers see on the location page.
   * WHY green for 1: green = start, red matches the route line for all other points.
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
   * Creates the map, editable layer, and draw toolbar restricted to polylines.
   */
  function initMap() {
    map = L.map('submit-map').setView([39.95, -82.94], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
      draw: {
        polyline: {
          shapeOptions: {
            color: '#ef4444',
            weight: 5,
            opacity: 0.95,
          },
        },
        polygon: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      if (e.layerType === 'polyline') {
        layer.setStyle({ color: '#ef4444', weight: 5 });

        // WHY numbered markers: lets the submitter verify point order matches what
        // viewers will see on the location page before they submit.
        const latlngs = layer.getLatLngs();
        latlngs.forEach((pt, i) => {
          drawnItems.addLayer(L.marker([pt.lat, pt.lng], { icon: waypointIcon(i + 1) }));
        });
      }
      drawnItems.addLayer(layer);
    });
  }

  /**
   * Recenters on the chosen BMV and drops a pin so the user knows exactly which building to start from.
   * WHY replace: selecting a different location should move the pin, not stack multiple markers.
   */
  function focusLocation(loc) {
    if (!loc || !map) return;
    map.setView([loc.lat, loc.lng], 16);
    if (locationMarker) {
      map.removeLayer(locationMarker);
    }
    locationMarker = L.marker([loc.lat, loc.lng]).addTo(map);
  }

  /**
   * Returns the first polyline as GeoJSON, or null if missing.
   */
  function getRouteGeoJson() {
    let geo = null;
    drawnItems.eachLayer((layer) => {
      if (geo) return;
      if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        geo = layer.toGeoJSON();
      }
    });
    return geo;
  }

  initNav('submit');
  initFooter();
  initMap();

  const stateSel = document.getElementById('sub-state');
  const locSel = document.getElementById('sub-location');
  const form = document.getElementById('route-form');
  const msg = document.getElementById('form-msg');

  /**
   * Loads testing sites for the dropdown when state changes.
   */
  async function loadLocations(code) {
    locSel.innerHTML = '<option value="">Select a location…</option>';
    if (!code) return;
    const res = await fetch(`/api/locations?state=${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error('locations');
    const rows = await res.json();
    for (const loc of rows) {
      const opt = document.createElement('option');
      opt.value = String(loc.id);
      opt.textContent = `${loc.name} — ${loc.city}`;
      opt.dataset.lat = String(loc.lat);
      opt.dataset.lng = String(loc.lng);
      locSel.appendChild(opt);
    }
    if (rows.length === 0) {
      msg.textContent = 'No locations for this state yet — try Ohio.';
    } else {
      msg.textContent = '';
    }
  }

  fetch('/api/states')
    .then((r) => r.json())
    .then((states) => {
      for (const s of states) {
        const opt = document.createElement('option');
        opt.value = s.code;
        opt.textContent = `${s.name}`;
        stateSel.appendChild(opt);
      }
      const preset = getQueryState();
      stateSel.value = preset || 'OH';
      return loadLocations(stateSel.value);
    })
    .then(() => {
      locSel.addEventListener('change', () => {
        const opt = locSel.selectedOptions[0];
        if (opt && opt.dataset.lat) {
          focusLocation({
            lat: parseFloat(opt.dataset.lat, 10),
            lng: parseFloat(opt.dataset.lng, 10),
          });
        }
      });
    })
    .catch(() => {
      msg.textContent = 'Could not load form data.';
    });

  stateSel.addEventListener('change', () => {
    loadLocations(stateSel.value).catch(() => {
      msg.textContent = 'Failed to load locations.';
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    const routeGeo = getRouteGeoJson();
    if (!routeGeo) {
      msg.textContent = 'Draw your route on the map first.';
      msg.classList.add('text-red-600');
      return;
    }
    const locationId = locSel.value;
    if (!locationId) {
      msg.textContent = 'Choose a BMV location.';
      msg.classList.add('text-red-600');
      return;
    }
    const result = form.querySelector('input[name="result"]:checked')?.value;
    const body = {
      result,
      route_geojson: JSON.stringify(routeGeo),
      description: document.getElementById('desc').value.trim(),
      tips: document.getElementById('tips').value.trim(),
      date_taken: document.getElementById('date-taken').value,
    };
    try {
      const res = await fetch(`/api/routes/${encodeURIComponent(locationId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        msg.textContent = data.error || 'Submit failed.';
        msg.classList.add('text-red-600');
        return;
      }
      msg.classList.remove('text-red-600');
      msg.textContent = 'Saved! Redirecting…';
      window.location.href = `/location.html?locationId=${encodeURIComponent(locationId)}`;
    } catch {
      msg.textContent = 'Network error — try again.';
      msg.classList.add('text-red-600');
    }
  });
})();

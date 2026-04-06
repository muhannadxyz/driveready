/**
 * Handbook page: renders one accordion row per state with a direct link to the
 * official permit handbook PDF.
 *
 * WHY no per-state API calls: handbook_url already comes back with /api/states,
 * so we have everything we need from that single request — no lazy-loading needed.
 */

(function () {
  const { initNav, initFooter } = window.DriveReadyCommon;

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s ?? '';
    return d.innerHTML;
  }

  initNav('handbook');
  initFooter();

  fetch('/api/states')
    .then((r) => r.json())
    .then((states) => {
      const root = document.getElementById('handbook-list');
      for (const s of states) {
        const details = document.createElement('details');
        details.className =
          'group border border-slate-200 rounded-xl bg-white shadow-sm open:shadow-md transition';

        const sum = document.createElement('summary');
        sum.className =
          'cursor-pointer list-none px-4 py-3 font-medium text-slate-900 flex justify-between items-center marker:content-none';
        sum.innerHTML = `
          <span>${escapeHtml(s.name)} <span class="text-slate-500 font-normal">(${escapeHtml(s.code)})</span></span>
          <span class="text-slate-400 group-open:rotate-180 transition-transform duration-150">▼</span>
        `;

        const body = document.createElement('div');
        body.className = 'px-4 pb-5 pt-3 border-t border-slate-100';

        if (s.handbook_url) {
          body.innerHTML = `
            <a href="${escapeHtml(s.handbook_url)}"
               target="_blank"
               rel="noopener noreferrer"
               class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 text-sm transition-colors">
              Read the ${escapeHtml(s.name)} Driver Handbook
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          `;
        } else {
          body.innerHTML = `<p class="text-sm text-slate-500">No handbook link available for this state yet.</p>`;
        }

        details.appendChild(sum);
        details.appendChild(body);
        root.appendChild(details);
      }
    })
    .catch(() => {
      document.getElementById('handbook-list').innerHTML =
        '<p class="text-red-600 text-sm">Could not load state list.</p>';
    });
})();

/**
 * Shared UI helpers for DriveReady static pages.
 *
 * WHY a tiny common script: we avoid a build step while keeping navigation consistent
 * across map, quiz, and handbook flows so the product feels intentional on phones.
 */

(function (global) {
  /**
   * Builds the top navigation; highlights the active section for orientation.
   * @param {string} active - one of: home | map | submit | quiz | handbook
   */
  function initNav(active) {
    const el = document.getElementById('dr-nav');
    if (!el) return;

    const links = [
      { href: '/index.html', key: 'home', label: 'Home' },
      { href: '/map.html', key: 'map', label: 'BMV Map' },
      { href: '/submit.html', key: 'submit', label: 'Submit Route' },
      { href: '/quiz.html', key: 'quiz', label: 'Practice Test' },
      { href: '/handbook.html', key: 'handbook', label: 'Handbook' },
    ];

    el.innerHTML = `
      <div class="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <a href="/index.html" class="text-xl font-bold text-emerald-400 tracking-tight">DriveReady</a>
        <nav class="flex flex-wrap gap-2 text-sm">
          ${links
            .map((l) => {
              const isOn = l.key === active;
              const cls = isOn
                ? 'bg-emerald-600 text-white px-3 py-2 rounded-lg'
                : 'text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800';
              return `<a class="${cls}" href="${l.href}">${l.label}</a>`;
            })
            .join('')}
        </nav>
      </div>
    `;
  }

  /**
   * Shared footer copy — reinforces trust for a teen audience.
   */
  function initFooter() {
    const el = document.getElementById('dr-footer');
    if (!el) return;
    el.innerHTML = `
      <div class="max-w-5xl mx-auto px-4 py-6 text-center text-slate-500 text-sm">
        <p>DriveReady is a community study tool — always verify rules with your state licensing agency.</p>
        <p class="mt-1">Maps © OpenStreetMap contributors.</p>
      </div>
    `;
  }

  /**
   * Reads ?state=XX from the current page URL for deep-linking from the homepage picker.
   * @returns {string|null} uppercased code or null
   */
  function getQueryState() {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('state');
    return s ? s.toUpperCase().trim() : null;
  }

  global.DriveReadyCommon = { initNav, initFooter, getQueryState };
})(typeof window !== 'undefined' ? window : globalThis);

/**
 * Homepage: wires feature deep links with ?state= query param if present.
 *
 * WHY query params: teens bookmark one state and share links without editing HTML.
 */

(function () {
  const { initNav, initFooter, getQueryState } = window.DriveReadyCommon;

  /**
   * Applies ?state= to the link hrefs when a state is present in the URL.
   */
  function applyStateToLinks(code) {
    const q = code ? `?state=${encodeURIComponent(code)}` : '';
    document.getElementById('link-map').href = `/map.html${q}`;
    document.getElementById('link-submit').href = `/submit.html${q}`;
    document.getElementById('link-quiz').href = `/quiz.html${q}`;
    document.getElementById('link-handbook').href = `/handbook.html${q}`;
  }

  initNav('home');
  initFooter();

  // WHY: still honor ?state= deep-links even without the dropdown, so bookmarked
  // URLs like /?state=OH continue to route users to state-specific pages.
  const preset = getQueryState();
  applyStateToLinks(preset || '');
})();

// Fetches the season's picks, then hands off to assets/scoreboard.js.
//
// Why this file exists: before the reveal date the Worker will not give anybody
// everyone else's picks, so they cannot be baked into pages/YYYY-YYYY.html. They have
// to arrive at view time. Nothing is in the page source, which means "locked" is
// actually locked rather than hidden behind CSS anyone can see through.
//
// It loads scoreboard.js itself, after the fetch settles. That keeps scoreboard.js
// completely unchanged — it still just reads window.SEASON_CONFIG on load, exactly as
// the five older season pages need it to.
//
// scoreboard.js is loaded whatever happens, including on a network failure, so the
// page always renders something rather than sitting blank.
(function () {
  const conf = window.PLP_CONFIG || {};
  const API_BASE = conf.apiBase || '';
  // Same fallback as assets/predict.js on purpose. The two read and write the same
  // localStorage keys, so if they ever disagree on the season the page silently stops
  // recognising the person who submitted.
  const SEASON = conf.season || '2026-2027';

  // Derive the sibling script path from this file's own src, so the same file works
  // from the repo root or from pages/ without hardcoding '../'.
  const self = document.currentScript;
  const scoreboardSrc = self
    ? self.src.replace(/season-fetch\.js(\?.*)?$/, 'scoreboard.js')
    : '../assets/scoreboard.js';

  const noticeEl = document.getElementById('reveal-notice');

  function loadScoreboard() {
    const el = document.createElement('script');
    el.src = scoreboardSrc;
    document.body.appendChild(el);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function notice(html) {
    if (!noticeEl) return;
    noticeEl.innerHTML = html;
    noticeEl.hidden = false;
  }

  function whenText(iso) {
    if (!iso) return 'the end of the season';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'the end of the season';
    return d.toLocaleDateString(undefined, { dateStyle: 'long' });
  }

  const cfg = window.SEASON_CONFIG;
  if (!cfg || !API_BASE) {
    // Nothing configured to fetch from. The page's own empty SEASON_CONFIG stands.
    loadScoreboard();
    return;
  }

  // Identify the visitor as the person who submitted from this browser. Both values
  // are written by assets/predict.js on a successful submit. localStorage is scoped to
  // the origin, not the path, so predict.html and pages/*.html share them.
  let email = '';
  let token = '';
  try {
    email = localStorage.getItem('plp:email:' + SEASON) || '';
    token = localStorage.getItem('plp:token:' + SEASON) || '';
  } catch (e) {
    // Private browsing. They will just see the locked state.
  }

  const params = [];
  if (email && token) {
    params.push('email=' + encodeURIComponent(email));
    params.push('token=' + encodeURIComponent(token));
  }

  // An admin key in the page URL unlocks the full view for the maintainer.
  // It lands in browser history, so treat it as a convenience, not a secret channel.
  const pageKey = new URLSearchParams(window.location.search).get('key');
  if (pageKey) params.push('key=' + encodeURIComponent(pageKey));

  fetch(API_BASE + '/picks' + (params.length ? '?' + params.join('&') : ''))
    .then((res) => res.json())
    .then((data) => {
      if (!data || !data.ok) return;

      if (data.predictions) cfg.predictions = data.predictions;
      if (data.hot) cfg.hot = data.hot;

      const when = whenText(data.reveal);

      if (data.scope === 'all') return; // revealed, nothing to explain
      if (data.scope === 'admin') {
        notice(
          '<strong>Admin preview.</strong> You are seeing all ' +
            (data.count || 0) +
            ' entries. Everyone else sees only their own until ' +
            esc(when) +
            '.'
        );
      } else if (data.scope === 'self') {
        notice(
          '<strong>This is your entry.</strong> Everyone else’s picks stay hidden until ' +
            esc(when) +
            ', so nobody can copy. Come back then to see the lot.'
        );
      } else {
        notice(
          '<strong>Picks are locked until ' +
            esc(when) +
            '.</strong> Already submitted? Open this page in the browser you submitted from ' +
            'and your own entry will show. Not yet? <a href="../predict.html">Get yours in</a>.'
        );
      }
    })
    .catch(() => {
      notice(
        '<strong>Could not load the picks.</strong> Check your connection and reload.'
      );
    })
    .then(loadScoreboard);
})();

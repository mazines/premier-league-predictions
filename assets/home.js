// Home page: one tile per season.
//
// Reads window.SEASONS, which each pages/*.js season file fills in, so the tiles
// and the season pages show the same numbers. Rendering only starts once
// assets/scoreboard.js has published its arithmetic.
(function () {
  const host = document.querySelector('[data-tiles]');
  if (!host) return;

  const seasons = window.SEASONS;
  const build = window.PLP_BUILD;
  if (!seasons || !build) return;

  // Newest first.
  const order = Object.keys(seasons).sort().reverse();

  const MEDAL =
    '<svg class="medal" viewBox="0 0 14 18" aria-hidden="true">' +
    '<path d="M4 0h2.3l1.2 5.6H5.2z" opacity=".6" />' +
    '<path d="M10 0H7.7L6.5 5.6h2.3z" opacity=".6" />' +
    '<circle cx="7" cy="12.2" r="4.6" />' +
    '<circle cx="7" cy="12.2" r="2.4" fill="var(--cream)" opacity=".45" />' +
    '</svg>';

  function label(slug) {
    const parts = slug.split('-');
    return parts[0] + '/' + parts[1].slice(2);
  }

  function tile(slug, cfg) {
    const name = label(slug);
    const href = 'pages/' + slug + '.html';
    const actual = cfg.actualResults || {};

    if (!actual.topN || !actual.topN.length) {
      return (
        '<a class="tile" href="' + href + '">' +
        '<span class="yr">' + name + '</span>' +
        '<span class="state">In progress</span>' +
        '</a>'
      );
    }

    const clubs = actual.topN
      .slice(0, 4)
      .map((code) => build.pill(code))
      .join('');

    const max = build.maxFor(cfg);
    const people = build
      .ranking(cfg)
      .slice(0, 4)
      .map((r) => {
        const medal = r.rank <= 3 ? r.rank : 0;
        return (
          '<span class="pp m' + medal + '">' +
          (medal ? MEDAL : '') +
          '<span class="pos">' + r.rank + '</span>' +
          '<span class="who">' + build.esc(r.name) + '</span>' +
          '<span class="pt">' + r.score + '/' + max + ' pt</span>' +
          '</span>'
        );
      })
      .join('');

    return (
      '<a class="tile" href="' + href + '">' +
      '<span class="yr">' + name + '</span>' +
      '<span class="clubs">' + clubs + '</span>' +
      '<span class="people">' + people + '</span>' +
      '</a>'
    );
  }

  host.innerHTML = order.map((slug) => tile(slug, seasons[slug])).join('');
})();

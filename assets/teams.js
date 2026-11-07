// Single source of truth for the club roster.
//
// Next season this is the only file that needs editing: swap the three relegated
// clubs out of PL_TEAMS, move them into DEPARTED, and add the three promoted ones.
// Everything else on the site derives from here.
//
// espnId feeds https://a.espncdn.com/i/teamlogos/soccer/500/{id}.png. A null id
// renders the pill with no crest, which is exactly what the site's existing
// onerror="this.remove()" idiom produces — so a missing id degrades, it never breaks.
(function () {
  // 2026/27 Premier League — alphabetical, matching the official club list.
  const PL_TEAMS = [
    { code: 'ARS', name: 'Arsenal',                 espnId: 359,  promoted: false },
    { code: 'AVL', name: 'Aston Villa',             espnId: 362,  promoted: false },
    { code: 'BOU', name: 'Bournemouth',             espnId: 349,  promoted: false },
    { code: 'BRE', name: 'Brentford',               espnId: 337,  promoted: false },
    { code: 'BHA', name: 'Brighton and Hove Albion', espnId: 331, promoted: false },
    { code: 'CHE', name: 'Chelsea',                 espnId: 363,  promoted: false },
    { code: 'COV', name: 'Coventry City',           espnId: 388,  promoted: true },
    { code: 'CRY', name: 'Crystal Palace',          espnId: 384,  promoted: false },
    { code: 'EVE', name: 'Everton',                 espnId: 368,  promoted: false },
    { code: 'FUL', name: 'Fulham',                  espnId: 370,  promoted: false },
    { code: 'HUL', name: 'Hull City',               espnId: 306,  promoted: true },
    { code: 'IPS', name: 'Ipswich Town',            espnId: 373,  promoted: true },
    { code: 'LEE', name: 'Leeds United',            espnId: 357,  promoted: false },
    { code: 'LIV', name: 'Liverpool',               espnId: 364,  promoted: false },
    { code: 'MCI', name: 'Manchester City',         espnId: 382,  promoted: false },
    { code: 'MUN', name: 'Manchester United',       espnId: 360,  promoted: false },
    { code: 'NEW', name: 'Newcastle United',        espnId: 361,  promoted: false },
    { code: 'NFO', name: 'Nottingham Forest',       espnId: 393,  promoted: false },
    { code: 'SUN', name: 'Sunderland',              espnId: 366,  promoted: false },
    { code: 'TOT', name: 'Tottenham Hotspur',       espnId: 367,  promoted: false },
  ];

  // Relegated out of 2025/26. Kept so the relegation question can show who went
  // down last year without hardcoding pills into the page markup.
  const DEPARTED = [
    { code: 'WHU', name: 'West Ham', espnId: 371, promoted: false },
    { code: 'BUR', name: 'Burnley',  espnId: 379, promoted: false },
    { code: 'WOL', name: 'Wolves',   espnId: 380, promoted: false },
  ];

  // Clubs that only appear in older seasons. Without these the historic pages
  // render a bare code instead of a crest, because teamPill cannot find them.
  // Ids are copied from the crest URLs those pages already carried.
  const HISTORIC = [
    { code: 'LEI', name: 'Leicester City',    espnId: 375, promoted: false },
    { code: 'LUT', name: 'Luton Town',        espnId: 398, promoted: false },
    { code: 'SHU', name: 'Sheffield United',  espnId: 392, promoted: false },
    { code: 'SOU', name: 'Southampton',       espnId: 376, promoted: false },
  ];

  const TEAMS_BY_CODE = {};
  PL_TEAMS.concat(DEPARTED, HISTORIC).forEach((t) => {
    TEAMS_BY_CODE[t.code] = t;
  });

  // Returns just the crest <img>, or '' when there is no id. Kept separate from
  // teamPill so the form's club chips can reuse it without the pill wrapper —
  // the crest URL is then defined in exactly one place.
  function crestImg(code) {
    const team = TEAMS_BY_CODE[code];
    if (!team || !team.espnId) return '';
    return (
      '<img class="crest" src="https://a.espncdn.com/i/teamlogos/soccer/500/' +
      team.espnId +
      '.png" alt="" onerror="this.remove()" />'
    );
  }

  // Returns the same pill markup the season pages already hand-write, so the
  // renderer and the form produce output indistinguishable from the existing tables.
  function teamPill(code, opts) {
    const team = TEAMS_BY_CODE[code];
    if (!team) return '';
    const sm = opts && opts.sm ? ' sm' : '';
    return (
      '<span class="pill' + sm + ' t-' + team.code + '" title="' + team.name + '">' +
      crestImg(code) +
      team.code +
      '</span>'
    );
  }

  window.PL_TEAMS = PL_TEAMS;
  window.PL_DEPARTED = DEPARTED;
  window.PL_HISTORIC = HISTORIC;
  window.TEAMS_BY_CODE = TEAMS_BY_CODE;
  window.teamPill = teamPill;
  window.crestImg = crestImg;
})();

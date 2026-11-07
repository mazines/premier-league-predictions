// Season renderer.
//
// Builds three pieces from window.SEASON_CONFIG:
//   <div data-season>  the name controls and the predictions matrix, with the
//                      Actual column and each person's rank and points
//   <div data-takes>   hot takes, one category at a time
//
// The builders are pure functions that return HTML strings, so the markup can be
// checked without a browser. window.PLP_BUILD exposes them.
(function () {
  const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  // A page that forgets teams.js loses every crest and every club colour. Say so
  // once, in the console, instead of rendering a table of grey codes.
  if (!window.teamPill && typeof console !== 'undefined') {
    console.warn('[plp] assets/teams.js must load before scoreboard.js');
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pill(code, opts) {
    if (!code) return '';
    const html = window.teamPill ? window.teamPill(code, opts) : '';
    if (html) return html;
    // teams.js never loaded, or the code is unknown. Keep the club colour class
    // so the table still reads; only the crest is lost.
    return '<span class="pill t-' + esc(code) + '">' + esc(code) + '</span>';
  }

  function player(v) {
    if (v == null || v === '') return '<span class="none">no pick</span>';
    return '<span class="player">' + esc(v) + '</span>';
  }

  function relegStack(list) {
    if (!list || !list.length) return '<span class="none">no pick</span>';
    const pills = list.map((c) => pill(c, { sm: true })).join('');
    return list.length > 1 ? '<span class="relegation-stack">' + pills + '</span>' : pills;
  }

  // The season maximum, the same arithmetic the scoring page describes:
  // three per position, two for a perfect order, three for relegation, each
  // award's own value.
  function maxFor(cfg) {
    const mega = cfg.hasMegaBonus === false ? 0 : 2;
    let m = (cfg.topN || 6) * 3 + mega;
    if (cfg.hasReleg) m += 3;
    (cfg.awards || []).forEach((a) => {
      m += a.max;
    });
    return m;
  }

  function scoreFor(picks, actual, cfg) {
    if (!picks || !actual.topN) return null;
    let s = 0;
    (picks.topN || []).forEach((t, i) => {
      if (actual.topN.includes(t)) s += 1;
      if (actual.topN[i] === t) s += 2;
    });
    if (
      cfg.hasMegaBonus !== false &&
      picks.topN &&
      picks.topN.length &&
      picks.topN.every((t, i) => actual.topN[i] === t)
    ) {
      s += 2;
    }
    if (cfg.hasReleg && actual.releg) {
      (picks.releg || []).forEach((t) => {
        if (actual.releg.includes(t)) s += 1;
      });
    }
    (cfg.awards || []).forEach((a) => {
      if (actual[a.key] && picks[a.key] && picks[a.key] === actual[a.key]) s += a.max;
    });
    return s;
  }

  // Competition ranking: 9, 9, 8 ranks 1, 1, 3 — a tie shares the place and the
  // next place skips. Matches the old leaderboard.
  function ranking(cfg) {
    const actual = cfg.actualResults || {};
    const rows = Object.keys(cfg.predictions || {}).map((name) => ({
      name,
      score: scoreFor(cfg.predictions[name], actual, cfg),
    }));
    rows.sort((a, b) => {
      if (a.score !== b.score) return (b.score || 0) - (a.score || 0);
      return a.name.localeCompare(b.name);
    });
    let last = null;
    let place = 0;
    rows.forEach((r, i) => {
      if (r.score !== last) {
        place = i + 1;
        last = r.score;
      }
      r.rank = place;
    });
    return rows;
  }

  // ---- Matrix --------------------------------------------------------------

  function buildMatrix(cfg) {
    const actual = cfg.actualResults || {};
    const ranked = ranking(cfg);
    const names = ranked.map((r) => r.name);
    const max = maxFor(cfg);
    const hasResults = !!(actual.topN && actual.topN.length);

    const head =
      '<th class="cat"></th><th class="actcol">Actual</th>' +
      names
        .map((name, i) => {
          const r = ranked[i];
          const medal = hasResults && r.rank <= 3 ? ' medal-' + r.rank : '';
          const pts =
            !hasResults || r.score == null
              ? ''
              : '<span class="fp">#' + r.rank + ' &middot; ' + r.score + '/' + max + ' pt</span>';
          return (
            '<th class="friend' +
            medal +
            '" data-col="' +
            i +
            '"><span class="fn">' +
            esc(name) +
            '</span>' +
            pts +
            '</th>'
          );
        })
        .join('');

    const rows = [];

    const topN = cfg.topN || 6;
    rows.push(band('Final table', names.length + 2));
    for (let i = 0; i < topN; i++) {
      rows.push(
        '<tr><td class="cat">' +
          (ORD[i] || i + 1) +
          '</td><td class="actcol">' +
          (actual.topN && actual.topN[i] ? pill(actual.topN[i]) : '<span class="none">—</span>') +
          '</td>' +
          names
            .map((name) => {
              const picks = (cfg.predictions[name] || {}).topN;
              const code = picks && picks[i];
              if (!code) return '<td><span class="none">—</span></td>';
              const hit = actual.topN && actual.topN.includes(code);
              return '<td>' + hitPill(code, hit) + '</td>';
            })
            .join('') +
          '</tr>',
      );
    }

    if (cfg.hasReleg) {
      rows.push(
        '<tr><td class="cat">Relegation</td><td class="actcol">' +
          (actual.releg && actual.releg.length
            ? '<span class="relegation-stack">' + actual.releg.map((c) => pill(c)).join('') + '</span>'
            : '<span class="none">—</span>') +
          '</td>' +
          names
            .map((name) => {
              const list = (cfg.predictions[name] || {}).releg;
              if (!list || !list.length) return '<td><span class="none">—</span></td>';
              return (
                '<td><span class="relegation-stack">' +
                list
                  .map((c) => hitPill(c, actual.releg && actual.releg.includes(c), { sm: true }))
                  .join('') +
                '</span></td>'
              );
            })
            .join('') +
          '</tr>',
      );
    }

    if (cfg.awards && cfg.awards.length) {
      rows.push(band('Awards', names.length + 2));
      cfg.awards.forEach((a) => {
        rows.push(
          '<tr><td class="cat">' +
            esc(a.label) +
            (a.note ? ' ' + esc(a.note) : '') +
            '</td><td class="actcol">' +
            player(actual[a.key]) +
            '</td>' +
            names
              .map((name) => {
                const v = (cfg.predictions[name] || {})[a.key];
                const hit = v && actual[a.key] && v === actual[a.key];
                if (v == null || v === '') return '<td><span class="none">no pick</span></td>';
                return (
                  '<td><span class="player' +
                  (hit ? ' hit' : '') +
                  '">' +
                  esc(v) +
                  '</span></td>'
                );
              })
              .join('') +
            '</tr>',
        );
      });
    }

    return { head, body: rows.join(''), names, max };

    function band(label, span) {
      return '<tr><td class="cat band" colspan="' + span + '">' + esc(label) + '</td></tr>';
    }
  }

  // A pill carrying the tick when the pick is right.
  function hitPill(code, hit, opts) {
    const html = pill(code, opts);
    if (!hit) return html;
    return html.replace('class="pill', 'class="pill hit');
  }

  function buildControls(names) {
    return names
      .map(
        (name, i) =>
          '<button type="button" class="chipx" data-col="' +
          i +
          '" aria-pressed="true">' +
          esc(name) +
          '</button>',
      )
      .join('');
  }

  // ---- Hot takes -----------------------------------------------------------

  const KINDS = [
    { key: 'disappointment', label: 'Disappointment', cls: 'takes-dis' },
    { key: 'surprise', label: 'Surprise', cls: 'takes-sur' },
    { key: 'hotTake', label: 'Hot take', cls: 'takes-hot' },
  ];

  function buildTakes(cfg) {
    const hot = cfg.hot || {};
    const people = Object.keys(hot).sort((a, b) => a.localeCompare(b));
    const panels = [];

    KINDS.forEach((kind, idx) => {
      const items = people
        .map((name) => {
          const text = (hot[name] || {})[kind.key];
          if (!text) return '';
          return (
            '<div class="take"><span class="who">' +
            esc(name) +
            '</span><p>' +
            esc(text) +
            '</p></div>'
          );
        })
        .join('');
      if (!items) return;
      panels.push({ kind, items, idx });
    });

    if (!panels.length) return null;

    const tabs = panels
      .map(
        (p, i) =>
          '<button type="button" role="tab" data-kind="' +
          p.kind.key +
          '" aria-controls="takes-' +
          p.kind.key +
          '" aria-selected="' +
          (i === 0 ? 'true' : 'false') +
          '">' +
          p.kind.label +
          '</button>',
      )
      .join('');

    const bodies = panels
      .map(
        (p, i) =>
          '<div class="takes ' +
          p.kind.cls +
          '" id="takes-' +
          p.kind.key +
          '" role="tabpanel" data-panel="' +
          p.kind.key +
          '"' +
          (i === 0 ? '' : ' hidden') +
          '>' +
          p.items +
          '</div>',
      )
      .join('');

    return '<div class="toggle" role="tablist">' + tabs + '</div>' + bodies;
  }

  // ---- DOM wiring ----------------------------------------------------------

  function wire(root) {
    const matrix = root.querySelector('table.matrix');
    if (!matrix) return;

    const tab = root.querySelector('.tabx');
    if (tab) {
      tab.addEventListener('click', () => {
        const visible = tab.getAttribute('aria-pressed') !== 'true';
        tab.setAttribute('aria-pressed', String(visible));
        matrix.classList.toggle('hide-actual', !visible);
      });
    }

    root.querySelectorAll('.chipx').forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = Number(btn.getAttribute('data-col'));
        const on = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', String(on));

        const th = matrix.querySelector('th.friend[data-col="' + col + '"]');
        if (th) th.hidden = !on;

        matrix.querySelectorAll('tbody tr').forEach((tr) => {
          if (tr.querySelector('.cat.band')) return;
          const cell = tr.children[col + 2]; // label + Actual come first
          if (cell) cell.hidden = !on;
        });
      });
    });
  }

  function wireTakes(root) {
    const tabs = root.querySelectorAll('.toggle button');
    if (!tabs.length) return;
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
        root.querySelectorAll('[data-panel]').forEach((p) => {
          p.hidden = p.getAttribute('data-panel') !== tab.getAttribute('data-kind');
        });
      });
    });
  }

  // Exported before any DOM work, so a page that only needs the arithmetic
  // (index.html) can load this file without a SEASON_CONFIG of its own.
  window.PLP_BUILD = {
    esc,
    pill,
    player,
    maxFor,
    scoreFor,
    ranking,
    buildMatrix,
    buildControls,
    buildTakes,
  };

  const cfg = window.SEASON_CONFIG;
  if (!cfg) return;

  const host = document.querySelector('[data-season]');
  if (host) {
    const matrix = buildMatrix(cfg);
    const hasPeople = matrix.names.length > 0;

    // Before results exist the Actual column is a row of dashes, so it starts
    // hidden. Once the season is scored it starts visible.
    const hasResults = !!(cfg.actualResults && cfg.actualResults.topN && cfg.actualResults.topN.length);

    let html = '';
    if (hasPeople) {
      html +=
        '<div class="controls">' +
        '<button type="button" class="tabx" aria-pressed="' + String(hasResults) + '">Actual</button>' +
        '<div class="chips">' +
        buildControls(matrix.names) +
        '</div></div>' +
        '<div class="matrixwrap"><table class="matrix' +
        (hasResults ? '' : ' hide-actual') +
        '"><thead><tr>' +
        matrix.head +
        '</tr></thead><tbody>' +
        matrix.body +
        '</tbody></table></div>';
    }
    host.innerHTML = html;
    wire(host);
  }

  const takesHost = document.querySelector('[data-takes]');
  if (takesHost) {
    const takes = buildTakes(cfg);
    if (takes) {
      takesHost.innerHTML = takes;
      wireTakes(takesHost);
    }
  }
})();

// Generic scoring + leaderboard renderer.
// Reads window.SEASON_CONFIG and renders into #leaderboard-body.
//
// Config shape:
// {
//   topN:         6,                // number of league positions scored
//   hasReleg:     true,              // whether to score relegation
//   hasMegaBonus: true,              // +2pt for perfect ordered top N
//   awards: [
//     { key: 'poty',  label: 'PFA POTY',     max: 2 },
//     ...                            // optional `note` renders a muted qualifier
//   ],
//   actualResults: { topN: ['ARS',...], releg: [...], poty: '...', ... },
//   predictions:  { Friend1: { topN: [...], releg: [...], poty: '...', ... }, ... }
//   hot:          { Friend1: { disappointment: '...', surprise: '...', hotTake: '...' } }
// }

// Predictions table renderer — a page opts in, nothing is imposed.
//
// The five older season pages hand-write their table and carry no data-render
// attribute, so this skips them entirely and they behave exactly as before. A page
// that sets <table class="predictions" data-render="auto"> with an empty thead and
// tbody gets both built from SEASON_CONFIG, which removes the per-participant <td>
// duplication, the colspan that had to be kept in step by hand, and every copied
// crest URL.
//
// The category labels emitted here are deliberately identical to the hand-written
// ones. The tick-marking pass further down finds rows by reading that text, so those
// strings are a contract, not a cosmetic choice.
(function () {
  const cfg = window.SEASON_CONFIG;
  if (!cfg) return;

  const table = document.querySelector('table.predictions[data-render="auto"]');
  if (!table) return;
  if (!window.teamPill) return; // needs assets/teams.js loaded first

  const topN = cfg.topN || 6;
  const awards = cfg.awards || [];
  const actual = cfg.actualResults || {};
  const predictions = cfg.predictions || {};

  const names = Object.keys(predictions).sort((a, b) => a.localeCompare(b));
  const span = names.length + 2; // category column + actual column
  const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  // Award picks and display names now originate from a public form, so nothing
  // from the config is trusted into markup unescaped.
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const NOPICK = '<span class="nopick">no pick</span>';
  const PENDING = '<span class="nopick">—</span>'; // season not finished yet

  function pill(code, sm) {
    return code ? window.teamPill(code, { sm: !!sm }) : NOPICK;
  }

  function player(v) {
    if (v == null || v === '') return NOPICK;
    return '<span class="player">' + esc(v) + '</span>';
  }

  function relegStack(list) {
    if (!list || !list.length) return NOPICK;
    return (
      '<div class="relegation-stack">' + list.map((c) => pill(c, true)).join('') + '</div>'
    );
  }

  function breakRow(label) {
    return (
      '<tr class="section-break"><td class="cat-col" colspan="' +
      span +
      '">' +
      esc(label) +
      '</td></tr>'
    );
  }

  let head =
    '<tr><th class="cat-col">Name</th><th class="actual-col">Actual</th>' +
    names.map((n) => '<th class="friend">' + esc(n) + '</th>').join('') +
    '</tr>';

  let body = breakRow('Final Table — Top ' + topN);

  for (let i = 0; i < topN; i++) {
    body +=
      '<tr><td class="cat-col">' +
      (ordinals[i] || i + 1 + 'th') +
      '</td><td class="actual-col">' +
      (actual.topN && actual.topN[i] ? pill(actual.topN[i]) : PENDING) +
      '</td>' +
      names
        .map((n) => {
          const picks = predictions[n].topN;
          return '<td>' + (picks && picks[i] ? pill(picks[i]) : NOPICK) + '</td>';
        })
        .join('') +
      '</tr>';
  }

  if (cfg.hasReleg) {
    body +=
      breakRow('Bottom Three — Relegated') +
      '<tr><td class="cat-col">Relegation</td><td class="actual-col">' +
      (actual.releg ? relegStack(actual.releg) : PENDING) +
      '</td>' +
      names.map((n) => '<td>' + relegStack(predictions[n].releg) + '</td>').join('') +
      '</tr>';
  }

  if (awards.length) {
    body += breakRow('Individual Awards');
    awards.forEach((a) => {
      // Matches the hand-written "PFA YPOTY (U23)" treatment.
      const note = a.note
        ? ' <span style="color:var(--muted);font-weight:400">' + esc(a.note) + '</span>'
        : '';
      body +=
        '<tr class="award"><td class="cat-col">' +
        esc(a.label) +
        note +
        '</td><td class="actual-col">' +
        (actual[a.key] ? player(actual[a.key]) : PENDING) +
        '</td>' +
        names.map((n) => '<td>' + player(predictions[n][a.key]) + '</td>').join('') +
        '</tr>';
    });
  }

  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  if (thead) thead.innerHTML = head;
  if (tbody) tbody.innerHTML = body;
})();

// Hot takes renderer — same opt-in idea, for
// <section class="commentary" data-render="auto">. Reads SEASON_CONFIG.hot so the
// cards no longer have to be typed out by hand.
(function () {
  const cfg = window.SEASON_CONFIG;
  if (!cfg || !cfg.hot) return;

  const cards = document.querySelector('section.commentary[data-render="auto"] .cards');
  if (!cards) return;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function quote(variant, label, text) {
    if (!text) return '';
    return (
      '<div class="quote ' +
      variant +
      '"><span class="label">' +
      label +
      '</span>' +
      esc(text) +
      '</div>'
    );
  }

  const names = Object.keys(cfg.hot).sort((a, b) => a.localeCompare(b));

  cards.innerHTML = names
    .map((name) => {
      const h = cfg.hot[name] || {};
      const quotes =
        quote('disappointment', 'Disappointment', h.disappointment) +
        quote('surprise', 'Surprise', h.surprise) +
        quote('hottake', 'Hot take', h.hotTake);
      // Somebody who skipped all three gets no card, rather than an empty one.
      if (!quotes) return '';
      return '<div class="card"><h3>' + esc(name) + '</h3>' + quotes + '</div>';
    })
    .join('');
})();

(function () {
  const cfg = window.SEASON_CONFIG;
  if (!cfg) return;

  const {
    topN = 6,
    hasReleg = false,
    hasMegaBonus = true,
    awards = [],
    actualResults = {},
    predictions = {},
  } = cfg;

  // Names and award picks reach this config from a public form, so anything that
  // originated there is escaped before it goes into markup.
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function score(picks, actual) {
    if (!actual.topN) return null;
    let s = 0;

    if (picks.topN && actual.topN) {
      picks.topN.forEach((t, i) => {
        if (actual.topN.includes(t)) s += 1;
        if (actual.topN[i] === t) s += 2;
      });
      if (hasMegaBonus && picks.topN.every((t, i) => actual.topN[i] === t))
        s += 2;
    }

    if (hasReleg && actual.releg && picks.releg) {
      picks.releg.forEach((t) => {
        if (actual.releg.includes(t)) s += 1;
      });
    }

    awards.forEach((a) => {
      if (actual[a.key] && picks[a.key] && picks[a.key] === actual[a.key])
        s += a.max;
    });

    return s;
  }

  function buildBreakdown(picks, actual) {
    const sections = {};
    let total = 0;
    const ordinals = [
      '1st',
      '2nd',
      '3rd',
      '4th',
      '5th',
      '6th',
      '7th',
      '8th',
      '9th',
      '10th',
    ];

    if (picks.topN && actual.topN) {
      const key = `Top ${topN}`;
      sections[key] = [];
      picks.topN.forEach((t, i) => {
        const inTop = actual.topN.includes(t);
        const exact = actual.topN[i] === t;
        const pts = (inTop ? 1 : 0) + (exact ? 2 : 0);
        total += pts;
        const cls = exact ? 'hit' : inTop ? 'partial' : '';
        sections[key].push({
          label: `${ordinals[i] || i + 1 + 'th'}: <strong>${t}</strong> · actual ${actual.topN[i]}`,
          pts,
          cls,
        });
      });
      if (hasMegaBonus && picks.topN.every((t, i) => actual.topN[i] === t)) {
        sections[key].push({
          label: '<strong>Perfect order bonus</strong>',
          pts: 2,
          cls: 'hit',
        });
        total += 2;
      }
    }

    if (hasReleg && actual.releg && picks.releg) {
      sections['Relegation'] = [];
      picks.releg.forEach((t) => {
        const hit = actual.releg.includes(t);
        if (hit) total += 1;
        sections['Relegation'].push({
          label: `<strong>${t}</strong>${hit ? '' : ' · stayed up'}`,
          pts: hit ? 1 : 0,
          cls: hit ? 'hit' : '',
        });
      });
    }

    if (awards.length) {
      sections['Awards'] = [];
      awards.forEach((a) => {
        const pickVal = picks[a.key];
        const hit = pickVal && actual[a.key] && pickVal === actual[a.key];
        if (hit) total += a.max;
        const display =
          pickVal == null
            ? '<em style="color:var(--muted)">no pick</em>'
            : `<strong>${esc(pickVal)}</strong>`;
        sections['Awards'].push({
          label: `${a.label}: ${display}`,
          pts: hit ? a.max : 0,
          cls: hit ? 'hit' : '',
        });
      });
    }

    let html = '<div class="bd-panel">';
    for (const [name, items] of Object.entries(sections)) {
      html += `<div class="bd-section"><h4>${name}</h4>`;
      items.forEach((item) => {
        const sign = item.pts > 0 ? '+' : '';
        html += `<div class="bd-row ${item.cls}"><span class="bd-label">${item.label}</span><span class="bd-pts">${sign}${item.pts}</span></div>`;
      });
      html += '</div>';
    }
    html += `<div class="bd-total"><span class="bd-total-label">Total</span><span class="bd-total-pts">${total} pt</span></div>`;
    html += '</div>';
    return html;
  }

  const haveResults =
    Array.isArray(actualResults.topN) && actualResults.topN.length > 0;

  const rows = Object.entries(predictions).map(([name, picks]) => ({
    name,
    score: score(picks, actualResults),
  }));

  if (haveResults) {
    rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  } else {
    rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  let lastScore = null,
    currentRank = 0;
  rows.forEach((r, i) => {
    if (r.score !== lastScore) {
      currentRank = i + 1;
      lastScore = r.score;
    }
    r.rank = currentRank;
  });

  const tbody = document.getElementById('leaderboard-body');
  if (!tbody) return;

  tbody.innerHTML = rows
    .map((r, idx) => {
      const podium = haveResults && r.rank <= 3 ? ` podium-${r.rank}` : '';
      const rankCell = haveResults ? '#' + r.rank : '—';
      const pts = r.score === null ? '—' : r.score + ' pt';
      const breakdownRow = haveResults
        ? `<tr class="lb-breakdown" data-idx="${idx}" hidden><td colspan="3">${buildBreakdown(predictions[r.name], actualResults)}</td></tr>`
        : '';
      return `<tr class="lb-row${podium}" data-idx="${idx}"><td class="rank">${rankCell}</td><td class="name">${esc(r.name)}</td><td class="score">${pts}</td></tr>${breakdownRow}`;
    })
    .join('');

  document.querySelectorAll('.lb-row').forEach((row) => {
    row.addEventListener('click', () => {
      const idx = row.dataset.idx;
      const target = document.querySelector(`.lb-breakdown[data-idx="${idx}"]`);
      if (!target) return;
      const wasHidden = target.hasAttribute('hidden');
      target.toggleAttribute('hidden');
      row.classList.toggle('expanded', wasHidden);
    });
  });

  // Mark correct picks in the predictions table with a green tick
  if (haveResults) {
    const categoryMap = {
      'PFA POTY': { key: 'poty', kind: 'player' },
      'Golden Boot': { key: 'gb', kind: 'player' },
      Playmaker: { key: 'play', kind: 'player' },
      'Golden Glove': { key: 'gg', kind: 'player' },
      MOTY: { key: 'mgr', kind: 'player' },
      'Signing of the Season': { key: 'sots', kind: 'player' },
    };

    function getPlayerText(playerEl) {
      // First text node only — strips out any qualifier child span
      const node = playerEl.childNodes[0];
      return node ? (node.nodeValue || '').trim() : '';
    }

    function getPillCode(pillEl) {
      // First text node of pill — abbreviation, ignoring crest img
      let txt = '';
      pillEl.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) txt += n.nodeValue;
      });
      return txt.trim();
    }

    document.querySelectorAll('table.predictions tbody tr').forEach((tr) => {
      const catCell = tr.querySelector('td.cat-col');
      if (!catCell) return;
      const cat = catCell.textContent.trim();

      // Top-N position rows: "1st", "2nd", "3rd", "4th", "5th", "6th", "7th"
      const posMatch = cat.match(/^(\d+)(st|nd|rd|th)$/);
      if (posMatch) {
        const idx = parseInt(posMatch[1], 10) - 1;
        const expected = actualResults.topN && actualResults.topN[idx];
        if (!expected) return;
        tr.querySelectorAll('td:not(.cat-col):not(.actual-col) .pill').forEach(
          (pill) => {
            if (getPillCode(pill) === expected) pill.classList.add('hit-pill');
          },
        );
        return;
      }

      // Relegation row
      if (cat.toLowerCase().startsWith('relegation') && actualResults.releg) {
        tr.querySelectorAll('td:not(.cat-col):not(.actual-col) .pill').forEach(
          (pill) => {
            if (actualResults.releg.includes(getPillCode(pill)))
              pill.classList.add('hit-pill');
          },
        );
        return;
      }

      // Award rows — match by category text (handles "PFA YPOTY (U23)" variants)
      let key = null;
      if (cat.startsWith('PFA YPOTY')) key = 'ypoty';
      else if (categoryMap[cat]) key = categoryMap[cat].key;
      if (!key) return;
      const expected = actualResults[key];
      if (!expected) return;
      tr.querySelectorAll('td:not(.cat-col):not(.actual-col) .player').forEach(
        (p) => {
          if (getPlayerText(p) === expected) p.classList.add('hit-player');
        },
      );
    });
  }
})();

// Compare mode: clicking a friend column header hides the other friends so
// you can read that participant's picks side-by-side with Actual. Clicking
// the same name (or any "Reset" surface) restores all columns.
(function () {
  const table = document.querySelector('table.predictions');
  if (!table) return;
  const friendThs = Array.from(table.querySelectorAll('th.friend'));
  if (friendThs.length < 2) return;

  let focused = null;

  function clearFocus() {
    table.removeAttribute('data-compare');
    table
      .querySelectorAll('.compare-hidden')
      .forEach((el) => el.classList.remove('compare-hidden'));
    friendThs.forEach((th) => th.classList.remove('compare-focus'));
    focused = null;
  }

  function setFocus(th) {
    if (focused === th) {
      clearFocus();
      return;
    }
    clearFocus();
    const colIdx = Array.from(th.parentNode.children).indexOf(th);
    th.classList.add('compare-focus');
    table.setAttribute('data-compare', 'on');
    friendThs.forEach((other) => {
      if (other !== th) other.classList.add('compare-hidden');
    });
    table.querySelectorAll('tbody tr').forEach((tr) => {
      Array.from(tr.children).forEach((cell, i) => {
        if (
          cell.classList.contains('cat-col') ||
          cell.classList.contains('actual-col')
        )
          return;
        if (cell.colSpan && cell.colSpan > 1) return; // section-break
        if (i !== colIdx) cell.classList.add('compare-hidden');
      });
    });
    focused = th;
  }

  friendThs.forEach((th) => {
    th.title = 'Click to compare with Actual · click again to show all';
    th.addEventListener('click', () => setFocus(th));
  });

  // Clicking the Name or Actual header also resets, since they're always visible.
  const resetThs = table.querySelectorAll('thead th.cat-col, thead th.actual-col');
  resetThs.forEach((th) => {
    th.style.cursor = 'pointer';
    th.title = 'Click to show all participants';
    th.addEventListener('click', clearFocus);
  });
})();

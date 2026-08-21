// Tests for the data-driven table and hot-takes renderers in assets/scoreboard.js.
//
// Run with:  node test/renderer.mjs
//
// Why this exists: the renderer emits category labels ("1st", "Relegation",
// "PFA POTY", ...) that the tick-marking pass later finds by reading that text. If
// the two ever drift, nothing throws — the green ticks just quietly stop appearing.
// This pins the contract down. It also proves the five hand-written season pages are
// left alone, since they carry no data-render attribute.
//
// The DOM shim below is deliberately tiny. Both renderers only ever assign
// innerHTML, so nothing here needs to parse HTML.
import fs from 'fs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');

const teamsSrc = read('assets/teams.js');
const boardSrc = read('assets/scoreboard.js');

function run(cfg, optIn) {
  const out = { thead: '', tbody: '', cards: '', lb: '' };
  const el = (k) => ({
    set innerHTML(v) {
      out[k] = v;
    },
    get innerHTML() {
      return out[k];
    },
  });

  const table = optIn
    ? {
        querySelector: (s) => (s === 'thead' ? el('thead') : s === 'tbody' ? el('tbody') : null),
        querySelectorAll: () => [],
        removeAttribute() {},
        setAttribute() {},
      }
    : null;

  const document = {
    querySelector(sel) {
      if (sel.includes('table.predictions') && sel.includes('data-render="auto"')) return table;
      if (sel.includes('commentary[data-render="auto"]')) return optIn ? el('cards') : null;
      return null; // leaves compare mode inert
    },
    querySelectorAll: () => [],
    getElementById: (id) => (id === 'leaderboard-body' ? el('lb') : null),
  };

  const win = {};
  new Function('window', 'document', teamsSrc)(win, document);
  win.SEASON_CONFIG = cfg;
  new Function('window', 'document', 'Node', boardSrc)(win, document, { TEXT_NODE: 3 });
  return out;
}

const CFG = {
  topN: 7,
  hasReleg: true,
  hasMegaBonus: true,
  awards: [
    { key: 'poty', label: 'PFA POTY', max: 2 },
    { key: 'ypoty', label: 'PFA YPOTY', max: 2, note: '(U23)' },
    { key: 'gb', label: 'Golden Boot', max: 1 },
    { key: 'play', label: 'Playmaker', max: 1 },
    { key: 'gg', label: 'Golden Glove', max: 1 },
    { key: 'mgr', label: 'MOTY', max: 1 },
    { key: 'sots', label: 'Signing of the Season', max: 1 },
  ],
  actualResults: {}, // season not finished, so Actual should show dashes
  predictions: {
    Mazine: {
      topN: ['ARS', 'LIV', 'MCI', 'CHE', 'MUN', 'AVL', 'NEW'],
      releg: ['COV', 'HUL', 'IPS'],
      poty: 'Bruno Fernandes',
      ypoty: null,
      gb: 'Erling Haaland',
      play: null,
      gg: null,
      mgr: null,
      sots: null,
    },
    Osman: {
      topN: ['LIV', 'ARS', 'MCI', 'CHE', 'TOT', 'MUN', 'NFO'],
      releg: null,
      poty: 'Cole Palmer',
      ypoty: 'Ethan Nwaneri',
      gb: null,
      play: null,
      gg: 'David Raya',
      mgr: null,
      sots: 'A Signing',
    },
    'K Mogz': {
      topN: ['MCI', 'ARS', 'LIV', 'MUN', 'CHE', 'NEW', 'EVE'],
      releg: ['COV', 'HUL', 'LEE'],
      poty: 'Bukayo Saka',
      ypoty: null,
      gb: null,
      play: null,
      gg: null,
      mgr: null,
      sots: null,
    },
  },
  hot: {
    Mazine: { disappointment: 'Spurs again.', surprise: 'Sunderland stay up.', hotTake: 'Haaland leaves.' },
    Osman: { disappointment: null, surprise: 'Hull survive.', hotTake: null },
    Quiet: { disappointment: null, surprise: null, hotTake: null },
  },
};

let pass = 0;
let fail = 0;
function t(label, cond, detail) {
  if (cond) {
    pass++;
    console.log('  ok   ' + label);
  } else {
    fail++;
    console.log('  FAIL ' + label + (detail ? '  -> ' + detail : ''));
  }
}

const r = run(CFG, true);

console.log('renders when the page opts in:');
t('thead built', r.thead.length > 0);
t('tbody built', r.tbody.length > 0);
t('hot take cards built', r.cards.length > 0);

console.log('\ncategory label contract (tick-marking greps this text):');
const labels = [...r.tbody.matchAll(/<td class="cat-col"[^>]*>(.*?)<\/td>/g)].map((m) => m[1]);
['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'].forEach((o) =>
  t('position "' + o + '"', labels.includes(o))
);
t('"Relegation" exactly', labels.includes('Relegation'));
['PFA POTY', 'Golden Boot', 'Playmaker', 'Golden Glove', 'MOTY', 'Signing of the Season'].forEach(
  (a) => t('award "' + a + '" exactly', labels.includes(a))
);
const yp = labels.find((l) => l.startsWith('PFA YPOTY'));
t('YPOTY matches the startsWith path', !!yp, yp);
t('YPOTY keeps its (U23) qualifier', !!yp && yp.includes('(U23)'), yp);

console.log('\nevery award key is known to the tick-marking:');
const map = boardSrc.slice(boardSrc.indexOf('const categoryMap'), boardSrc.indexOf('function getPlayerText'));
CFG.awards.forEach((a) => {
  // ypoty is handled by a startsWith branch rather than the map.
  if (a.key === 'ypoty') return;
  t('categoryMap knows ' + a.key, map.includes("'" + a.key + "'"));
});

console.log('\nstructure:');
t('colspan is 2 + participants', r.tbody.includes('colspan="5"'), (r.tbody.match(/colspan="\d+"/g) || []).join(','));
t('one header per participant', (r.thead.match(/class="friend"/g) || []).length === 3);
t(
  'participants sorted alphabetically',
  r.thead.indexOf('K Mogz') < r.thead.indexOf('Mazine') &&
    r.thead.indexOf('Mazine') < r.thead.indexOf('Osman')
);
t('three section breaks', (r.tbody.match(/section-break/g) || []).length === 3);
t('award rows carry tr.award', (r.tbody.match(/<tr class="award">/g) || []).length === 7);

console.log('\npill markup matches the hand-written pages:');
const handArs =
  '<span class="pill t-ARS" title="Arsenal"><img class="crest" src="https://a.espncdn.com/i/teamlogos/soccer/500/359.png" alt="" onerror="this.remove()" />ARS</span>';
t('Arsenal pill is byte-identical to pages/2025-2026.html', r.tbody.includes(handArs) && read('pages/2025-2026.html').includes(handArs));
t('relegation uses .relegation-stack', r.tbody.includes('relegation-stack'));
t(
  'a club with no crest id still renders',
  r.tbody.includes('<span class="pill sm t-COV" title="Coventry City">COV</span>')
);

console.log('\nnull and pending handling:');
t('a null award shows "no pick"', r.tbody.includes('<span class="nopick">no pick</span>'));
t('an unfinished season shows a dash in Actual', r.tbody.includes('<span class="nopick">—</span>'));

console.log('\nhot takes:');
t(
  'all three quote variants render',
  r.cards.includes('quote disappointment') &&
    r.cards.includes('quote surprise') &&
    r.cards.includes('quote hottake')
);
t('somebody who skipped all three gets no card', !r.cards.includes('Quiet'));
t('two cards rendered', (r.cards.match(/class="card"/g) || []).length === 2);

console.log('\nescaping (form data reaches these pages):');
const X = JSON.parse(JSON.stringify(CFG));
X.predictions['<img src=x>'] = X.predictions.Mazine;
X.predictions.Mazine = Object.assign({}, X.predictions.Mazine, { poty: '<script>alert(1)</script>' });
X.hot = { Mazine: { hotTake: '<b>bold</b>', disappointment: null, surprise: null } };
const x = run(X, true);
t('participant name escaped', !x.thead.includes('<img src=x>') && x.thead.includes('&lt;img'));
t('award value escaped', !x.tbody.includes('<script>alert(1)') && x.tbody.includes('&lt;script&gt;'));
t('hot take escaped', !x.cards.includes('<b>bold</b>') && x.cards.includes('&lt;b&gt;'));

console.log('\nhand-written pages are left alone:');
const off = run(CFG, false);
t('no thead written', off.thead === '');
t('no tbody written', off.tbody === '');
t('no cards written', off.cards === '');
['2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026'].forEach((p) =>
  t(p + ' carries no data-render attribute', !read('pages/' + p + '.html').includes('data-render'))
);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);

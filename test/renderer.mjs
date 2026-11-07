// Tests for the season renderer in assets/scoreboard.js.
//
// Run with:  node test/renderer.mjs
//
// Why this exists: the matrix carries each person's rank and points in its column
// header, and the ticks that mark a correct pick are produced by string comparison.
// If either drifts, nothing throws — the page just quietly shows wrong numbers.
// The builders are pure functions, so they can be called here without a browser.

import fs from 'fs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');

const teamsSrc = read('assets/teams.js');
const boardSrc = read('assets/scoreboard.js');

// The renderer only needs innerHTML assignment once it reaches the DOM section.
// Returning null for every selector keeps that section inert, so these tests can
// call the builders directly.
const document = { querySelector: () => null, querySelectorAll: () => [] };

function load(config) {
  const win = {};
  new Function('window', 'document', teamsSrc)(win, document);
  win.SEASON_CONFIG = config;
  new Function('window', 'document', boardSrc)(win, document);
  return win;
}

function season(slug) {
  const win = {};
  new Function('window', read('assets/seasons/' + slug + '.js'))(win);
  return win.SEASONS[slug];
}

const CFG = {
  topN: 7,
  hasReleg: true,
  hasMegaBonus: true,
  awards: [
    { key: 'poty', label: 'PFA POTY', max: 2 },
    { key: 'ypoty', label: 'PFA YPOTY', max: 2, note: '(U23)' },
    { key: 'gb', label: 'Golden Boot', max: 1 },
  ],
  actualResults: {
    topN: ['ARS', 'LIV', 'MCI', 'CHE', 'MUN', 'AVL', 'NEW'],
    releg: ['COV', 'HUL', 'IPS'],
    poty: 'Bruno Fernandes',
    ypoty: 'Ethan Nwaneri',
    gb: 'Erling Haaland',
  },
  predictions: {
    Mazine: {
      topN: ['ARS', 'LIV', 'MCI', 'CHE', 'MUN', 'AVL', 'NEW'],
      releg: ['COV', 'HUL', 'IPS'],
      poty: 'Bruno Fernandes',
      ypoty: null,
      gb: 'Erling Haaland',
    },
    Osman: {
      topN: ['LIV', 'ARS', 'MCI', 'CHE', 'TOT', 'MUN', 'NFO'],
      releg: null,
      poty: 'Cole Palmer',
      ypoty: 'Ethan Nwaneri',
      gb: null,
    },
    'K Mogz': {
      topN: ['MCI', 'ARS', 'LIV', 'MUN', 'CHE', 'NEW', 'EVE'],
      releg: ['COV', 'HUL', 'LEE'],
      poty: 'Bukayo Saka',
      ypoty: null,
      gb: null,
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

const B = load(CFG).PLP_BUILD;

console.log('builders are available without a season configured:');
t('PLP_BUILD is exported', !!B);
['maxFor', 'scoreFor', 'ranking', 'buildMatrix', 'buildControls', 'buildTakes'].forEach(
  (k) => t(k + ' is a function', typeof B[k] === 'function'),
);

console.log('\nseason maximum matches the scoring page:');
const EXPECTED_MAX = {
  '2021-2022': 27,
  '2022-2023': 29,
  '2023-2024': 31,
  '2024-2025': 31,
  '2025-2026': 31,
  '2026-2027': 35,
};
Object.entries(EXPECTED_MAX).forEach(([slug, max]) => {
  t(slug + ' max is ' + max, B.maxFor(season(slug)) === max, B.maxFor(season(slug)));
});

console.log('\nscoring:');
t('an exact pick scores 3', B.scoreFor({ topN: ['ARS'] }, { topN: ['ARS'] }, { topN: 1, hasMegaBonus: false }) === 3);
t(
  'a team in the top N but in the wrong slot scores 1',
  B.scoreFor({ topN: ['LIV', 'ARS'] }, { topN: ['ARS', 'LIV'] }, { topN: 2 }) === 2,
);
t(
  'a perfect order adds the 2 point bonus',
  B.scoreFor({ topN: ['ARS', 'LIV'] }, { topN: ['ARS', 'LIV'] }, { topN: 2 }) === 8,
);
t('no actual results means no score', B.scoreFor({ topN: ['ARS'] }, {}, { topN: 1 }) === null);

console.log('\nranking:');
{
  const ranked = B.ranking(CFG);
  t('every participant is ranked', ranked.length === 3);
  t('highest score is rank 1', ranked[0].rank === 1);
  t('sorted by score then name', ranked[0].score >= ranked[1].score);
  const tieCfg = {
    topN: 1,
    awards: [],
    actualResults: { topN: ['ARS'] },
    predictions: { A: { topN: ['ARS'] }, B: { topN: ['ARS'] }, C: { topN: ['LIV'] } },
  };
  const tied = B.ranking(tieCfg);
  t('a tie shares the rank', tied[0].rank === 1 && tied[1].rank === 1, JSON.stringify(tied));
  t('the next place skips after a tie', tied[2].rank === 3, JSON.stringify(tied[2]));
}

console.log('\nmatrix header carries rank and points:');
{
  const m = B.buildMatrix(CFG);
  t('one header per participant', (m.head.match(/class="friend/g) || []).length === 3);
  t('header shows rank and score out of max', /#1 &middot; \d+\/31 pt/.test(m.head), m.head);
  t('medal class on the winner', m.head.includes('medal-1'));
  // Columns run in leaderboard order: the highest score is leftmost.
  const order = [...m.head.matchAll(/class="fn">([^<]+)</g)].map((x) => x[1]);
  t('columns are in rank order', order[0] === 'Mazine' && order[order.length - 1] === 'K Mogz', order.join(','));
  t('every column has a data-col', (m.head.match(/data-col="/g) || []).length === 3);
}

console.log('\nmatrix body:');
{
  const m = B.buildMatrix(CFG);
  const rows = m.body.split('<tr>').slice(1);
  const cells = rows.filter((r) => !r.includes('colspan'));
  t('every row has 2 + participants cells', cells.every((r) => (r.match(/<td/g) || []).length === 5), cells.map((r) => (r.match(/<td/g) || []).length).join(','));
  t('band rows span every column', m.body.includes('colspan="5"'));
  ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'].forEach((o) =>
    t('position label "' + o + '"', new RegExp('<td class="cat">' + o + '</td>').test(m.body)),
  );
  t('"Relegation" exactly', m.body.includes('>Relegation</td>'));
  ['PFA POTY', 'Golden Boot'].forEach((a) =>
    t('award label "' + a + '" exactly', m.body.includes('>' + a + '</td>')),
  );
  t('YPOTY keeps its (U23) qualifier', /PFA YPOTY \(U23\)<\/td>/.test(m.body));
  t('a correct pick is marked', m.body.includes('class="pill hit'));
  t('a missing pick reads "no pick"', m.body.includes('<span class="none">no pick</span>'));
  t('relegation uses .relegation-stack', m.body.includes('relegation-stack'));
}

console.log('\nactual results live in the matrix column:');
{
  const m = B.buildMatrix(CFG);
  t('the Actual column exists', m.head.includes('class="actcol"'));
  t('every row carries an Actual cell', (m.body.match(/class="actcol"/g) || []).length >= 8);
  t(
    'relegation stacks vertically in Actual',
    /class="actcol"><span class="relegation-stack">/.test(m.body),
    m.body.slice(0, 240),
  );
  const locked = Object.assign({}, CFG, { actualResults: {} });
  const lm = B.buildMatrix(locked);
  t('a locked season shows dashes, not blanks', lm.body.includes('<span class="none">—</span>'));
  t('and claims no rank', !/#\d+/.test(lm.head), lm.head);
  t('and claims no medal', !/medal-/.test(lm.head));
}

console.log('\nhot takes:');
{
  const h = B.buildTakes(CFG);
  t('one tab per populated kind', (h.match(/role="tab"/g) || []).length === 3);
  t('tabs control their panel', (h.match(/aria-controls="takes-/g) || []).length === 3);
  t('panels are tabpanels', (h.match(/role="tabpanel"/g) || []).length === 3);
  t('only the first panel is visible', (h.match(/ hidden/g) || []).length === 2);
  t('a take shows who said it', h.includes('<span class="who">Mazine</span>'));
  t('somebody who skipped everything gets no panel entry', !h.includes('Quiet'));
  t('an empty hot list renders nothing', B.buildTakes({ hot: {} }) === null);
  t('a missing hot key renders nothing', B.buildTakes({}) === null);
}

console.log('\nhit marking is exact:');
{
  const mini = {
    topN: 1,
    awards: [],
    hasReleg: false,
    actualResults: { topN: ['ARS'] },
    predictions: { Right: { topN: ['ARS'] }, Wrong: { topN: ['LIV'] }, Blank: { topN: [null] } },
  };
  const m = B.buildMatrix(mini);
  t('the correct pick is marked', /class="pill hit t-ARS"/.test(m.body), m.body);
  t('the wrong pick is not marked', /class="pill t-LIV"/.test(m.body));
  t('and the wrong pick carries no hit class', !/pill hit[^"]*t-LIV/.test(m.body));
}

console.log('\nhit pill markup:');
{
  const pillHit = B.pill('ARS');
  t('a plain pill carries the club colour', pillHit.includes('class="pill t-ARS"'));
  t('a hit keeps the colour and adds hit', B.pill === B.pill);
  const m = B.buildMatrix(CFG);
  t('hit pills keep their club class', /class="pill hit t-[A-Z]{3}"/.test(m.body), m.body.slice(0, 200));
}

console.log('\ncrests:');
{
  const win = {};
  new Function('window', teamsSrc)(win);
  t('every club in the roster has a crest id', win.PL_TEAMS.every((x) => !!x.espnId));
  t('no two clubs share an id', new Set(win.PL_TEAMS.map((x) => x.espnId)).size === win.PL_TEAMS.length);
  t('a club with an id renders its crest', win.teamPill('ARS').includes('/500/359.png'));
  win.TEAMS_BY_CODE.ZZZ = { code: 'ZZZ', name: 'New Club', espnId: null };
  t('a club with no id renders a plain chip', win.teamPill('ZZZ') === '<span class="pill t-ZZZ" title="New Club">ZZZ</span>', win.teamPill('ZZZ'));
  t('and emits no img tag', win.crestImg('ZZZ') === '');
  t('an unknown code renders nothing', win.teamPill('QQQ') === '');
  t('historic clubs are known', ['LEI', 'LUT', 'SHU', 'SOU'].every((c) => !!win.TEAMS_BY_CODE[c]));
}

console.log('\nescaping (form data reaches these pages):');
{
  const X = JSON.parse(JSON.stringify(CFG));
  X.predictions['<img src=x>'] = X.predictions.Mazine;
  X.predictions.Mazine.poty = '<script>alert(1)</script>';
  X.hot = { Mazine: { hotTake: '<b>bold</b>', disappointment: null, surprise: null } };
  const m = B.buildMatrix(X);
  const h = B.buildTakes(X);
  t('participant name escaped', !m.head.includes('<img src=x>') && m.head.includes('&lt;img'));
  t('award value escaped', !m.body.includes('<script>alert(1>') && m.body.includes('&lt;script&gt;'));
  t('hot take escaped', !h.includes('<b>bold</b>') && h.includes('&lt;b&gt;'));
}

console.log('\nclub colours and crests reach the matrix:');
{
  const m = B.buildMatrix(CFG);
  t('pills carry the club colour class', /class="pill t-ARS"/.test(m.body), m.body.slice(0, 160));
  t('pills carry a crest image', m.body.includes('class="crest"') && m.body.includes('/500/359.png'));
}

console.log('\nfallback when teams.js is missing:');
{
  const bare = {};
  new Function('window', 'document', boardSrc)(bare, document);
  const out = bare.PLP_BUILD.pill('ARS');
  t('still applies the club colour class', out === '<span class="pill t-ARS">ARS</span>', out);
}

console.log('\npages load teams.js before the renderer:');
['2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026', '2026-2027'].forEach((slug) => {
  const src = read('pages/' + slug + '.html');
  const teams = src.indexOf('assets/teams.js');
  const needsIt = Math.min(
    ...['assets/scoreboard.js', 'assets/season-fetch.js']
      .map((f) => src.indexOf(f))
      .filter((i) => i !== -1),
  );
  t(slug + ' loads teams.js first', teams !== -1 && teams < needsIt, 'teams at ' + teams + ', renderer at ' + needsIt);
});

console.log('\npages use the shared season files:');
['2021-2022', '2022-2023', '2023-2024', '2024-2025', '2025-2026', '2026-2027'].forEach((slug) => {
  const src = read('pages/' + slug + '.html');
  t(slug + ' loads its season file', src.includes('assets/seasons/' + slug + '.js'));
  t(slug + ' sets SEASON_CONFIG from it', src.includes("window.SEASON_CONFIG = window.SEASONS['" + slug + "']"));
  t(slug + ' has a season hook', src.includes('data-season'));
  t(slug + ' has a takes hook', src.includes('data-takes'));
  t(slug + ' no longer hand-writes a table', !src.includes('class="predictions"'));
  t(slug + ' no longer has a leaderboard', !src.includes('leaderboard-body'));

  // The rail marks the season as current, and its two shortcuts point at sections.
  t(slug + ' rail marks the season current', /<span class="group" aria-current="true">[^<]*Season<\/span>/.test(src));
  t(slug + ' All seasons is not marked current', !/href="\.\.\/index\.html" aria-current/.test(src));
  t(slug + ' has a Matrix shortcut', src.includes('href="#matrix"'));
  t(slug + ' has a Hot takes shortcut', src.includes('href="#hot-takes"'));
  t(slug + ' has the matrix anchor', src.includes('id="matrix"'));
  t(slug + ' has the takes anchor', src.includes('id="hot-takes"'));
  t(slug + ' has no duplicated status line', !src.includes('class="status"'));
});

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);

// Tests for the Worker's request validation.
//
// Run with:  node test.mjs
//
// No framework and no dependencies, on purpose — the rest of the repo has no build
// step and this should stay runnable years from now. Validation is the only real
// security boundary in the project, so it is the part worth pinning down.
//
// The trick below reads src/index.js and evaluates everything above `export default`
// so the internal helpers can be inspected. It never modifies the shipped file.
import fs from 'fs';

const src = fs.readFileSync(new URL('./src/index.js', import.meta.url), 'utf8');
const body = src.slice(0, src.indexOf('export default {'));
const internals = new Function(
  body + '\nreturn { validate, cleanText, isEmail, normEmail, isOpen, DEADLINE_ISO, VALID_CODES, TOO_LONG, HAS_BRACKETS };'
)();
const { validate, cleanText, isOpen, DEADLINE_ISO, VALID_CODES } = internals;

const TOP = ['ARS', 'LIV', 'MCI', 'CHE', 'MUN', 'AVL', 'NEW'];

// Relegation picks must be clubs in THIS season. COV/HUL/IPS are the promoted three.
const base = () => ({
  season: '2026-2027',
  name: 'Mazine',
  email: 'Me@Example.COM',
  topN: [...TOP],
  releg: ['COV', 'HUL', 'IPS'],
  poty: 'Bruno Fernandes',
  ypoty: null,
  gb: null,
  play: null,
  gg: null,
  mgr: null,
  sots: null,
  disappointment: null,
  surprise: null,
  hotTake: null,
});

let pass = 0;
let fail = 0;

function check(label, condition, detail) {
  if (condition) {
    pass++;
    console.log('  ok   ' + label);
  } else {
    fail++;
    console.log('  FAIL ' + label + (detail ? '  -> ' + detail : ''));
  }
}

function accepts(label, mutate) {
  const b = base();
  if (mutate) mutate(b);
  const r = validate(b);
  check(label, typeof r !== 'string', typeof r === 'string' ? r : '');
  return r;
}

function rejects(label, mutate, expectMatch) {
  const b = base();
  if (mutate) mutate(b);
  const r = validate(b);
  const rejected = typeof r === 'string';
  const matched = !expectMatch || (rejected && r.toLowerCase().includes(expectMatch.toLowerCase()));
  check(label, rejected && matched, rejected ? r : 'accepted');
}

console.log('roster (' + VALID_CODES.length + ' clubs): ' + VALID_CODES.join(' '));

console.log('\naccepted:');
const good = accepts('a full valid entry');
accepts('relegation left out entirely', (b) => {
  b.releg = null;
});
accepts('every optional award filled', (b) => {
  b.ypoty = 'Ethan Nwaneri';
  b.gb = 'Erling Haaland';
  b.play = 'Cole Palmer';
  b.gg = 'David Raya';
  b.mgr = 'Mikel Arteta';
  b.sots = 'Someone New';
});
accepts('season field omitted', (b) => {
  delete b.season;
});
accepts('hot takes filled in', (b) => {
  b.disappointment = 'x';
  b.surprise = 'y';
  b.hotTake = 'z';
});
accepts('accented and apostrophe names', (b) => {
  b.gb = 'Viktor Gyökeres';
  b.ypoty = "Nico O'Reilly";
  b.mgr = 'Rúben Amorim';
});

console.log('\nrejected:');
rejects('blank name', (b) => (b.name = '   '), 'name is required');
rejects('name over the limit', (b) => (b.name = 'x'.repeat(41)), 'characters or fewer');
rejects('malformed email', (b) => (b.email = 'nope'), 'valid email');
rejects('email over the limit', (b) => (b.email = 'a'.repeat(120) + '@x.com'), 'valid email');
rejects('top 7 too short', (b) => (b.topN = TOP.slice(0, 6)), 'exactly 7');
rejects('top 7 too long', (b) => (b.topN = [...TOP, 'TOT']), 'exactly 7');
rejects('top 7 containing a null', (b) => (b.topN[3] = null), 'not a club');
rejects('top 7 naming a club that went down', (b) => (b.topN[6] = 'WHU'), 'not a club');
rejects('top 7 with a duplicate', (b) => (b.topN[1] = 'ARS'), 'twice');
rejects('top 7 not an array', (b) => (b.topN = 'ARS'), 'must be an array');
rejects('relegation with only two picks', (b) => (b.releg = ['COV', 'HUL']), '3 clubs');
rejects('relegation with a duplicate', (b) => (b.releg = ['COV', 'COV', 'IPS']), 'twice');
rejects('a club both top 7 and relegated', (b) => (b.releg = ['ARS', 'HUL', 'IPS']), 'cannot finish');
rejects('relegation naming an unknown club', (b) => (b.releg = ['ZZZ', 'HUL', 'IPS']), 'not a club');
rejects('POTY missing', (b) => (b.poty = null), 'poty is required');
rejects('POTY blank', (b) => (b.poty = '  '), 'poty is required');
rejects('award over the limit', (b) => (b.gb = 'x'.repeat(61)), 'characters or fewer');
rejects('hot take over the limit', (b) => (b.hotTake = 'x'.repeat(601)), 'characters or fewer');
rejects('award of the wrong type', (b) => (b.gb = {}), 'characters or fewer');
rejects('an unexpected field', (b) => (b.isAdmin = true), 'unexpected field');
rejects('the wrong season', (b) => (b.season = '2025-2026'), 'wrong season');
check('a null body', typeof validate(null) === 'string');
check('a string body', typeof validate('nope') === 'string');

// The export gets pasted into an inline <script> block, so a value carrying
// "</script>" would end that element during HTML parsing — before any render-time
// escaping could run. These have to be refused at the boundary.
console.log('\nangle brackets refused (protects the paste-into-HTML step):');
rejects('a script tag in the name', (b) => (b.name = 'Maz</script><script>x'), '< or >');
rejects('a script tag in an award', (b) => (b.gb = '</script><script>alert(1)'), '< or >');
rejects('a script tag in a hot take', (b) => (b.hotTake = 'a </script> b'), '< or >');
rejects('an img onerror payload', (b) => (b.poty = '<img src=x onerror=alert(1)>'), '< or >');
rejects('a lone angle bracket', (b) => (b.surprise = 'Arsenal > Spurs'), '< or >');
check(
  'a bracket rejection is never mistaken for a value',
  (() => {
    const b = base();
    b.gb = '<x>';
    const r = validate(b);
    // Must be a rejection string, not an entry that stored a sentinel.
    return typeof r === 'string';
  })()
);

console.log('\nnormalisation:');
check('email is lowercased', good.entry.email === 'me@example.com', good.entry.email);
check('a blank award becomes null', good.entry.ypoty === null);
check('inner whitespace collapses', cleanText('  Mo    Salah  ', 60) === 'Mo Salah');
check(
  'entry keys match SEASON_CONFIG order',
  Object.keys(good.entry).join(',') ===
    'name,email,topN,releg,poty,ypoty,gb,play,gg,mgr,sots,disappointment,surprise,hotTake',
  Object.keys(good.entry).join(',')
);

console.log('\ndeadline:');
console.log('  ' + DEADLINE_ISO + '  ->  ' + new Date(DEADLINE_ISO).toString());
check('the deadline parses', !isNaN(new Date(DEADLINE_ISO).getTime()));
console.log('  open right now: ' + isOpen());

// handleSubmit reads properties straight off the parsed body, so a body that is valid
// JSON but not an object has to be turned away cleanly rather than throwing into a 500.
console.log('\nmalformed request bodies get a 4xx, never a 500:');
const submitInternals = new Function(
  src.slice(0, src.indexOf('export default {')) + '\nreturn { handleSubmit };'
)();

const kv = new Map();
const env = {
  ADMIN_KEY: 'SECRET',
  PREDICTIONS: {
    get: async (k) => (kv.has(k) ? kv.get(k) : null),
    put: async (k, v) => {
      kv.set(k, v);
    },
    delete: async (k) => {
      kv.delete(k);
    },
    list: async () => ({ keys: [], list_complete: true }),
  },
};

async function post(rawBody) {
  const req = new Request('https://worker.dev/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
    body: rawBody,
  });
  const res = await submitInternals.handleSubmit(req, env);
  return { status: res.status, data: JSON.parse(await res.text()) };
}

for (const [label, raw] of [
  ['null', 'null'],
  ['a bare string', '"hello"'],
  ['a number', '42'],
  ['an array', '[1,2,3]'],
  ['not JSON at all', '{oops'],
]) {
  const r = await post(raw);
  check(label + ' -> ' + r.status, r.status >= 400 && r.status < 500 && r.data.ok === false, r);
}

// A non-string token must be dropped, not tripped over by the unknown-field check.
const badToken = await post(JSON.stringify(Object.assign(base(), { token: 12345 })));
check(
  'a non-string token is ignored rather than reported as an unknown field',
  (badToken.data.error || '').indexOf('token') === -1,
  badToken
);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);

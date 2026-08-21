// Tests for the /picks access gate.
//
// Run with:  node test-access.mjs
//
// This is the endpoint that decides who can see whose predictions, so the leak cases
// matter more than the happy path. Before the reveal date the only thing anybody may
// read is their own entry, proven with the edit token they were handed on submit.
// Knowing somebody's email address must get you nothing.
//
// Same trick as test.mjs: evaluate everything above `export default` so the internal
// handlers can be called directly. The shipped file is never modified.
import fs from 'fs';

const src = fs.readFileSync(new URL('./src/index.js', import.meta.url), 'utf8');
const head = src.slice(0, src.indexOf('export default {'));
const internals = new Function(head + '\nreturn { handlePicks, REVEAL_ISO };')();
const { handlePicks, REVEAL_ISO } = internals;

function entry(name, email, token) {
  return {
    name: name,
    email: email,
    editToken: token,
    topN: ['ARS', 'LIV', 'MCI', 'CHE', 'MUN', 'AVL', 'NEW'],
    releg: ['COV', 'HUL', 'IPS'],
    poty: 'Bruno Fernandes',
    ypoty: null,
    gb: null,
    play: null,
    gg: null,
    mgr: null,
    sots: null,
    disappointment: 'Spurs again',
    surprise: null,
    hotTake: null,
    createdAt: 'then',
    updatedAt: 'then',
  };
}

const store = new Map();
store.set('pred:me@x.com', JSON.stringify(entry('Mazine', 'me@x.com', 'TOK-ME')));
store.set('pred:them@x.com', JSON.stringify(entry('Osman', 'them@x.com', 'TOK-THEM')));

const env = {
  ADMIN_KEY: 'SECRET',
  PREDICTIONS: {
    get: async (k) => (store.has(k) ? store.get(k) : null),
    list: async () => ({
      keys: [...store.keys()].map((name) => ({ name })),
      list_complete: true,
    }),
  },
};

async function call(qs, handler) {
  const fn = handler || handlePicks;
  const res = await fn(new URL('https://worker.dev/picks' + qs), env);
  return JSON.parse(await res.text());
}

let pass = 0;
let fail = 0;
function t(label, cond, detail) {
  if (cond) {
    pass++;
    console.log('  ok   ' + label);
  } else {
    fail++;
    console.log('  FAIL ' + label + (detail ? '  -> ' + JSON.stringify(detail) : ''));
  }
}

const names = (r) => Object.keys(r.predictions).sort().join(',');
const empty = (r) => Object.keys(r.predictions).length === 0;

console.log('REVEAL_ISO = ' + REVEAL_ISO);
console.log('revealed right now? ' + (Date.now() >= new Date(REVEAL_ISO).getTime()));

console.log('\nwhile locked, these must return nothing:');
let r = await call('');
t('an anonymous visitor', empty(r) && r.scope === 'none', r);
t('and is told it is locked, not that it failed', r.ok === true && r.revealed === false && !!r.reveal, r);

r = await call('?email=them%40x.com');
t('an email with no token', empty(r), r);

r = await call('?email=them%40x.com&token=TOK-ME');
t('my token against their email', empty(r), r);

r = await call('?email=them%40x.com&token=guess');
t('a wrong token', empty(r), r);

r = await call('?email=me%40x.com&token=');
t('an empty token', empty(r), r);

r = await call('?email=nobody%40x.com&token=TOK-ME');
t('a token with an unknown email', empty(r), r);

r = await call('?key=nope');
t('a wrong admin key', empty(r) && r.scope === 'none', r);

console.log('\nwhile locked, these must work:');
r = await call('?email=me%40x.com&token=TOK-ME');
t('my own token returns my entry', r.scope === 'self' && names(r) === 'Mazine', r);
t('and nobody else is included', !('Osman' in r.predictions), Object.keys(r.predictions));
t('my hot take comes along', !!r.hot.Mazine, r.hot);
t('no email is echoed back', JSON.stringify(r).indexOf('me@x.com') === -1);
t('no edit token is echoed back', JSON.stringify(r).indexOf('TOK-ME') === -1);

r = await call('?key=SECRET');
t('the admin key returns everyone', r.scope === 'admin' && names(r) === 'Mazine,Osman', r);
t('but revealed stays false', r.revealed === false, r);
t('and the count is right', r.count === 2, r);

console.log('\nafter the reveal date:');
// Re-evaluate with a reveal date in the past, so the gate is open.
const opened = new Function(
  head.replace(/const REVEAL_ISO = '[^']+'/, "const REVEAL_ISO = '2000-01-01T00:00:00Z'") +
    '\nreturn { handlePicks };'
)();
r = await call('', opened.handlePicks);
t('anyone sees everyone, no credentials', r.scope === 'all' && names(r) === 'Mazine,Osman', r);
t('the revealed flag flips', r.revealed === true, r);
t('emails are still withheld', JSON.stringify(r).indexOf('me@x.com') === -1);
t('tokens are still withheld', JSON.stringify(r).indexOf('TOK-') === -1);

console.log('\nthe payload matches SEASON_CONFIG:');
const one = r.predictions.Mazine;
t(
  'award keys in the expected order',
  Object.keys(one).join(',') === 'topN,releg,poty,ypoty,gb,play,gg,mgr,sots',
  Object.keys(one)
);
t('topN is seven codes', Array.isArray(one.topN) && one.topN.length === 7, one.topN);
t('a skipped award is null', one.ypoty === null && one.mgr === null, one);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);

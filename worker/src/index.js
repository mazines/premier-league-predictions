// Cloudflare Worker backing predict.html.
//
// Why this exists: GitHub Pages is static, so the two rules that actually matter —
// one entry per email, and no submissions after the deadline — have nowhere
// trustworthy to live on the client. Anyone can edit JavaScript or move their
// clock. This Worker is the only authority on both.
//
// Endpoints
//   GET  /status                     deadline, server time, open/closed, reveal date
//   POST /submit                     group code + validate + upsert, keyed on email
//   GET  /mine?email=&token=         read back one entry, token required
//   GET  /picks?email=&token=&key=   feeds the season page. Before the reveal date it
//                                    returns only the caller's own entry
//   GET  /export?key=                admin: SEASON_CONFIG.predictions, ready to paste
//   POST /admin/reset?key=&email=    admin: drop one entry so somebody can resubmit
//
// Secrets, both set with `wrangler secret put` and never in this file:
//   ADMIN_KEY   guards /export and /admin/reset
//   JOIN_CODE   the shared code the group needs in order to submit at all
//
// Storage: one KV namespace bound as PREDICTIONS.
//   pred:<email>   the entry, JSON
//   rate:<ip>      a short-lived request counter
//
// Secrets come from wrangler, never from this file. See README.md.

// Cutoff matches the Premier League transfer deadline: Tue 1 Sep 2026, 23:00 BST.
// BST is UTC+1, so 22:00Z — which is 18:00 ET and 15:00 PT.
// assets/predict.js keeps a copy for the countdown, but this value is the one
// that decides anything.
const DEADLINE_ISO = '2026-09-01T22:00:00Z';

// When everyone's picks become public on pages/2026-2027.html.
//
// Before this moment /picks returns only the caller's OWN entry, and only if they
// present the edit token they were given on submit. So nobody can read anybody
// else's calls, and knowing an email address gets you nothing.
//
// Set to Sunday 30 May 2027, 18:00 BST — the final day of the season. All ten
// matches kick off together at 16:00 BST, so this lands just after the last whistle
// and the season is genuinely over. BST is UTC+1, so 17:00Z. That is 13:00 ET and
// 10:00 PT.
const REVEAL_ISO = '2027-05-30T17:00:00Z';

const SEASON = '2026-2027';

// Must match assets/teams.js. Kept as a plain list so the Worker never trusts a
// club code the client sends.
const VALID_CODES = [
  'ARS', 'AVL', 'BOU', 'BRE', 'BHA', 'CHE', 'COV', 'CRY', 'EVE', 'FUL',
  'HUL', 'IPS', 'LEE', 'LIV', 'MCI', 'MUN', 'NEW', 'NFO', 'SUN', 'TOT',
];

const TOP_N = 7;
const RELEG_N = 3;

// Free-text prediction fields. Order matters only for the exported object.
const AWARD_KEYS = ['poty', 'ypoty', 'gb', 'play', 'gg', 'mgr', 'sots'];
const HOT_KEYS = ['disappointment', 'surprise', 'hotTake'];

const LIMIT = { name: 40, email: 120, award: 60, hot: 600, body: 8192 };

// Requests per window, per IP. Generous for a dozen friends, tight enough that a
// runaway script cannot fill the namespace.
const RATE_MAX = 20;
const RATE_WINDOW_S = 300;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS),
  });
}

function deadlineMs() {
  return new Date(DEADLINE_ISO).getTime();
}

function isOpen() {
  return Date.now() < deadlineMs();
}

function normEmail(v) {
  return String(v == null ? '' : v).trim().toLowerCase();
}

function isEmail(v) {
  return typeof v === 'string' && v.length <= LIMIT.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

// cleanText outcomes that are not a usable value. Distinct sentinels rather than
// strings, so a rejection can never be mistaken for somebody's actual answer.
const TOO_LONG = Symbol('tooLong');
const HAS_BRACKETS = Symbol('hasBrackets');

// Trims and collapses inner whitespace, then returns null for blanks so the stored
// shape matches SEASON_CONFIG, where null is the canonical "no pick".
//
// Angle brackets are refused outright. This is not about escaping — the season page
// escapes on render anyway. It is about the publishing step: the export gets pasted
// into an inline <script> block in pages/YYYY-YYYY.html, and a value containing
// "</script>" would close that element while the HTML is being parsed, before any
// escaping could possibly run. Rejecting the characters at the boundary is the only
// place that hole can actually be closed.
function cleanText(v, max) {
  if (v == null) return null;
  if (typeof v !== 'string') return TOO_LONG;
  const s = v.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (s.length > max) return TOO_LONG;
  if (/[<>]/.test(s)) return HAS_BRACKETS;
  return s;
}

function uniq(list) {
  const seen = {};
  for (let i = 0; i < list.length; i++) {
    if (seen[list[i]]) return false;
    seen[list[i]] = true;
  }
  return true;
}

// Full independent re-validation. The client checks the same things for feedback,
// but nothing here relies on that having happened.
function validate(body) {
  if (!body || typeof body !== 'object') return 'Malformed request body.';

  const allowed = ['season', 'name', 'email', 'topN', 'releg']
    .concat(AWARD_KEYS)
    .concat(HOT_KEYS);
  const unknown = Object.keys(body).filter((k) => allowed.indexOf(k) === -1);
  if (unknown.length) return 'Unexpected field: ' + unknown[0] + '.';

  if (body.season != null && body.season !== SEASON) return 'Wrong season.';

  const name = cleanText(body.name, LIMIT.name);
  if (name === HAS_BRACKETS) return 'Please write your name without < or > characters.';
  if (name === TOO_LONG) return 'Name must be text of ' + LIMIT.name + ' characters or fewer.';
  if (!name) return 'Name is required.';

  const email = normEmail(body.email);
  if (!isEmail(email)) return 'A valid email address is required.';

  if (!Array.isArray(body.topN) || body.topN.length !== TOP_N) {
    return 'topN must be an array of exactly ' + TOP_N + ' club codes.';
  }
  for (let i = 0; i < body.topN.length; i++) {
    if (VALID_CODES.indexOf(body.topN[i]) === -1) {
      return 'Position ' + (i + 1) + ' is not a club in this season.';
    }
  }
  if (!uniq(body.topN)) return 'The same club appears twice in your top ' + TOP_N + '.';

  let releg = null;
  if (body.releg != null) {
    if (!Array.isArray(body.releg) || body.releg.length !== RELEG_N) {
      return 'Relegation must be ' + RELEG_N + ' clubs, or left out entirely.';
    }
    for (let i = 0; i < body.releg.length; i++) {
      if (VALID_CODES.indexOf(body.releg[i]) === -1) {
        return 'A relegation pick is not a club in this season.';
      }
      if (body.topN.indexOf(body.releg[i]) !== -1) {
        return body.releg[i] + ' cannot finish in the top ' + TOP_N + ' and be relegated.';
      }
    }
    if (!uniq(body.releg)) return 'The same club appears twice in your relegation picks.';
    releg = body.releg.slice();
  }

  const entry = { name: name, email: email, topN: body.topN.slice(), releg: releg };

  for (let i = 0; i < AWARD_KEYS.length; i++) {
    const k = AWARD_KEYS[i];
    const v = cleanText(body[k], LIMIT.award);
    if (v === HAS_BRACKETS) return k + ' cannot contain < or > characters.';
    if (v === TOO_LONG) return k + ' must be text of ' + LIMIT.award + ' characters or fewer.';
    entry[k] = v;
  }
  if (!entry.poty) return 'PFA POTY is required.';

  for (let i = 0; i < HOT_KEYS.length; i++) {
    const k = HOT_KEYS[i];
    const v = cleanText(body[k], LIMIT.hot);
    if (v === HAS_BRACKETS) {
      return (
        k + ' cannot contain < or > characters — please write "greater than" instead.'
      );
    }
    if (v === TOO_LONG) return k + ' must be text of ' + LIMIT.hot + ' characters or fewer.';
    entry[k] = v;
  }

  return { entry: entry };
}

function adminOk(url, env) {
  const key = url.searchParams.get('key');
  // Constant-time comparison is overkill here, but bailing when the secret is
  // unset matters: otherwise a missing binding would make every caller an admin.
  return !!env.ADMIN_KEY && key === env.ADMIN_KEY;
}

async function rateLimited(request, env, bucket) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = 'rate:' + (bucket || 'submit') + ':' + ip;
  const current = Number((await env.PREDICTIONS.get(key)) || 0);
  if (current >= RATE_MAX) return true;
  // expirationTtl restarts on each write, which makes this a sliding window.
  // Good enough to stop a loop; not trying to be a real rate limiter.
  await env.PREDICTIONS.put(key, String(current + 1), { expirationTtl: RATE_WINDOW_S });
  return false;
}

function newToken() {
  return crypto.randomUUID();
}

async function handleSubmit(request, env) {
  if (!isOpen()) {
    return json(
      { ok: false, error: 'Submissions closed on ' + DEADLINE_ISO + '.', closed: true },
      403
    );
  }

  if (await rateLimited(request, env)) {
    return json({ ok: false, error: 'Too many requests. Try again in a few minutes.' }, 429);
  }

  const raw = await request.text();
  if (raw.length > LIMIT.body) return json({ ok: false, error: 'Request too large.' }, 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    return json({ ok: false, error: 'Could not read that as JSON.' }, 400);
  }

  // JSON.parse('null') and JSON.parse('"x"') both succeed, so the shape has to be
  // checked before any property is read. Without this, the body.token access below
  // throws on a null body and the caller gets a 500 for what is really a bad request.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ ok: false, error: 'Malformed request body.' }, 400);
  }

  // The edit token travels alongside the entry but is not part of it. Delete it
  // whatever type it arrived as, otherwise validate() rejects it as an unknown field
  // and the error makes no sense to whoever sent a malformed one.
  const token = typeof body.token === 'string' ? body.token : null;
  delete body.token;

  // The group code is the same: alongside, not part of. Checked here rather than in
  // validate() so a wrong code costs nothing and reveals nothing about the rest.
  //
  // This is what stops a stranger who finds the URL from submitting. It is enforced
  // here because a check in the browser would be worthless — anybody can edit that.
  // If JOIN_CODE is unset the gate is skipped, which keeps a fresh deployment usable;
  // set the secret and it locks.
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  delete body.code;
  if (env.JOIN_CODE && code !== env.JOIN_CODE) {
    return json(
      {
        ok: false,
        error: 'Wrong group code. Ask Mazine for it.',
        badCode: true,
      },
      403
    );
  }

  const checked = validate(body);
  if (typeof checked === 'string') return json({ ok: false, error: checked }, 400);

  const entry = checked.entry;
  const kvKey = 'pred:' + entry.email;
  const existingRaw = await env.PREDICTIONS.get(kvKey);

  if (existingRaw) {
    let existing;
    try {
      existing = JSON.parse(existingRaw);
    } catch (e) {
      existing = null;
    }
    // An entry already exists for this email. Require the token that was handed
    // out when it was created, so nobody can overwrite someone else's picks just
    // by knowing their address.
    if (existing && existing.editToken && existing.editToken !== token) {
      return json(
        {
          ok: false,
          error:
            'Picks already exist for this email. Submit from the browser you used the ' +
            'first time, or ask Mazine to reset it for you.',
          conflict: true,
        },
        409
      );
    }
    entry.editToken = existing && existing.editToken ? existing.editToken : newToken();
    entry.createdAt = existing && existing.createdAt ? existing.createdAt : new Date().toISOString();
  } else {
    entry.editToken = newToken();
    entry.createdAt = new Date().toISOString();
  }

  entry.updatedAt = new Date().toISOString();
  entry.season = SEASON;

  await env.PREDICTIONS.put(kvKey, JSON.stringify(entry));

  return json({
    ok: true,
    token: entry.editToken,
    updated: !!existingRaw,
    name: entry.name,
  });
}

async function handleMine(url, env) {
  const email = normEmail(url.searchParams.get('email'));
  const token = url.searchParams.get('token');
  // No token, no read. Email alone is not a secret, and leaking picks before the
  // deadline would let people copy each other.
  if (!isEmail(email) || !token) return json({ ok: false, error: 'Not found.' }, 404);

  const raw = await env.PREDICTIONS.get('pred:' + email);
  if (!raw) return json({ ok: false, error: 'Not found.' }, 404);

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch (e) {
    return json({ ok: false, error: 'Not found.' }, 404);
  }
  if (entry.editToken !== token) return json({ ok: false, error: 'Not found.' }, 404);

  delete entry.editToken;
  return json({ ok: true, entry: entry });
}

// Turns a stored entry into the two public shapes: a SEASON_CONFIG.predictions value,
// and a hot-takes value. Shared by /export and /picks so the two can never drift.
function shapeEntry(e) {
  const pred = { topN: e.topN, releg: e.releg };
  AWARD_KEYS.forEach((key) => {
    pred[key] = e[key] == null ? null : e[key];
  });

  const hot =
    e.disappointment || e.surprise || e.hotTake
      ? {
          disappointment: e.disappointment || null,
          surprise: e.surprise || null,
          hotTake: e.hotTake || null,
        }
      : null;

  return { pred: pred, hot: hot };
}

// Reads every entry out of KV, keyed by display name exactly like
// SEASON_CONFIG.predictions.
async function collectAll(env) {
  const out = { predictions: {}, hot: {}, meta: {} };
  let cursor;

  // KV list pages at 1000 keys. Looping keeps this correct if the game ever grows.
  do {
    const page = await env.PREDICTIONS.list({ prefix: 'pred:', cursor: cursor });
    for (const k of page.keys) {
      const raw = await env.PREDICTIONS.get(k.name);
      if (!raw) continue;
      let e;
      try {
        e = JSON.parse(raw);
      } catch (err) {
        continue;
      }

      // Duplicate display names would collide, so make that visible rather than
      // silently dropping one.
      let name = e.name;
      if (out.predictions[name]) name = name + ' (' + e.email + ')';

      const shaped = shapeEntry(e);
      out.predictions[name] = shaped.pred;
      if (shaped.hot) out.hot[name] = shaped.hot;
      out.meta[name] = { email: e.email, createdAt: e.createdAt, updatedAt: e.updatedAt };
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);

  out.count = Object.keys(out.predictions).length;
  return out;
}

// Feeds the season page. Three outcomes:
//   revealed, or a valid admin key -> everybody's picks
//   a valid email + edit token     -> that person's own entry, and nothing else
//   anything else                  -> nothing, with revealed:false so the page says so
//
// Never an error response. A locked page is a normal state, not a failure.
async function handlePicks(url, env) {
  const revealed = Date.now() >= new Date(REVEAL_ISO).getTime();
  const isAdmin = adminOk(url, env);

  if (revealed || isAdmin) {
    const all = await collectAll(env);
    return json({
      ok: true,
      revealed: revealed,
      scope: revealed ? 'all' : 'admin',
      reveal: REVEAL_ISO,
      count: all.count,
      predictions: all.predictions,
      hot: all.hot,
    });
  }

  // Locked. The only thing anybody can read is their own entry, and only by
  // presenting the edit token they were handed on submit. An email alone is useless.
  const email = normEmail(url.searchParams.get('email'));
  const token = url.searchParams.get('token');

  if (isEmail(email) && token) {
    const raw = await env.PREDICTIONS.get('pred:' + email);
    if (raw) {
      let e;
      try {
        e = JSON.parse(raw);
      } catch (err) {
        e = null;
      }
      if (e && e.editToken && e.editToken === token) {
        const shaped = shapeEntry(e);
        const predictions = {};
        const hot = {};
        predictions[e.name] = shaped.pred;
        if (shaped.hot) hot[e.name] = shaped.hot;
        return json({
          ok: true,
          revealed: false,
          scope: 'self',
          reveal: REVEAL_ISO,
          count: 1,
          predictions: predictions,
          hot: hot,
        });
      }
    }
  }

  return json({
    ok: true,
    revealed: false,
    scope: 'none',
    reveal: REVEAL_ISO,
    count: 0,
    predictions: {},
    hot: {},
  });
}

// Both admin endpoints take the key in a query string, so without a limit somebody
// could sit and guess at it. /export returns every entry including all the email
// addresses, so it is the one endpoint where a guessable key would actually cost
// something. A separate bucket from /submit, so admin guessing cannot lock the form.
async function handleExport(request, url, env) {
  if (await rateLimited(request, env, 'admin')) {
    return json({ ok: false, error: 'Too many requests.' }, 429);
  }
  if (!adminOk(url, env)) return json({ ok: false, error: 'Not found.' }, 404);
  const all = await collectAll(env);
  return json({ ok: true, season: SEASON, export: all });
}

async function handleReset(request, url, env) {
  if (await rateLimited(request, env, 'admin')) {
    return json({ ok: false, error: 'Too many requests.' }, 429);
  }
  if (!adminOk(url, env)) return json({ ok: false, error: 'Not found.' }, 404);
  const email = normEmail(url.searchParams.get('email'));
  if (!isEmail(email)) return json({ ok: false, error: 'Valid email required.' }, 400);
  await env.PREDICTIONS.delete('pred:' + email);
  return json({ ok: true, deleted: email });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      if (path === '/status' && request.method === 'GET') {
        return json({
          ok: true,
          season: SEASON,
          deadline: DEADLINE_ISO,
          now: new Date().toISOString(),
          open: isOpen(),
          reveal: REVEAL_ISO,
          revealed: Date.now() >= new Date(REVEAL_ISO).getTime(),
        });
      }

      if (path === '/submit' && request.method === 'POST') return handleSubmit(request, env);
      if (path === '/mine' && request.method === 'GET') return handleMine(url, env);
      if (path === '/picks' && request.method === 'GET') return handlePicks(url, env);
      if (path === '/export' && request.method === 'GET') return handleExport(request, url, env);
      if (path === '/admin/reset' && request.method === 'POST') return handleReset(request, url, env);

      return json({ ok: false, error: 'Not found.' }, 404);
    } catch (err) {
      // Never leak internals to the browser, but do surface it in `wrangler tail`.
      console.error('unhandled', path, err && err.stack ? err.stack : err);
      return json({ ok: false, error: 'Something broke on our end. Try again.' }, 500);
    }
  },
};

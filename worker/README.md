# Prediction submission Worker

Backs the form at [`predict.html`](../predict.html). GitHub Pages is static, so the two
rules that matter — one entry per email, and nothing accepted after the deadline — need
somewhere the browser cannot reach. This is that place.

Everything else on the site stays static. This Worker holds no secrets in source.

## Deploy

You need a Cloudflare account. The free tier covers this many times over.

```sh
npm install -g wrangler     # once
cd worker
wrangler login
```

Create the KV namespace and copy the printed id into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`:

```sh
wrangler kv namespace create PREDICTIONS
```

Set the admin secret. Use something long and random — it guards the export and reset
endpoints:

```sh
wrangler secret put ADMIN_KEY
```

Deploy:

```sh
wrangler deploy
```

Wrangler prints a URL like `https://plp-predictions.<your-subdomain>.workers.dev`. Put it
in `API_BASE` at the top of [`../assets/predict.js`](../assets/predict.js). That is the
only client-side change needed.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/status` | none | Deadline, server time, open or closed, reveal date |
| POST | `/submit` | edit token when updating | Validate and store an entry |
| GET | `/mine?email=&token=` | edit token | Read one entry back |
| GET | `/picks?email=&token=&key=` | see below | Feeds the season page |
| GET | `/export?key=` | `ADMIN_KEY` | Every entry, shaped for `SEASON_CONFIG` |
| POST | `/admin/reset?key=&email=` | `ADMIN_KEY` | Delete one entry |

## Who can see whose picks

`/picks` is what `pages/2026-2027.html` calls on load, and it decides visibility:

- **After `REVEAL_ISO`** — anybody gets everybody's picks, no credentials needed.
- **With a valid `key`** — you get everybody's, at any time. That is how you preview.
- **With a valid `email` and `token`** — you get your own entry and nothing else.
- **Anything else** — an empty set and `revealed: false`, so the page can explain itself.

The last case is deliberately not an error. A locked page is a normal state.

Emails and edit tokens are never included in a `/picks` response, whichever branch runs.

`REVEAL_ISO` sits at the top of `src/index.js`, set to Sunday 30 May 2027, 18:00 BST. That
is the final day of the season, two hours after the ten simultaneous 16:00 kickoffs, so the
last whistle has gone before anybody sees anybody else's picks.

## How entries are protected

Email is the storage key, so `pred:someone@example.com` holds their entry. On the first
submit the Worker mints a random `editToken`, stores it, and returns it. The browser keeps
it in `localStorage`.

A second submit for the same email must present that token. Without it the Worker returns
`409` and refuses. This stops two things: somebody accidentally wiping their own entry from
a different device, and somebody deliberately overwriting a friend's picks because they
know their email address.

Reads work the same way. `/mine` needs the token, so knowing an email address is not enough
to see what somebody predicted before the deadline.

When somebody loses their token, reset them and let them submit fresh:

```sh
curl -X POST "https://<worker-url>/admin/reset?key=$ADMIN_KEY&email=friend@example.com"
```

## Publishing the season page

After the deadline, export:

```sh
curl -s "https://<worker-url>/export?key=$ADMIN_KEY" > export.json
```

`export.predictions` is already in `SEASON_CONFIG.predictions` shape — club codes, `null`
for skipped picks, keyed by display name. Paste it into `pages/2026-2027.html`.
`export.hot` carries the three free-text answers for the hot takes section, and
`export.meta` holds the email and timestamps, which stay off the published page.

## Changing the deadline

`DEADLINE_ISO` in [`src/index.js`](src/index.js), then `wrangler deploy`. There is a copy
in `assets/predict.js` that drives the countdown, so change both — but only the Worker's
value decides whether a submission is accepted.

`REVEAL_ISO` lives in the same place and only exists here. The client reads it from
`/status` and `/picks`, so there is nothing to keep in step.

## Watching it run

```sh
wrangler tail
```

Unhandled errors are logged there and never sent to the browser.

## Tests

Validation and access control are the only real security boundaries here, so both have
tests. No framework, no dependencies:

```sh
cd worker
node test.mjs         # request validation
node test-access.mjs  # who can see whose picks
```

Run `test.mjs` after any change to `VALID_CODES`, the field limits, or `validate()`. It
covers the roster check, duplicate and overlap rules, length caps, unknown fields, the
angle-bracket rejection, and the normalisation the export relies on.

Run `test-access.mjs` after any change to `/picks` or `REVEAL_ISO`. It is mostly leak
cases: an email with no token, somebody else's token, a wrong admin key. Those are the
failures that would be invisible in normal use.


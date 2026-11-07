# Running it locally

Everything here works with no accounts and no install. The form runs fully without a server,
so start there.

## Serve the site

```sh
cd ~/Documents/GitHub/premier-league-predictons/premier-league-predictons
python3 -m http.server 8000
```

Then open:

| Page | URL |
|---|---|
| The form | http://localhost:8000/predict.html |
| Season directory | http://localhost:8000/ |
| New season page | http://localhost:8000/pages/2026-2027.html |
| Scoring rubric | http://localhost:8000/scoring.html |

**Use `localhost`, not a `file://` path.** Opening the HTML directly mostly works, but Safari
restricts `localStorage` over `file://`, so drafts will silently fail to save and you will
think you found a bug.

## Test the form with no backend

`apiBase` in `assets/config.js` is empty by default. That is a working state, not a broken
one: the form validates, the pickers work, drafts save, and the countdown runs. Pressing
submit prints the payload to the browser console and says plainly that nothing was sent.

So you can check almost everything before touching Cloudflare.

### Worth clicking through

**The top 7 picker**

- Tap seven clubs. They fill 1st through 7th in order, and each chip shows the position it
  took.
- Tap a chosen club again. It comes out, and the next tap refills that gap rather than
  appending to the end.
- Tap the × on a filled row. Same result.
- "Clear all" empties the picker.
- Tab to a chip and press space. It should behave exactly like a tap.

**Cross-picker locking**

- Put Arsenal in the top 7, then look at the relegation grid. Arsenal should be greyed out.
- Remove it from the top 7. It becomes available again.

**Validation** — press submit with each of these and check the panel turns red and scrolls
into view:

- No name, or no email, or a malformed email
- Only five of seven positions filled
- POTY left blank
- Exactly two relegation clubs picked (all three or none is the rule)

Relegation with **zero** picks should submit fine. It is optional.

**Drafts**

- Half-fill the form, then reload. Your picks come back.
- In devtools, look for `plp:draft:2026-2027` under Local Storage.

**The deadline chip** in the header should read something like
`Closes 1 Sep 2026, 23:00 · 11 days left`, in your local timezone.

**Images**

- Every question should show its image. In devtools, block
  `assets/img/2026-2027/poty.jpg` and reload — the question should fall back to a gold card
  reading "2025/26 winner · Bruno Fernandes" rather than showing a broken image.
- Every club should show a badge. All twenty ids are verified against ESPN, so a missing
  or wrong one means an id has drifted.

**Mobile** — narrow the window to about 375px. Chips stay tappable, nothing overflows
sideways, and the submit button goes full width.

## Test the whole thing with a local Worker

You do not need to deploy to try the real deadline, the email upsert or the export. Wrangler
runs the Worker on your machine.

```sh
npm install -g wrangler          # once
cd worker
wrangler dev
```

Wrangler serves on `http://127.0.0.1:8787` and gives you a local KV store automatically, so
no namespace setup is needed for this.

Then set the base URL in `assets/config.js`:

```js
apiBase: 'http://127.0.0.1:8787',
```

Reload the form. Now you can check:

**A first submit** — fill it in and send. You should get "Picks submitted". Look for
`plp:token:2026-2027` in Local Storage.

**An edit** — change a pick and submit again from the same browser. You should get "Picks
updated".

**A conflict** — open the form in a private window, use the same email, and submit. You
should get `409` and a message about using the browser you submitted from. This is the
protection against overwriting somebody else's entry.

**The deadline** — set `DEADLINE_ISO` in `worker/src/index.js` to a past date. Wrangler
reloads by itself. The form should switch to "Submissions are closed", and a direct call
should be refused:

```sh
curl -i -X POST http://127.0.0.1:8787/submit \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"t@example.com","topN":["ARS","LIV","MCI","CHE","MUN","AVL","NEW"],"poty":"Someone"}'
```

Expect `403`. Put the real date back afterwards.

**Clock independence** — with the real deadline restored, move your Mac's clock forward a day.
The countdown should not budge, because it runs on the server's time.

**The export** — submit two or three test entries, then:

```sh
curl -s "http://127.0.0.1:8787/export?key=$ADMIN_KEY" | python3 -m json.tool
```

For `wrangler dev` you can set `ADMIN_KEY` in a local `.dev.vars` file inside `worker/`. Keep
that file out of git.

Then clear your test entries:

```sh
curl -X POST "http://127.0.0.1:8787/admin/reset?key=$ADMIN_KEY&email=t@example.com"
```

## Test the reveal gate

The 2026/27 season page does not contain anybody's picks. It asks the Worker for them, and
before `REVEAL_ISO` the Worker only returns the entry belonging to whoever is asking. Open
http://localhost:8000/pages/2026-2027.html and check:

**As somebody who has submitted** — after submitting through the form in this browser, the
page shows your own row and a notice saying everyone else stays hidden until the reveal date.

**As a stranger** — open the page in a private window. You should see an empty table and a
notice saying picks are locked. Nothing about anybody's picks should appear in view-source
either; that is the whole point of fetching rather than embedding.

**As you** — add your admin key to the URL:

```
http://localhost:8000/pages/2026-2027.html?key=YOUR_ADMIN_KEY
```

Every entry appears, with an "admin preview" notice. The key lands in browser history, so
treat it as a convenience rather than a secret channel.

**After the reveal** — set `REVEAL_ISO` in `worker/src/index.js` to a past date. Wrangler
reloads by itself. Now a private window should see everything with no credentials. Put the
real date back afterwards.

Direct checks, without the page:

```sh
curl -s "http://127.0.0.1:8787/picks" | python3 -m json.tool
curl -s "http://127.0.0.1:8787/picks?key=$ADMIN_KEY" | python3 -m json.tool
```

## Look up a club crest id

Clubs change every summer and their ESPN ids are not guessable. A wrong-but-valid id is worse
than none, because it silently shows another club's badge. Open:

```
http://localhost:8000/test/crest-finder.html
```

It shows every configured club with the badge its current id actually returns, tries ESPN's
public team list, and sweeps a range of ids as a visual grid so you can find a club by eye.
Put what you find into `espnId` in `assets/teams.js`.

## Run the tests

```sh
node test/renderer.mjs             # renderer output, label contract, escaping
cd worker && node test.mjs         # request validation
cd worker && node test-access.mjs  # who can see whose picks
```

Plain Node, no dependencies, under a second each.

Run the renderer test after any change to `scoreboard.js` or `teams.js`. It pins down the
category label strings that the green-tick logic finds by reading text — see
[architecture.md](architecture.md#the-label-contract) for why that matters.

Run `test.mjs` after any change to `VALID_CODES`, the field limits or `validate()`, and
`test-access.mjs` after any change to `/picks` or `REVEAL_ISO`.

## Check you have not broken the season pages

Every season page renders through the same renderer, so one mistake shows up everywhere.
Open two and confirm:

- The matrix opens with the Actual column: final table, relegation, awards.
- Each column header reads a name, a rank and points out of the season maximum.
- The `Actual` button adds a pinned column; pressing it again removes it.
- A name chip hides that person's column, header included.
- Green ticks appear on correct picks only.
- `Hot takes` flips between Disappointment and Surprise.

`node test/renderer.mjs` asserts the arithmetic, the row shape and the markup. It does not
check layout, so the short visual pass above is still worth the thirty seconds.

## Deploy the Worker for real

Only needed when you want friends to actually submit. Full steps are in
[`../worker/README.md`](../worker/README.md). The short version:

```sh
cd worker
wrangler login
wrangler kv namespace create PREDICTIONS   # copy the id into wrangler.toml
wrangler secret put ADMIN_KEY              # long and random
wrangler deploy
```

Put the URL it prints into `apiBase` in `assets/config.js`, then commit and push. GitHub
Pages picks it up from `main`.

## If something looks wrong

| Symptom | Likely cause |
|---|---|
| Form area is blank | A JS error. Open the console. `teams.js` must load before `predict.js` |
| Drafts never save | You opened the page over `file://`, or you are in private browsing |
| A chip has no crest, or the wrong badge | Check `espnId` in `teams.js` against `test/crest-finder.html` |
| Table on a season page is empty | `predictions` is still `{}`, or `teams.js` is not loaded before `scoreboard.js` |
| Green ticks missing | A category label drifted, or the award is absent from `categoryMap`. Run `node test/renderer.mjs` |
| Submit says "no submission endpoint" | `apiBase` in `assets/config.js` is empty. Expected until you set it |
| Submit returns 409 | Working as intended. Reset the entry, or submit from the original browser |
| Countdown looks wrong | `/status` could not be reached, so it fell back to the built-in date |

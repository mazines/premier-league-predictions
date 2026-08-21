# Premier League Predictions

Annual group-chat prediction game. Each season's submissions become a self-contained HTML infographic, scored against actual results.

Live: https://mazzaleen.github.io/premier-league-predictons/ · Submit: [`predict.html`](predict.html) · Rubric: [`scoring.html`](scoring.html)

Static site — no build step. Pushes to `main` auto-deploy via GitHub Pages.

## Docs

| Read this | For |
|---|---|
| [docs/running-locally.md](docs/running-locally.md) | Serving the site, testing the form, running the Worker locally, the tests |
| [docs/architecture.md](docs/architecture.md) | How it is built and why — the data flow, the design decisions, the sharp edges |
| [worker/README.md](worker/README.md) | Deploying the submission endpoint, and its API |

Quickest possible start:

```sh
python3 -m http.server 8000     # then open http://localhost:8000/predict.html
```

The form works with no backend at all, so that is enough to try everything except submitting.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Season directory |
| `predict.html` | Submission form for the current season |
| `scoring.html` | Scoring rubric |
| `pages/YYYY-YYYY.html` | One infographic per season |
| `assets/config.js` | **Worker URL and season.** The one file to edit after deploying |
| `assets/teams.js` | **The club roster.** Single source of truth |
| `assets/scoreboard.js` | Scoring, leaderboard, and the optional table renderer |
| `assets/season-fetch.js` | Fetches the picks for a locked season page, then loads `scoreboard.js` |
| `assets/predict.js` | The form: questions, pickers, validation, submission |
| `assets/styles.css` | Everything except the form |
| `assets/predict.css` | Form only, so the season pages skip it |
| `assets/img/YYYY-YYYY/` | Question images, one directory per season |
| `worker/` | Cloudflare Worker that receives submissions |
| `test/` | Node tests, plus `crest-finder.html` for looking up club crest ids |

## Running a season

**1. Before it starts.** In `assets/teams.js`, move the three relegated clubs into `DEPARTED` and add the three promoted ones. Add `.t-XXX` brand colours to `styles.css` for any club that has not appeared before. Drop the question images into `assets/img/YYYY-YYYY/`. Set `season` in `assets/config.js`, then `DEADLINE_ISO` and `REVEAL_ISO` in `worker/src/index.js` and the matching `DEADLINE_ISO` in `assets/predict.js`. Run `wrangler deploy` and put the URL into `apiBase` in `assets/config.js`.

**2. Collecting.** Share `predict.html`. Entries are keyed on email, so resubmitting replaces instead of duplicating, and the Worker refuses anything after the deadline using its own clock rather than the visitor's.

**3. Through the season.** Nothing to do. The season page fetches the picks itself, and until `REVEAL_ISO` the Worker only hands each visitor their own entry. Add `?key=$ADMIN_KEY` to the page URL to see them all.

**4. When it finishes.** Fill in `actualResults` in `pages/YYYY-YYYY.html`. The leaderboard, the points breakdowns and the green ticks all follow from that.

**5. Then make the page permanent.** Once the picks are public there is no reason for the page to keep depending on the Worker, and a good reason not to: if the Worker ever goes away, the page goes blank. Paste the picks in and it becomes self-contained like the older seasons:

```sh
curl -s "https://<worker-url>/export?key=$ADMIN_KEY" > export.json
```

`export.predictions` already matches the `SEASON_CONFIG.predictions` shape and `export.hot` drives the hot takes cards. Paste both into the page and drop the `season-fetch.js` script tag in favour of `scoreboard.js`.

## Tests

```sh
node test/renderer.mjs           # renderer output, label contract, escaping
cd worker && node test.mjs       # request validation
cd worker && node test-access.mjs  # who can see whose picks
```

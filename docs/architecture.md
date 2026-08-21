# How this is made

A guide to the design, and to why it is built this way. If you only want to get it running,
read [running-locally.md](running-locally.md) instead.

## The problem it solves

The game used to run on a Google Form. Every August that meant the same manual work:

- Screenshot last season's final table.
- Hunt down a photo for each award question.
- Retype the 20 club names, remembering who went up and who went down.
- Transcribe every response by hand into a new `pages/YYYY-YYYY.html`.

That last step was the worst. A season page holds one `<td>` for every participant in every
row, plus a `colspan` that has to be kept in step by hand. Eleven people across sixteen rows
is a lot of cells to type without a mistake.

Three things drive the design:

1. **Entries are tied to an email**, so submitting again replaces instead of duplicating.
2. **Entries stop at a deadline** that nobody can get around by changing their clock.
3. **The roster and the images live in one place**, so next August is a one-file edit.

## Why there is no framework

The 2021/22 page still renders correctly five years on. That is not luck — there is nothing
in it to rot. No build step, no `node_modules`, no framework version to keep current, no
deploy pipeline. Push to `main` and GitHub Pages serves it.

A framework would trade that away, and for what? This is a form that eleven people fill in
once a year.

The separation a framework gives you is here anyway, just without the library:

| Role | Where it lives |
|---|---|
| Model | `assets/teams.js` |
| View | the `QUESTIONS` array and `panelHtml()` in `assets/predict.js` |
| Controller | the `state` object and the delegated event handlers |

The real problem was never structure. It was **duplication** — the same roster typed into
twenty places, the same crest URL copied into hundreds of cells. That is what got fixed, by
making data the source of truth.

## How a submission travels

```
  predict.html
  assets/predict.js          the form. Works with no server at all:
       |                     validates, remembers a draft, shows a countdown
       |  POST /submit
       v
  worker/src/index.js        the only authority on the deadline, on
       |                     one-entry-per-email, and on who may read what
       |  KV.put('pred:<email>')
       v
  Cloudflare KV              one record per person, plus an edit token
       |
       |  GET /picks
       v
  assets/season-fetch.js     asks at view time. Before the reveal date the Worker
       |                     returns only the visitor's OWN entry
       |  merges into SEASON_CONFIG, then loads scoreboard.js
       v
  assets/scoreboard.js       builds the table, the hot takes, the leaderboard,
                             the points breakdowns and the green ticks
```

The client never decides anything that matters. It validates purely so people get an answer
without waiting on a round trip.

`GET /export?key=…` is a separate path for the maintainer: the same data, shaped for pasting
into a page, for inspection and for making the page permanent at the end of the season.

## Why the picks are not in the page

The obvious way to lock a season page would be to ship the picks and hide them with CSS or a
JavaScript flag. That is not locking anything. Anyone can read the page source.

So the picks genuinely are not in `pages/2026-2027.html`. Its `predictions` object ships
empty, and `assets/season-fetch.js` asks the Worker for them when somebody opens the page.
Before `REVEAL_ISO` the Worker hands back only the entry belonging to whoever is asking,
proven by the edit token their browser kept when they submitted. An email address alone gets
nothing, and neither does somebody else's token.

`season-fetch.js` loads `scoreboard.js` itself, after the fetch settles. That was the point of
doing it this way: `scoreboard.js` still just reads `window.SEASON_CONFIG` on load, exactly as
the five older pages need it to, so nothing about it had to change. It also loads
`scoreboard.js` even when the fetch fails, so a network problem gives you an empty table
rather than a blank page.

### The tradeoff, and how to undo it

A fetched page depends on the Worker existing. The five older season pages are self-contained
files that will render in ten years with no infrastructure at all; the 2026/27 page will go
blank if the Worker is ever deleted.

That is worth accepting while the picks need protecting, and worth undoing the moment they do
not. Once a season is public, paste `export.predictions` and `export.hot` into the page and
swap the `season-fetch.js` script tag back to `scoreboard.js`. The page becomes self-contained
like the others, and the Worker becomes irrelevant to it. Step 5 in the README covers it.

## The pieces that stop duplication

**`assets/teams.js`** is the roster, and the only place it exists. It holds each club's
three-letter code, full name and ESPN crest id, and it exports `teamPill()`, which returns
exactly the pill markup the older pages hand-write. The form's chips, the rendered tables
and the relegation stacks all come from it. Next August this is the one file to edit.

**`assets/config.js`** holds the Worker URL and the season. Both the form and the season page
read it, so the URL cannot be right in one place and stale in the other — which was a real
risk when each script had its own copy.

**The `QUESTIONS` array** in `assets/predict.js` is the whole form. Each entry says what
type of control it needs, whether it is required, what help text to show, which image to use,
and which European place each position earns. Add an entry and a new question appears, styled
and validated. There is no markup to write.

**`data-render="auto"`** opts a season page into having its table built from data. See
below.

## Two kinds of season page

Pages up to 2025/26 hand-write their prediction table. Newer ones do not.

A table marked `data-render="auto"` with an empty `<thead>` and `<tbody>` gets built by
`assets/scoreboard.js` from `SEASON_CONFIG`. That removes the per-participant `<td>`
duplication, the hand-maintained `colspan`, and every copied crest URL.
`<section class="commentary" data-render="auto">` does the same for the hot takes cards.

Pages **without** the attribute are skipped entirely, which is why the five older ones keep
working untouched. This was deliberate: the alternative was rewriting five pages that already
worked, to no benefit.

`pages/2026-2027.html` is the one to copy for a new season.

### The label contract

This is the sharpest edge in the codebase, so it is worth understanding.

The green ticks on correct picks are not driven by data attributes. `scoreboard.js` walks the
table and works out what each row means **by reading the category text**:

```js
const posMatch = cat.match(/^(\d+)(st|nd|rd|th)$/);   // "1st", "2nd", ...
if (cat.toLowerCase().startsWith('relegation')) ...
if (cat.startsWith('PFA YPOTY')) key = 'ypoty';       // survives the "(U23)" suffix
else if (categoryMap[cat]) key = categoryMap[cat].key;
```

So those strings — `1st`…`7th`, `Relegation`, `PFA POTY`, `PFA YPOTY`, `Golden Boot`,
`Playmaker`, `Golden Glove`, `MOTY`, `Signing of the Season` — are a contract between the
renderer and the tick-marking. Change one and nothing throws. The ticks just quietly stop
appearing.

`test/renderer.mjs` exists mainly to pin this down. It also checks that a generated Arsenal
pill is byte-identical to the one in `pages/2025-2026.html`.

**When you add an award**, add it to `categoryMap` in `scoreboard.js` too, or its picks will
never be ticked.

## Design decisions worth knowing

### The club picker taps, it does not drag

Most people fill this in on a phone. Drag-and-drop needs a library and behaves badly on
touch. Seven `<select>` elements would need duplicate-prevention wired across all seven.

So: tap a club and it drops into the next open position. Tap it again and it comes out.
Duplicates become impossible by construction rather than by validation. The chips are real
`<button>` elements with `aria-pressed`, so keyboard and screen reader support come free.

Removing a pick leaves a hole rather than shifting the others up. Moving somebody's 5th pick
because they changed their 3rd would be a nasty surprise.

The relegation picker is the same component capped at three, and the two lock each other
out — a club cannot both finish in the top 7 and be relegated.

### The server clock is the only clock

`GET /status` returns the deadline **and the server's current time**. The page computes
`offset = serverNow - clientNow` and runs its countdown on corrected time. Moving your Mac's
clock forward changes nothing.

If `/status` cannot be reached, the form still renders. The Worker rejects a late `POST`
either way, so failing open on *display* costs no integrity and beats showing a dead page.

### Email is the key, so entries need a token

Storing under `pred:<email>` raises two problems. Anyone who knows your address could
overwrite your picks, and anyone could read them before the deadline and copy you.

So the first submit mints a random `editToken`, stores it, and returns it. The browser keeps
it. A second submit for the same email must present that token, or the Worker answers `409`.
Reads work the same way: `/mine` needs the token, so an email address alone reveals nothing.

Lost the token? `POST /admin/reset` clears the entry and they submit fresh.

### Angle brackets are refused outright

This one is not about escaping. The season pages escape on render anyway.

It is about the publishing step. The export gets pasted into an **inline `<script>` block**.
A value containing `</script>` would close that element while the browser parses the HTML,
before any escaping could possibly run. Render-time escaping cannot save you from that.

Rejecting `<` and `>` at the boundary is the only place the hole can actually be closed. It
costs somebody writing "Arsenal > Spurs" a small annoyance, and the error message tells them
what to do.

### Award answers are free text

Scoring compares award picks with strict `===`, so "Mo Salah" and "Mohamed Salah" score
differently. That is a real hazard, and it is tempting to fix it at the input end with a
dropdown or a suggestion list.

That was tried and removed. Any curated player list has to be maintained by hand every
August, and it goes stale mid-season anyway because squads change in every window. The first
version of this form seeded its suggestions from previous seasons' picks, which meant it
confidently offered players who had already left the league. A stale suggestion is worse than
no suggestion: it looks authoritative.

There is also no free, key-less squad API a static site can call, so nothing can keep such a
list current on its own.

So the fields are plain text. The Worker stores exactly what somebody typed and never rewrites
it — silently changing a pick would be worse than an inconsistent spelling. Tidying up happens
at scoring time, once, by a person who can tell that two spellings mean the same player.

If that ever gets tedious, the right place to help is the export: group near-identical names
so `/export` reports "Mo Salah ×3, Mohamed Salah ×1" and the merge becomes one decision
rather than a hunt. Watch the awkward ones either way: Gyökeres, Rúben Amorim, Nico O'Reilly.

### Images degrade instead of breaking

Every hero image carries `onerror`, following the idiom already used site-wide for crests. If
the image fails, it is removed and a data-driven card takes its place showing last season's
winner. A missing image never leaves a question without context.

The relegation question has no photo at all. Its hero is built from `teams.js`: who went down
last season, and who came up.

Clubs with no crest id yet — Coventry and Hull — render as plain coloured chips. Guessing an
ESPN id would be worse than having none, because a wrong-but-valid id shows **another club's
badge**.

## Scoring

| Outcome | Points |
|---|---|
| Right club, exact position | 3 (1 for being in the top N, plus 2 for the position) |
| Right club, wrong position | 1 |
| Every position exact | +2 bonus |
| Each correct relegated club | 1 |
| PFA POTY, PFA YPOTY | 2 each |
| Golden Boot, Playmaker, Golden Glove, MOTY, Signing of the Season | 1 each |

2026/27 tops out at **35**: 7×3 + 2 bonus + 3 relegation + 9 awards.

This model reproduces every previous season exactly — 27, 29, 31, 31, 31 — which is how it
was checked.

Note that Signing of the Season has no official winner. Every other award is decided by the
PFA or the league. This one the group agrees at the end.

## What is deliberately missing

- **No accounts or passwords.** The edit token is enough for a group of friends.
- **No email sending.** Nothing to configure, nothing to get marked as spam.
- **No admin UI.** Two `curl` commands cover export and reset.
- **No CI.** The tests run in under a second locally, and there is nothing to build.
- **No light theme.** The site has always been dark only.

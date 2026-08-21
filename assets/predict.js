// Prediction form for predict.html.
//
// The whole question set is data — edit SEASON, IMG_DIR and QUESTIONS below and the
// form rebuilds itself. Nothing about the markup needs touching from one season to
// the next.
//
// Deliberately vanilla to match the rest of the site: no build step, no modules, no
// dependencies. Reads the roster from assets/teams.js, which must load first.
(function () {
  const cfg = window.PL_TEAMS;
  if (!cfg) return;

  // ---------------------------------------------------------------------------
  // Season configuration — the only part that changes year to year
  // ---------------------------------------------------------------------------
  // Season and the Worker URL come from assets/config.js, so they are set once and
  // shared with the season page. The fallbacks keep this file usable on its own.
  const conf = window.PLP_CONFIG || {};
  const SEASON = conf.season || '2026-2027';
  const API_BASE = conf.apiBase || '';
  const IMG_DIR = 'assets/img/' + SEASON + '/';

  // Cutoff matches the Premier League transfer deadline: Tue 1 Sep 2026, 23:00 BST.
  // BST is UTC+1, so 22:00Z — which is 18:00 ET and 15:00 PT.
  // The server owns the real check — this copy only drives the countdown, and gets
  // corrected against the server's own clock as soon as /status answers.
  const DEADLINE_ISO = '2026-09-01T22:00:00Z';

  const DRAFT_KEY = 'plp:draft:' + SEASON;
  const TOKEN_KEY = 'plp:token:' + SEASON;
  const EMAIL_KEY = 'plp:email:' + SEASON;
  // Remembered so coming back to edit does not mean retyping it. It is a code shared
  // with ten friends, not a password, so keeping it here costs nothing.
  const CODE_KEY = 'plp:code:' + SEASON;

  const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

  const LIMIT = { name: 40, email: 120, award: 60, hot: 600, code: 60 };

  // European qualification hint shown beside each top-7 position, the same way a real
  // league table colours its zones.
  //
  // Worth editing every season: the exact allocation moves around. England can earn a
  // fifth Champions League place on coefficient, and a cup winner who already
  // qualified through the league pushes a Europa or Conference place further down.
  // Treat this as the usual shape, not a guarantee — the note under the question says
  // as much.
  const ZONES = {
    ucl: { short: 'Champions Lg', full: 'Champions League place' },
    uel: { short: 'Europa Lg', full: 'Europa League place' },
    uecl: { short: 'Conference Lg', full: 'Conference League place' },
  };

  // Last season's winners, mirroring actualResults in pages/2025-2026.html. Used
  // only for the hero fallbacks, so a broken or missing image still leaves the
  // question with useful context.
  const LAST_TOP_6 = ['ARS', 'MCI', 'MUN', 'AVL', 'LIV', 'BOU'];

  const QUESTIONS = [
    { type: 'identity' },

    {
      type: 'picker',
      key: 'topN',
      slots: 7,
      ordered: true,
      required: true,
      title: 'Top 7 Prediction',
      help:
        'Tap a club to drop it into the next open position. Tap it again to take it out. ' +
        'All seven positions are required. European places are the usual allocation — cup ' +
        'winners and coefficient places can shift them.',
      // One entry per position, so a changed allocation is a one-line edit.
      zones: ['ucl', 'ucl', 'ucl', 'ucl', 'uel', 'uecl', null],
      hero: 'last-season-table.png',
      heroAlt: 'Final 2025/26 Premier League table, Arsenal first on 85 points',
      fallbackLabel: '2025/26 final top 6',
      fallbackPills: LAST_TOP_6,
    },

    {
      type: 'picker',
      key: 'releg',
      slots: 3,
      ordered: false,
      required: false,
      title: 'Relegation',
      heroMovers: true,
    },

    {
      type: 'text',
      key: 'poty',
      required: true,
      title: 'PFA POTY',
      hero: 'poty.jpg',
      heroAlt: 'Bruno Fernandes holding the 2025/26 PFA Player of the Year trophy',
      fallbackLabel: '2025/26 winner',
      fallbackValue: 'Bruno Fernandes',
    },

    {
      type: 'text',
      key: 'ypoty',
      required: false,
      title: 'PFA YPOTY',
      optionalNote: '(U23)',
      hero: 'ypoty.jpg',
      heroAlt: 'The PFA Young Player of the Year trophy',
      fallbackLabel: '2025/26 winner',
      fallbackValue: "Nico O'Reilly",
    },

    {
      type: 'text',
      key: 'gb',
      required: false,
      title: 'Golden Boot',
      hero: 'golden-boot.jpg',
      heroAlt: 'The Premier League Golden Boot award',
      fallbackLabel: '2025/26 winner',
      fallbackValue: 'Erling Haaland',
    },

    {
      type: 'text',
      key: 'play',
      required: false,
      title: 'Playmaker',
      hero: 'playmaker.jpg',
      heroAlt: 'The Premier League Playmaker award',
      fallbackLabel: '2025/26 winner',
      fallbackValue: 'Bruno Fernandes',
    },

    {
      type: 'text',
      key: 'gg',
      required: false,
      title: 'Golden Glove',
      hero: 'golden-glove.jpg',
      heroAlt: 'The Premier League Golden Glove award',
      fallbackLabel: '2025/26 winner',
      fallbackValue: 'David Raya',
    },

    {
      type: 'text',
      key: 'mgr',
      required: false,
      title: 'MOTY',
      hero: 'moty.jpg',
      heroAlt: 'The Premier League Manager of the Year award',
      fallbackLabel: '2025/26 winner',
      fallbackValue: 'Mikel Arteta',
    },

    {
      type: 'text',
      key: 'sots',
      required: false,
      title: 'Signing of the Season',
      help: 'No official award for this one, so we agree the winner between us at the end.',
      hero: 'signing-of-season.jpg',
      heroAlt: 'Premier League signing of the season',
    },

    {
      type: 'textarea',
      key: 'disappointment',
      required: false,
      title: 'Disappointment',
      help: 'Who or what is going to let us down this season?',
      hero: 'disappointment.png',
      heroAlt: 'Disappointment',
    },

    {
      type: 'textarea',
      key: 'surprise',
      required: false,
      title: 'Surprise',
      help: 'Who or what is going to overperform?',
      hero: 'surprise.gif',
      heroAlt: 'Surprise',
    },

    {
      type: 'textarea',
      key: 'hotTake',
      required: false,
      title: 'Hot Take',
      help: 'Anything else you want on the record before a ball is kicked.',
      hero: 'hot-take.jpg',
      heroAlt: 'Hot take',
    },
  ];

  const PICKERS = QUESTIONS.filter((q) => q.type === 'picker');
  const TEXTISH = QUESTIONS.filter((q) => q.type === 'text' || q.type === 'textarea');

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const state = { name: '', email: '', code: '' };
  PICKERS.forEach((q) => {
    state[q.key] = new Array(q.slots).fill(null);
  });
  TEXTISH.forEach((q) => {
    state[q.key] = '';
  });

  let serverOffset = 0; // serverNow - clientNow, so a wrong device clock cannot matter
  let deadlineIso = DEADLINE_ISO; // replaced by the server's own value once known
  let saveTimer = null;
  let sending = false;

  const form = document.getElementById('predict-form');
  const questionsEl = document.getElementById('questions');
  const resultEl = document.getElementById('form-result');
  const chipEl = document.getElementById('status-chip');
  const closedEl = document.getElementById('closed-panel');
  const submitBtn = document.getElementById('submit-btn');
  if (!form || !questionsEl) return;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function now() {
    return Date.now() + serverOffset;
  }

  function deadlineMs() {
    return new Date(deadlineIso).getTime();
  }

  function isOpen() {
    return now() < deadlineMs();
  }

  function deadlineText(style) {
    return new Date(deadlineIso).toLocaleString(undefined, style);
  }

  // The edit token the Worker issues on a first submit. Holding it is what lets
  // somebody change their own picks later, and stops anyone else changing them.
  function readToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function writeToken(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      // Private browsing. They can still submit; they just cannot edit later
      // from this browser, and the Worker will tell them so.
    }
  }

  // Loose on purpose. The Worker validates properly; this is only to catch typos
  // before somebody waits on a round trip.
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
  }

  function teamName(code) {
    const t = window.TEAMS_BY_CODE[code];
    return t ? t.name : code;
  }

  // ---------------------------------------------------------------------------
  // Markup builders
  // ---------------------------------------------------------------------------
  function heroHtml(q) {
    let html = '';

    if (q.hero) {
      // Matches the site's onerror="this.remove()" idiom, but also reveals the
      // fallback block so the question keeps its context.
      html +=
        '<figure class="q-hero"><img src="' +
        esc(IMG_DIR + q.hero) +
        '" alt="' +
        esc(q.heroAlt || '') +
        '" loading="lazy" onerror="window.plpHeroFailed(this)" /></figure>';
    }

    // Relegation gets a data-driven hero instead of a photo: who went down last
    // season and who came up. Both come straight from assets/teams.js.
    if (q.heroMovers) {
      html +=
        '<div class="q-fallback"><span class="fb-label">Went down 25/26</span>' +
        window.PL_DEPARTED.map((t) => window.teamPill(t.code, { sm: true })).join(' ') +
        '</div>' +
        '<div class="q-fallback"><span class="fb-label">Came up</span>' +
        window.PL_TEAMS.filter((t) => t.promoted)
          .map((t) => window.teamPill(t.code, { sm: true }))
          .join(' ') +
        '</div>';
    }

    if (q.fallbackPills) {
      html +=
        '<div class="q-fallback"' +
        (q.hero ? ' hidden' : '') +
        '><span class="fb-label">' +
        esc(q.fallbackLabel || '') +
        '</span>' +
        q.fallbackPills.map((c) => window.teamPill(c, { sm: true })).join(' ') +
        '</div>';
    }

    if (q.fallbackValue) {
      html +=
        '<div class="q-fallback"' +
        (q.hero ? ' hidden' : '') +
        '><span class="fb-label">' +
        esc(q.fallbackLabel || '') +
        '</span><span class="fb-value">' +
        esc(q.fallbackValue) +
        '</span></div>';
    }

    return html;
  }

  function titleHtml(q) {
    return (
      '<h2 class="q-title">' +
      esc(q.title) +
      (q.required ? '<span class="req" aria-hidden="true">*</span>' : '') +
      (q.optionalNote ? '<span class="opt">' + esc(q.optionalNote) + '</span>' : '') +
      '</h2>'
    );
  }

  function chipsHtml(q) {
    return window.PL_TEAMS.map(
      (t) =>
        '<button type="button" class="club-chip" data-picker="' +
        q.key +
        '" data-code="' +
        t.code +
        '" aria-pressed="false" aria-label="' +
        esc(t.name) +
        '" title="' +
        esc(t.name) +
        '">' +
        window.crestImg(t.code) +
        '<span class="chip-code">' +
        t.code +
        '</span><span class="chip-slot"></span></button>'
    ).join('');
  }

  function slotsHtml(q) {
    const arr = state[q.key];
    const nextIdx = arr.indexOf(null);
    return arr
      .map((code, i) => {
        const label = q.ordered ? ORDINALS[i] : '↓';
        const zoneKey = q.zones ? q.zones[i] : null;
        const zone = zoneKey && ZONES[zoneKey] ? ZONES[zoneKey] : null;

        const cls =
          'slot' +
          (code ? ' is-filled' : '') +
          (i === nextIdx ? ' is-next' : '') +
          (zone ? ' zone-' + zoneKey : '');

        const content = code
          ? window.teamPill(code)
          : '<span class="slot-empty">' + (q.ordered ? 'Tap a club below' : 'Empty') + '</span>';

        // Sits between the pick and the clear button, both of which use margin-left:auto,
        // so the zone label lands to the left of the ×.
        const zoneBadge = zone
          ? '<span class="slot-zone" title="' + esc(zone.full) + '">' + esc(zone.short) + '</span>'
          : '';

        const clear = code
          ? '<button type="button" class="slot-clear" data-picker="' +
            q.key +
            '" data-idx="' +
            i +
            '" aria-label="Remove ' +
            esc(teamName(code)) +
            '">×</button>'
          : '';

        return (
          '<li class="' +
          cls +
          '"><span class="slot-num" aria-hidden="true">' +
          label +
          '</span>' +
          content +
          zoneBadge +
          clear +
          '</li>'
        );
      })
      .join('');
  }

  function panelHtml(q) {
    if (q.type === 'identity') {
      return (
        '<section class="q-panel" data-panel="identity">' +
        '<h2 class="q-title">About you</h2>' +
        '<div class="field">' +
        '<label class="field-label" for="f-name">Name<span class="req" aria-hidden="true">*</span></label>' +
        '<input class="field-input" id="f-name" name="name" type="text" data-key="name" ' +
        'maxlength="' +
        LIMIT.name +
        '" autocomplete="name" required placeholder="How you show up on the table" />' +
        '</div>' +
        '<div class="field">' +
        '<label class="field-label" for="f-email">Email<span class="req" aria-hidden="true">*</span></label>' +
        '<input class="field-input" id="f-email" name="email" type="email" data-key="email" ' +
        'maxlength="' +
        LIMIT.email +
        '" autocomplete="email" inputmode="email" required placeholder="you@example.com" />' +
        '</div>' +
        '<div class="field">' +
        '<label class="field-label" for="f-code">Group code<span class="req" aria-hidden="true">*</span></label>' +
        '<input class="field-input" id="f-code" name="code" type="password" data-key="code" ' +
        'maxlength="' +
        LIMIT.code +
        '" autocomplete="off" required placeholder="Ask Mazine if you do not have it" />' +
        '<p class="field-hint">Keeps the form to our group. Same code for everyone.</p>' +
        '</div>' +
        '<p class="q-error" id="err-identity" role="alert" hidden></p>' +
        '</section>'
      );
    }

    if (q.type === 'picker') {
      return (
        '<section class="q-panel" data-panel="' +
        q.key +
        '">' +
        titleHtml(q) +
        '<p class="q-help">' +
        esc(q.help) +
        '</p>' +
        heroHtml(q) +
        '<ol class="slot-list" id="slots-' +
        q.key +
        '">' +
        slotsHtml(q) +
        '</ol>' +
        '<div class="picker-head">' +
        '<span class="picker-count" id="count-' +
        q.key +
        '" aria-live="polite"></span>' +
        '<button type="button" class="btn btn-sm" data-clear-all="' +
        q.key +
        '">Clear all</button>' +
        '</div>' +
        '<div class="club-grid" id="grid-' +
        q.key +
        '" role="group" aria-label="' +
        esc(q.title) +
        ' club choices">' +
        chipsHtml(q) +
        '</div>' +
        '<p class="q-error" id="err-' +
        q.key +
        '" role="alert" hidden></p>' +
        '</section>'
      );
    }

    // Award answers are deliberately free text with no suggestion list. Any curated
    // list of players goes stale within a season — squads change every window — and
    // maintaining one every August is exactly the chore this project exists to
    // remove. Inconsistent spellings get tidied up at scoring time instead.
    const control =
      q.type === 'textarea'
        ? '<textarea class="field-input" id="f-' +
          q.key +
          '" name="' +
          q.key +
          '" data-key="' +
          q.key +
          '" maxlength="' +
          LIMIT.hot +
          '" rows="3" placeholder="Say your piece"></textarea>'
        : '<input class="field-input" id="f-' +
          q.key +
          '" name="' +
          q.key +
          '" type="text" data-key="' +
          q.key +
          '" maxlength="' +
          LIMIT.award +
          '" autocomplete="off" placeholder="Name" />';

    return (
      '<section class="q-panel" data-panel="' +
      q.key +
      '">' +
      titleHtml(q) +
      // Most awards need no explanation beyond their title.
      (q.help ? '<p class="q-help">' + esc(q.help) + '</p>' : '') +
      heroHtml(q) +
      '<div class="field">' +
      '<label class="field-label" for="f-' +
      q.key +
      '">' +
      esc(q.title) +
      '</label>' +
      control +
      '</div>' +
      '<p class="q-error" id="err-' +
      q.key +
      '" role="alert" hidden></p>' +
      '</section>'
    );
  }

  // ---------------------------------------------------------------------------
  // Picker behaviour
  // ---------------------------------------------------------------------------
  // Codes locked out of a given picker because another picker already uses them —
  // a club cannot both finish in the top 7 and be relegated.
  function lockedFor(key) {
    const locked = {};
    PICKERS.forEach((p) => {
      if (p.key === key) return;
      state[p.key].forEach((c) => {
        if (c) locked[c] = true;
      });
    });
    return locked;
  }

  function refreshPicker(q) {
    const arr = state[q.key];

    const slots = document.getElementById('slots-' + q.key);
    if (slots) slots.innerHTML = slotsHtml(q);

    const locked = lockedFor(q.key);
    const filled = arr.filter(Boolean).length;
    const full = filled === q.slots;

    const grid = document.getElementById('grid-' + q.key);
    if (grid) {
      grid.querySelectorAll('.club-chip').forEach((chip) => {
        const code = chip.dataset.code;
        const at = arr.indexOf(code);
        const picked = at !== -1;
        chip.setAttribute('aria-pressed', picked ? 'true' : 'false');
        // A full picker still lets you tap a picked club to remove it.
        chip.disabled = !!locked[code] || (full && !picked);
        const badge = chip.querySelector('.chip-slot');
        if (badge) badge.textContent = picked ? (q.ordered ? ORDINALS[at] : '✓') : '';
      });
    }

    const count = document.getElementById('count-' + q.key);
    if (count) count.textContent = filled + ' of ' + q.slots + ' chosen';
  }

  function refreshAllPickers() {
    PICKERS.forEach(refreshPicker);
  }

  function toggleClub(key, code) {
    const q = PICKERS.filter((p) => p.key === key)[0];
    if (!q) return;
    const arr = state[key];

    const at = arr.indexOf(code);
    if (at !== -1) {
      // Already chosen here, so this tap removes it. Leave the hole where it was
      // rather than shifting the other picks up — moving somebody's 5th pick
      // because they changed their 3rd would be a nasty surprise.
      arr[at] = null;
    } else {
      if (lockedFor(key)[code]) return;
      const free = arr.indexOf(null);
      if (free === -1) return;
      arr[free] = code;
    }

    // The other picker's lockouts change too, so refresh both.
    refreshAllPickers();
    clearError(key);
    saveDraft();
  }

  function clearSlot(key, idx) {
    const arr = state[key];
    if (!arr || idx < 0 || idx >= arr.length) return;
    arr[idx] = null;
    refreshAllPickers();
    clearError(key);
    saveDraft();
  }

  function clearAll(key) {
    const arr = state[key];
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) arr[i] = null;
    refreshAllPickers();
    clearError(key);
    saveDraft();
  }

  // ---------------------------------------------------------------------------
  // Draft persistence
  // ---------------------------------------------------------------------------
  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      } catch (e) {
        // Private browsing or a full quota. The form still works, it just will
        // not remember anything, so there is nothing useful to tell the user.
      }
    }, 300);
  }

  // Returns true when a draft was restored. The caller needs to know, because an
  // unsubmitted draft is newer than anything the server holds.
  function loadDraft() {
    let saved;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      saved = JSON.parse(raw);
    } catch (e) {
      return false; // Corrupt draft — start clean rather than break the page.
    }
    if (!saved || typeof saved !== 'object') return false;

    Object.keys(state).forEach((k) => {
      if (!(k in saved)) return;
      if (Array.isArray(state[k])) {
        const from = Array.isArray(saved[k]) ? saved[k] : [];
        for (let i = 0; i < state[k].length; i++) {
          // Re-check every code against the current roster. A draft left over
          // from a previous season could name a club that has since gone down.
          state[k][i] = window.TEAMS_BY_CODE[from[i]] ? from[i] : null;
        }
      } else if (typeof saved[k] === 'string') {
        state[k] = saved[k];
      }
    });

    return true;
  }

  function applyStateToInputs() {
    // Scoped to real controls. The question sections carry data-panel, not
    // data-key, so they cannot be caught by this.
    questionsEl.querySelectorAll('input[data-key], textarea[data-key]').forEach((el) => {
      const k = el.dataset.key;
      if (typeof state[k] === 'string') el.value = state[k];
    });
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  function validate() {
    const errors = [];

    if (!state.name.trim()) {
      errors.push({ key: 'identity', msg: 'Please enter your name.' });
    } else if (!isEmail(state.email)) {
      errors.push({ key: 'identity', msg: 'Please enter a valid email address.' });
    } else if (!state.code.trim()) {
      errors.push({ key: 'identity', msg: 'Please enter the group code.' });
    }

    PICKERS.forEach((q) => {
      const picked = state[q.key].filter(Boolean).length;
      if (q.required && picked < q.slots) {
        errors.push({
          key: q.key,
          msg: 'Please fill all ' + q.slots + ' positions — ' + picked + ' so far.',
        });
      } else if (!q.required && picked !== 0 && picked !== q.slots) {
        errors.push({
          key: q.key,
          msg: 'Pick all ' + q.slots + ' or leave it empty — ' + picked + ' so far.',
        });
      }
    });

    TEXTISH.forEach((q) => {
      if (q.required && !state[q.key].trim()) {
        errors.push({ key: q.key, msg: q.title + ' is required.' });
      }
    });

    return errors;
  }

  function clearError(key) {
    const el = document.getElementById('err-' + key);
    if (el) {
      el.hidden = true;
      el.textContent = '';
    }
    const panel = questionsEl.querySelector('[data-panel="' + key + '"]');
    if (panel) panel.classList.remove('has-error');
  }

  function clearAllErrors() {
    questionsEl.querySelectorAll('.q-error').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
    });
    questionsEl.querySelectorAll('.q-panel').forEach((p) => p.classList.remove('has-error'));
    questionsEl.querySelectorAll('.is-invalid').forEach((i) => i.classList.remove('is-invalid'));
  }

  function showErrors(errors) {
    clearAllErrors();
    errors.forEach((e) => {
      const el = document.getElementById('err-' + e.key);
      if (el) {
        el.textContent = e.msg;
        el.hidden = false;
      }
      const panel = questionsEl.querySelector('[data-panel="' + e.key + '"]');
      if (panel) panel.classList.add('has-error');
    });

    if (!errors.length) return;
    const first = questionsEl.querySelector('[data-panel="' + errors[0].key + '"]');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------------------------------------------------------------------------
  // Payload
  // ---------------------------------------------------------------------------
  // Flat on purpose: the shape mirrors a SEASON_CONFIG.predictions entry so the
  // Worker's /export endpoint can hand back something ready to paste.
  function buildPayload() {
    const p = {
      season: SEASON,
      name: state.name.trim(),
      email: state.email.trim().toLowerCase(),
      topN: state.topN.slice(),
      // Travels with the entry but is not part of it. The Worker checks it, strips it,
      // and never stores it.
      code: state.code.trim(),
    };

    const releg = state.releg.filter(Boolean);
    p.releg = releg.length === 3 ? releg : null;

    TEXTISH.forEach((q) => {
      p[q.key] = state[q.key].trim() || null;
    });

    return p;
  }

  // ---------------------------------------------------------------------------
  // Talking to the Worker
  // ---------------------------------------------------------------------------
  function showResult(kind, html) {
    if (!resultEl) return;
    resultEl.className = 'form-result is-' + kind;
    resultEl.innerHTML = html;
    resultEl.hidden = false;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Corrects the local clock against the server's and picks up the authoritative
  // deadline. If it fails we deliberately carry on: the Worker rejects a late POST
  // regardless, so a dead /status should not mean a dead page.
  function syncStatus() {
    if (!API_BASE) return Promise.resolve();
    return fetch(API_BASE + '/status', { method: 'GET' })
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.ok) return;
        if (data.now) serverOffset = new Date(data.now).getTime() - Date.now();
        if (data.deadline) deadlineIso = data.deadline;
        renderChip();
        if (!isOpen()) showClosed();
      })
      .catch(() => {
        // Offline, or the Worker is not deployed yet. Leave the built-in deadline
        // in place and let the server have the final say on submit.
      });
  }

  // Pulls a previously submitted entry back into the form. Needs the edit token, so
  // this only ever works for the person who submitted from this browser.
  //
  // Skipped when a local draft exists: a draft only survives if it has NOT been
  // submitted, so those edits are newer than anything the server holds and must win.
  function loadExisting(hadDraft) {
    if (hadDraft) return;

    const token = readToken();
    let email = '';
    try {
      email = localStorage.getItem(EMAIL_KEY) || '';
    } catch (e) {
      email = '';
    }
    if (!API_BASE || !token || !email) return;

    fetch(
      API_BASE + '/mine?email=' + encodeURIComponent(email) + '&token=' + encodeURIComponent(token)
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.ok || !data.entry) return;
        applyEntry(data.entry);
        applyStateToInputs();
        refreshAllPickers();
        showResult(
          'ok',
          '<strong>Welcome back.</strong> These are the picks you already submitted. ' +
            'Change anything you like and submit again to replace them.'
        );
      })
      .catch(() => {
        // Offline or reset server-side. The blank form is a fine fallback.
      });
  }

  // Copies a stored entry into state, re-checking club codes against the current
  // roster the same way loadDraft does.
  function applyEntry(entry) {
    if (typeof entry.name === 'string') state.name = entry.name;
    if (typeof entry.email === 'string') state.email = entry.email;

    PICKERS.forEach((q) => {
      const from = Array.isArray(entry[q.key]) ? entry[q.key] : [];
      for (let i = 0; i < state[q.key].length; i++) {
        state[q.key][i] = window.TEAMS_BY_CODE[from[i]] ? from[i] : null;
      }
    });

    TEXTISH.forEach((q) => {
      state[q.key] = typeof entry[q.key] === 'string' ? entry[q.key] : '';
    });
  }

  function send(payload) {
    const token = readToken();
    if (token) payload.token = token;

    return fetch(API_BASE + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) =>
      res
        .json()
        .catch(() => ({ ok: false, error: 'The server sent back something unreadable.' }))
        .then((data) => ({ status: res.status, data: data }))
    );
  }

  function onSent(result, payloadEmail) {
    const data = result.data || {};

    if (data.ok) {
      if (data.token) writeToken(data.token);
      try {
        // Remember the email so a later visit can pull the entry back, keep the group
        // code so editing does not mean retyping it, and drop the draft because the
        // server copy is the record now.
        localStorage.setItem(EMAIL_KEY, payloadEmail);
        localStorage.setItem(CODE_KEY, state.code.trim());
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        // Nothing to clean up.
      }
      showResult(
        'ok',
        '<strong>' +
          (data.updated ? 'Picks updated.' : 'Picks submitted.') +
          '</strong> Thanks' +
          (data.name ? ', ' + esc(data.name) : '') +
          '. You can come back and change them any time before the deadline — ' +
          'from this browser.'
      );
      return;
    }

    if (result.status === 409) {
      showResult(
        'err',
        '<strong>Already submitted.</strong> ' +
          esc(data.error || '') +
          ' If you have switched phone or browser, ask Mazine to reset your entry.'
      );
      return;
    }

    // A wrong group code is also a 403, so check it before the closed-for-business
    // branch below. Otherwise a mistyped code would wrongly claim submissions had shut.
    if (data.badCode) {
      showErrors([{ key: 'identity', msg: data.error || 'Wrong group code.' }]);
      showResult('err', '<strong>Not saved.</strong> ' + esc(data.error || 'Wrong group code.'));
      return;
    }

    if (result.status === 403 || data.closed) {
      renderChip();
      showClosed();
      return;
    }

    showResult('err', '<strong>Not saved.</strong> ' + esc(data.error || 'Please try again.'));
  }

  // ---------------------------------------------------------------------------
  // Deadline chip
  // ---------------------------------------------------------------------------
  function humanLeft(ms) {
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return mins + (mins === 1 ? ' minute' : ' minutes');
    const hours = Math.floor(mins / 60);
    if (hours < 48) return hours + (hours === 1 ? ' hour' : ' hours');
    return Math.floor(hours / 24) + ' days';
  }

  function renderChip() {
    if (!chipEl) return;
    const open = isOpen();
    const left = deadlineMs() - now();
    const when = deadlineText({ dateStyle: 'medium', timeStyle: 'short' });

    if (open) {
      chipEl.className = 'status-chip';
      chipEl.innerHTML =
        'Closes ' + esc(when) + ' · <span class="chip-count">' + humanLeft(left) + ' left</span>';
    } else {
      chipEl.className = 'status-chip is-closed';
      chipEl.textContent = 'Submissions closed ' + when;
    }
    chipEl.hidden = false;

    // The deadline can pass while the page sits open, so keep the button honest.
    if (submitBtn && !sending) submitBtn.disabled = !open;
  }

  function showClosed() {
    if (!closedEl) return;
    closedEl.innerHTML =
      '<h2>Submissions are closed</h2>' +
      '<p>The deadline was ' +
      esc(deadlineText({ dateStyle: 'full', timeStyle: 'short' })) +
      '.</p>' +
      '<p>Head to <a href="pages/' +
      SEASON +
      '.html">the 2026/27 table</a> to see what everyone went for.</p>';
    closedEl.hidden = false;
    form.hidden = true;
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  function render() {
    questionsEl.innerHTML = QUESTIONS.map(panelHtml).join('');
    applyStateToInputs();
    refreshAllPickers();
    form.hidden = false;
  }

  // Referenced from the inline onerror on each hero image. Drops the broken
  // image and reveals the data-driven fallback that follows it, if there is one.
  window.plpHeroFailed = function (img) {
    const figure = img.closest('.q-hero');
    if (!figure) return;
    const next = figure.nextElementSibling;
    if (next && next.classList.contains('q-fallback')) next.hidden = false;
    figure.remove();
  };

  questionsEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.club-chip');
    if (chip && !chip.disabled) {
      toggleClub(chip.dataset.picker, chip.dataset.code);
      return;
    }
    const clear = e.target.closest('.slot-clear');
    if (clear) {
      clearSlot(clear.dataset.picker, Number(clear.dataset.idx));
      return;
    }
    const all = e.target.closest('[data-clear-all]');
    if (all) clearAll(all.dataset.clearAll);
  });

  questionsEl.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.key) return;
    if (typeof state[el.dataset.key] !== 'string') return;
    state[el.dataset.key] = el.value;
    el.classList.remove('is-invalid');
    clearError(el.dataset.key);
    clearError('identity');
    saveDraft();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (sending) return;

    if (!isOpen()) {
      showClosed();
      return;
    }

    const errors = validate();
    showErrors(errors);
    if (errors.length) return;

    const payload = buildPayload();

    // No Worker configured yet. The form is still fully usable offline, so hand the
    // payload over rather than pretending to save it.
    if (!API_BASE) {
      console.log('[predict] no apiBase set — payload was:', payload);
      showResult(
        'err',
        '<strong>Not sent.</strong> No submission endpoint is configured yet. ' +
          'Set <code>apiBase</code> in <code>assets/config.js</code> to the Worker URL. ' +
          'Your payload is in the browser console.'
      );
      return;
    }

    sending = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    send(payload)
      .then((result) => onSent(result, payload.email))
      .catch(() => {
        showResult(
          'err',
          '<strong>Could not reach the server.</strong> Check your connection and try again — ' +
            'your answers are still saved in this browser.'
        );
      })
      .then(() => {
        sending = false;
        if (submitBtn) {
          submitBtn.textContent = 'Submit predictions';
          submitBtn.disabled = !isOpen();
        }
      });
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  const hadDraft = loadDraft();

  // A draft carries the group code with it, but a draft is cleared on a successful
  // submit. So on a later visit fall back to the remembered code, otherwise somebody
  // editing their picks would have to go and ask for it again.
  if (!state.code) {
    try {
      state.code = localStorage.getItem(CODE_KEY) || '';
    } catch (e) {
      // Private browsing. They will have to type it.
    }
  }

  render();
  renderChip(); // also sets the submit button's disabled state
  setInterval(renderChip, 30000);
  if (!isOpen()) showClosed();
  syncStatus().then(() => loadExisting(hadDraft));
})();

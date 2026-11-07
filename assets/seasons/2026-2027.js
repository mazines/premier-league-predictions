// Season data — 2026/27.
// Loaded by pages/2026-2027.html and by index.html, so the season page and the
// home tiles read the same numbers.
window.SEASONS = window.SEASONS || {};
window.SEASONS['2026-2027'] = {
        topN: 7,
        hasReleg: true,
        hasMegaBonus: true,
        awards: [
          { key:'poty',  label:'PFA POTY',              max:2 },
          { key:'ypoty', label:'PFA YPOTY',             max:2, note:'(U23)' },
          { key:'gb',    label:'Golden Boot',           max:1 },
          { key:'play',  label:'Playmaker',             max:1 },
          { key:'gg',    label:'Golden Glove',          max:1 },
          { key:'mgr',   label:'MOTY',                  max:1 },
          { key:'sots',  label:'Signing of the Season', max:1 },
        ],

        // Fill these in once the season finishes. Leaving them out keeps the Actual
        // column showing a dash and the leaderboard showing no ranks.
        actualResults: {},

        // Left empty on purpose. assets/season-fetch.js fills both from the Worker at
        // view time — before the reveal date it only ever gets the visitor's own entry.
        // Nothing about anybody else's picks lives in this file.
        predictions: {},
        hot: {},
      };

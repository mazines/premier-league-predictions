// Shared runtime configuration.
//
// This is the one file to edit after deploying the Worker. Both the form
// (assets/predict.js) and the season page (assets/season-fetch.js) read from here, so
// the URL cannot end up correct in one place and stale in the other.
//
// Leave apiBase empty to run everything offline: the form stays fully usable and logs
// its payload to the console, and a season page simply shows its empty state.
(function () {
  window.PLP_CONFIG = {
    // Base URL of the Cloudflare Worker, with no trailing slash.
    // Printed by `wrangler deploy` — see worker/README.md.
    // For a local `wrangler dev` run, swap in 'http://127.0.0.1:8787'.
    apiBase: 'https://plp-predictions.mazzaleen.workers.dev',

    season: '2026-2027',
  };
})();

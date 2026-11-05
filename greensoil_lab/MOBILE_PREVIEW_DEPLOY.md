# GreenSoil Mobile Preview — deployment safety

This is a **synthetic-data, read-only demo**. It is not the live GreenSoil
Intelligence report, does not authenticate to TradingView, and cannot place
orders. NIFTY/SENSEX levels initially shown on the static site are **invented
demo values**. Back-end `/greensoil/api/*` routes are **not deployed** by the
static Pages build. Therefore automated baseline/watch/revisions will show
unavailable in the demo, by design.

## Status and activation

- CI creates a portable `greensoil-mobile-preview-demo` artifact, including
  an `index.html` suitable for static hosting. No hosting is enabled by CI.
- `.github/workflows/greensoil-manual-pages.yml` may deploy this artifact to
  GitHub Pages **only after a person triggers it**. It has **no push trigger**.
- GitHub Pages is configured per repository. Deploying this workflow would
  replace whatever site that repository currently hosts. **Before manually
  running it, check Settings > Pages for any existing site. Do not run if one
  must be preserved.** Instead use a separate, dedicated demo repository/site.
- On a public repository, the preview will generally be publicly accessible;
  **never paste API keys, account information, broker credentials, or personal
  data** into the report JSON field.
- If Pages is available, enable workflow-based Pages source under
  Settings > Pages. The manual workflow uses the `github-pages` environment.
  Branch `greens-oil/paper-lab` source files are checked out explicitly.
- This setup does not require Railway or a paid market-data subscription.
  GitHub's repository and organization settings may affect Pages availability.

## Verified vs unverified

The GitHub Actions CI tests building and bundling the preview only. The mobile
Chrome runtime, actual hosted URL, device navigation, permissions, and
real-market feed remain unverified until a separate site is activated and
tested.

Never infer a live data feed, a trading signal or a profit forecast from this
demo. Production bot, Pine and Railway are out of scope.

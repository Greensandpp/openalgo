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
- `.github/workflows/greensoil-manual-pages.yml` contains a deploy job
  explicitly gated by repository variable `GREENSOIL_PAGES_APPROVED=true`.
  Without that opt-in, the job skips on all pushes. Do not set it until
  existing Pages settings have been checked. This workflow also declares
  `workflow_dispatch`, though dispatch availability on a non-default branch
  can be limited by GitHub.
- GitHub Pages is configured per repository. Enabling the repository variable
  and then pushing a commit to the lab branch can activate a Pages deployment.
  Deploying this workflow would
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

## Mobile demo QA (November 2026)

Compact collapsible detail panels, a dark chart preview and an explicit
synthetic-data watermark improve phone readability. Live feeds remain absent.

## V2 reactive core status

- CSS plus 2D canvas glittering/reactive core replaces old hero orb in isolated static preview.
- Touch interaction changes visual state; micro-animations are **simulated**, not a
  connected AI process or proof of market-data analysis.
- Type a question for a browser text-to-speech demo. Optional user-initiated
  microphone uses the browser speech-recognition service where available.
  It may send audio to that browser's speech service; no background mic capture.
- Queries about targets and entry fail closed with NO TRADE because no trusted live
  market feed or voice AI model is attached to GitHub Pages.
- Reduced motion / tab suspension suspend canvas animation.

## V2 mobile QA patch

- Orb touch now emits a visual pulse only, not a simulated microphone ON state.
- Actual listening is reserved for user-initiated Use mic permission.
- Mobile reactor reserves space for status below animated sphere to avoid overlap.

## V3 Obsidian visual refresh

- Midnight graphite/black, warm bronze/gold, and restrained magenta replaces blue-heavy panels.
- Existing CE/PE chart colors retain their meaning and synthetic-data disclaimer remains visible.
- No trading execution, private API credentials, or paid services are introduced.

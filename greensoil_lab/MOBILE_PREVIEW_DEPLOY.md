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

## V4 reactor visual implementation

- Refined cinematic holographic reactor with gold/magenta segmented rings, 220 animated glitter particles, sweeps and a hot energy core.
- Reduced oversized shaded-ball look; compacted phone hero spacing while retaining reduced-motion support.
- All animation is decorative; microphone mode only starts after explicit Use mic action. Live data remains unavailable.

## V5 selected core — Plasma

- User chose #12 Plasma Core rather than flat 2D cartoon styling.
- Live canvas draws 380 orange/gold glitter particles, moving curved plasma filaments and segmented holographic orbits; CSS enhances core depth.
- Supports existing IDLE/LISTENING/THINKING/SPEAKING; renderer includes future PROCESSING/COMPLETED presentation modes. No real AI engine or market-data claims.
- Static Pages read-only PAPER demo only; production services untouched.

## V6 — JARVIS-first full-screen prototype (2026-11-06)

- Home shows a large animated plasma core with no chart clutter.
- Mobile-friendly fixed bottom command bar supports text and explicit tap-to-start browser mic.
- Offline local command routing: trading mode, NIFTY or SENSEX chart, return to home.
- Switching to trading mode reveals synthetic PAPER chart data only; no real market calls or order execution.
- Optional sound effects and browser text-to-speech; reduced motion available.
- User JSON theme import applies validated colors, geometry metadata and 80–800 particle count, with browser-local save, export and reset.
- HTML import is visual preview ONLY: sandboxed iframe with a restrictive CSP, no scripts, external network or app code execution.
- A separate Railway Gemini staging gateway has passed a real Gemini 3.5 Flash-Lite one-shot generation check, but is **not yet connected to this static Pages UI**, which has no public authenticated gateway pairing. Do not claim this browser uses a live AI brain.
- Existing Railway production services, bots and Pine indicators are untouched.


## V6.1 — Private Gemini pairing (2026-11-06)

- Isolated Railway gateway successfully generated a real Gemini 3.5 Flash-Lite response.
- Private staging service domain: https://jarvis-gemini-gateway-staging.up.railway.app/
- Gateway uses strong separate `GATEWAY_ACCESS_TOKEN` in Railway Variables; Google API key stays server-side.
- Public website supports manual pairing via Settings. Access token stays in React memory only and is cleared on refresh; never embedded in site JavaScript, repository files, localStorage or exported presets.
- Authenticated config handshake and chat are limited by strict exact origin, server-side bearer checks, and conservative per-process rate/daily quotas.
- Market data and news are still unavailable; charts remain synthetic and trade execution disabled.
- Successful isolated API smoke probe does not prove browser pairing works on every phone; end-to-end mobile QA pending.

## V6.2 — Vertical chart maximization

- Maximize button is physically below NIFTY/SENSEX chart, with an accessible Minimize control and Close button.
- The chart fills the browser visual viewport vertically on Android/mobile. Browser OS navigation and Chrome toolbar cannot be hidden by CSS; this is a full-viewport overlay, not forced native browser fullscreen.
- Chart lifecycle reinitializes when expanded/collapsed to measure new dimensions; Escape key also exits.
- Synthetic PAPER chart remains synthetic; no production, live market feed, broker or Railway changes.

## V6.3 — Voice configuration and plasma states

- Settings: voice engine selection, available device voices, pace controls, optional ElevenLabs.
- Plasma has different listening, thinking, processing, speaking, completed animation profiles.
- Gateway supports optional disabled-by-default ElevenLabs authenticated TTS with tight per-process daily caps, but no ElevenLabs API key is configured.
- Public website cannot claim ElevenLabs connected, and always falls back to device browser voice.
- No paid billing upgrades or production broker changes.

## V6.3 — ElevenLabs voice readiness / mobile bugfix

- Optional ElevenLabs free-plan-compatible Flash v2.5 TTS path stays disabled without a dedicated ElevenLabs API key and selected free-tier-accessible voice ID.
- Browser device voice remains the default fallback. Voice provider/voice choice/speed remain editable in Settings.
- Fixed trailing-slash removal in optional audio endpoint URL; endpoint now resolves to the private Railway gateway correctly when pairing is enabled.
- User-facing provider label no longer suggests the voice is already live; no actual ElevenLabs credits used or API requests made.
- Existing read-only PAPER demo, mobile fullscreen chart, no broker orders, separate Railway production and AIRA remain unchanged.

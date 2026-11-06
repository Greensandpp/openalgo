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

## V6.4 Deployment — 2026-11-06

Publish the latest compiled PAPER preview with Voice engine Settings, ElevenLabs optional TTS selection, browser voice fallback, correct private TTS URL and chart fullscreen controls. API keys are not bundled. Actual ElevenLabs phone playback still requires testing. Production systems untouched.

## V6.5 — synchronized Brian voice + AI states

- Speech recognition starts listening state; after transcription Gemini request shows thinking.
- Processing/completed animation transitions precede ElevenLabs speech and only return to idle on audio ending.
- Stop voice cancels mic, queued state timers, pending AI/TTS network requests and active audio; stale async callbacks cannot resume the core.
- Browser voice remains a safe fallback, Brian remains the selected ElevenLabs service voice, no market/news feed or broker orders added.
- New frontend TypeScript gate passed; actual mobile state transition QA still pending.

## V6.6 — settings persistence

- Voice provider (ElevenLabs Brian or browser), speech toggle, voice rate and UI motion/sound preferences auto-save in localStorage. Credentials are NEVER put in localStorage.
- Gateway access token stays in React memory unless the user explicitly chooses Remember this browser tab; in that case the separate bearer token alone is stored in sessionStorage, restored on same-tab reload, and must be revalidated by pressing Connect Gemini. Tab/session close discards it; Disconnect clears it.
- Google/ElevenLabs provider API keys remain server-side in Railway. No auto-login across browser/tab restarts, no paid billing and no broker changes.
- Frontend TypeScript validation passed. Mobile reload testing pending.

## V6.7 — Multilingual voice and text navigation

- Local offline intent parser handles common natural Tamil/Tanglish/English chart commands: NIFTY/SENSEX open, trading mode activation and return to JARVIS core.
- Trading-mode activation keeps current selected index, rather than always reverting to NIFTY.
- High-stakes live next-target/new-entry/option premium questions are explicitly blocked with NO TRADE when trusted NSE/news feeds are missing; unknown general conversation goes only to separately paired Gemini.
- Automated 28-case intent tests plus TypeScript gate PASS. Actual on-device mic transcription QA remains pending.
- Brian ElevenLabs configuration, secure gateway pairing, all saved settings and production trading services untouched.

## V6.8 — encrypted remember-this-device pairing

- Brian/ElevenLabs is the new voice provider default for first-time visitors; existing saved preferences continue to win.
- On explicit saved-device opt-in (checked by default on a personal phone), the separate Railway gateway access token is encrypted with AES-GCM and a nonexportable browser key persisted in IndexedDB, and revalidated automatically on future visits. Gemini and ElevenLabs provider API keys never leave Railway.
- The storage design limits casual raw storage exposure but is not protection from malicious same-origin scripts, stolen unlocked browser sessions or a compromised phone. Clearing browser site data, incognito or changed phone/browser requires pairing again. Disconnect & forget clears persistent and tab pairing.
- Auto-pairing validates the fixed separate Railway staging gateway and the disabled-trading flag before reporting connected; no production services altered. Existing free-tier quotas preserved.
- TypeScript and command routing CI PASS; real device persistence test still required.

## V6.9 — JARVIS welcome and animated emerald reactor

- Device-local time-aware Good morning/afternoon/evening Boss welcome message, with a manually activated Hear welcome button (not an automatic paid voice API call).
- Updated visual CSS for animated green plasma core with visible inner motion and energy halo even while idle; Resume AI core animation button appears if previously saved Reduce animation is enabled.
- User requested retaining gateway token in chat, but credentials must never be written into GitHub, project documents or logs. Keep private gateway pairing in encrypted device browser storage and rotate any token exposed in chat.
- Brian ElevenLabs and saved device pairing untouched. TypeScript frontend and multilingual intent CI PASS; on-phone animation QA pending.

## V7.0 — Brian-only voice lock and truthful free-tier statuses

- ElevenLabs Brian remains the default preferred voice. Frontend never silently changes to browser voice following ElevenLabs quota exhaustion, API errors, failed authorization or audio errors.
- Explicit browser voice remains available only by user selection. When Brian cannot play, show the text response with a clear paused/unavailable status and return core to idle.
- Railway staging ElevenLabs quota remains intentionally restricted to 4 requests / 800 text characters per worker day for free-tier protection. This is not unlimited playback and can stop after a few interactions; do not incur added costs or alter limits without user approval.
- Greeting and emerald plasma changes remain present, saved encrypted pairing preserved, no production bot modifications.
- TypeScript frontend and multilingual safety tests PASS; physical Android audio replay QA pending.

## V7.1 — voice recovery after Brian outage

- User reported no voice after V7.0 locked Brian output. Restore temporary browser speech fallback when Brian voice quota, pairing, network or playback fails, while keeping Brian as the preferred selected engine.
- Add explicit user-gesture Test phone voice button on the home screen so Android browser speech output can be diagnosed without making ElevenLabs calls.
- Phone voice fallback is labeled honestly in Settings, does not permanently switch the preferred voice selection, and preserves existing Railway free-tier limits.
- Frontend TypeScript and multilingual routing checks passed; live Android playback confirmation remains necessary.

## V7.2 — separate Brian and phone voice diagnostics

- Clarifies phone voice test is Android browser's selected voice, not ElevenLabs Brian.
- Added Test Brian voice button that calls secure staging ElevenLabs without phone fallback, and a visible core-level voice status display.
- Distinguishes Brian gateway unpaired, quota 429, provider rejection, configuration and network/audio errors without exposing API credentials.
- Normal spoken replies still prefer Brian and temporarily use browser voice when Brian fails, as requested for uninterrupted audio; successful Brian voice remains chosen.
- TypeScript and routing tests PASS. Actual Android browser test pending.

## V7.3 — JARVIS-first emerald plasma visualization

- Prioritized JARVIS over AIRA/trading integrations. Rebuilt core canvas color palette as emerald/green instead of orange, with three continuously moving volumetric plasma ribbons, energized particles and light beams.
- Idle still pulses softly; listening, processing, thinking and speaking affect motion rate and intensity. Motion reduction continues respecting preference, page visibility and OS accessibility rules.
- Brian ElevenLabs remains the preferred configured voice and settings are preserved. This commit does not increase paid/free ElevenLabs limits, so when Brian quota is exhausted the previous clearly labeled temporary phone-voice fallback remains.
- TypeScript and language-command checks PASS; real iQOO Android rendering QA is pending.

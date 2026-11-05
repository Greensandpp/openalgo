# GreenSoil Intelligent — Gemini brain integration (STAGING PLAN)

Status: PLANNED / NO API KEY CONFIGURED / NO DEPLOYMENT / NO BILLING APPROVED.

## Model assignment
- Reasoning: Google Gemini 4 Argon, documented model id `gemini-4-argon`, for interpretation of user commands, text analysis and tool selection. Requires confirmed developer API entitlement and separately monitored billing; the user's Gemini AI Pro app subscription is not an API credential.
- Voice: Google Gemini 3.8 Live (`gemini-3.8-live`) for low-latency bidirectional speech if enabled; fallback to browser user-initiated microphone and read-aloud when no server voice connection is configured.
- Speech-to-text alternative: Gemini 3.5 Transcribe only if explicitly enabled and supported by the developer API project.
- News: require a separate licensed/verified news source with source URLs and publication timestamps before labelling any response as live.
- Market data: require authorized live NSE/index/OI sources and 5-min locked-close confirmation; no fictional next targets.

## Isolation
1. Do not edit Pine indicators, broker production services, Railway production, or the PAPER lab HTTP write-denial guard.
2. Host any Gemini-enabled gateway in its OWN separate staging service, secrets and access controls. The static GitHub Pages site must never contain Gemini keys.
3. Secrets only in protected runtime environment variables, never frontend assets, repository commits, chat logs, browser localStorage, or demo JSON export.
4. Gateway should use HTTPS, authenticated per-user sessions, strict CORS origin allowlist, input/response size limits, quotas, cost ceilings, sanitized logs (no raw voice or secrets) and safe timeouts.
5. No costs or paid API upgrade without prior user authorization; fail closed when free quota is exhausted.
6. No orders or autonomous execution. Any financial recommendation needs fresh source timestamps; missing sources => NO TRADE.
7. Any settings/theme imports should use validated JSON; untrusted HTML should only be rendered as a sanitized/sandboxed visual preview.

## UI targets
- Default mobile screen: full-screen 3D-style plasma core, black/green with gold energy particles; no chart panel visible until user asks for Trading Mode.
- Voice/text bottom command bar. Microphone starts only on explicit tap in browser; background wake-word requires native platform support.
- Commands in Tanglish/Tamil/English: 'trading mode activate', 'NIFTY chart open pannu', 'SENSEX open', 'latest news', 'back to core', plus conversational paraphrases through the reasoning model rather than only regex.
- Transition modes: IDLE, LISTENING, THINKING, PROCESSING, COMPLETED, RETURN TO IDLE; optional sound off by default, accessible reduce-motion.
- Trading mode animated transition, charts and read-only reports; explicit market-data availability labels.
- Editable/importable preset files and rollback; preserve safe baseline.
- Voice choices: assess quality and pricing of Gemini Live or permitted local TTS; do not imply the Argon app voice transfers to this site.

## Connection checklist
- User explicitly creates a Google AI Studio API key and verifies whether `gemini-4-argon` and `gemini-3.8-live` are available on their API project.
- Add API key by the user's secure staging provider Secrets UI (not in chat).
- User approves any priced API usage and sets spend alerts/caps before enabling billing.
- Only then implement authorized staging runtime, integration tests, rate/usage limits, audio permission tests and browser E2E tests.

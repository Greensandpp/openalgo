# GreenSoil JARVIS Gemini gateway (STAGING-ONLY SOURCE)

This is an **inactive, text-only** prototype committed to the isolated
`greens-oil/paper-lab` branch. It is not connected to Railway, any public
website or production trading infrastructure. No charges or API calls occur
just because this source file exists.

## Required environment variables
- `GEMINI_API_KEY`: secret already entered in isolated Railway staging; never
  store in GitHub, browser, build artifacts or screenshots.
- `GATEWAY_ACCESS_TOKEN`: separate high-entropy secret (not the Gemini key).
- `ALLOWED_ORIGIN`: exact website origin, e.g.
  `https://greensandpp.github.io`.
- `GEMINI_MODEL`: eligible Gemini Developer API model ID, *verify first*.
  Default `gemini-2.5-flash` is a tentative compatibility starting point,
  not a guarantee of free-tier entitlement.
- `PORT`: Railway-provided listener port.

## Security and scope
- GET /health displays configuration booleans only, never credentials.
- POST /api/chat requires exact Origin and bearer token, rejects invalid input,
  and fails closed if any required setting is missing. Unsupported market/news
  claims are blocked locally; the model never receives those sample prompts.
- No broker, paper order, Pine script, option chain or live news access exists.
- Production bot, AIRA and existing JARVIS must be left untouched.
- **Do not connect the public GitHub Pages frontend to this gateway as-is.**
  A shared bearer secret in static JS is not secure. Before publishing a
  public endpoint, add proper user authentication with short-lived sessions
  and abuse controls, server-side quotas, per-user throttling, a usage cap and
  logging redaction. Only publish after independent security review.
- Avoid implying that `gemini-4-argon` in the Gemini app is API-accessible.
  Verify actual model listing and the Google API project tier.
- Do not deploy until the user explicitly approves any new ongoing
  infrastructure charge or quota/billing change.

## Runtime (only after approval)
From this directory, install requirements and start
`gunicorn -w 1 -b 0.0.0.0:$PORT app:app`. Run isolated integration tests and
verify 4xx/5xx fail-closed conditions before enabling any browser access.

## Next development
Replace shared token with authenticated sessions, confirm available Gemini
model, add optional Gemini Live voice gateway, source-grounded news and
authorized read-only market feeds; then wire voice command routing and JARVIS
mode transitions. Design imported themes as strict JSON, never execute
uploaded HTML scripts.

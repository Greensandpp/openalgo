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
  Default `gemini-3.8-flash` is documented with free-tier pricing, but
  not a guarantee of this project's actual API availability or quota.
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

## Read-only API model check (not run yet)

The staging-only script `check_models.py` uses the `GEMINI_API_KEY` environment
variable to make **one** read-only Google API `listModels` request. It prints
only model IDs and supported API methods; it never prints the key, prompts or
full provider responses. This check must run inside an authorized private
runtime, not from public GitHub Pages. It does not enable paid billing or test
generative token spending. For a new project Google documents free-tier pricing
for `gemini-3.8-flash` and `gemini-3.5-flash-lite`, but individual
access and quotas must still be verified. `gemini-4-argon` is not assumed
to be authorized solely from a Gemini app screenshot.

No API connectivity claim should be made until this check and an authorized
test prompt succeed. Do not connect public frontend to token-authenticated
prototype.

# GreenSoil OpenAlgo Lab — PAPER-ONLY Gate

Status: experimental feasibility branch, NOT approved for deployment or trading.

## Non-negotiable isolation
- Never deploy to existing GreenSoil production Railway services, databases, variables, webhooks, or domains.
- Do not connect any broker credentials or use real order execution in this lab.
- Do not connect TradingView alerts to order routes, Python Strategy Host, or Flow order nodes.
- Disable or block all order mutations server-side before any network-accessible instance is started. UI approval dialogs and Analyzer Mode **alone are not sufficient safeguards**.
- Keep all secrets out of GitHub. Use dummy offline test fixtures only.
- No paid resources, account upgrades, services, or API calls without explicit user approval.
- Preserve upstream license files/notices and review AGPL-3.0 compliance.

## Phase A — offline read-only QA
1. Record pinned upstream commit and dependency versions.
2. Check license, startup entrypoints, Dockerfile and environment templates.
3. Identify every order-capable route/tool: REST, MCP, AI agent, Flow, Python host, scheduling and WebSocket.
4. Implement deny-by-default server-side guard and tests for ALL order paths before runtime deployment.
5. Use synthetic historical NIFTY/SENSEX samples; no live market-data claims.
6. Test chart drawing with deterministic report fixtures, without opening real TradingView or brokers.

## Phase B — 8:30 report-to-chart integration
- Build a JSON schema with report_date, timezone=Asia/Kolkata, generated_at, source, symbol, timeframe, PDH/PDL/PDC, support/resistance, NO_TRADE zone, CE/PE trigger, structural SL and TP1-TP3.
- Reject stale reports, missing values, mismatched instruments and inconsistent entry/SL/target ordering.
- Display confirmed marks on OpenAlgo charts only; TradingView account drawings need a separate authorized mechanism.
- Send screenshot + validation evidence to JARVIS/Telegram, but do not treat chart annotation as a trade signal.
- Retain immutable 8:30 baseline; 9:35 updates must be separately versioned.

## Exit criteria
- No order execution reachable (automated negative tests).
- No connectivity or changes to existing GreenSoil production systems.
- NIFTY/SENSEX mock chart annotations verified visually and by structured assertions.
- Mobile layout tested.
- Hosting costs measured and explicitly approved prior to Railway staging.

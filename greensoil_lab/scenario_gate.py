"""Evidence gate between verified market observations and proposed chart levels.

This deterministic gate does not predict prices or create entry/SL/targets:
levels must be independently supplied and structurally valid. A fresh complete
five-minute candle, full-weight index breadth, OI corroboration and timestamped
source must all agree. Results remain WATCH ONLY, never actionable orders.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from math import isfinite
from zoneinfo import ZoneInfo

from greensoil_lab.market_adapter import adapt_verified_feed
from greensoil_lab.scenario_revisions import validate_revisions

IST = ZoneInfo("Asia/Kolkata")


def _finite(value: object, key: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{key}: number required")
    result = float(value)
    if not isfinite(result) or result <= 0:
        raise ValueError(f"{key}: positive finite number required")
    return result


def _timestamp(raw: object) -> datetime:
    if not isinstance(raw, str):
        raise ValueError("candle timestamp required")
    try:
        at = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError("invalid candle timestamp") from exc
    if at.tzinfo is None:
        raise ValueError("candle timezone required")
    return at.astimezone(IST)


def gate_candidate(
    market_document: dict, candidate_document: dict, candles: object, *,
    now: datetime,
) -> dict:
    """Validate one latest proposed revision with corroborating feed + 5m OHLC.

    No broker access, no filesystem writes, and no AI-generated levels.
    This function only says whether a proposed overlay merits human review.
    """
    day = now.astimezone(IST).date().isoformat()
    market = adapt_verified_feed(market_document, now=now)
    revisions = validate_revisions(candidate_document, expected_date=day, now=now)
    if revisions["source"] != market["source"]:
        raise ValueError("independent feeds have different attribution")
    if not isinstance(candles, list) or len(candles) != 2 or any(not isinstance(x, dict) for x in candles):
        raise ValueError("one five-minute candle for each index required")
    if {x.get("index") for x in candles} != {"NIFTY", "SENSEX"}:
        raise ValueError("NIFTY/SENSEX candles required")

    last = revisions["revisions"][-1]
    if last["status"] != "PROPOSED":
        return {"status": "INVALIDATED_NO_OVERLAY", "proposals": [], "execution": "DISABLED"}
    matched = next(x for x in market["warnings"] if x["index"] == last["symbol"])
    if matched["status"] != "EARLY_WARNING":
        return {
            "status": "NO_TRADE_EVIDENCE_NOT_ALIGNED",
            "reason": matched["status"], "proposals": [], "execution": "DISABLED",
        }
    desired = "BULLISH_WATCH" if last["direction"] == "CE" else "BEARISH_WATCH"
    if matched.get("bias") != desired:
        return {"status": "NO_TRADE_DIRECTION_CONFLICT", "proposals": [], "execution": "DISABLED"}
    candle = next(x for x in candles if x["index"] == last["symbol"])
    closed_at = _timestamp(candle.get("closed_at"))
    revision_close = _timestamp(last["closed_5m_at"])
    now_ist = now.astimezone(IST)
    if closed_at != revision_close or closed_at.minute % 5 or closed_at.second or closed_at.microsecond:
        raise ValueError("candle close must match candidate completed 5m boundary")
    if not timedelta(0) <= now_ist - closed_at <= timedelta(minutes=5):
        raise ValueError("candle is stale or not closed")
    o, h, l, c = (_finite(candle.get(key), key) for key in ("open", "high", "low", "close"))
    if not l <= min(o, c) <= max(o, c) <= h:
        raise ValueError("OHLC is inconsistent")
    if (last["direction"] == "CE" and c <= o) or (last["direction"] == "PE" and c >= o):
        return {"status": "NO_TRADE_CANDLE_NOT_CONFIRMED", "proposals": [], "execution": "DISABLED"}
    # A supplied proposed trigger cannot already be beyond TP1 on the
    # confirmation candle. Refuse to display an obsolete chase setup.
    if ((last["direction"] == "CE" and h >= last["tp1"]) or
            (last["direction"] == "PE" and l <= last["tp1"])):
        return {"status": "NO_TRADE_TARGET_ALREADY_TOUCHED", "proposals": [], "execution": "DISABLED"}
    return {
        "status": "REVIEW_PROPOSAL_ONLY",
        "source": market["source"],
        "date": day,
        "proposals": [last],
        "evidence": {
            "index": last["symbol"], "oi_bias": matched["evidence"]["oi_bias"],
            "weighted_constituent_change_pct": matched["evidence"]["weighted_constituent_change_pct"],
            "closed_5m_at": closed_at.isoformat(),
        },
        "execution": "DISABLED",
        "not_a_prediction": True,
    }

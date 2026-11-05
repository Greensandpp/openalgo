"""GreenSoil event watch: conservative, source-agnostic intraday early warnings.

Pure calculations, NOT an AI forecast or a live-data collector. An upstream
authorized feed must supply timestamped, verified values separately.
This module never creates orders, levels, price targets, or BUY/SELL signals.
"""
from datetime import datetime, timedelta
from math import isfinite
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
INDEXES = frozenset({"NIFTY", "SENSEX"})
ALLOWED_OI = frozenset({"bullish", "bearish", "neutral", "unknown"})


def _num(value, label):
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not isfinite(value):
        raise ValueError(f"{label} must be finite numeric")
    return float(value)


def evaluate_watch(snapshot: dict, *, now: datetime) -> dict:
    """Evaluate corroborated market pressure; return fail-closed warning only."""
    if now.tzinfo is None:
        raise ValueError("now must have timezone")
    if not isinstance(snapshot, dict) or snapshot.get("index") not in INDEXES:
        raise ValueError("only NIFTY or SENSEX snapshots supported")
    raw = snapshot.get("as_of")
    if not isinstance(raw, str):
        raise ValueError("as_of timestamp required")
    try:
        stamp = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError("invalid timestamp") from exc
    if stamp.tzinfo is None:
        raise ValueError("as_of needs timezone")
    age = now.astimezone(IST) - stamp.astimezone(IST)
    if not timedelta(0) <= age <= timedelta(minutes=2):
        return {"index": snapshot["index"], "status": "STALE_DATA_NO_PREDICTION",
                "reason": "Snapshot outside 2-minute freshness window"}
    volume = _num(snapshot.get("volume_ratio"), "volume_ratio")
    breadth = _num(snapshot.get("weighted_constituent_change_pct"), "weighted_constituent_change_pct")
    move = _num(snapshot.get("index_change_pct"), "index_change_pct")
    if volume < 0:
        raise ValueError("volume_ratio cannot be negative")
    oi = snapshot.get("oi_bias")
    if oi not in ALLOWED_OI:
        raise ValueError("invalid oi_bias")
    if oi == "unknown":
        return {"index": snapshot["index"], "status": "INSUFFICIENT_DATA_NO_PREDICTION",
                "reason": "OI direction unknown"}
    if volume < 1.5 or abs(breadth) < 0.2 or abs(move) < 0.15:
        return {"index": snapshot["index"], "status": "NO_TRADE",
                "reason": "No corroborated price-volume-breadth acceleration"}
    if move > 0 and breadth > 0 and oi == "bullish":
        bias = "BULLISH_WATCH"
    elif move < 0 and breadth < 0 and oi == "bearish":
        bias = "BEARISH_WATCH"
    else:
        return {"index": snapshot["index"], "status": "CONFLICTING_SIGNALS_NO_TRADE",
                "reason": "Index, constituent pressure and OI disagree"}
    return {
        "index": snapshot["index"],
        "status": "EARLY_WARNING",
        "bias": bias,
        "as_of": stamp.isoformat(),
        "reason": "Price move, weighted stock pressure, OI and volume aligned",
        "confirmation": "REQUIRES_COMPLETED_5M_CLOSE_AND_ADDITIONAL_CHECKS",
        "action": "WATCH_ONLY_NO_ORDER",
    }

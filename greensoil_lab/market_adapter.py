"""Deterministic verified-feed adapter for index-pressure monitoring.

Input is an attributed, timestamped feed payload supplied by a separately
authorized market-data collector. This does NOT fetch or verify third-party
data, predict future prices, or send broker instructions. OI classification
is conservative and only corroborates price/weighted constituent movement.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from math import isfinite
from zoneinfo import ZoneInfo

from greensoil_lab.monitor_events import evaluate_watch

IST = ZoneInfo("Asia/Kolkata")
INDEXES = ("NIFTY", "SENSEX")
MAX_AGE = timedelta(minutes=2)


def finite_number(value: object, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field}: numeric value required")
    result = float(value)
    if not isfinite(result):
        raise ValueError(f"{field}: finite value required")
    return result


def timestamp(raw: object, field: str) -> datetime:
    if not isinstance(raw, str):
        raise ValueError(f"{field}: timestamp missing")
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError(f"{field}: invalid timestamp") from exc
    if parsed.tzinfo is None:
        raise ValueError(f"{field}: timezone required")
    return parsed.astimezone(IST)


def freshness(raw: object, field: str, now: datetime) -> datetime:
    at = timestamp(raw, field)
    age = now.astimezone(IST) - at
    if not timedelta(0) <= age <= MAX_AGE:
        raise ValueError(f"{field}: stale or future data")
    return at


def _weighted_change(constituents: object, now: datetime, index: str) -> float:
    if not isinstance(constituents, list) or not 1 <= len(constituents) <= 200:
        raise ValueError(f"{index}: constituent rows missing")
    names: set[str] = set()
    weighted = 0.0
    total = 0.0
    for row in constituents:
        if not isinstance(row, dict):
            raise ValueError(f"{index}: invalid constituent")
        name = row.get("symbol")
        if not isinstance(name, str) or not name or name in names:
            raise ValueError(f"{index}: missing/duplicate constituent")
        names.add(name)
        freshness(row.get("as_of"), f"{index}.{name}.as_of", now)
        weight = finite_number(row.get("weight_pct"), f"{name}.weight_pct")
        change = finite_number(row.get("change_pct"), f"{name}.change_pct")
        if not 0 < weight <= 100 or abs(change) > 100:
            raise ValueError(f"{index}.{name}: invalid weight or move")
        weighted += weight * change
        total += weight
    # No directional inference from a tiny cherry-picked set of stocks.
    if not 99.0 <= total <= 101.0:
        raise ValueError(f"{index}: constituent weights must cover full index")
    return weighted / total


def _oi_bias(oi: object, now: datetime, index: str) -> str:
    if not isinstance(oi, dict):
        raise ValueError(f"{index}: missing OI")
    freshness(oi.get("as_of"), f"{index}.oi.as_of", now)
    call_delta = finite_number(oi.get("call_oi_change"), "call_oi_change")
    put_delta = finite_number(oi.get("put_oi_change"), "put_oi_change")
    # Aggregate OI is not enough to prove directional positioning.
    # A 20% directional imbalance is only a provisional corroboration.
    scale = abs(call_delta) + abs(put_delta)
    if scale <= 0:
        return "unknown"
    imbalance = (put_delta - call_delta) / scale
    if imbalance >= 0.2:
        return "bullish"
    if imbalance <= -0.2:
        return "bearish"
    return "neutral"


def adapt_verified_feed(document: dict, *, now: datetime) -> dict:
    """Validate a full-index payload and return two watch-only evaluations."""
    if now.tzinfo is None or not isinstance(document, dict):
        raise ValueError("timezone-aware now and feed document required")
    date = now.astimezone(IST).date().isoformat()
    if document.get("date") != date:
        raise ValueError("feed session date mismatch")
    source = document.get("source")
    if not isinstance(source, str) or not 1 <= len(source.strip()) <= 160:
        raise ValueError("provider attribution required")
    indexes = document.get("indexes")
    if not isinstance(indexes, list) or len(indexes) != 2:
        raise ValueError("exactly NIFTY and SENSEX required")
    if any(not isinstance(x, dict) for x in indexes) or {
        x.get("index") for x in indexes
    } != set(INDEXES):
        raise ValueError("index set must be NIFTY and SENSEX")
    results = []
    for item in indexes:
        index = item["index"]
        at = freshness(item.get("as_of"), f"{index}.as_of", now)
        volume = finite_number(item.get("volume_ratio"), "volume_ratio")
        move = finite_number(item.get("index_change_pct"), "index_change_pct")
        if not 0 <= volume <= 100 or abs(move) > 100:
            raise ValueError(f"{index}: invalid price/volume metrics")
        breadth = _weighted_change(item.get("constituents"), now, index)
        oi_bias = _oi_bias(item.get("oi"), now, index)
        snapshot = {
            "index": index,
            "as_of": at.isoformat(),
            "volume_ratio": volume,
            "weighted_constituent_change_pct": breadth,
            "index_change_pct": move,
            "oi_bias": oi_bias,
        }
        result = evaluate_watch(snapshot, now=now)
        result["evidence"] = {
            "weighted_constituent_change_pct": round(breadth, 4),
            "oi_bias": oi_bias,
            "volume_ratio": volume,
            "source": source,
        }
        results.append(result)
    return {
        "status": "WATCH_ONLY",
        "date": date,
        "source": source,
        "warnings": results,
        "news_monitor": "NOT_CONNECTED",
        "order_execution": "DISABLED",
    }

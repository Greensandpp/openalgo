"""Conservative intraday change detector; no forecast, AI, orders, or new targets.

Consumes two independently attributed, timestamped feed observations. A rapid
change becomes an EARLY_WARNING_TO_REVIEW, never a confirmed trading signal.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from math import isfinite
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
INDEXES = {"NIFTY", "SENSEX"}


def _time(value: object) -> datetime:
    if not isinstance(value, str):
        raise ValueError("timestamp required")
    try:
        stamp = datetime.fromisoformat(value)
    except ValueError as exc:
        raise ValueError("timestamp invalid") from exc
    if stamp.tzinfo is None:
        raise ValueError("timezone required")
    return stamp.astimezone(IST)


def _number(value: object, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (float, int)):
        raise ValueError(f"{name}: number required")
    num = float(value)
    if not isfinite(num):
        raise ValueError(f"{name}: number must be finite")
    return num


def detect_spikes(previous: dict, current: dict, *, now: datetime) -> list[dict]:
    if now.tzinfo is None:
        raise ValueError("now needs timezone")
    if not isinstance(previous, dict) or not isinstance(current, dict):
        raise ValueError("two feed snapshots required")
    if previous.get("source") != current.get("source") or not isinstance(current.get("source"), str) or not current["source"]:
        raise ValueError("provider must match")
    outputs = []
    old = previous.get("indexes")
    new = current.get("indexes")
    if not isinstance(old, list) or not isinstance(new, list) or len(old) != 2 or len(new) != 2:
        raise ValueError("two indexes per observation required")
    if any(not isinstance(row, dict) for row in old + new):
        raise ValueError("bad observation")
    if {row.get("index") for row in old} != INDEXES or {row.get("index") for row in new} != INDEXES:
        raise ValueError("only NIFTY and SENSEX, no duplicates")
    old_by_index = {row["index"]: row for row in old}
    for row in new:
        name = row["index"]
        previous_row = old_by_index[name]
        after, before = _time(row.get("as_of")), _time(previous_row.get("as_of"))
        elapsed = after - before
        age = now.astimezone(IST) - after
        if not timedelta(seconds=30) <= elapsed <= timedelta(minutes=5) or not timedelta(0) <= age <= timedelta(minutes=2):
            outputs.append({"index": name, "status": "STALE_OR_INCOMPARABLE_NO_PREDICTION"})
            continue
        current_move = _number(row.get("index_change_pct"), "index_change_pct")
        old_move = _number(previous_row.get("index_change_pct"), "previous_index_change_pct")
        volume = _number(row.get("volume_ratio"), "volume_ratio")
        if not 0 <= volume <= 100 or abs(current_move) > 100 or abs(old_move) > 100:
            raise ValueError("index or volume outside plausible bounds")
        change = round(current_move - old_move, 4)
        if abs(change) >= 0.25 and volume >= 1.5:
            status = "EARLY_WARNING_TO_REVIEW"
            direction = "UPWARD_ACCELERATION" if change > 0 else "DOWNWARD_ACCELERATION"
        else:
            status, direction = "NO_SUDDEN_SPIKE", "NONE"
        outputs.append({
            "index": name, "status": status, "direction": direction,
            "index_change_pct_delta": change, "window_seconds": int(elapsed.total_seconds()),
            "as_of": after.isoformat(), "action": "WATCH_ONLY_NO_ORDER",
            "confirmation": "5M_CLOSE_AND_OI_RECHECK_REQUIRED",
        })
    return outputs

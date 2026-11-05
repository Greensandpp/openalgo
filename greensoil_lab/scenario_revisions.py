"""Versioned, non-executing intraday scenario overlay contract.

Accepts proposed chart levels, never invents them. Required source, UTC-offset
timestamps, a completed five-minute candle, monotonic revision IDs and a
separate immutable 08:30 baseline. This is NOT evidence of forecasting skill.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from math import isfinite
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
SYMBOLS = {"NIFTY", "SENSEX"}
LEVELS = ("entry", "sl", "tp1", "tp2", "tp3")
DIRECTIONS = {"CE", "PE"}
MAX_REVISIONS = 50


def _when(raw: object) -> datetime:
    if not isinstance(raw, str):
        raise ValueError("ISO timestamp required")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError("invalid ISO timestamp") from exc
    if dt.tzinfo is None:
        raise ValueError("timestamp must include timezone")
    return dt.astimezone(IST)


def _price(value: object, key: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{key} must be numeric")
    num = float(value)
    if not isfinite(num) or num <= 0:
        raise ValueError(f"{key} must be finite positive")
    return num


def validate_revisions(document: object, *, expected_date: str, now: datetime) -> dict:
    """Pure validation; retains history and never mutates the baseline."""
    if now.tzinfo is None or not isinstance(document, dict):
        raise ValueError("timezone aware now and revisions object required")
    if document.get("report_date") != expected_date or now.astimezone(IST).date().isoformat() != expected_date:
        raise ValueError("not today's session")
    source = document.get("source")
    if not isinstance(source, str) or not 1 <= len(source.strip()) <= 160:
        raise ValueError("source attribution required")
    rows = document.get("revisions")
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_REVISIONS:
        raise ValueError("1-50 revisions required")
    last_version = 0
    last_at = None
    clean = []
    for item in rows:
        if not isinstance(item, dict):
            raise ValueError("revision must be object")
        version = item.get("version")
        if type(version) is not int or version <= last_version:
            raise ValueError("revision versions must increase")
        symbol, direction = item.get("symbol"), item.get("direction")
        if symbol not in SYMBOLS or direction not in DIRECTIONS:
            raise ValueError("only NIFTY/SENSEX CE/PE allowed")
        at, candle_close = _when(item.get("as_of")), _when(item.get("closed_5m_at"))
        if at.date().isoformat() != expected_date or candle_close.date().isoformat() != expected_date:
            raise ValueError("revision date mismatch")
        if last_at is not None and at < last_at:
            raise ValueError("revision timestamps must increase")
        if not timedelta(0) <= now.astimezone(IST) - at <= timedelta(minutes=2):
            raise ValueError("stale/future revision")
        if candle_close.minute % 5 or candle_close.second or candle_close.microsecond:
            raise ValueError("not a completed 5-minute candle boundary")
        if not timedelta(0) <= at - candle_close <= timedelta(minutes=5):
            raise ValueError("closed five-minute confirmation not available")
        values = {k: _price(item.get(k), k) for k in LEVELS}
        v = values
        if direction == "CE" and not v["sl"] < v["entry"] < v["tp1"] < v["tp2"] < v["tp3"]:
            raise ValueError("invalid CE structural levels")
        if direction == "PE" and not v["tp3"] < v["tp2"] < v["tp1"] < v["entry"] < v["sl"]:
            raise ValueError("invalid PE structural levels")
        reason = item.get("reason")
        if not isinstance(reason, str) or not 1 <= len(reason.strip()) <= 300:
            raise ValueError("specific reason required")
        status = item.get("status")
        if status not in {"PROPOSED", "INVALIDATED"}:
            raise ValueError("only candidate/invalidation overlays allowed")
        clean.append({
            "version": version, "symbol": symbol, "direction": direction,
            "as_of": at.isoformat(), "closed_5m_at": candle_close.isoformat(),
            "status": status, "reason": reason.strip(), **values,
            "execution": "DISABLED", "certainty": "UNVERIFIED_SCENARIO",
        })
        last_version, last_at = version, at
    return {
        "report_date": expected_date, "source": source, "status": "WATCH_ONLY",
        "baseline": "IMMUTABLE_0830", "revisions": clean,
    }

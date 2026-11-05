"""Local, read-only baseline handoff for the GreenSoil chart lab.

Another trusted process must provide the report file separately. This module
never fetches news, calls an AI, places an order, or mutates report files.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify, make_response

from greensoil_lab.report_drawings import report_to_drawings

bp = Blueprint("greensoil_baseline", __name__)
IST = ZoneInfo("Asia/Kolkata")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_BYTES = 64 * 1024


def read_baseline_for_date(date: str, *, root: str | None = None) -> dict | None:
    """Load only today's validated canonical report; no network or writes."""
    if not DATE_RE.fullmatch(date):
        raise ValueError("invalid report date")
    datetime.strptime(date, "%Y-%m-%d")
    folder = root if root is not None else os.environ.get("GREENSOIL_BASELINE_DIR")
    if not folder:
        return None
    path = Path(folder) / f"{date}.json"
    if not path.is_file():
        return None
    if path.stat().st_size > MAX_BYTES:
        raise ValueError("report exceeds 64 KiB")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("report must be a JSON object")
    report_to_drawings(data, expected_date=date)
    # Zone constraints match the browser contract; require complete data.
    instruments = data["instruments"]
    for item in instruments:
        for field in ("support_zones", "resistance_zones"):
            zones = item.get(field)
            if not isinstance(zones, list) or not 1 <= len(zones) <= 5:
                raise ValueError(f"{field} requires 1 to 5 zones")
            for zone in zones:
                _check_zone(zone)
        _check_zone(item.get("no_trade_zone"))
    return data


def _check_zone(zone: object) -> None:
    if not isinstance(zone, dict):
        raise ValueError("zone must be an object")
    low, high = zone.get("low"), zone.get("high")
    if any(isinstance(p, bool) or not isinstance(p, (int, float)) for p in (low, high)):
        raise ValueError("zone bounds must be numeric")
    from math import isfinite
    if not (isfinite(low) and isfinite(high) and 0 < low < high):
        raise ValueError("zone bounds invalid")


@bp.get("/greensoil/api/baseline")
def baseline_today():
    date = datetime.now(IST).date().isoformat()
    try:
        report = read_baseline_for_date(date)
    except (ValueError, OSError, json.JSONDecodeError, TypeError):
        # Do not expose the source file path or source document on bad input.
        response = jsonify({"status": "invalid", "message": "Today baseline is invalid"})
        response.status_code = 422
    else:
        if report is None:
            response = jsonify({"status": "missing", "date": date})
            response.status_code = 404
        else:
            response = jsonify(report)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

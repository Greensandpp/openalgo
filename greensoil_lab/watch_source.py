"""Read-only, fail-closed index-watch input from a trusted local JSON snapshot.

No provider credentials, news scraper, model API or trades. A separate source
must supply timestamped snapshots for BOTH indexes, with attribution.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify

from greensoil_lab.monitor_events import evaluate_watch

bp = Blueprint("greensoil_watch", __name__)
IST = ZoneInfo("Asia/Kolkata")
MAX_BYTES = 32 * 1024


def local_watch(now: datetime, *, root: str | None = None) -> dict:
    if now.tzinfo is None:
        raise ValueError("now must be timezone aware")
    date = now.astimezone(IST).date().isoformat()
    folder = root if root is not None else os.environ.get("GREENSOIL_WATCH_DIR")
    if not folder:
        return {"status": "NO_VERIFIED_FEED", "date": date, "warnings": []}
    path = Path(folder) / f"{date}.json"
    if not path.is_file():
        return {"status": "NO_VERIFIED_FEED", "date": date, "warnings": []}
    if path.stat().st_size > MAX_BYTES:
        raise ValueError("watch input exceeds size limit")
    document = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or document.get("date") != date:
        raise ValueError("watch date mismatch")
    source = document.get("source")
    if not isinstance(source, str) or not source.strip() or len(source) > 160:
        raise ValueError("attributed source required")
    snapshots = document.get("snapshots")
    if not isinstance(snapshots, list) or len(snapshots) != 2:
        raise ValueError("one snapshot per index required")
    if any(not isinstance(item, dict) for item in snapshots):
        raise ValueError("invalid snapshot")
    if {item.get("index") for item in snapshots} != {"NIFTY", "SENSEX"}:
        raise ValueError("NIFTY and SENSEX snapshots required")
    warnings = [evaluate_watch(item, now=now) for item in snapshots]
    return {
        "date": date, "status": "WATCH_ONLY",
        "source": source, "warnings": warnings,
        "news_monitor": "NOT_CONNECTED",
        "order_execution": "DISABLED",
    }


@bp.get("/greensoil/api/watch")
def watch_today():
    try:
        result = local_watch(datetime.now(IST))
    except (ValueError, TypeError, OSError, json.JSONDecodeError):
        response = jsonify({"status": "INVALID_OR_STALE_INPUT", "warnings": []})
        response.status_code = 422
    else:
        response = jsonify(result)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

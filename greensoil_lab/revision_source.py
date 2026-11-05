"""GET-only proposed intraday overlays; separate from immutable 8:30 baseline.

No model inference, market access, broker routes or file mutation.
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from flask import Blueprint, jsonify

from greensoil_lab.scenario_revisions import validate_revisions

bp = Blueprint("greensoil_revisions", __name__)
IST = ZoneInfo("Asia/Kolkata")
MAX_BYTES = 64 * 1024


def read_revisions(now: datetime, *, root: str | None = None) -> dict:
    if now.tzinfo is None:
        raise ValueError("timezone aware now required")
    day = now.astimezone(IST).date().isoformat()
    folder = root if root is not None else os.environ.get("GREENSOIL_REVISIONS_DIR")
    if not folder:
        return {"status": "NO_VERIFIED_REVISIONS", "report_date": day, "revisions": []}
    path = Path(folder) / f"{day}.json"
    if not path.is_file():
        return {"status": "NO_VERIFIED_REVISIONS", "report_date": day, "revisions": []}
    if path.stat().st_size > MAX_BYTES:
        raise ValueError("revisions file too large")
    data = json.loads(path.read_text(encoding="utf-8"))
    return validate_revisions(data, expected_date=day, now=now)


@bp.get("/greensoil/api/revisions")
def revisions_today():
    try:
        result = read_revisions(datetime.now(IST))
    except (ValueError, TypeError, OSError, json.JSONDecodeError):
        response = jsonify({"status": "INVALID_OR_STALE_REVISIONS", "revisions": []})
        response.status_code = 422
    else:
        response = jsonify(result)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

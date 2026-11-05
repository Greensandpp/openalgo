"""Pure-data adapter: 8:30 GreenSoil report -> OpenAlgo chart annotations.

No network, broker access, order execution, or TradingView account automation.
Only structured immutable input; never fabricate levels from prose.
"""
from __future__ import annotations

from datetime import datetime
from math import isfinite
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")
SYMBOLS = {"NIFTY", "SENSEX"}
FIELDS = ("pdh", "pdl", "pdc", "ce_entry", "ce_sl", "ce_tp1",
          "ce_tp2", "ce_tp3", "pe_entry", "pe_sl", "pe_tp1",
          "pe_tp2", "pe_tp3")


def _price(value: object, key: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{key}: numeric price required")
    number = float(value)
    if not isfinite(number) or number <= 0:
        raise ValueError(f"{key}: invalid price")
    return number


def report_to_drawings(report: dict, *, expected_date: str) -> list[dict]:
    """Validate one NSE day and return read-only drawing descriptors."""
    if report.get("timezone") != "Asia/Kolkata":
        raise ValueError("timezone must be Asia/Kolkata")
    if report.get("report_date") != expected_date:
        raise ValueError("report date does not match trading session")
    try:
        issued = datetime.fromisoformat(report["generated_at"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("generated_at must be ISO 8601") from exc
    if issued.tzinfo is None or issued.astimezone(IST).date().isoformat() != expected_date:
        raise ValueError("report timestamp invalid for session")
    if issued.astimezone(IST).hour != 8 or issued.astimezone(IST).minute != 30:
        raise ValueError("only canonical 08:30 baseline is accepted")
    if not isinstance(report.get("source"), str) or not report["source"].strip():
        raise ValueError("source attribution required")
    instruments = report.get("instruments")
    if not isinstance(instruments, list) or len(instruments) != 2:
        raise ValueError("exactly NIFTY and SENSEX required")
    if {x.get("symbol") for x in instruments if isinstance(x, dict)} != SYMBOLS:
        raise ValueError("must contain one NIFTY and one SENSEX")
    drawings = []
    for item in instruments:
        symbol = item["symbol"]
        prices = {key: _price(item.get(key), f"{symbol}.{key}") for key in FIELDS}
        if not prices["pdh"] > prices["pdl"]:
            raise ValueError(f"{symbol}: PDH must exceed PDL")
        if not prices["ce_sl"] < prices["ce_entry"] < prices["ce_tp1"] < prices["ce_tp2"] < prices["ce_tp3"]:
            raise ValueError(f"{symbol}: CE direction invalid")
        if not prices["pe_tp3"] < prices["pe_tp2"] < prices["pe_tp1"] < prices["pe_entry"] < prices["pe_sl"]:
            raise ValueError(f"{symbol}: PE direction invalid")
        for key in FIELDS:
            drawings.append({
                "symbol": symbol,
                "type": "horizontal_line",
                "level": key.upper(),
                "price": prices[key],
                "report_date": expected_date,
                "status": "PREMARKET_PLAN_NOT_SIGNAL",
            })
    return drawings

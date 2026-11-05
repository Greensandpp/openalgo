"""No-network tests of GreenSoil read-only 08:30 handoff."""
import json
import tempfile
import unittest
from pathlib import Path

from flask import Flask

from greensoil_lab.baseline_source import bp, read_baseline_for_date


def report():
    def instrument(symbol, base):
        return {
            "symbol": symbol, "pdh": base + 80, "pdl": base - 80, "pdc": base,
            "ce_entry": base + 15, "ce_sl": base + 5,
            "ce_tp1": base + 25, "ce_tp2": base + 35, "ce_tp3": base + 45,
            "pe_entry": base - 15, "pe_sl": base - 5,
            "pe_tp1": base - 25, "pe_tp2": base - 35, "pe_tp3": base - 45,
            "support_zones": [{"low": base - 65, "high": base - 55}],
            "resistance_zones": [{"low": base + 55, "high": base + 65}],
            "no_trade_zone": {"low": base - 10, "high": base + 10},
        }
    return {
        "timezone": "Asia/Kolkata",
        "report_date": "2026-11-05",
        "generated_at": "2026-11-05T08:30:00+05:30",
        "source": "SYNTHETIC_TEST_NOT_MARKET_DATA",
        "instruments": [instrument("NIFTY", 25000), instrument("SENSEX", 80000)],
    }


class TestDailyHandoff(unittest.TestCase):
    def test_read_only_valid_source(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "2026-11-05.json"
            data = report()
            path.write_text(json.dumps(data), encoding="utf-8")
            before = path.read_bytes()
            self.assertEqual(read_baseline_for_date("2026-11-05", root=directory), data)
            self.assertEqual(path.read_bytes(), before)

    def test_invalid_or_missing_reports_do_not_return_levels(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIsNone(read_baseline_for_date("2026-11-05", root=directory))
            path = Path(directory) / "2026-11-05.json"
            stale = report()
            stale["report_date"] = "2026-11-04"
            path.write_text(json.dumps(stale), encoding="utf-8")
            with self.assertRaises(ValueError):
                read_baseline_for_date("2026-11-05", root=directory)
            with self.assertRaises(ValueError):
                read_baseline_for_date("../secret", root=directory)
            with self.assertRaises(ValueError):
                read_baseline_for_date("2026-13-42", root=directory)

    def test_zone_bounds_and_oversized_source_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "2026-11-05.json"
            broken = report()
            broken["instruments"][0]["no_trade_zone"]["high"] = -2
            path.write_text(json.dumps(broken), encoding="utf-8")
            with self.assertRaises(ValueError):
                read_baseline_for_date("2026-11-05", root=directory)
            path.write_text(" " * (65 * 1024), encoding="utf-8")
            with self.assertRaises(ValueError):
                read_baseline_for_date("2026-11-05", root=directory)

    def test_endpoint_never_accepts_writes(self):
        app = Flask(__name__)
        app.register_blueprint(bp)
        from greensoil_lab.read_only import install_read_only_http_guard
        install_read_only_http_guard(app)
        client = app.test_client()
        self.assertEqual(client.post("/greensoil/api/baseline", json=report()).status_code, 403)


if __name__ == "__main__":
    unittest.main()

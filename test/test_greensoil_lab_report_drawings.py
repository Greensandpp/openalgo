"""Synthetic, offline-only report drawing contract tests."""
import unittest
from greensoil_lab.report_drawings import report_to_drawings


def fixture():
    def instrument(symbol, base):
        return {
            "symbol": symbol, "pdh": base + 80, "pdl": base - 80,
            "pdc": base, "ce_entry": base + 15, "ce_sl": base + 5,
            "ce_tp1": base + 25, "ce_tp2": base + 35, "ce_tp3": base + 45,
            "pe_entry": base - 15, "pe_sl": base - 5,
            "pe_tp1": base - 25, "pe_tp2": base - 35, "pe_tp3": base - 45,
        }
    return {
        "timezone": "Asia/Kolkata",
        "report_date": "2026-11-05",
        "generated_at": "2026-11-05T08:30:00+05:30",
        "source": "SYNTHETIC_TEST_NOT_MARKET_DATA",
        "instruments": [instrument("NIFTY", 25000), instrument("SENSEX", 80000)],
    }


class TestReportDrawings(unittest.TestCase):
    def test_good_report_has_no_order_instructions(self):
        data = report_to_drawings(fixture(), expected_date="2026-11-05")
        self.assertEqual(len(data), 26)
        self.assertEqual({x["symbol"] for x in data}, {"NIFTY", "SENSEX"})
        self.assertTrue(all(x["type"] == "horizontal_line" for x in data))
        self.assertTrue(all(x["status"] == "PREMARKET_PLAN_NOT_SIGNAL" for x in data))
        self.assertFalse(any("order" in x for x in data))

    def test_stale_or_wrong_time_rejected(self):
        report = fixture()
        with self.assertRaises(ValueError):
            report_to_drawings(report, expected_date="2026-11-06")
        report["generated_at"] = "2026-11-05T09:35:00+05:30"
        with self.assertRaises(ValueError):
            report_to_drawings(report, expected_date="2026-11-05")

    def test_missing_level_and_broken_side_rejected(self):
        report = fixture()
        del report["instruments"][0]["ce_sl"]
        with self.assertRaises(ValueError):
            report_to_drawings(report, expected_date="2026-11-05")
        report = fixture()
        report["instruments"][1]["pe_tp1"] = report["instruments"][1]["pe_entry"] + 5
        with self.assertRaises(ValueError):
            report_to_drawings(report, expected_date="2026-11-05")

    def test_malformed_instruments_and_nonfinite_rejected(self):
        report = fixture()
        report["instruments"][1]["symbol"] = "NIFTY"
        with self.assertRaises(ValueError):
            report_to_drawings(report, expected_date="2026-11-05")
        report = fixture()
        report["instruments"][0]["pdh"] = float("nan")
        with self.assertRaises(ValueError):
            report_to_drawings(report, expected_date="2026-11-05")


if __name__ == "__main__":
    unittest.main()

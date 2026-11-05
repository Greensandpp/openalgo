"""Synthetic adapter tests; never reach a broker or market-data provider."""
from copy import deepcopy
from datetime import datetime, timedelta
import unittest

from greensoil_lab.market_adapter import adapt_verified_feed

NOW = datetime.fromisoformat("2026-11-05T11:20:00+05:30")


def feed():
    stamp = (NOW - timedelta(seconds=15)).isoformat()
    def index(name, move=0.33):
        return {
            "index": name, "as_of": stamp, "index_change_pct": move,
            "volume_ratio": 1.8,
            "constituents": [
                {"symbol": f"{name}A", "weight_pct": 55, "change_pct": 0.5, "as_of": stamp},
                {"symbol": f"{name}B", "weight_pct": 45, "change_pct": 0.4, "as_of": stamp},
            ],
            "oi": {"as_of": stamp, "call_oi_change": 100, "put_oi_change": 200},
        }
    return {
        "date": "2026-11-05", "source": "SYNTHETIC_TEST_ONLY",
        "indexes": [index("NIFTY"), index("SENSEX")],
    }


class TestMarketAdapter(unittest.TestCase):
    def test_full_fresh_weighted_data_is_watch_only(self):
        report = adapt_verified_feed(feed(), now=NOW)
        self.assertEqual(report["status"], "WATCH_ONLY")
        self.assertEqual(report["news_monitor"], "NOT_CONNECTED")
        self.assertEqual(report["order_execution"], "DISABLED")
        self.assertEqual(len(report["warnings"]), 2)
        self.assertTrue(all(x["status"] == "EARLY_WARNING" for x in report["warnings"]))
        self.assertTrue(all(x["action"] == "WATCH_ONLY_NO_ORDER" for x in report["warnings"]))
        self.assertNotIn("targets", str(report))

    def test_missing_or_cherry_picked_stock_weights_rejected(self):
        value = feed()
        value["indexes"][0]["constituents"].pop()
        with self.assertRaisesRegex(ValueError, "cover full index"):
            adapt_verified_feed(value, now=NOW)

    def test_stale_stock_oi_or_index_rejected(self):
        for section in ("as_of", "oi", "constituents"):
            value = feed()
            stamp = (NOW - timedelta(minutes=5)).isoformat()
            if section == "as_of":
                value["indexes"][0]["as_of"] = stamp
            elif section == "oi":
                value["indexes"][0]["oi"]["as_of"] = stamp
            else:
                value["indexes"][0]["constituents"][1]["as_of"] = stamp
            with self.subTest(section=section), self.assertRaises(ValueError):
                adapt_verified_feed(value, now=NOW)

    def test_conflicting_oi_cannot_become_bullish_alert(self):
        value = feed()
        value["indexes"][0]["oi"]["call_oi_change"] = 900
        value["indexes"][0]["oi"]["put_oi_change"] = 100
        report = adapt_verified_feed(value, now=NOW)
        self.assertEqual(report["warnings"][0]["status"], "CONFLICTING_SIGNALS_NO_TRADE")

    def test_missing_source_duplicate_names_and_nonfinite_rejected(self):
        original = feed()
        for transform in (
            lambda x: x.pop("source"),
            lambda x: x["indexes"][0]["constituents"][1].update(symbol="NIFTYA"),
            lambda x: x["indexes"][0].update(volume_ratio=float("nan")),
        ):
            value = deepcopy(original)
            transform(value)
            with self.assertRaises(ValueError):
                adapt_verified_feed(value, now=NOW)


if __name__ == "__main__":
    unittest.main()

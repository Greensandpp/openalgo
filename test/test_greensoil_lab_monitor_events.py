"""Synthetic tests. These do not validate market prediction accuracy."""
from datetime import datetime, timedelta, timezone
import unittest
from greensoil_lab.monitor_events import evaluate_watch

NOW = datetime(2026, 11, 5, 5, 0, tzinfo=timezone.utc)


def snap(**changes):
    data = {
        "index": "NIFTY",
        "as_of": (NOW - timedelta(seconds=25)).isoformat(),
        "volume_ratio": 1.9,
        "weighted_constituent_change_pct": 0.46,
        "index_change_pct": 0.33,
        "oi_bias": "bullish",
    }
    data.update(changes)
    return data


class TestMarketWatch(unittest.TestCase):
    def test_corroborated_snapshot_only_warning_not_signal(self):
        result = evaluate_watch(snap(), now=NOW)
        self.assertEqual(result["status"], "EARLY_WARNING")
        self.assertEqual(result["bias"], "BULLISH_WATCH")
        self.assertEqual(result["action"], "WATCH_ONLY_NO_ORDER")
        self.assertNotIn("target", result)
        self.assertNotIn("entry", result)

    def test_bearish_and_conflict(self):
        bearish = snap(index="SENSEX", oi_bias="bearish", index_change_pct=-0.4,
                       weighted_constituent_change_pct=-0.7)
        self.assertEqual(evaluate_watch(bearish, now=NOW)["bias"], "BEARISH_WATCH")
        bearish["oi_bias"] = "bullish"
        self.assertEqual(evaluate_watch(bearish, now=NOW)["status"], "CONFLICTING_SIGNALS_NO_TRADE")

    def test_stale_and_missing_data_refuse_prediction(self):
        old = snap(as_of=(NOW - timedelta(minutes=6)).isoformat())
        self.assertEqual(evaluate_watch(old, now=NOW)["status"], "STALE_DATA_NO_PREDICTION")
        unknown = snap(oi_bias="unknown")
        self.assertEqual(evaluate_watch(unknown, now=NOW)["status"], "INSUFFICIENT_DATA_NO_PREDICTION")
        quiet = snap(volume_ratio=1.1)
        self.assertEqual(evaluate_watch(quiet, now=NOW)["status"], "NO_TRADE")

    def test_rejects_invalid_inputs(self):
        for override in ({"index": "RELIANCE"}, {"volume_ratio": float("nan")},
                         {"as_of": "2026-11-05T10:30:00"}, {"oi_bias": "confirmed_buy"}):
            with self.subTest(override=override):
                with self.assertRaises(ValueError):
                    evaluate_watch(snap(**override), now=NOW)


if __name__ == "__main__":
    unittest.main()

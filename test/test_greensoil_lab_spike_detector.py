"""Offline NIFTY/SENSEX speed-change tests; no real signals."""
import unittest
from datetime import datetime, timedelta
from copy import deepcopy

from greensoil_lab.spike_detector import detect_spikes

NOW = datetime.fromisoformat("2026-11-05T11:20:00+05:30")


def observation(when, nifty, sensex):
    return {
        "source": "SYNTHETIC_TEST_ONLY",
        "indexes": [
            {"index": "NIFTY", "as_of": when.isoformat(),
             "index_change_pct": nifty, "volume_ratio": 1.9},
            {"index": "SENSEX", "as_of": when.isoformat(),
             "index_change_pct": sensex, "volume_ratio": 1.9},
        ]
    }


class TestSpikeDetection(unittest.TestCase):
    def test_upside_downside_acceleration_are_watch_only(self):
        old = observation(NOW - timedelta(minutes=3), 0.1, 0.2)
        new = observation(NOW - timedelta(seconds=20), 0.4, -0.2)
        result = detect_spikes(old, new, now=NOW)
        self.assertEqual([r["status"] for r in result], ["EARLY_WARNING_TO_REVIEW"] * 2)
        self.assertEqual([r["direction"] for r in result],
                         ["UPWARD_ACCELERATION", "DOWNWARD_ACCELERATION"])
        self.assertTrue(all(r["action"] == "WATCH_ONLY_NO_ORDER" for r in result))
        self.assertNotIn("targets", str(result))

    def test_weak_or_stale_move_cannot_trigger(self):
        old = observation(NOW - timedelta(minutes=3), 0.1, 0.2)
        new = observation(NOW - timedelta(seconds=20), 0.2, 0.25)
        self.assertTrue(all(r["status"] == "NO_SUDDEN_SPIKE" for r in detect_spikes(old, new, now=NOW)))
        new = observation(NOW - timedelta(minutes=8), 0.9, 0.7)
        self.assertTrue(all(r["status"] == "STALE_OR_INCOMPARABLE_NO_PREDICTION"
                            for r in detect_spikes(old, new, now=NOW)))

    def test_wrong_source_invalid_time_or_index_is_refused(self):
        old = observation(NOW - timedelta(minutes=3), 0.1, 0.2)
        latest = observation(NOW - timedelta(seconds=20), 0.4, -0.2)
        for update in ("source", "duplicate", "future", "nan"):
            candidate = deepcopy(latest)
            if update == "source":
                candidate["source"] = "OTHER_PROVIDER"
            elif update == "duplicate":
                candidate["indexes"][1]["index"] = "NIFTY"
            elif update == "future":
                candidate["indexes"][0]["as_of"] = (NOW + timedelta(minutes=2)).isoformat()
            else:
                candidate["indexes"][0]["volume_ratio"] = float("nan")
            if update == "future":
                rows = detect_spikes(old, candidate, now=NOW)
                self.assertEqual(rows[0]["status"], "STALE_OR_INCOMPARABLE_NO_PREDICTION")
            else:
                with self.assertRaises(ValueError):
                    detect_spikes(old, candidate, now=NOW)


if __name__ == "__main__":
    unittest.main()

"""Strict no-network tests for versioned overlay history."""
from copy import deepcopy
from datetime import datetime, timedelta
import unittest
from greensoil_lab.scenario_revisions import validate_revisions

NOW = datetime.fromisoformat("2026-11-05T11:35:50+05:30")


def fixture():
    def revision(version, symbol, direction, at):
        base = 25000 if symbol == "NIFTY" else 80000
        if direction == "CE":
            levels = dict(entry=base+15, sl=base+5, tp1=base+25, tp2=base+35, tp3=base+45)
        else:
            levels = dict(entry=base-15, sl=base-5, tp1=base-25, tp2=base-35, tp3=base-45)
        return dict(version=version, symbol=symbol, direction=direction,
                    as_of=at, closed_5m_at="2026-11-05T11:35:00+05:30",
                    status="PROPOSED", reason="Synthetic post-close OI/price confirmation",
                    **levels)
    return {
        "report_date": "2026-11-05", "source": "SYNTHETIC_TEST_ONLY",
        "revisions": [
            revision(1,"NIFTY","CE","2026-11-05T11:35:10+05:30"),
            revision(2,"SENSEX","PE","2026-11-05T11:35:40+05:30"),
        ],
    }


class TestOverlayRevision(unittest.TestCase):
    def test_proposed_overlay_preserves_order_and_baseline(self):
        data = fixture()
        old = deepcopy(data)
        result = validate_revisions(data, expected_date="2026-11-05", now=NOW)
        self.assertEqual(data, old)
        self.assertEqual(result["baseline"], "IMMUTABLE_0830")
        self.assertEqual([x["version"] for x in result["revisions"]],[1,2])
        self.assertTrue(all(x["execution"] == "DISABLED" for x in result["revisions"]))
        self.assertNotIn("order", result)

    def test_stale_data_or_unclosed_candle_is_rejected(self):
        for change in ("stale", "future_close", "not_five_min"):
            data = fixture()
            if change == "stale":
                data["revisions"][0]["as_of"] = "2026-11-05T11:10:00+05:30"
            if change == "future_close":
                data["revisions"][1]["closed_5m_at"] = "2026-11-05T11:40:00+05:30"
            if change == "not_five_min":
                data["revisions"][1]["closed_5m_at"] = "2026-11-05T11:34:00+05:30"
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_revisions(data, expected_date="2026-11-05", now=NOW)

    def test_version_direction_and_target_corruption_rejected(self):
        for change in ("duplicate_version","wrong_symbol","bad_ce_sl","old_date"):
            data = fixture()
            if change == "duplicate_version": data["revisions"][1]["version"] = 1
            if change == "wrong_symbol": data["revisions"][1]["symbol"] = "RELIANCE"
            if change == "bad_ce_sl": data["revisions"][0]["sl"] = 26000
            if change == "old_date": data["report_date"] = "2026-11-04"
            with self.subTest(change=change), self.assertRaises(ValueError):
                validate_revisions(data, expected_date="2026-11-05", now=NOW)


if __name__ == "__main__":
    unittest.main()

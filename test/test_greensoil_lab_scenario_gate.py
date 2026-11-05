"""Synthetic scenario evidence-gate tests; no broker, real feed or forecasting."""
from copy import deepcopy
from datetime import datetime, timedelta
import unittest

from greensoil_lab.scenario_gate import gate_candidate

NOW = datetime.fromisoformat("2026-11-05T11:35:50+05:30")
STAMP = "2026-11-05T11:35:30+05:30"
CLOSE = "2026-11-05T11:35:00+05:30"


def fixtures():
    def instrument(index, base):
        return {
            "index": index, "as_of": STAMP, "index_change_pct": .45,
            "volume_ratio": 1.85,
            "constituents": [
                {"symbol": index+"A", "as_of": STAMP, "weight_pct": 60, "change_pct": .6},
                {"symbol": index+"B", "as_of": STAMP, "weight_pct": 40, "change_pct": .3},
            ],
            "oi": {"as_of": STAMP, "call_oi_change": 100, "put_oi_change": 250},
        }
    market = {"date": "2026-11-05", "source": "SYNTHETIC_TEST_ONLY",
              "indexes": [instrument("NIFTY",25000),instrument("SENSEX",80000)]}
    revisions = {"report_date": "2026-11-05", "source": "SYNTHETIC_TEST_ONLY",
                 "revisions": [{
                     "version": 1, "symbol": "NIFTY", "direction": "CE",
                     "as_of": "2026-11-05T11:35:40+05:30",
                     "closed_5m_at": CLOSE, "status": "PROPOSED",
                     "reason": "Synthetic 5m price and OI corroboration",
                     "entry": 25015, "sl": 25005, "tp1": 25025,
                     "tp2": 25035, "tp3": 25045,
                 }]}
    candles = [
        {"index": "NIFTY", "closed_at": CLOSE,
         "open": 25012, "high": 25022, "low": 25009, "close": 25020},
        {"index": "SENSEX", "closed_at": CLOSE,
         "open": 80010, "high": 80018, "low": 80008, "close": 80015},
    ]
    return market, revisions, candles


class TestScenarioGate(unittest.TestCase):
    def test_evidence_aligned_is_review_only(self):
        market, revisions, candles = fixtures()
        original = deepcopy((market,revisions,candles))
        got = gate_candidate(market, revisions, candles, now=NOW)
        self.assertEqual(got["status"], "REVIEW_PROPOSAL_ONLY")
        self.assertEqual(got["execution"], "DISABLED")
        self.assertTrue(got["not_a_prediction"])
        self.assertEqual(got["evidence"]["oi_bias"], "bullish")
        self.assertEqual(original,(market,revisions,candles))

    def test_oi_conflict_and_candle_not_crossed(self):
        market, revisions, candles = fixtures()
        market["indexes"][0]["oi"]["call_oi_change"] = 900
        self.assertEqual(gate_candidate(market,revisions,candles,now=NOW)["status"],
                         "NO_TRADE_EVIDENCE_NOT_ALIGNED")
        market, revisions, candles = fixtures()
        candles[0]["close"] = 25013
        self.assertEqual(gate_candidate(market,revisions,candles,now=NOW)["status"],
                         "NO_TRADE_CANDLE_NOT_CONFIRMED")

    def test_tp1_already_touched_rejects_chase(self):
        market, revisions, candles = fixtures()
        candles[0]["high"] = 25028
        self.assertEqual(gate_candidate(market,revisions,candles,now=NOW)["status"],
                         "NO_TRADE_TARGET_ALREADY_TOUCHED")

    def test_false_or_stale_or_inconsistent_inputs(self):
        for category in ("stale_oi","missing_weight","wrong_source","future_candle","bad_ohlc","not_closed"):
            market, revisions, candles = fixtures()
            if category == "stale_oi":
                market["indexes"][0]["oi"]["as_of"] = (NOW - timedelta(minutes=6)).isoformat()
            elif category == "missing_weight":
                market["indexes"][0]["constituents"][0]["weight_pct"] = 20
            elif category == "wrong_source":
                revisions["source"] = "SOMEBODY_ELSE"
            elif category == "future_candle":
                candles[0]["closed_at"] = "2026-11-05T11:40:00+05:30"
            elif category == "bad_ohlc":
                candles[0]["high"] = 25010
            else:
                candles[0]["closed_at"] = "2026-11-05T11:34:00+05:30"
            with self.subTest(category=category), self.assertRaises(ValueError):
                gate_candidate(market,revisions,candles,now=NOW)


if __name__ == "__main__":
    unittest.main()

"""Offline event-feed tests; no market subscriptions, keys or orders."""
from datetime import datetime, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
import json
import unittest

from flask import Flask

from greensoil_lab.watch_source import bp, local_watch

NOW = datetime.fromisoformat("2026-11-05T11:20:00+05:30")


def payload():
    return {
        "date": "2026-11-05",
        "source": "SYNTHETIC_TEST_ONLY",
        "snapshots": [
            {
                "index": symbol,
                "as_of": (NOW - timedelta(seconds=30)).isoformat(),
                "volume_ratio": 1.8,
                "weighted_constituent_change_pct": 0.45,
                "index_change_pct": 0.34,
                "oi_bias": "bullish",
            } for symbol in ("NIFTY", "SENSEX")
        ],
    }


class TestLocalWatch(unittest.TestCase):
    def test_missing_source_never_predicts(self):
        self.assertEqual(local_watch(NOW, root=None)["status"], "NO_VERIFIED_FEED")

    def test_timestamped_index_warnings_without_trade_action(self):
        with TemporaryDirectory() as directory:
            document = payload()
            file = Path(directory) / "2026-11-05.json"
            file.write_text(json.dumps(document), encoding="utf-8")
            before = file.read_bytes()
            result = local_watch(NOW, root=directory)
            self.assertEqual(result["status"], "WATCH_ONLY")
            self.assertEqual(len(result["warnings"]), 2)
            self.assertEqual(result["news_monitor"], "NOT_CONNECTED")
            self.assertTrue(all(row["status"] == "EARLY_WARNING" for row in result["warnings"]))
            self.assertTrue(all(row["action"] == "WATCH_ONLY_NO_ORDER" for row in result["warnings"]))
            self.assertEqual(file.read_bytes(), before)

    def test_stale_and_missing_index(self):
        with TemporaryDirectory() as directory:
            document = payload()
            file = Path(directory) / "2026-11-05.json"
            document["snapshots"][0]["as_of"] = (NOW - timedelta(minutes=4)).isoformat()
            file.write_text(json.dumps(document), encoding="utf-8")
            result = local_watch(NOW, root=directory)
            self.assertEqual(result["warnings"][0]["status"], "STALE_DATA_NO_PREDICTION")
            document["snapshots"][1]["index"] = "RELIANCE"
            file.write_text(json.dumps(document), encoding="utf-8")
            with self.assertRaises(ValueError):
                local_watch(NOW, root=directory)

    def test_bad_inputs_rejected_and_http_post_denied(self):
        with TemporaryDirectory() as directory:
            file = Path(directory) / "2026-11-05.json"
            file.write_text(json.dumps({"date": "2026-11-05", "snapshots": []}), encoding="utf-8")
            with self.assertRaises(ValueError):
                local_watch(NOW, root=directory)
        app = Flask(__name__)
        app.register_blueprint(bp)
        from greensoil_lab.read_only import install_read_only_http_guard
        install_read_only_http_guard(app)
        self.assertEqual(app.test_client().post("/greensoil/api/watch", json={}).status_code, 403)


if __name__ == "__main__":
    unittest.main()

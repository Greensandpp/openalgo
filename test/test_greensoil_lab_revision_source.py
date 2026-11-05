"""Isolated GET-only intraday revisions route tests."""
import json
import unittest
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from flask import Flask

from greensoil_lab.revision_source import bp, read_revisions

NOW = datetime.fromisoformat("2026-11-05T11:35:50+05:30")


class TestRevisionSource(unittest.TestCase):
    def test_missing_feed_is_empty(self):
        with TemporaryDirectory() as folder:
            self.assertEqual(read_revisions(NOW, root=folder)["status"], "NO_VERIFIED_REVISIONS")

    def test_proposed_revision_does_not_mutate_file(self):
        payload = {
            "report_date": "2026-11-05", "source": "SYNTHETIC_TEST",
            "revisions": [{
                "version": 1, "symbol": "NIFTY", "direction": "CE",
                "as_of": "2026-11-05T11:35:40+05:30",
                "closed_5m_at": "2026-11-05T11:35:00+05:30",
                "status": "PROPOSED", "reason": "Synthetic confirmation",
                "entry": 25015, "sl": 25005, "tp1": 25025,
                "tp2": 25035, "tp3": 25045,
            }],
        }
        with TemporaryDirectory() as folder:
            file = Path(folder) / "2026-11-05.json"
            file.write_text(json.dumps(payload), encoding="utf-8")
            before = file.read_bytes()
            result = read_revisions(NOW, root=folder)
            self.assertEqual(result["status"], "WATCH_ONLY")
            self.assertEqual(result["revisions"][0]["certainty"], "UNVERIFIED_SCENARIO")
            self.assertEqual(file.read_bytes(), before)

    def test_post_denied_by_lab_gate(self):
        app = Flask(__name__)
        app.register_blueprint(bp)
        from greensoil_lab.read_only import install_read_only_http_guard
        install_read_only_http_guard(app)
        self.assertEqual(app.test_client().post("/greensoil/api/revisions", json={}).status_code, 403)


if __name__ == "__main__":
    unittest.main()

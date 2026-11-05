"""Gemini startup probe test: offline simulation, secrets never logged."""
import importlib.util
import json
import os
import pathlib
import unittest
from unittest.mock import patch

PATH = pathlib.Path(__file__).resolve().parents[1] / "greensoil_lab" / "gemini_gateway" / "smoke_probe.py"
spec = importlib.util.spec_from_file_location("greensoil_smoke_probe", PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class Response:
    def __init__(self, body):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, *args):
        return json.dumps(self.body).encode()


class SmokeProbeTests(unittest.TestCase):
    def test_missing_key_no_network(self):
        logs = []
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(mod.probe(fetch=lambda *a, **k: self.fail("network"), emit=logs.append))
        self.assertEqual(["GEMINI_SMOKE: not_configured"], logs)

    def test_list_and_generate_no_secrets(self):
        logs = []
        secret = "test_only_never_use_in_real_gateway"
        calls = []
        def fetch(req, timeout=10):
            calls.append(req.full_url)
            if req.full_url.endswith("pageSize=1000"):
                return Response({"models": [
                    {"name": "models/gemini-3.5-flash-lite",
                     "supportedGenerationMethods": ["generateContent"]}]})
            return Response({"candidates": [{"content": {"parts": [{"text": "READY"}]}}]})
        with patch.dict(os.environ, {"GEMINI_API_KEY": secret}, clear=True):
            self.assertTrue(mod.probe(fetch=fetch, emit=logs.append))
        self.assertEqual(2, len(calls))
        self.assertIn("GEMINI_SMOKE: generation_success", logs)
        self.assertNotIn(secret, str(logs))


if __name__ == "__main__":
    unittest.main()

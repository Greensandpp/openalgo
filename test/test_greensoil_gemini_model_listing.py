"""Offline regression tests: listing Gemini models without exposing secrets."""
import importlib.util
import io
import json
import os
import pathlib
import unittest
from unittest.mock import patch

PATH = pathlib.Path(__file__).resolve().parents[1] / "greensoil_lab" / "gemini_gateway" / "check_models.py"
spec = importlib.util.spec_from_file_location("gs_gemini_model_listing", PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class FakeResponse:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self, *args):
        return json.dumps({"models": [
            {"name": "models/gemini-3.8-flash", "supportedGenerationMethods": ["generateContent"]},
            {"name": "models/gemini-3.5-flash-lite", "supportedGenerationMethods": ["generateContent"]},
        ]}).encode()


class ModelListingTests(unittest.TestCase):
    def test_missing_secret_does_not_call_network(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual("not_configured", mod.inspect_models()["status"])

    def test_only_verified_models_displayed_and_key_not_leaked(self):
        secret = "THIS_IS_A_TEST_PLACEHOLDER"
        with patch.dict(os.environ, {"GEMINI_API_KEY": secret}, clear=True):
            def fetch(request, timeout):
                self.assertEqual(10, timeout)
                self.assertIn("x-goog-api-key", {key.lower() for key in request.headers})
                return FakeResponse()
            result = mod.inspect_models(fetch=fetch)
        self.assertEqual("ok", result["status"])
        self.assertEqual({"gemini-3.8-flash", "gemini-3.5-flash-lite"},
                         {model["name"] for model in result["available"]})
        self.assertIn("gemini-4-argon", result["unavailable"])
        self.assertNotIn(secret, json.dumps(result))


if __name__ == "__main__":
    unittest.main()

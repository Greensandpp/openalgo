"""Network-free contract tests for the isolated, never-deployed Gemini gateway."""
import importlib.util
import json
import os
import pathlib
import unittest
from unittest.mock import patch

SOURCE = pathlib.Path(__file__).resolve().parents[1] / "greensoil_lab" / "gemini_gateway" / "app.py"
spec = importlib.util.spec_from_file_location("greensoil_gemini_gateway_testmodule", SOURCE)
gateway = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)

ORIGIN = "https://greensandpp.github.io"
ENV = {
    "GEMINI_API_KEY": "unit-test-placeholder-only",
    "GATEWAY_ACCESS_TOKEN": "unit-test-private-token-only",
    "ALLOWED_ORIGIN": ORIGIN,
    "GEMINI_MODEL": "gemini-2.5-flash",
}
HEADERS = {"Origin": ORIGIN, "Authorization": "Bearer unit-test-private-token-only"}


class FakeProviderResponse:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self, *args):
        return b'{"candidates":[{"content":{"parts":[{"text":"Hello machi"}]}}]}'


class GeminiGatewayTests(unittest.TestCase):
    def setUp(self):
        self.env_patch = patch.dict(os.environ, ENV, clear=True)
        self.env_patch.start()
        self.client = gateway.app.test_client()
        with gateway._LIMIT_LOCK:
            gateway._REQUEST_TIMES.clear()
            gateway._DAILY_COUNTS.update(day=None, count=0)

    def tearDown(self):
        self.env_patch.stop()

    def test_never_exposes_key(self):
        r = self.client.get("/health")
        self.assertEqual(200, r.status_code)
        self.assertTrue(r.json["configured"])
        self.assertNotIn(ENV["GEMINI_API_KEY"], r.get_data(as_text=True))
        self.assertFalse(r.json["broker_orders_enabled"])

    def test_fail_closed_without_credential(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            r = self.client.post("/api/chat", headers=HEADERS, json={"message": "hello"})
        self.assertEqual(503, r.status_code)

    def test_wrong_origin_and_missing_auth(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("must not call provider")):
            self.assertEqual(403, self.client.post("/api/chat", headers={"Origin": "https://evil.example"}, json={"message": "hello"}).status_code)
            self.assertEqual(401, self.client.post("/api/chat", headers={"Origin": ORIGIN}, json={"message": "hello"}).status_code)

    def test_no_fabricated_market_calls(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("must not call provider")):
            for prompt in ("NIFTY next target", "SENSEX chart entry", "latest news"):
                r = self.client.post("/api/chat", headers=HEADERS, json={"message": prompt})
                self.assertEqual(200, r.status_code)
                self.assertEqual("local_safety_gate", r.json["source"])
                self.assertIn("NO TRADE", r.json["answer"])

    def test_only_non_market_prompt_calls_provider(self):
        with patch("urllib.request.urlopen", return_value=FakeProviderResponse()) as send:
            r = self.client.post("/api/chat", headers=HEADERS, json={"message": "Vanakkam"})
            self.assertEqual(200, r.status_code)
            self.assertEqual("Hello machi", r.json["answer"])
            self.assertEqual(1, send.call_count)

    def test_minute_quota_blocks_fourth_call(self):
        with patch("urllib.request.urlopen", return_value=FakeProviderResponse()) as send:
            for _ in range(3):
                self.assertEqual(200, self.client.post("/api/chat", headers=HEADERS, json={"message": "Hello"}).status_code)
            r = self.client.post("/api/chat", headers=HEADERS, json={"message": "Hello"})
            self.assertEqual(429, r.status_code)
            self.assertEqual("minute_quota_exhausted", r.json["error"])
            self.assertEqual(3, send.call_count)

    def test_daily_quota_blocks_without_network(self):
        with gateway._LIMIT_LOCK:
            gateway._DAILY_COUNTS.update(day=int(__import__("time").time() // 86400), count=20)
        with patch("urllib.request.urlopen", side_effect=AssertionError("must not call provider")):
            r = self.client.post("/api/chat", headers=HEADERS, json={"message": "Hello"})
        self.assertEqual(429, r.status_code)
        self.assertEqual("daily_quota_exhausted", r.json["error"])

    def test_auth_config_does_not_expose_secrets(self):
        r = self.client.get("/api/config", headers=HEADERS)
        self.assertEqual(200, r.status_code)
        self.assertFalse(r.json["model_access_verified"])
        self.assertEqual(20, r.json["max_requests_per_day"])
        self.assertNotIn(ENV["GEMINI_API_KEY"], r.get_data(as_text=True))

    def test_invalid_payload_and_write_denial(self):
        r = self.client.post("/api/chat", headers=HEADERS, json={"message": ""})
        self.assertEqual(400, r.status_code)
        self.assertEqual(403, self.client.post("/api/orders", headers=HEADERS, json={}).status_code)


if __name__ == "__main__":
    unittest.main()

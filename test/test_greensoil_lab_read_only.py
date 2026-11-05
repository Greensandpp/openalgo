"""Self-contained read-only HTTP guard tests; no broker keys required."""
import unittest
from flask import Flask
from greensoil_lab.read_only import install_read_only_http_guard, denied_broker_write


class TestGreenSoilLabReadOnly(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.add_url_rule("/chart", view_func=lambda: "chart", methods=["GET"])
        app.add_url_rule("/api/v1/placeorder", view_func=lambda: "ORDER SENT", methods=["POST"])
        app.add_url_rule("/agent", view_func=lambda: "AGENT EXECUTED", methods=["POST"])
        app.add_url_rule("/flow/execute", view_func=lambda: "FLOW EXECUTED", methods=["POST"])
        install_read_only_http_guard(app)
        self.client = app.test_client()

    def test_internal_broker_write_is_denied(self):
        for operation in ("place_order_with_auth", "close_position_with_auth", "cancel_order_with_auth"):
            with self.subTest(operation=operation):
                success, response, status = denied_broker_write(operation)
                self.assertFalse(success)
                self.assertEqual(status, 403)
                self.assertEqual(response["code"], "GREENSOIL_LAB_READ_ONLY")

    def test_chart_read_still_works(self):
        self.assertEqual(self.client.get("/chart").status_code, 200)

    def test_order_api_blocked(self):
        response = self.client.post("/api/v1/placeorder")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json["code"], "GREENSOIL_LAB_READ_ONLY")

    def test_agent_and_flow_http_writes_blocked(self):
        for path in ("/agent", "/flow/execute"):
            with self.subTest(path=path):
                response = self.client.post(path)
                self.assertEqual(response.status_code, 403)

    def test_all_unsafe_methods_blocked(self):
        for method in ("POST", "PUT", "PATCH", "DELETE"):
            with self.subTest(method=method):
                self.assertEqual(self.client.open("/chart", method=method).status_code, 403)


if __name__ == "__main__":
    unittest.main()

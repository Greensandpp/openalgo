"""Static safety contract for GreenSoil lab order paths.

These checks need only the Python standard library and never import broker code.
They do NOT prove full trading isolation; other dispatch paths must be audited.
"""
import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
GUARDED = {
    "services/place_order_service.py": ("place_order_with_auth",),
    "services/close_position_service.py": ("close_position_with_auth",),
    "services/cancel_order_service.py": ("cancel_order_with_auth",),
    "services/pending_order_execution_service.py": ("execute_approved_order",),
    "services/basket_order_service.py": ("place_single_order", "process_basket_order_with_auth", "place_basket_order"),
    "services/cancel_all_order_service.py": ("cancel_all_orders_with_auth", "cancel_all_orders"),
    "services/cancel_gtt_order_service.py": ("cancel_gtt_order_with_auth", "cancel_gtt_order"),
    "services/modify_gtt_order_service.py": ("modify_gtt_order_with_auth", "modify_gtt_order"),
    "services/modify_order_service.py": ("modify_order_with_auth", "modify_order"),
    "services/options_multiorder_service.py": ("place_single_split_order_for_leg", "resolve_and_place_leg", "process_multiorder_with_auth", "place_options_multiorder"),
    "services/place_gtt_order_service.py": ("place_gtt_order_with_auth", "place_gtt_order"),
    "services/place_options_order_service.py": ("place_single_split_order", "place_options_order"),
    "services/place_smart_order_service.py": ("place_smart_order_with_auth", "place_smart_order"),
    "services/split_order_service.py": ("place_single_order", "split_order_with_auth", "split_order"),
}

class TestGuardPlacement(unittest.TestCase):
    def test_guarded_functions_have_early_deny(self):
        for path, names in GUARDED.items():
            tree = ast.parse((ROOT / path).read_text(encoding="utf-8"), filename=path)
            funcs = {node.name: node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))}
            for name in names:
                with self.subTest(path=path, function=name):
                    self.assertIn(name, funcs)
                    fn = funcs[name]
                    first = fn.body[:5]
                    text = "\n".join(ast.unparse(node) for node in first)
                    self.assertTrue(
                        "denied_broker_write" in text or "raise_broker_write_blocked" in text,
                        "Expected explicit early broker denial"
                    )
                    self.assertTrue(
                        any(isinstance(node, (ast.Raise, ast.Return)) for node in first),
                        "Expected early return or exception"
                    )

    def test_pending_approval_denied(self):
        path = ROOT / "services/pending_order_execution_service.py"
        tree = ast.parse(path.read_text(encoding="utf-8"))
        fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "execute_approved_order")
        text = "\n".join(ast.unparse(x) for x in fn.body[:5])
        self.assertIn("denied_broker_write", text)

if __name__ == "__main__":
    unittest.main()

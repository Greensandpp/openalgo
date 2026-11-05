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
                    body = fn.body
                    # Skip an optional function docstring; no executable code may
                    # precede the guard's import and unconditional denial.
                    if (body and isinstance(body[0], ast.Expr)
                            and isinstance(body[0].value, ast.Constant)
                            and isinstance(body[0].value.value, str)):
                        body = body[1:]
                    self.assertGreaterEqual(len(body), 2)
                    self.assertIsInstance(body[0], ast.ImportFrom)
                    self.assertEqual(body[0].module, "greensoil_lab.read_only")
                    second = body[1]
                    if isinstance(second, ast.Return):
                        call = second.value
                    elif isinstance(second, ast.Expr):
                        call = second.value
                    else:
                        self.fail("Expected unconditional return or raising guard call")
                    self.assertIsInstance(call, ast.Call)
                    self.assertIsInstance(call.func, ast.Name)
                    self.assertIn(call.func.id, ("denied_broker_write", "raise_broker_write_blocked"))
                    self.assertIn(call.func.id, [n.name for n in body[0].names])

    def test_flow_order_nodes_are_unconditionally_denied(self):
        path = ROOT / "services/flow_executor_service.py"
        tree = ast.parse(path.read_text(encoding="utf-8"))
        names = {
            "execute_place_order", "execute_smart_order",
            "execute_options_order", "execute_options_multi_order",
            "execute_modify_order", "execute_cancel_order",
            "execute_cancel_all_orders", "execute_close_positions",
            "execute_basket_order", "execute_split_order",
        }
        methods = {
            node.name: node
            for cls in tree.body if isinstance(cls, ast.ClassDef)
            for node in cls.body if isinstance(node, ast.FunctionDef)
        }
        for name in names:
            with self.subTest(name=name):
                self.assertIn(name, methods)
                body = methods[name].body
                self.assertGreaterEqual(len(body), 2)
                self.assertIsInstance(body[0], ast.ImportFrom)
                self.assertEqual(body[0].module, "greensoil_lab.read_only")
                self.assertIsInstance(body[1], ast.Expr)
                call = body[1].value
                self.assertIsInstance(call, ast.Call)
                self.assertIsInstance(call.func, ast.Name)
                self.assertEqual(call.func.id, "raise_broker_write_blocked")

    def test_mcp_tools_force_read_only(self):
        path = ROOT / "mcp/mcpserver.py"
        tree = ast.parse(path.read_text(encoding="utf-8"))
        assignments = [
            node for node in tree.body
            if isinstance(node, ast.Assign)
            and any(isinstance(t, ast.Name) and t.id == "READ_ONLY" for t in node.targets)
        ]
        self.assertEqual(len(assignments), 1)
        self.assertIsInstance(assignments[0].value, ast.Constant)
        self.assertIs(assignments[0].value.value, True)

    def test_agent_order_pipeline_returns_before_dispatch(self):
        path = ROOT / "services/agent/tools/orders.py"
        tree = ast.parse(path.read_text(encoding="utf-8"))
        method = next(
            fn
            for cls in tree.body if isinstance(cls, ast.ClassDef)
            for fn in cls.body if isinstance(fn, ast.FunctionDef)
            if fn.name == "_run_mutation"
        )
        body = method.body
        if (body and isinstance(body[0], ast.Expr)
                and isinstance(body[0].value, ast.Constant)
                and isinstance(body[0].value.value, str)):
            body = body[1:]
        self.assertIsInstance(body[0], ast.Return)
        self.assertIn("GREENSOIL_LAB_READ_ONLY", ast.unparse(body[0]))
        self.assertNotIn("plan_factory", ast.unparse(body[0]))

    def test_pending_approval_denied(self):
        path = ROOT / "services/pending_order_execution_service.py"
        tree = ast.parse(path.read_text(encoding="utf-8"))
        fn = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "execute_approved_order")
        text = "\n".join(ast.unparse(x) for x in fn.body[:5])
        self.assertIn("denied_broker_write", text)

if __name__ == "__main__":
    unittest.main()

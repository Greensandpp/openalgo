"""GreenSoil isolated lab: deny HTTP writes before any route handler runs.

This is only the HTTP safety layer. Scheduled strategies, internal broker calls,
MCP tools and background workers require separate guards before deployment.
"""
from flask import jsonify, request

SAFE_METHODS = frozenset(("GET", "HEAD", "OPTIONS"))


def install_read_only_http_guard(app):
    """Unconditionally deny mutating HTTP requests in the isolated lab fork.

    Intentionally *no* enable-trading flag, bypass header, or allowlist.
    """
    @app.before_request
    def greensoil_lab_deny_http_writes():
        if request.method not in SAFE_METHODS:
            return jsonify({
                "status": "blocked",
                "code": "GREENSOIL_LAB_READ_ONLY",
                "message": "GreenSoil lab forbids HTTP write operations; no orders allowed.",
            }), 403


def denied_broker_write(operation: str):
    """Return a deterministic failure for internal broker-order operations."""
    return False, {
        "status": "blocked",
        "code": "GREENSOIL_LAB_READ_ONLY",
        "message": f"GreenSoil lab forbids broker mutation: {operation}",
    }, 403

"""Print safe Gemini API model availability using an existing staging secret.

Execute ONLY inside the isolated authorized staging runtime, never on GitHub
Actions, shared developer laptops, or user-visible chat logs. This sends one
read-only listModels request; it does not generate content or incur text tokens.
Availability is specific to the developer API project/key, NOT the Gemini app.
"""
import json
import os
import sys
import urllib.error
import urllib.request

MODEL_IDS = (
    "gemini-4-argon",
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.8-live",
)


def inspect_models(fetch=None):
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        return {"status": "not_configured", "available": [], "unavailable": list(MODEL_IDS)}
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
        headers={"x-goog-api-key": key, "Accept": "application/json"},
    )
    opener = fetch or urllib.request.urlopen
    try:
        with opener(request, timeout=10) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        # Never show response contents; provider may echo diagnostic metadata.
        return {"status": "provider_error", "http_status": error.code}
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        return {"status": "network_error"}

    all_models = {
        item.get("name", "").removeprefix("models/"): item
        for item in payload.get("models", [])
        if isinstance(item, dict)
    }
    available = []
    unavailable = []
    for model_id in MODEL_IDS:
        model = all_models.get(model_id)
        if model:
            available.append({
                "name": model_id,
                "methods": [
                    method
                    for method in model.get("supportedGenerationMethods", [])
                    if method in ("generateContent", "bidiGenerateContent")
                ],
            })
        else:
            unavailable.append(model_id)
    return {"status": "ok", "available": available, "unavailable": unavailable,
            "note": "Model listing does not guarantee quota or usage entitlement."}


if __name__ == "__main__":
    outcome = inspect_models()
    print(json.dumps(outcome, indent=2))
    if outcome["status"] != "ok":
        sys.exit(1)

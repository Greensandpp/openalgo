"""Private, one-shot Gemini model connectivity check on Railway STAGING startup.

Invokes read-only listModels then ONE short generation on Gemini 3.5 Flash-Lite
only when model listing advertises generateContent. The probe never logs the
API key, model output or provider bodies, and doesn't accept public input.
A nonzero API error still starts the fail-closed staging HTTP service.
"""
import json
import os
import urllib.error
import urllib.request

MODEL = "gemini-3.5-flash-lite"
BASE = "https://generativelanguage.googleapis.com/v1beta/models/"


def probe(fetch=None, emit=print):
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        emit("GEMINI_SMOKE: not_configured")
        return False
    opener = fetch or urllib.request.urlopen
    try:
        req = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
            headers={"x-goog-api-key": key, "Accept": "application/json"},
        )
        with opener(req, timeout=10) as response:
            models = json.load(response)
        supported = any(
            item.get("name") == f"models/{MODEL}"
            and "generateContent" in item.get("supportedGenerationMethods", [])
            for item in models.get("models", [])
            if isinstance(item, dict)
        )
        if not supported:
            emit("GEMINI_SMOKE: model_unavailable")
            return False
        emit("GEMINI_SMOKE: listed_model_available")
        payload = json.dumps({
            "contents": [{"parts": [{"text": "Reply with one word: READY"}]}],
            "generationConfig": {"maxOutputTokens": 96, "temperature": 0},
        }).encode()
        request = urllib.request.Request(
            BASE + MODEL + ":generateContent", data=payload, method="POST",
            headers={"x-goog-api-key": key, "Content-Type": "application/json"},
        )
        with opener(request, timeout=30) as response:
            result = json.load(response)
        valid = isinstance(result.get("candidates"), list) and bool(result["candidates"])
        emit("GEMINI_SMOKE: generation_" + ("success" if valid else "empty"))
        return valid
    except urllib.error.HTTPError as error:
        emit("GEMINI_SMOKE: provider_http_" + str(error.code))
    except (TimeoutError,):
        emit("GEMINI_SMOKE: provider_timeout")
    except urllib.error.URLError:
        emit("GEMINI_SMOKE: network_error")
    except (OSError, ValueError, KeyError, TypeError):
        emit("GEMINI_SMOKE: response_parse_or_io_error")
    return False


if __name__ == "__main__":
    probe()

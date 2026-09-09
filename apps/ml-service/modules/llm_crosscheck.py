"""
llm_crosscheck.py

Optional LLM cross-check via OpenRouter (works with GPT, Claude, Grok, or
any other vision-capable model available there). Only used if
USE_LLM_CROSSCHECK is True in config.py.
"""

import base64
import cv2
import requests

from config import OPENROUTER_API_KEY
from modules.ocr_engine import _clean_text

LLM_PROMPT = (
    "You are reading a vehicle license plate cropped from a photo. "
    "Reply with ONLY the plate's alphanumeric characters, uppercase, no "
    "spaces, no punctuation, no explanation. If you cannot read it, reply "
    "with an empty string."
)

# Look-alike pairs used to check whether an OCR/LLM mismatch is explainable.
_CONFUSION_PAIR_SET = {frozenset(p) for p in [("H", "W"), ("0", "O"), ("1", "I"), ("5", "S"), ("8", "B")]}


def call_openrouter_vision(image_bgr, model, prompt=LLM_PROMPT, max_tokens=30):
    """Send a cropped image + prompt to an OpenRouter vision model, return the cleaned text reply."""
    try:
        ok, buffer = cv2.imencode(".png", image_bgr)
        if not ok:
            return ""
        b64 = base64.b64encode(buffer.tobytes()).decode("utf-8")
        data_url = f"data:image/png;base64,{b64}"

        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }],
                "max_tokens": max_tokens,
            },
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        text = data["choices"][0]["message"]["content"]
        return _clean_text(text)
    except Exception as e:
        print(f"OpenRouter call failed ({model}): {e}")
        return ""


def texts_match(a, b):
    return bool(a) and a == b


def explain_by_confusion_map(a, b):
    """True + merged text if every differing character is a known look-alike swap, else (False, None)."""
    if not a or not b or len(a) != len(b):
        return False, None
    merged = []
    for ca, cb in zip(a, b):
        if ca == cb:
            merged.append(ca)
        elif frozenset((ca, cb)) in _CONFUSION_PAIR_SET:
            merged.append(ca)
        else:
            return False, None
    return True, "".join(merged)


def check_region():
    """Placeholder for GPS/country detection - hardcoded to India for now."""
    return "IN"

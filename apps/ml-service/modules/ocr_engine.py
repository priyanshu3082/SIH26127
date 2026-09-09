"""
ocr_engine.py

EasyOCR text extraction, plus structural parsing and confusion-lookup
correction against Indian plate format (state code / district code /
series / number).
"""

import easyocr

_ocr_reader = None

PLATE_TEXT_ALLOWLIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# Country badges/stickers that sometimes get OCR'd along with the plate
# text (e.g. the blue "IND" badge on Indian plates), dropped by exact
# match rather than by relative bounding-box size (an area-ratio filter
# was found to drop legitimate characters on some plate layouts).
BADGE_TEXT_BLOCKLIST = {"IND"}

# All Indian state / union-territory RTO codes. TG is the current official
# Telangana code; TS is kept as an alias for older transitional plates.
INDIAN_STATE_CODES = {
    "AN", "AP", "AR", "AS", "BR", "CH", "CG", "DD", "DL", "DN", "GA", "GJ",
    "HR", "HP", "JK", "JH", "KA", "KL", "LA", "LD", "MP", "MH", "MN", "ML",
    "MZ", "NL", "OD", "OR", "PB", "PY", "RJ", "SK", "TN", "TG", "TS", "TR",
    "UK", "UA", "UP", "WB",
}

# District/RTO number range check (1-99 covers the vast majority of real
# codes - there is no single reliable public source for an exhaustive
# per-district registry, so this validates plausibility, not an exact list).
DISTRICT_CODE_MIN = 1
DISTRICT_CODE_MAX = 99

# Confusion lookup table: for each character OCR/LLM might misread, what
# it should become if the position expects a letter vs. a digit.
CONFUSION_LOOKUP = {
    "0": {"as_letter": "O", "as_digit": "0"}, "O": {"as_letter": "O", "as_digit": "0"},
    "1": {"as_letter": "I", "as_digit": "1"}, "I": {"as_letter": "I", "as_digit": "1"},
    "5": {"as_letter": "S", "as_digit": "5"}, "S": {"as_letter": "S", "as_digit": "5"},
    "8": {"as_letter": "B", "as_digit": "8"}, "B": {"as_letter": "B", "as_digit": "8"},
    "2": {"as_letter": "Z", "as_digit": "2"}, "Z": {"as_letter": "Z", "as_digit": "2"},
    "4": {"as_letter": "A", "as_digit": "4"}, "A": {"as_letter": "A", "as_digit": "4"},
}

# Pure letter<->letter look-alikes (both valid letters - type coercion
# above doesn't help here, only trying the alternate letter does).
LETTER_LOOKALIKES = {"H": ["W"], "W": ["H"]}


def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        _ocr_reader = easyocr.Reader(["en"], gpu=False)
    return _ocr_reader


def _clean_text(text):
    return "".join(ch for ch in text.upper() if ch in PLATE_TEXT_ALLOWLIST)


def run_ocr(plate_img, min_conf=0.2):
    """Run EasyOCR on a pre-processed plate image and return the raw text."""
    reader = get_ocr_reader()
    results = reader.readtext(plate_img, allowlist=PLATE_TEXT_ALLOWLIST, mag_ratio=2)
    if not results:
        return ""
    results = [r for r in results if r[2] >= min_conf]
    if not results:
        return ""
    results = [r for r in results if _clean_text(r[1]) not in BADGE_TEXT_BLOCKLIST]
    if not results:
        return ""
    results = sorted(results, key=lambda r: r[0][0][0])
    return "".join(_clean_text(r[1]) for r in results)


def _coerce(text, role):
    out = []
    for ch in text:
        info = CONFUSION_LOOKUP.get(ch)
        out.append(info[f"as_{role}"] if info and info.get(f"as_{role}") else ch)
    return "".join(out)


def parse_plate_structure(text):
    """Split raw text into state(2) / district(1-2 digits) / series(1-3 letters) / number(4 digits)."""
    if len(text) < 8:
        return None
    number = text[-4:]
    remainder = text[:-4]
    state = remainder[:2]
    middle = remainder[2:]
    district_len = 2 if len(middle) >= 3 else max(1, len(middle))
    district = middle[:district_len]
    series = middle[district_len:]
    return {"state": state, "district": district, "series": series, "number": number}


def validate_plate_parts(parts):
    state_ok = parts["state"] in INDIAN_STATE_CODES
    district_ok = parts["district"].isdigit() and DISTRICT_CODE_MIN <= int(parts["district"]) <= DISTRICT_CODE_MAX
    series_ok = parts["series"].isalpha() and len(parts["series"]) >= 1
    number_ok = parts["number"].isdigit() and len(parts["number"]) == 4
    return state_ok and district_ok and series_ok and number_ok, {
        "state_ok": state_ok, "district_ok": district_ok, "series_ok": series_ok, "number_ok": number_ok,
    }


def structural_correct(raw_text, max_recheck=2):
    """
    Structural parse + confusion-lookup correction + re-check.

    Returns (corrected_text, is_valid, detail). If the text doesn't parse
    into the expected shape at all (too short for a standard Indian
    plate), corrected_text is the raw text and is_valid is False - the
    caller uses that to fall back to the plain reading for non-Indian
    plates instead of forcing an Indian-format correction onto it.
    """
    parts = parse_plate_structure(raw_text)
    if parts is None:
        return raw_text, False, {}

    parts = {
        "state": _coerce(parts["state"], "letter"),
        "district": _coerce(parts["district"], "digit"),
        "series": _coerce(parts["series"], "letter"),
        "number": _coerce(parts["number"], "digit"),
    }
    is_valid, detail = validate_plate_parts(parts)

    attempt = 0
    while not detail["state_ok"] and attempt < max_recheck:
        swapped = False
        for i, ch in enumerate(parts["state"]):
            for alt in LETTER_LOOKALIKES.get(ch, []):
                trial_state = parts["state"][:i] + alt + parts["state"][i + 1:]
                if trial_state in INDIAN_STATE_CODES:
                    parts["state"] = trial_state
                    swapped = True
                    break
            if swapped:
                break
        if not swapped:
            break
        is_valid, detail = validate_plate_parts(parts)
        attempt += 1

    corrected_text = parts["state"] + parts["district"] + parts["series"] + parts["number"]
    return corrected_text, is_valid, detail

"""
text_extraction.py

Orchestrates the full plate-text extraction flow:
  OCR -> (optional) cheap LLM cross-check -> confusion map -> GPS check ->
  structural check. On an unresolved mismatch, retries with stronger
  pre-processing. If still unresolved after all retries, escalates ONCE to
  the strong model as a final attempt before falling back to plain OCR.
"""

from config import MAX_PREPROCESS_RETRIES, USE_LLM_CROSSCHECK, OPENROUTER_CHEAP_MODEL, OPENROUTER_STRONG_MODEL
from modules.preprocessing import preprocess_plate
from modules.ocr_engine import run_ocr, structural_correct
from modules.llm_crosscheck import call_openrouter_vision, texts_match, explain_by_confusion_map, check_region

_PREPROCESS_VARIANTS = [
    dict(target_height=150, clip_limit=2.5, sharpen_amount=0.5),
    dict(target_height=200, clip_limit=3.5, sharpen_amount=0.8),
    dict(target_height=250, clip_limit=4.0, sharpen_amount=1.0),
]


def extract_plate_text(plate_crop_bgr, max_retries=MAX_PREPROCESS_RETRIES, verbose=False):
    best_raw = ""
    for attempt in range(max_retries + 1):
        variant = _PREPROCESS_VARIANTS[min(attempt, len(_PREPROCESS_VARIANTS) - 1)]
        pre_plate = preprocess_plate(plate_crop_bgr, **variant)
        raw_text = run_ocr(pre_plate)
        if len(raw_text) > len(best_raw):
            best_raw = raw_text

        if not USE_LLM_CROSSCHECK:
            corrected, is_valid, _ = structural_correct(raw_text)
            if verbose:
                print(f"  attempt {attempt}: raw={raw_text!r} corrected={corrected!r} valid={is_valid}")
            if is_valid:
                return corrected
            continue

        llm_text = call_openrouter_vision(plate_crop_bgr, OPENROUTER_CHEAP_MODEL)
        if verbose:
            print(f"  attempt {attempt}: OCR={raw_text!r} LLM(cheap)={llm_text!r}")

        if texts_match(raw_text, llm_text):
            corrected, is_valid, _ = structural_correct(raw_text)
            return corrected if is_valid else raw_text

        swappable, merged = explain_by_confusion_map(raw_text, llm_text)
        if swappable and check_region() == "IN":
            corrected, is_valid, _ = structural_correct(merged)
            if is_valid:
                return corrected
        elif swappable:
            return merged
        # else: unresolved this round - loop retries with stronger pre-processing

    if USE_LLM_CROSSCHECK:
        pre_plate = preprocess_plate(plate_crop_bgr, **_PREPROCESS_VARIANTS[-1])
        raw_text = run_ocr(pre_plate)
        llm_text_strong = call_openrouter_vision(plate_crop_bgr, OPENROUTER_STRONG_MODEL)
        if verbose:
            print(f"  escalation: OCR={raw_text!r} LLM(strong)={llm_text_strong!r}")

        if texts_match(raw_text, llm_text_strong):
            corrected, is_valid, _ = structural_correct(raw_text)
            return corrected if is_valid else raw_text

        swappable, merged = explain_by_confusion_map(raw_text, llm_text_strong)
        if swappable:
            corrected, is_valid, _ = structural_correct(merged)
            return corrected if is_valid else merged

    return best_raw

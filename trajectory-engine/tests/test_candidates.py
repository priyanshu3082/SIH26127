import time

from trajectory import db
from trajectory.matching.candidates import find_candidates, matches_hsrp_grammar, normalize_plate

from conftest import make_camera


def test_normalize_plate_collapses_confusable_chars():
    assert normalize_plate("KA0IAB1234") == normalize_plate("KA01AB1234")


def test_matches_hsrp_grammar_accepts_valid_shapes_and_rejects_invalid():
    assert matches_hsrp_grammar("KA01AB1234")
    assert not matches_hsrp_grammar("KA01AB12")  # too few trailing digits
    assert not matches_hsrp_grammar("1201AB1234")  # state code must be letters


def test_matches_hsrp_grammar_tolerates_a_single_digit_letter_ocr_confusion():
    # "1" misread as "I" mid-plate should not be rejected by grammar before the
    # confusion table gets a chance to normalize it for comparison.
    assert matches_hsrp_grammar("KA0IAB1234")


def test_find_candidates_returns_close_matches_and_excludes_far_and_invalid(conn):
    make_camera(conn, "CAM1", 26.1, 91.7)
    now = time.time()

    db.insert_event(conn, "CAM1", now, "KA01AB1234", 0.95)       # exact match
    db.insert_event(conn, "CAM1", now + 10, "KA01AB1235", 0.9)   # edit distance 1
    db.insert_event(conn, "CAM1", now + 20, "KA0IAB1234", 0.8)   # confusable char, normalizes to exact
    db.insert_event(conn, "CAM1", now + 30, "DL99ZZ9999", 0.9)   # different plate, excluded by distance
    db.insert_event(conn, "CAM1", now + 40, "KA01AB12", 0.9)     # fails HSRP grammar, excluded

    results = find_candidates(conn, "KA01AB1234")
    plates = {r["plate_raw"] for r in results}

    assert plates == {"KA01AB1234", "KA01AB1235", "KA0IAB1234"}
    assert all(r["edit_distance"] <= 2 for r in results)
    assert results == sorted(results, key=lambda r: r["ts"])

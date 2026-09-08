import time

from trajectory import db
from trajectory.pipeline import reconstruct_trajectory

from conftest import make_camera, set_travel_time


def test_reconstructs_trajectory_despite_ocr_noise_and_a_contradicting_decoy(conn):
    make_camera(conn, "CAM1", 0, 0)
    make_camera(conn, "CAM2", 0, 0.01)
    make_camera(conn, "CAM3", 0, 0.02)
    for x, y in [("CAM1", "CAM2"), ("CAM2", "CAM3"), ("CAM1", "CAM3")]:
        set_travel_time(conn, x, y, 600)

    now = time.time()
    true_plate = "KA01AB1234"

    db.insert_event(conn, "CAM1", now, true_plate, 0.95, "car", "white")
    # OCR noise: a confusable-character misread, still within edit distance <=2
    db.insert_event(conn, "CAM2", now + 610, "KA0IAB1234", 0.7, "car", "white")
    db.insert_event(conn, "CAM3", now + 1220, true_plate, 0.9, "car", "white")

    # Decoy vehicle: similar plate, different attributes, a competing sighting near CAM2's time
    db.insert_event(conn, "CAM2", now + 615, "KA01AB1235", 0.6, "truck", "red")

    trajectory = reconstruct_trajectory(conn, true_plate, case_id="CASE-TEST")

    camera_sequence = [stop.camera_id for stop in trajectory.stops]
    assert camera_sequence == ["CAM1", "CAM2", "CAM3"]
    assert not any(stop.is_chain_break for stop in trajectory.stops)


def test_flags_chain_break_on_unusually_long_gap(conn):
    make_camera(conn, "CAM1", 0, 0)
    make_camera(conn, "CAM2", 0, 0.01)
    set_travel_time(conn, "CAM1", "CAM2", 600)

    now = time.time()
    plate = "KA01AB1234"
    db.insert_event(conn, "CAM1", now, plate, 0.95, "car", "white")
    db.insert_event(conn, "CAM2", now + 5000, plate, 0.9, "car", "white")  # ~8x expected: a stop

    trajectory = reconstruct_trajectory(conn, plate, case_id="CASE-TEST")

    assert [s.camera_id for s in trajectory.stops] == ["CAM1", "CAM2"]
    assert trajectory.stops[1].is_chain_break is True


def test_impossible_transition_is_never_included(conn):
    make_camera(conn, "CAM1", 0, 0)
    make_camera(conn, "CAM2", 0, 0.01)
    set_travel_time(conn, "CAM1", "CAM2", 600)

    now = time.time()
    plate = "KA01AB1234"
    db.insert_event(conn, "CAM1", now, plate, 0.95, "car", "white")
    db.insert_event(conn, "CAM2", now + 30, plate, 0.9, "car", "white")  # far too fast

    trajectory = reconstruct_trajectory(conn, plate, case_id="CASE-TEST")

    assert [s.camera_id for s in trajectory.stops] == ["CAM1"]


def test_no_matching_events_returns_empty_trajectory(conn):
    make_camera(conn, "CAM1", 0, 0)
    trajectory = reconstruct_trajectory(conn, "KA01AB1234", case_id="CASE-TEST")

    assert trajectory.stops == []
    assert trajectory.confidence == 0.0

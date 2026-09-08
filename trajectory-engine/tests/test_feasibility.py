from trajectory.feasibility.filter import build_feasible_transitions

from conftest import make_camera, set_travel_time


def _candidate(camera_id, ts, edit_distance=0, confidence=0.9):
    return {
        "camera_id": camera_id, "ts": ts, "edit_distance": edit_distance,
        "confidence": confidence, "vehicle_type": "car", "vehicle_color": "white",
    }


def test_feasible_transition_kept_and_not_flagged(conn):
    make_camera(conn, "A", 0, 0)
    make_camera(conn, "B", 0, 0.01)
    set_travel_time(conn, "A", "B", 600)  # 10 min expected

    candidates = [_candidate("A", 1000), _candidate("B", 1000 + 700)]  # slightly over expected
    feasible, chain_breaks = build_feasible_transitions(conn, candidates)

    assert (0, 1) in feasible
    assert (0, 1) not in chain_breaks


def test_too_fast_transition_is_dropped(conn):
    make_camera(conn, "A", 0, 0)
    make_camera(conn, "B", 0, 0.01)
    set_travel_time(conn, "A", "B", 600)

    candidates = [_candidate("A", 1000), _candidate("B", 1000 + 60)]  # far too fast
    feasible, _ = build_feasible_transitions(conn, candidates)

    assert (0, 1) not in feasible


def test_slow_transition_kept_but_flagged_as_chain_break(conn):
    make_camera(conn, "A", 0, 0)
    make_camera(conn, "B", 0, 0.01)
    set_travel_time(conn, "A", "B", 600)

    candidates = [_candidate("A", 1000), _candidate("B", 1000 + 3000)]  # 5x expected
    feasible, chain_breaks = build_feasible_transitions(conn, candidates)

    assert (0, 1) in feasible
    assert (0, 1) in chain_breaks


def test_candidate_with_unknown_camera_excluded_from_feasibility(conn):
    make_camera(conn, "A", 0, 0)
    # "GHOST" intentionally never created as a camera

    candidates = [_candidate("A", 1000), _candidate("GHOST", 1600)]
    feasible, _ = build_feasible_transitions(conn, candidates)

    assert (0, 1) not in feasible


def test_same_camera_pair_is_not_a_transition(conn):
    make_camera(conn, "A", 0, 0)

    candidates = [_candidate("A", 1000), _candidate("A", 1010)]
    feasible, _ = build_feasible_transitions(conn, candidates)

    assert feasible == {}

import time

from trajectory import db
from trajectory.od_analytics.ipf import estimate_od_matrix
from trajectory.traffic_analytics.analytics import total_camera_volume

from conftest import make_camera, set_travel_time


def test_ipf_estimate_concentrates_mass_on_the_dominant_true_od_pair(conn):
    make_camera(conn, "A", 0, 0)
    make_camera(conn, "B", 0, 0.01)
    make_camera(conn, "C", 0, 0.02)
    for x, y in [("A", "B"), ("B", "C"), ("A", "C")]:
        set_travel_time(conn, x, y, 600)

    now = time.time()
    # 5 vehicles A->C (dominant flow), 1 vehicle A->B
    for i in range(5):
        plate = f"KA01AB{1000 + i}"
        db.insert_event(conn, "A", now + i, plate, 0.9, "car", "white")
        db.insert_event(conn, "C", now + i + 600, plate, 0.9, "car", "white")
    db.insert_event(conn, "A", now + 100, "KA02CD2000", 0.9, "car", "white")
    db.insert_event(conn, "B", now + 700, "KA02CD2000", 0.9, "car", "white")

    volumes = total_camera_volume(conn)
    matrix, cameras = estimate_od_matrix(conn, volumes)

    a_idx = cameras.index("A")
    b_idx = cameras.index("B")
    c_idx = cameras.index("C")

    assert matrix[a_idx][c_idx] > matrix[a_idx][b_idx]


def test_ipf_output_respects_requested_marginals(conn):
    make_camera(conn, "A", 0, 0)
    make_camera(conn, "B", 0, 0.01)
    set_travel_time(conn, "A", "B", 600)

    now = time.time()
    db.insert_event(conn, "A", now, "KA01AB1234", 0.9, "car", "white")
    db.insert_event(conn, "B", now + 600, "KA01AB1234", 0.9, "car", "white")

    volumes = {"A": 10.0, "B": 10.0}
    matrix, cameras = estimate_od_matrix(conn, volumes)

    # IPF converges logarithmically for a seed with near-zero cells that must grow to
    # match a large marginal share (see fit_ipf's docstring) - within 2% is a
    # meaningful "respects the marginals" bar without demanding exact convergence.
    row_sums = matrix.sum(axis=1)
    for i, camera_id in enumerate(cameras):
        assert abs(row_sums[i] - volumes[camera_id]) < 0.2


def test_no_volume_data_returns_seed_matrix_unchanged(conn):
    make_camera(conn, "A", 0, 0)
    make_camera(conn, "B", 0, 0.01)

    matrix, cameras = estimate_od_matrix(conn, camera_volumes={})

    assert matrix.sum() == 0

import time

from trajectory import db
from trajectory.traffic_analytics.analytics import (
    average_speed_and_congestion,
    camera_volume,
    total_camera_volume,
)

from conftest import make_camera, set_travel_time


def test_total_camera_volume_counts_events_per_camera(conn):
    make_camera(conn, "CAM1", 0, 0)
    make_camera(conn, "CAM2", 0, 0.01)
    now = time.time()
    db.insert_event(conn, "CAM1", now, "KA01AB1234", 0.9)
    db.insert_event(conn, "CAM1", now + 10, "KA01AB1235", 0.9)
    db.insert_event(conn, "CAM2", now + 20, "KA01AB1236", 0.9)

    assert total_camera_volume(conn) == {"CAM1": 2, "CAM2": 1}


def test_camera_volume_buckets_by_time_window(conn):
    make_camera(conn, "CAM1", 0, 0)
    now = 0.0
    db.insert_event(conn, "CAM1", now, "KA01AB1234", 0.9)
    db.insert_event(conn, "CAM1", now + 3600, "KA01AB1235", 0.9)  # next hour bucket

    rows = camera_volume(conn, bucket_seconds=3600)

    assert len(rows) == 2
    assert {r["bucket_start"] for r in rows} == {0, 3600}


def test_congestion_index_reflects_slower_than_free_flow_travel(conn):
    make_camera(conn, "A", 0, 0)
    make_camera(conn, "B", 0, 0.01)
    set_travel_time(conn, "A", "B", 600)  # free-flow: 10 min

    now = time.time()
    db.insert_event(conn, "A", now, "KA01AB1234", 0.9, "car", "white")
    db.insert_event(conn, "B", now + 1200, "KA01AB1234", 0.9, "car", "white")  # 20 min: 2x free-flow

    results = average_speed_and_congestion(conn)

    assert len(results) == 1
    assert abs(results[0]["congestion_index"] - 2.0) < 0.01

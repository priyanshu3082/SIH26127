import time

import pytest

from trajectory import db
from trajectory.pipeline import reconstruct_trajectory
from trajectory.privacy.audit import purge_expired_events

from conftest import make_camera


def test_reconstruct_trajectory_requires_case_id(conn):
    make_camera(conn, "CAM1", 0, 0)
    db.insert_event(conn, "CAM1", time.time(), "KA01AB1234", 0.9)

    with pytest.raises(ValueError):
        reconstruct_trajectory(conn, "KA01AB1234", case_id="")


def test_reconstruct_trajectory_writes_audit_log(conn):
    make_camera(conn, "CAM1", 0, 0)
    db.insert_event(conn, "CAM1", time.time(), "KA01AB1234", 0.9)

    reconstruct_trajectory(conn, "KA01AB1234", case_id="CASE-1")

    logs = db.all_audit_logs(conn)
    assert len(logs) == 1
    assert logs[0]["case_id"] == "CASE-1"
    assert logs[0]["plate_queried"] == "KA01AB1234"
    assert logs[0]["query_type"] == "trajectory_search"


def test_purge_expired_events_respects_retention_window(conn):
    make_camera(conn, "CAM1", 0, 0)
    now = time.time()
    old_id = db.insert_event(conn, "CAM1", now - 10 * 24 * 3600, "KA01AB1234", 0.9)   # 10 days old
    recent_id = db.insert_event(conn, "CAM1", now - 1 * 24 * 3600, "KA01AB1234", 0.9)  # 1 day old

    deleted = purge_expired_events(conn, retention_days=7, now=now)

    remaining_ids = {e["event_id"] for e in db.all_events(conn)}
    assert deleted == 1
    assert old_id not in remaining_ids
    assert recent_id in remaining_ids

import time

from trajectory import db
from trajectory.alerts.blacklist import check_event

from conftest import make_camera


def test_blacklist_match_triggers_alert(conn):
    make_camera(conn, "CAM1", 0, 0)
    db.add_blacklist(conn, "KA01AB1234", reason="stolen", added_ts=time.time())

    event_id = db.insert_event(conn, "CAM1", time.time(), "KA01AB1234", 0.9)
    event = db.get_event(conn, event_id)

    triggered = check_event(conn, event)

    assert any(a["alert_type"] == "blacklist" for a in triggered)
    assert len(db.all_alerts(conn)) == 1


def test_non_blacklisted_plate_never_triggers(conn):
    make_camera(conn, "CAM1", 0, 0)
    db.add_blacklist(conn, "KA01AB1234", reason="stolen", added_ts=time.time())

    event_id = db.insert_event(conn, "CAM1", time.time(), "DL99ZZ9999", 0.9)
    event = db.get_event(conn, event_id)

    triggered = check_event(conn, event)

    assert triggered == []
    assert db.all_alerts(conn) == []


def test_geofence_alert_triggers_regardless_of_plate(conn):
    make_camera(conn, "CAM1", 0, 0, zone="watched_zone_1")
    db.add_watched_zone(conn, "watched_zone_1", reason="checkpoint", added_ts=time.time())

    event_id = db.insert_event(conn, "CAM1", time.time(), "DL99ZZ9999", 0.9)
    event = db.get_event(conn, event_id)

    triggered = check_event(conn, event)

    assert any(a["alert_type"] == "geofence" for a in triggered)


def test_camera_outside_watched_zone_gives_no_geofence_alert(conn):
    make_camera(conn, "CAM1", 0, 0)  # no zone
    db.add_watched_zone(conn, "watched_zone_1", reason="checkpoint", added_ts=time.time())

    event_id = db.insert_event(conn, "CAM1", time.time(), "DL99ZZ9999", 0.9)
    event = db.get_event(conn, event_id)

    triggered = check_event(conn, event)

    assert not any(a["alert_type"] == "geofence" for a in triggered)

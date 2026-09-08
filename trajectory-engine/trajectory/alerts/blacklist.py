"""Real-time alert checks: blacklisted/wanted plates and watched-zone geofencing.

Runs against every new event as it lands, independent of any trajectory search - this
is an automated system process, not a human investigator's per-vehicle query, so it
is not case-ID bound (see privacy/audit.py for that distinction).
"""
from rapidfuzz.distance import Levenshtein

from trajectory import config, db
from trajectory.matching.candidates import matches_hsrp_grammar, normalize_plate


def check_event(conn, event: dict):
    """Checks one plate_events row against the blacklist and watched zones. Writes a
    row to `alerts` for each match and returns the list of triggered alert dicts."""
    triggered = []

    if matches_hsrp_grammar(event["plate_raw"]):
        normalized_event_plate = normalize_plate(event["plate_raw"])
        for entry in db.all_blacklist(conn):
            normalized_blacklisted = normalize_plate(entry["plate_normalized"])
            distance = Levenshtein.distance(normalized_event_plate, normalized_blacklisted)
            if distance <= config.ALERT_EDIT_DISTANCE_THRESHOLD:
                triggered.append({
                    "alert_type": "blacklist",
                    "matched_plate": entry["plate_normalized"],
                    "match_confidence": 1.0 - (distance / max(len(normalized_blacklisted), 1)),
                })

    camera = db.get_camera(conn, event["camera_id"])
    if camera and camera.get("zone"):
        if camera["zone"] in db.all_watched_zones(conn):
            triggered.append({
                "alert_type": "geofence",
                "matched_plate": event["plate_raw"],
                "match_confidence": 1.0,
            })

    for alert in triggered:
        db.insert_alert(
            conn,
            event_id=event["event_id"],
            matched_plate=alert["matched_plate"],
            camera_id=event["camera_id"],
            ts=event["ts"],
            match_confidence=alert["match_confidence"],
            alert_type=alert["alert_type"],
        )

    return triggered


def scan_all_events(conn):
    """Convenience: run check_event over every existing event (e.g. after a bulk load
    such as synth/generate.py, which doesn't call check_event per-row itself)."""
    all_triggered = []
    for event in db.all_events(conn):
        all_triggered.extend(check_event(conn, event))
    return all_triggered

"""SQLite connection handling + query helpers. The only module that speaks SQL directly."""
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from trajectory import config

_SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def _ensure_data_dirs() -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    config.GRAPH_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_raw_connection() -> sqlite3.Connection:
    _ensure_data_dirs()
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(reset: bool = False) -> None:
    """Create all tables from schema.sql. If reset, delete the db file first."""
    _ensure_data_dirs()
    if reset and config.DB_PATH.exists():
        config.DB_PATH.unlink()
    with get_raw_connection() as conn:
        conn.executescript(_SCHEMA_PATH.read_text())


@contextmanager
def connection():
    """Context manager yielding a connection, committing on success."""
    conn = get_raw_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# --- cameras -------------------------------------------------------------

def upsert_camera(conn, camera_id, name, lat, lon, road_node_id=None, zone=None):
    conn.execute(
        """
        INSERT INTO cameras (camera_id, name, lat, lon, road_node_id, zone)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(camera_id) DO UPDATE SET
            name=excluded.name, lat=excluded.lat, lon=excluded.lon,
            road_node_id=excluded.road_node_id, zone=excluded.zone
        """,
        (camera_id, name, lat, lon, road_node_id, zone),
    )


def get_camera(conn, camera_id):
    row = conn.execute("SELECT * FROM cameras WHERE camera_id = ?", (camera_id,)).fetchone()
    return dict(row) if row else None


def all_cameras(conn):
    return [dict(r) for r in conn.execute("SELECT * FROM cameras").fetchall()]


# --- plate_events ----------------------------------------------------------

def insert_event(conn, camera_id, ts, plate_raw, confidence, vehicle_type=None, vehicle_color=None):
    cur = conn.execute(
        """
        INSERT INTO plate_events (camera_id, ts, plate_raw, confidence, vehicle_type, vehicle_color)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (camera_id, ts, plate_raw, confidence, vehicle_type, vehicle_color),
    )
    return cur.lastrowid


def get_event(conn, event_id):
    row = conn.execute("SELECT * FROM plate_events WHERE event_id = ?", (event_id,)).fetchone()
    return dict(row) if row else None


def all_events(conn):
    return [dict(r) for r in conn.execute("SELECT * FROM plate_events").fetchall()]


def events_joined_with_camera(conn):
    rows = conn.execute(
        """
        SELECT e.*, c.lat AS camera_lat, c.lon AS camera_lon, c.zone AS camera_zone
        FROM plate_events e JOIN cameras c ON e.camera_id = c.camera_id
        ORDER BY e.ts
        """
    ).fetchall()
    return [dict(r) for r in rows]


def purge_events_older_than(conn, cutoff_ts):
    cur = conn.execute("DELETE FROM plate_events WHERE ts < ?", (cutoff_ts,))
    return cur.rowcount


# --- camera_travel_time ------------------------------------------------

def upsert_travel_time(conn, from_camera, to_camera, travel_seconds, distance_m):
    conn.execute(
        """
        INSERT INTO camera_travel_time (from_camera, to_camera, travel_seconds, distance_m)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(from_camera, to_camera) DO UPDATE SET
            travel_seconds=excluded.travel_seconds, distance_m=excluded.distance_m
        """,
        (from_camera, to_camera, travel_seconds, distance_m),
    )


def get_travel_time_row(conn, from_camera, to_camera):
    row = conn.execute(
        "SELECT * FROM camera_travel_time WHERE from_camera = ? AND to_camera = ?",
        (from_camera, to_camera),
    ).fetchone()
    return dict(row) if row else None


def all_travel_times(conn):
    return [dict(r) for r in conn.execute("SELECT * FROM camera_travel_time").fetchall()]


# --- blacklist / watched zones / alerts ---------------------------------

def add_blacklist(conn, plate_normalized, reason, added_ts):
    conn.execute(
        "INSERT OR REPLACE INTO blacklist (plate_normalized, reason, added_ts) VALUES (?, ?, ?)",
        (plate_normalized, reason, added_ts),
    )


def all_blacklist(conn):
    return [dict(r) for r in conn.execute("SELECT * FROM blacklist").fetchall()]


def add_watched_zone(conn, zone, reason, added_ts):
    conn.execute(
        "INSERT OR REPLACE INTO watched_zones (zone, reason, added_ts) VALUES (?, ?, ?)",
        (zone, reason, added_ts),
    )


def all_watched_zones(conn):
    return {r["zone"] for r in conn.execute("SELECT zone FROM watched_zones").fetchall()}


def insert_alert(conn, event_id, matched_plate, camera_id, ts, match_confidence, alert_type):
    conn.execute(
        """
        INSERT INTO alerts (event_id, matched_plate, camera_id, ts, match_confidence, alert_type)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (event_id, matched_plate, camera_id, ts, match_confidence, alert_type),
    )


def all_alerts(conn):
    return [dict(r) for r in conn.execute("SELECT * FROM alerts").fetchall()]


# --- audit_log -----------------------------------------------------------

def insert_audit_log(conn, case_id, query_type, plate_queried, ts, result_summary):
    conn.execute(
        """
        INSERT INTO audit_log (case_id, query_type, plate_queried, ts, result_summary)
        VALUES (?, ?, ?, ?, ?)
        """,
        (case_id, query_type, plate_queried, ts, result_summary),
    )


def all_audit_logs(conn):
    return [dict(r) for r in conn.execute("SELECT * FROM audit_log").fetchall()]


# --- ground truth (written by synth/generate.py, read only by tests) ---

def insert_ground_truth_step(conn, vehicle_id, seq_index, camera_id, ts, true_plate):
    conn.execute(
        """
        INSERT INTO ground_truth_trajectories (vehicle_id, seq_index, camera_id, ts, true_plate)
        VALUES (?, ?, ?, ?, ?)
        """,
        (vehicle_id, seq_index, camera_id, ts, true_plate),
    )


def get_ground_truth_trajectory(conn, vehicle_id):
    rows = conn.execute(
        "SELECT * FROM ground_truth_trajectories WHERE vehicle_id = ? ORDER BY seq_index",
        (vehicle_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def all_ground_truth_vehicle_ids(conn):
    rows = conn.execute("SELECT DISTINCT vehicle_id FROM ground_truth_trajectories").fetchall()
    return [r["vehicle_id"] for r in rows]


def insert_ground_truth_od(conn, vehicle_id, origin_camera, destination_camera, true_plate):
    conn.execute(
        """
        INSERT OR REPLACE INTO ground_truth_od (vehicle_id, origin_camera, destination_camera, true_plate)
        VALUES (?, ?, ?, ?)
        """,
        (vehicle_id, origin_camera, destination_camera, true_plate),
    )


def all_ground_truth_od(conn):
    return [dict(r) for r in conn.execute("SELECT * FROM ground_truth_od").fetchall()]

CREATE TABLE IF NOT EXISTS cameras (
    camera_id TEXT PRIMARY KEY,
    name TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    road_node_id INTEGER,
    zone TEXT
);

CREATE TABLE IF NOT EXISTS plate_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    camera_id TEXT NOT NULL REFERENCES cameras(camera_id),
    ts REAL NOT NULL,
    plate_raw TEXT NOT NULL,
    confidence REAL NOT NULL,
    vehicle_type TEXT,
    vehicle_color TEXT
);
CREATE INDEX IF NOT EXISTS idx_plate_events_plate ON plate_events(plate_raw);
CREATE INDEX IF NOT EXISTS idx_plate_events_camera ON plate_events(camera_id);
CREATE INDEX IF NOT EXISTS idx_plate_events_ts ON plate_events(ts);

CREATE TABLE IF NOT EXISTS camera_travel_time (
    from_camera TEXT NOT NULL,
    to_camera TEXT NOT NULL,
    travel_seconds REAL NOT NULL,
    distance_m REAL NOT NULL,
    PRIMARY KEY (from_camera, to_camera)
);

CREATE TABLE IF NOT EXISTS blacklist (
    plate_normalized TEXT PRIMARY KEY,
    reason TEXT,
    added_ts REAL
);

CREATE TABLE IF NOT EXISTS watched_zones (
    zone TEXT PRIMARY KEY,
    reason TEXT,
    added_ts REAL
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES plate_events(event_id),
    matched_plate TEXT,
    camera_id TEXT,
    ts REAL,
    match_confidence REAL,
    alert_type TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    query_type TEXT NOT NULL,
    plate_queried TEXT,
    ts REAL NOT NULL,
    result_summary TEXT
);

-- Ground truth, written only by synth/generate.py and read only by tests -
-- never queried by the pipeline/matching/feasibility/assignment code.
CREATE TABLE IF NOT EXISTS ground_truth_trajectories (
    vehicle_id TEXT NOT NULL,
    seq_index INTEGER NOT NULL,
    camera_id TEXT NOT NULL,
    ts REAL NOT NULL,
    true_plate TEXT NOT NULL,
    PRIMARY KEY (vehicle_id, seq_index)
);

CREATE TABLE IF NOT EXISTS ground_truth_od (
    vehicle_id TEXT PRIMARY KEY,
    origin_camera TEXT NOT NULL,
    destination_camera TEXT NOT NULL,
    true_plate TEXT NOT NULL
);

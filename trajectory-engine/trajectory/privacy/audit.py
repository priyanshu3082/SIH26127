"""Privacy/audit enforcement: every per-vehicle query is case-ID bound and logged.

This applies to *searches* (reconstruct_trajectory, and any future ad-hoc "look up
this plate" query) - not to the automated alerts/traffic_analytics background
processes, which aren't a human investigator looking up a specific vehicle.
"""
import time

from trajectory import config, db


def log_query(conn, case_id: str, query_type: str, plate_queried: str, ts: float, result_summary: str):
    if not case_id:
        raise ValueError("case_id is required to log a per-vehicle query")
    db.insert_audit_log(conn, case_id, query_type, plate_queried, ts, result_summary)


def purge_expired_events(conn, retention_days: int = None, now: float = None) -> int:
    """Deletes plate_events older than the retention window (7-day default). Returns
    the number of rows deleted. A scheduled job would call this periodically in
    production; here it's a plain function so it can be tested directly."""
    if retention_days is None:
        retention_days = config.RETENTION_DAYS
    if now is None:
        now = time.time()
    cutoff_ts = now - retention_days * 24 * 3600
    return db.purge_events_older_than(conn, cutoff_ts)

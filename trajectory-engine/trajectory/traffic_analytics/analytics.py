"""Sibling to trajectory reconstruction, not part of it: density/volume, average
speed, and a congestion index. Operates on all events, not a specific queried plate,
so it needs no case_id/audit binding - this is aggregate infrastructure monitoring.
Returns rows, not rendered charts - a future UI/API/heatmap consumes them directly.
"""
from collections import defaultdict

from trajectory import db
from trajectory.matching.candidates import normalize_plate
from trajectory.roadgraph.travel_time import get_travel_time


def camera_volume(conn, bucket_seconds=3600):
    """Event count per camera per time bucket."""
    counts = defaultdict(int)
    for event in db.all_events(conn):
        bucket = int(event["ts"] // bucket_seconds) * bucket_seconds
        counts[(event["camera_id"], bucket)] += 1
    return [
        {"camera_id": camera_id, "bucket_start": bucket, "event_count": count}
        for (camera_id, bucket), count in sorted(counts.items())
    ]


def total_camera_volume(conn):
    """Total observed event count per camera - used as IPF marginals in od_analytics."""
    counts = defaultdict(int)
    for event in db.all_events(conn):
        counts[event["camera_id"]] += 1
    return dict(counts)


def average_speed_and_congestion(conn):
    """For every camera pair with at least one observed same-plate consecutive
    transition, compute observed average speed and a congestion index: observed
    travel time / free-flow baseline travel time (>1 means slower than free-flow)."""
    events = db.events_joined_with_camera(conn)
    by_plate = defaultdict(list)
    for event in events:
        by_plate[normalize_plate(event["plate_raw"])].append(event)

    pair_gaps = defaultdict(list)
    for group in by_plate.values():
        group.sort(key=lambda e: e["ts"])
        for prev, nxt in zip(group, group[1:]):
            if prev["camera_id"] == nxt["camera_id"]:
                continue
            pair_gaps[(prev["camera_id"], nxt["camera_id"])].append(nxt["ts"] - prev["ts"])

    results = []
    for (from_camera, to_camera), gaps in pair_gaps.items():
        observed_avg_seconds = sum(gaps) / len(gaps)
        try:
            expected_seconds, distance_m = get_travel_time(conn, from_camera, to_camera)
        except ValueError:
            continue

        congestion_index = observed_avg_seconds / expected_seconds if expected_seconds > 0 else None
        avg_speed_kmph = (
            (distance_m / 1000) / (observed_avg_seconds / 3600) if observed_avg_seconds > 0 else None
        )
        results.append({
            "from_camera": from_camera,
            "to_camera": to_camera,
            "observed_avg_seconds": observed_avg_seconds,
            "free_flow_seconds": expected_seconds,
            "congestion_index": congestion_index,
            "avg_speed_kmph": avg_speed_kmph,
            "sample_size": len(gaps),
        })
    return results

"""Stage 5: Origin-Destination matrix estimation via Iterative Proportional Fitting.

O-D patterns are one of the three specific failure modes this whole pitch is built to
fix (vs. a competitor's plain vehicle-count heatmap), so this belongs alongside
trajectory reconstruction rather than being left for later. This is aggregate
infrastructure analytics (not a per-vehicle case query), so it does not go through
Stage 1-3's case-ID-bound pipeline - it scans all events directly.
"""
import numpy as np

from trajectory import db
from trajectory.matching.candidates import normalize_plate


def build_partial_od_counts(conn):
    """Group raw events by normalized plate, take first/last camera by timestamp as a
    naive observed O-D pair. Deliberately naive (no Stage 1-3 fuzzy/feasibility
    resolution per vehicle) - this is a partial-observation seed for IPF, not a claim
    of per-vehicle identity resolution."""
    events = db.events_joined_with_camera(conn)
    by_plate = {}
    for event in events:
        key = normalize_plate(event["plate_raw"])
        by_plate.setdefault(key, []).append(event)

    cameras = [c["camera_id"] for c in db.all_cameras(conn)]
    index = {camera_id: i for i, camera_id in enumerate(cameras)}
    counts = np.zeros((len(cameras), len(cameras)))

    for group in by_plate.values():
        group.sort(key=lambda e: e["ts"])
        if len(group) < 2:
            continue
        origin, destination = group[0]["camera_id"], group[-1]["camera_id"]
        if origin == destination:
            continue
        counts[index[origin], index[destination]] += 1

    return counts, cameras


def fit_ipf(seed_matrix, row_marginals, col_marginals, max_iterations=300, tolerance=1e-4):
    """Standard IPF: alternately rescale rows then columns to match target marginals.

    A seed with near-zero cells that need to grow to match a large marginal share
    converges slowly (logarithmically) - 300 iterations gets within ~0.1% for
    prototype-scale matrices without the cost of forcing exact 1e-4 convergence."""
    matrix = seed_matrix.astype(float) + 1e-6  # avoid zero-locking cells that should grow

    for _ in range(max_iterations):
        row_sums = matrix.sum(axis=1)
        row_sums[row_sums == 0] = 1e-6
        matrix *= (row_marginals / row_sums)[:, None]

        col_sums = matrix.sum(axis=0)
        col_sums[col_sums == 0] = 1e-6
        matrix *= (col_marginals / col_sums)[None, :]

        row_ok = np.abs(matrix.sum(axis=1) - row_marginals).max() < tolerance
        col_ok = np.abs(matrix.sum(axis=0) - col_marginals).max() < tolerance
        if row_ok and col_ok:
            break

    return matrix


def estimate_od_matrix(conn, camera_volumes: dict):
    """camera_volumes: camera_id -> total observed volume (from traffic_analytics),
    used as both row and column marginals (vehicles in ~= vehicles out, over the full
    observation window). Returns (fitted_matrix, camera_id_order)."""
    counts, cameras = build_partial_od_counts(conn)
    marginals = np.array([camera_volumes.get(c, 0.0) for c in cameras])

    if marginals.sum() == 0:
        return counts, cameras

    fitted = fit_ipf(counts, marginals, marginals)
    return fitted, cameras

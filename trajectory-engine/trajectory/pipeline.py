"""Orchestrates Stage 1 -> 2 -> 3 into one reconstructed trajectory, case-ID bound
and audit-logged per the doc's privacy stance.
"""
import time
from dataclasses import dataclass, field
from typing import List

from trajectory.assignment.hungarian import pick_primary_chain, resolve
from trajectory.feasibility.filter import build_feasible_transitions
from trajectory.matching.candidates import find_candidates
from trajectory.privacy.audit import log_query


@dataclass
class TrajectoryStop:
    camera_id: str
    lat: float
    lon: float
    ts: float
    confidence: float
    is_chain_break: bool


@dataclass
class Trajectory:
    plate: str
    stops: List[TrajectoryStop] = field(default_factory=list)
    confidence: float = 0.0


def reconstruct_trajectory(conn, plate: str, case_id: str) -> Trajectory:
    """Stage 1 -> 2 -> 3, returning the reconstructed path and one overall confidence
    score. Requires case_id: every per-vehicle query must be bound to a case and
    audit-logged before it runs."""
    if not case_id:
        raise ValueError("case_id is required for every trajectory query (privacy/audit policy)")

    candidates = find_candidates(conn, plate)
    feasible, chain_breaks = build_feasible_transitions(conn, candidates)
    chains = resolve(candidates, feasible)
    primary_chain = pick_primary_chain(candidates, chains)

    stops = []
    for position, idx in enumerate(primary_chain):
        candidate = candidates[idx]
        is_break = position > 0 and (primary_chain[position - 1], idx) in chain_breaks
        stops.append(TrajectoryStop(
            camera_id=candidate["camera_id"],
            lat=candidate["camera_lat"],
            lon=candidate["camera_lon"],
            ts=candidate["ts"],
            confidence=candidate["confidence"],
            is_chain_break=is_break,
        ))

    overall_confidence = (
        sum(stop.confidence for stop in stops) / len(stops) if stops else 0.0
    )
    trajectory = Trajectory(plate=plate, stops=stops, confidence=overall_confidence)

    log_query(
        conn, case_id=case_id, query_type="trajectory_search", plate_queried=plate,
        ts=time.time(), result_summary=f"{len(stops)} stops, confidence={overall_confidence:.2f}",
    )

    return trajectory

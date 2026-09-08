"""Stage 2: road-network feasibility filtering over Stage 1's candidate list.

Builds the full DAG of physically-feasible transitions among Stage-1 candidates
(every chronologically-ordered pair, not just adjacent ones) so Stage 3 can resolve
branching/contradicting candidates globally rather than greedily taking the first
chronological match.
"""
from trajectory import config
from trajectory.roadgraph.travel_time import get_travel_time


def build_feasible_transitions(conn, candidates):
    """
    `candidates` must be sorted by timestamp (Stage 1's output contract); indices below
    refer to positions in that list.

    Returns:
      feasible: dict[(i, j)] -> expected_seconds, for every physically-feasible i -> j
                transition (i earlier than j).
      chain_breaks: set of (i, j) pairs that are feasible but unusually slow - likely
                the vehicle stopped somewhere, not a broken trajectory.
    """
    feasible = {}
    chain_breaks = set()

    n = len(candidates)
    for i in range(n):
        for j in range(i + 1, n):
            prev, nxt = candidates[i], candidates[j]
            if prev["camera_id"] == nxt["camera_id"]:
                continue  # same camera - not a transition

            observed_gap = nxt["ts"] - prev["ts"]

            try:
                expected_seconds, _ = get_travel_time(conn, prev["camera_id"], nxt["camera_id"])
            except ValueError:
                continue  # unknown camera - can't judge feasibility, exclude rather than guess

            if observed_gap < expected_seconds * config.IMPOSSIBLE_MULTIPLIER:
                continue  # physically impossible - drop

            feasible[(i, j)] = expected_seconds
            if observed_gap > expected_seconds * config.CHAIN_BREAK_MULTIPLIER:
                chain_breaks.add((i, j))

    return feasible, chain_breaks

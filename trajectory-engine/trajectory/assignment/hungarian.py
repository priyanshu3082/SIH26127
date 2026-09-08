"""Stage 3: resolve contradicting candidates via global optimal assignment.

Stage 2 hands back a DAG of feasible transitions among Stage-1 candidates - a
candidate can have several feasible predecessors and/or successors (e.g. a decoy
vehicle with a similar plate passing a nearby camera around the same time). Rather
than greedily taking the first chronological match, this builds a predecessor/successor
cost matrix over the whole candidate set and solves it with the Hungarian algorithm,
so the globally cheapest set of transitions wins - which is what actually decomposes
the candidates into distinct vehicle chains.
"""
import numpy as np
from scipy.optimize import linear_sum_assignment

BIG_COST = 1e6
# Cost of "this candidate has no successor / predecessor" (a chain end). Must stay
# above the worst-case cost of a *legitimate* transition (exact match, high confidence,
# matching attributes, capped time-gap penalty) or the assignment will truncate real
# trajectories rather than accept a merely-slow, still-genuine continuation.
DUMMY_COST = 8.0

WEIGHTS = {
    "edit_distance": 2.0,
    "low_confidence": 3.0,
    "time_gap": 1.0,
    "attribute_mismatch": 1.5,
}


def _attribute_mismatch(a, b):
    """Cheap stand-in for the deck's multi-signal identity correlation (plate +
    feasibility + vehicle attributes + appearance) - real appearance embeddings are
    Stage 4/reid/ later; this is the categorical signal available today."""
    type_match = a.get("vehicle_type") == b.get("vehicle_type")
    color_match = a.get("vehicle_color") == b.get("vehicle_color")
    if type_match and color_match:
        return 0.0
    if type_match or color_match:
        return 0.5
    return 1.0


def _transition_cost(prev, nxt, expected_seconds):
    observed_gap = nxt["ts"] - prev["ts"]
    # Capped: Stage 2 already decided this transition is feasible (possibly flagged as
    # a chain break) - this term should nudge the assignment toward on-time transitions
    # when there's a choice, not swamp identity signals (edit distance/confidence/
    # attributes) for a transition that's merely slow, which Stage 2 already allows.
    time_gap_penalty = min(abs(observed_gap - expected_seconds) / max(expected_seconds, 1.0), 2.0)
    return (
        WEIGHTS["edit_distance"] * nxt.get("edit_distance", 0)
        + WEIGHTS["low_confidence"] * (1.0 - nxt.get("confidence", 0.5))
        + WEIGHTS["time_gap"] * time_gap_penalty
        + WEIGHTS["attribute_mismatch"] * _attribute_mismatch(prev, nxt)
    )


def resolve(candidates, feasible_transitions):
    """
    candidates: Stage-1 candidates, sorted by ts.
    feasible_transitions: dict[(i, j)] -> expected_seconds, from feasibility.filter.

    Returns a list of chains (each a list of candidate indices, chronological order) -
    the feasible-transition DAG decomposed into disjoint vehicle paths.
    """
    n = len(candidates)
    if n == 0:
        return []
    if n == 1:
        return [[0]]

    cost = np.full((n, n), BIG_COST)
    for (i, j), expected_seconds in feasible_transitions.items():
        cost[i, j] = _transition_cost(candidates[i], candidates[j], expected_seconds)

    # Pad with dummy "no successor"/"no predecessor" slots so a candidate isn't forced
    # into a chain when nothing genuinely feasible follows or precedes it.
    padded = np.full((n, n + n), BIG_COST)
    padded[:, :n] = cost
    for i in range(n):
        padded[i, n + i] = DUMMY_COST

    row_ind, col_ind = linear_sum_assignment(padded)

    successor = {}
    for i, j in zip(row_ind, col_ind):
        if j < n and padded[i, j] < BIG_COST:
            successor[i] = j

    predecessors = set(successor.values())
    chain_starts = [i for i in range(n) if i not in predecessors]

    chains = []
    for start in chain_starts:
        chain = [start]
        current = start
        while current in successor:
            current = successor[current]
            chain.append(current)
        chains.append(chain)

    return chains


def pick_primary_chain(candidates, chains):
    """Pick the chain most likely to be the queried vehicle: prefer the chain containing
    the closest plate match (lowest edit distance), then highest average confidence."""
    if not chains:
        return []

    def chain_score(chain):
        best_distance = min(candidates[i].get("edit_distance", 99) for i in chain)
        avg_confidence = sum(candidates[i].get("confidence", 0) for i in chain) / len(chain)
        return (best_distance, -avg_confidence)

    return min(chains, key=chain_score)

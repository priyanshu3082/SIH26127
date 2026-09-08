from trajectory.assignment.hungarian import pick_primary_chain, resolve


def _candidate(edit_distance, confidence, vehicle_type="car", vehicle_color="white", ts=0):
    return {
        "edit_distance": edit_distance, "confidence": confidence,
        "vehicle_type": vehicle_type, "vehicle_color": vehicle_color, "ts": ts,
    }


def test_resolve_picks_true_chain_over_contradicting_decoy():
    # 0: query start (exact match); 1: true continuation (exact match); 2: decoy
    # continuation arriving around the same time, worse match on every signal.
    candidates = [
        _candidate(edit_distance=0, confidence=0.95, ts=0),
        _candidate(edit_distance=0, confidence=0.9, ts=600, vehicle_type="car", vehicle_color="white"),
        _candidate(edit_distance=1, confidence=0.6, ts=610, vehicle_type="truck", vehicle_color="red"),
    ]
    feasible_transitions = {(0, 1): 600, (0, 2): 600}

    chains = resolve(candidates, feasible_transitions)
    primary = pick_primary_chain(candidates, chains)

    assert primary == [0, 1]


def test_resolve_produces_disjoint_chains_for_two_independent_vehicles():
    # Two entirely separate, non-contradicting chains: 0->1 and 2->3.
    candidates = [
        _candidate(edit_distance=0, confidence=0.9, ts=0),
        _candidate(edit_distance=0, confidence=0.9, ts=600),
        _candidate(edit_distance=0, confidence=0.9, ts=5),
        _candidate(edit_distance=0, confidence=0.9, ts=605),
    ]
    feasible_transitions = {(0, 1): 600, (2, 3): 600}

    chains = resolve(candidates, feasible_transitions)
    chain_sets = {tuple(c) for c in chains}

    assert (0, 1) in chain_sets
    assert (2, 3) in chain_sets


def test_single_candidate_returns_singleton_chain():
    candidates = [_candidate(edit_distance=0, confidence=0.9, ts=0)]
    assert resolve(candidates, {}) == [[0]]


def test_no_candidates_returns_no_chains():
    assert resolve([], {}) == []


def test_pick_primary_chain_of_empty_list_returns_empty():
    assert pick_primary_chain([], []) == []

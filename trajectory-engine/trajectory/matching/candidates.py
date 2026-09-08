"""Stage 1: wide, deliberately over-inclusive fuzzy plate candidate search.

Confusion-table normalization + HSRP grammar check narrow out structurally-invalid
reads; edit-distance <=2 keeps everything else that could plausibly be the queried
plate. Filtering for physical/temporal plausibility happens in Stage 2, not here.
"""
import re

from rapidfuzz.distance import Levenshtein

from trajectory import config, db

_HSRP_RE = re.compile(config.HSRP_PATTERN)


def normalize_plate(plate: str) -> str:
    """Canonicalize confusable characters to one representative form (0/O -> 0,
    8/B -> 8, 1/I -> 1, 5/S -> 5) so visually similar plates compare identically."""
    return "".join(config.CANONICAL_MAP.get(ch, ch) for ch in plate.upper())


def matches_hsrp_grammar(plate: str) -> bool:
    return bool(_HSRP_RE.match(plate.upper()))


def find_candidates(conn, query_plate: str, max_distance: int = None):
    """Returns Stage-1 candidates: plate_events (joined with camera lat/lon) within
    `max_distance` edit distance of the normalized query, sorted by timestamp.
    Each candidate dict is annotated with `edit_distance`."""
    if max_distance is None:
        max_distance = config.EDIT_DISTANCE_THRESHOLD

    normalized_query = normalize_plate(query_plate)
    candidates = []

    for event in db.events_joined_with_camera(conn):
        if not matches_hsrp_grammar(event["plate_raw"]):
            continue
        normalized_event_plate = normalize_plate(event["plate_raw"])
        distance = Levenshtein.distance(normalized_query, normalized_event_plate)
        if distance <= max_distance:
            candidate = dict(event)
            candidate["edit_distance"] = distance
            candidates.append(candidate)

    candidates.sort(key=lambda e: e["ts"])
    return candidates


def distinct_observed_plates(conn, limit: int = None):
    """One representative raw plate string per normalized identity across all events -
    the pool of plates a fleet-wide view (e.g. visualize.plot_multiple_trajectories)
    would reconstruct. Grammar-invalid reads are skipped, same as Stage 1."""
    seen = {}
    for event in db.all_events(conn):
        if not matches_hsrp_grammar(event["plate_raw"]):
            continue
        key = normalize_plate(event["plate_raw"])
        seen.setdefault(key, event["plate_raw"])

    plates = list(seen.values())
    return plates[:limit] if limit is not None else plates

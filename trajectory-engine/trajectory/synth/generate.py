"""Synthetic plate-event generator.

No real footage or finalized camera topology exists yet, and per PROJECT_STATUS.md's
own reasoning, Stages 1-3 (and the O-D/analytics/alerts additions) don't need video -
they run on an event table. This generates that event table directly: cameras placed
on a real road network, vehicle trips with realistic travel-time-derived timestamps,
OCR-style noise, decoy plates, and ground truth kept separate from what the pipeline
queries, purely for test validation.
"""
import random
import time

from trajectory import config, db
from trajectory.roadgraph.build import largest_component, load_graph
from trajectory.roadgraph.travel_time import get_travel_time, precompute_all_pairs, snap_cameras_to_graph

STATE_CODES = ["AS", "KA", "DL", "MH", "WB", "TN", "GJ", "UP"]
VEHICLE_TYPES = ["car", "bike", "truck", "bus"]
VEHICLE_COLORS = ["white", "black", "silver", "red", "blue", "grey"]
PLATE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"  # skip I/O, already confusable with 1/0


def generate_plate(rng: random.Random) -> str:
    state = rng.choice(STATE_CODES)
    rto = f"{rng.randint(1, 99):02d}"
    letters = "".join(rng.choice(PLATE_LETTERS) for _ in range(rng.choice([1, 2])))
    number = f"{rng.randint(0, 9999):04d}"
    return f"{state}{rto}{letters}{number}"


def corrupt_plate(rng: random.Random, plate: str) -> str:
    """Simulate an OCR misread using the confusion table."""
    chars = list(plate)
    num_corruptions = rng.choice([1, 2])
    indices = rng.sample(range(len(chars)), min(num_corruptions, len(chars)))
    for i in indices:
        if chars[i] in config.CONFUSION_PAIRS:
            chars[i] = config.CONFUSION_PAIRS[chars[i]]
    return "".join(chars)


def _place_cameras(conn, graph, rng: random.Random, n: int):
    nodes = list(graph.nodes(data=True))
    chosen = rng.sample(nodes, min(n, len(nodes)))
    camera_ids = []
    for i, (_, data) in enumerate(chosen):
        camera_id = f"CAM{i:03d}"
        db.upsert_camera(conn, camera_id, name=f"Camera {i}", lat=data["y"], lon=data["x"])
        camera_ids.append(camera_id)
    return camera_ids


def _emit_vehicle_trip(conn, rng, cameras, vehicle_id, plate, vehicle_type, vehicle_color,
                        force_grammar_violation=False):
    k = rng.randint(2, min(5, len(cameras)))
    waypoints = rng.sample(cameras, k)

    ts = time.time() - rng.uniform(0, config.RETENTION_DAYS * 24 * 3600)
    ground_truth_steps = []

    for idx, camera_id in enumerate(waypoints):
        if idx > 0:
            prev_camera = waypoints[idx - 1]
            travel_seconds, _ = get_travel_time(conn, prev_camera, camera_id)
            stop_time = rng.choice([0, 0, 0, rng.uniform(300, 1800)])  # occasional stop
            ts += travel_seconds + rng.gauss(0, 15) + stop_time

        ground_truth_steps.append((vehicle_id, idx, camera_id, ts, plate))

        if rng.random() < 0.1:
            continue  # simulate a fully missed read (occlusion/glare/night)

        observed_plate = plate
        confidence = rng.uniform(0.85, 0.99)
        if force_grammar_violation and idx == 0:
            observed_plate = plate[:-1]  # truncate -> fails HSRP grammar
            confidence = rng.uniform(0.3, 0.5)
        elif rng.random() < 0.3:
            observed_plate = corrupt_plate(rng, plate)
            confidence = rng.uniform(0.5, 0.8)

        db.insert_event(conn, camera_id, ts, observed_plate, confidence, vehicle_type, vehicle_color)

    for step in ground_truth_steps:
        db.insert_ground_truth_step(conn, *step)
    db.insert_ground_truth_od(conn, vehicle_id, waypoints[0], waypoints[-1], plate)


def generate(reset: bool = True, seed: int = None):
    rng = random.Random(seed if seed is not None else config.RANDOM_SEED)
    db.init_db(reset=reset)

    graph = largest_component(load_graph())

    with db.connection() as conn:
        cameras = _place_cameras(conn, graph, rng, config.NUM_CAMERAS)
        snap_cameras_to_graph(conn, graph)
        precompute_all_pairs(conn, graph)

        used_plates = []
        for i in range(config.NUM_VEHICLE_TRIPS):
            plate = generate_plate(rng)
            used_plates.append(plate)
            _emit_vehicle_trip(
                conn, rng, cameras, vehicle_id=f"V{i:04d}", plate=plate,
                vehicle_type=rng.choice(VEHICLE_TYPES), vehicle_color=rng.choice(VEHICLE_COLORS),
                force_grammar_violation=(i % 25 == 0),
            )

        # Decoy vehicles: near-miss plates of existing ones, to verify Stage 3
        # doesn't merge distinct trajectories.
        for i in range(config.NUM_DECOY_VEHICLES):
            base_plate = rng.choice(used_plates)
            decoy_plate = corrupt_plate(rng, base_plate)
            _emit_vehicle_trip(
                conn, rng, cameras, vehicle_id=f"DECOY{i:03d}", plate=decoy_plate,
                vehicle_type=rng.choice(VEHICLE_TYPES), vehicle_color=rng.choice(VEHICLE_COLORS),
            )

        # Seed blacklist from a few real plates.
        for plate in rng.sample(used_plates, min(3, len(used_plates))):
            db.add_blacklist(conn, plate, reason="reported stolen", added_ts=time.time())

        # Seed a watched zone: tag two cameras and register the zone.
        watched = rng.sample(cameras, min(2, len(cameras)))
        for camera_id in watched:
            cam = db.get_camera(conn, camera_id)
            db.upsert_camera(
                conn, camera_id, cam["name"], cam["lat"], cam["lon"],
                road_node_id=cam["road_node_id"], zone="watched_zone_1",
            )
        db.add_watched_zone(conn, "watched_zone_1", reason="checkpoint", added_ts=time.time())

    print(
        f"Generated {config.NUM_VEHICLE_TRIPS} vehicles + {config.NUM_DECOY_VEHICLES} decoys "
        f"across {len(cameras)} cameras."
    )


if __name__ == "__main__":
    generate()

"""Camera-to-camera travel time: snap cameras to the road graph, precompute the
pairwise matrix, and expose one stable lookup function.

`get_travel_time` is the seam the rest of the pipeline depends on. Swapping this
implementation for a real OSRM-backed one later means touching only this file -
Stage 2/3 code never calls OSMnx/NetworkX directly.
"""
import math

import networkx as nx
import osmnx as ox

from trajectory import config, db


def snap_cameras_to_graph(conn, graph):
    """Find each camera's nearest road-graph node once, cache it on the camera row."""
    cameras = db.all_cameras(conn)
    if not cameras:
        return
    lats = [c["lat"] for c in cameras]
    lons = [c["lon"] for c in cameras]
    node_ids = ox.distance.nearest_nodes(graph, X=lons, Y=lats)
    if not hasattr(node_ids, "__iter__"):
        node_ids = [node_ids]
    for camera, node_id in zip(cameras, node_ids):
        db.upsert_camera(
            conn, camera["camera_id"], camera["name"], camera["lat"], camera["lon"],
            road_node_id=int(node_id), zone=camera.get("zone"),
        )


def _haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def fallback_travel_time(cam_a, cam_b):
    """Haversine distance / speed-ceiling fallback, used when the road graph can't answer."""
    distance_m = _haversine_m(cam_a["lat"], cam_a["lon"], cam_b["lat"], cam_b["lon"])
    seconds = distance_m / (config.FALLBACK_SPEED_KMPH * 1000 / 3600)
    return seconds, distance_m


def precompute_all_pairs(conn, graph):
    """Fill camera_travel_time for every camera pair using real shortest-path travel
    time (and distance) over the road graph; falls back to haversine/speed-ceiling for
    any camera that didn't snap to a reachable node."""
    cameras = db.all_cameras(conn)

    for cam_a in cameras:
        if cam_a["road_node_id"] is None:
            for cam_b in cameras:
                if cam_b["camera_id"] == cam_a["camera_id"]:
                    continue
                travel_seconds, distance_m = fallback_travel_time(cam_a, cam_b)
                db.upsert_travel_time(conn, cam_a["camera_id"], cam_b["camera_id"], travel_seconds, distance_m)
            continue

        time_lengths = nx.single_source_dijkstra_path_length(
            graph, cam_a["road_node_id"], weight="travel_time"
        )
        dist_lengths = nx.single_source_dijkstra_path_length(
            graph, cam_a["road_node_id"], weight="length"
        )

        for cam_b in cameras:
            if cam_b["camera_id"] == cam_a["camera_id"]:
                continue
            if cam_b["road_node_id"] is not None and cam_b["road_node_id"] in time_lengths:
                travel_seconds = time_lengths[cam_b["road_node_id"]]
                distance_m = dist_lengths.get(
                    cam_b["road_node_id"], travel_seconds * config.FALLBACK_SPEED_KMPH * 1000 / 3600
                )
            else:
                travel_seconds, distance_m = fallback_travel_time(cam_a, cam_b)
            db.upsert_travel_time(conn, cam_a["camera_id"], cam_b["camera_id"], travel_seconds, distance_m)


def get_travel_time(conn, camera_a_id, camera_b_id):
    """Public lookup: cached matrix first, haversine fallback if the pair was never
    precomputed. Raises ValueError only if either camera is entirely unknown."""
    row = db.get_travel_time_row(conn, camera_a_id, camera_b_id)
    if row is not None:
        return row["travel_seconds"], row["distance_m"]

    cam_a = db.get_camera(conn, camera_a_id)
    cam_b = db.get_camera(conn, camera_b_id)
    if cam_a is None or cam_b is None:
        raise ValueError(f"Unknown camera pair: {camera_a_id}, {camera_b_id}")
    return fallback_travel_time(cam_a, cam_b)


def get_route_geometry(conn, camera_a_id, camera_b_id, graph=None):
    """Actual road-network path coordinates between two cameras, for drawing the real
    route on a map instead of a straight line. Falls back to the two camera endpoints
    (a straight line) if either camera never snapped to a graph node or no path
    exists - same graceful-degradation philosophy as get_travel_time."""
    cam_a = db.get_camera(conn, camera_a_id)
    cam_b = db.get_camera(conn, camera_b_id)
    if cam_a is None or cam_b is None:
        raise ValueError(f"Unknown camera pair: {camera_a_id}, {camera_b_id}")

    straight_line = [(cam_a["lat"], cam_a["lon"]), (cam_b["lat"], cam_b["lon"])]

    if cam_a["road_node_id"] is None or cam_b["road_node_id"] is None:
        return straight_line

    if graph is None:
        from trajectory.roadgraph.build import load_graph
        graph = load_graph()

    try:
        node_path = nx.shortest_path(
            graph, cam_a["road_node_id"], cam_b["road_node_id"], weight="travel_time"
        )
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return straight_line

    return [(graph.nodes[n]["y"], graph.nodes[n]["x"]) for n in node_path]


def build_and_cache_travel_times(conn, graph=None):
    """Convenience one-shot: snap cameras + precompute the full matrix."""
    if graph is None:
        from trajectory.roadgraph.build import load_graph
        graph = load_graph()
    snap_cameras_to_graph(conn, graph)
    precompute_all_pairs(conn, graph)

"""Shared test fixtures. All Stage 1-5/alerts/privacy tests run fully offline: cameras
and camera_travel_time rows are inserted directly rather than derived from a real
OSMnx graph, so `pytest` never needs internet access. The real Guwahati road graph is
only exercised by `roadgraph.build`/`synth.generate`, run manually per the README.
"""
import pytest

from trajectory import config, db


@pytest.fixture
def conn(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    monkeypatch.setattr(config, "DB_PATH", tmp_path / "test.db")
    monkeypatch.setattr(config, "GRAPH_CACHE_PATH", tmp_path / "cache" / "test.graphml")
    db.init_db(reset=True)
    with db.connection() as c:
        yield c


def make_camera(conn, camera_id, lat, lon, zone=None):
    db.upsert_camera(conn, camera_id, name=camera_id, lat=lat, lon=lon, road_node_id=None, zone=zone)


def set_travel_time(conn, cam_a, cam_b, seconds, distance_m=None, symmetric=True):
    if distance_m is None:
        distance_m = seconds * (60 * 1000 / 3600)  # implied ~60 km/h, arbitrary but consistent
    db.upsert_travel_time(conn, cam_a, cam_b, seconds, distance_m)
    if symmetric:
        db.upsert_travel_time(conn, cam_b, cam_a, seconds, distance_m)

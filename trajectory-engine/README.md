# trajectory-engine

Working prototype of SIH26127's trajectory reconstruction differentiator: fuzzy plate
candidate matching → road-network feasibility filtering → global assignment for
contradicting candidates, plus O-D estimation, traffic analytics, blacklist/geofence
alerts, and case-ID-bound audit logging. Operates entirely on event data (plate,
camera, timestamp) — no video, no trained models, no GPU required.

See `../PROJECT_STATUS.md` for the algorithmic decisions this implements, and the
approved plan this was built from for the full design rationale.

## Setup

```
python -m venv .venv
source .venv/Scripts/activate      # PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

`osmnx` pulls in `geopandas`/`shapely`/`fiona`. If a plain `pip install` hits a native
build error on Windows, install via conda instead:

```
conda install -c conda-forge osmnx networkx rapidfuzz scipy folium pytest
```

## Run everything (from inside this directory)

```
python -m trajectory.roadgraph.build          # one-time: downloads + caches the Guwahati road graph (needs internet)
python -m trajectory.synth.generate            # populates SQLite with synthetic cameras/events + ground truth
pytest tests/                                  # runs fully offline, no internet needed
python -m trajectory.cli --plate KA01AB1234 --case-id CASE-001 --visualize
```

The CLI prints the reconstructed trajectory and its confidence score, and
`--visualize` writes `data/trajectory_map.html` — open it in a browser to see the
camera pins and route drawn on the real road network, with chain-break hops marked in
a different colour. That HTML file is the concrete "yes this works" artifact; the
`pytest` run only proves correctness against synthetic ground truth, it doesn't show
you anything.

### Multiple vehicles on one map

```
python -m trajectory.cli --fleet 15 --case-id CASE-001
```

Reconstructs N distinct observed plates and plots them together in
`data/fleet_map.html`, each vehicle its own colour and its own toggleable layer (via
the layer control), plus a search box on the page: type a plate to show only that
vehicle and hide the rest. This is a **client-side filter over vehicles already
rendered into the page** — it does not run a new database query. Reconstructing a
plate that wasn't included in the `--fleet N` batch still means re-running the CLI;
this is a static HTML file, not a live backend (that would be the reserved `api/`
folder, not built yet).

## Why tests don't need internet

Unit tests (`tests/`) insert cameras and `camera_travel_time` rows directly rather
than deriving them from a real OSMnx graph, so `pytest` runs fast and fully offline.
Only `roadgraph.build` and `synth.generate` touch the real road network (and only on
their first run — after that, the graph is cached to `data/cache/*.graphml`).

## Module map

| Module | Stage | Purpose |
|---|---|---|
| `matching/candidates.py` | 1 | Confusion-table normalization + HSRP grammar + edit-distance ≤2 candidate search |
| `feasibility/filter.py` | 2 | Road-network travel-time feasibility filtering, chain-break flagging |
| `assignment/hungarian.py` | 3 | Global optimal assignment to resolve contradicting candidates |
| `od_analytics/ipf.py` | 5 | Origin-Destination matrix estimation via Iterative Proportional Fitting |
| `traffic_analytics/analytics.py` | — | Density/volume, average speed, congestion index |
| `alerts/blacklist.py` | — | Blacklist + geofence real-time alerting |
| `privacy/audit.py` | — | Case-ID-bound audit logging, 7-day retention purge |
| `roadgraph/` | — | OSMnx road graph build/cache, camera-to-camera travel-time matrix |
| `synth/generate.py` | — | Synthetic camera/event/ground-truth generator (unblocks all of the above) |
| `visualize.py` | — | HTML map of a reconstructed trajectory, CSV export for analytics/O-D output |

## Out of scope here

No YOLO/OCR/ByteTrack/TransReID, no FastAPI/Kafka/React/MapLibre/Grafana, no RBAC, no
"suspicious route deviation" alerting. Those belong to `../detection/`, `../reid/`,
`../api/`, `../ui/` (not yet built) and the deck's full application-layer architecture.

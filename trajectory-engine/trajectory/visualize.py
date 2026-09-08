"""Visual verification: plot a reconstructed trajectory on the real road map, and
export analytics/O-D output to CSV. Not a UI - just a concrete artifact proving the
system worked, without building a dashboard.
"""
import csv

import folium

from trajectory import config
from trajectory.roadgraph.build import load_graph
from trajectory.roadgraph.travel_time import get_route_geometry


def _draw_hop(group_or_map, conn, graph, prev, nxt, color):
    """A normal hop draws the real road-network path (we know the vehicle drove it,
    Stage 2 validated the transition against exactly this route's travel time). A
    chain-break hop draws a dashed straight line instead: the vehicle stopped or took
    an unknown detour during that gap, so drawing a "real" route there would claim
    knowledge we don't have."""
    if nxt.is_chain_break:
        points = [(prev.lat, prev.lon), (nxt.lat, nxt.lon)]
        folium.PolyLine(points, color="orange", weight=4, opacity=0.8, dash_array="8,8").add_to(
            group_or_map
        )
    else:
        points = get_route_geometry(conn, prev.camera_id, nxt.camera_id, graph=graph)
        folium.PolyLine(points, color=color, weight=4, opacity=0.8).add_to(group_or_map)


def plot_trajectory(conn, trajectory, out_path=None):
    """trajectory: a pipeline.Trajectory. Saves an HTML map with camera pins and the
    reconstructed path drawn along the real road network; chain-break hops are drawn
    as a dashed line instead, since the actual path during that gap is unknown."""
    if not trajectory.stops:
        raise ValueError("Trajectory has no stops to plot")

    if out_path is None:
        out_path = config.DATA_DIR / "trajectory_map.html"

    graph = load_graph()
    center = [trajectory.stops[0].lat, trajectory.stops[0].lon]
    fmap = folium.Map(location=center, zoom_start=13)

    for stop in trajectory.stops:
        folium.Marker(
            [stop.lat, stop.lon],
            popup=f"{stop.camera_id}<br>ts={stop.ts:.0f}<br>confidence={stop.confidence:.2f}",
            icon=folium.Icon(color="red" if stop.is_chain_break else "blue"),
        ).add_to(fmap)

    for prev, nxt in zip(trajectory.stops, trajectory.stops[1:]):
        _draw_hop(fmap, conn, graph, prev, nxt, color="green")

    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    fmap.save(str(out_path))
    return out_path


_PALETTE = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#8c564b",
    "#e377c2", "#17becf", "#bcbd22", "#7f7f7f", "#393b79",
]


def plot_multiple_trajectories(conn, trajectories, out_path=None):
    """Plot several reconstructed trajectories on one map, each vehicle its own colour
    and its own toggleable layer, plus a plate search box that shows only matching
    vehicles.

    The search box is a client-side filter over the vehicles already rendered into
    this page - typing a plate hides every other already-plotted vehicle, it does not
    run a new query against the database. Reconstructing a plate that was never
    included when this file was generated still means re-running the CLI/generation
    step - this is a static HTML file, not a live backend.
    """
    plotted = [t for t in trajectories if t.stops]
    if not plotted:
        raise ValueError("No trajectories with stops to plot")

    if out_path is None:
        out_path = config.DATA_DIR / "fleet_map.html"

    graph = load_graph()
    center = [plotted[0].stops[0].lat, plotted[0].stops[0].lon]
    fmap = folium.Map(location=center, zoom_start=13)

    layer_by_plate = {}
    for idx, trajectory in enumerate(plotted):
        color = _PALETTE[idx % len(_PALETTE)]
        group = folium.FeatureGroup(name=trajectory.plate, show=True)

        for stop in trajectory.stops:
            folium.CircleMarker(
                [stop.lat, stop.lon],
                radius=6,
                color="red" if stop.is_chain_break else color,
                fill=True,
                fill_opacity=0.9,
                popup=(
                    f"{trajectory.plate}<br>{stop.camera_id}<br>"
                    f"ts={stop.ts:.0f}<br>confidence={stop.confidence:.2f}"
                ),
            ).add_to(group)

        for prev, nxt in zip(trajectory.stops, trajectory.stops[1:]):
            _draw_hop(group, conn, graph, prev, nxt, color=color)

        group.add_to(fmap)
        layer_by_plate[trajectory.plate] = group.get_name()

    folium.LayerControl(collapsed=False).add_to(fmap)
    fmap.get_root().html.add_child(folium.Element(_search_control_html(fmap, layer_by_plate)))

    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    fmap.save(str(out_path))
    return out_path


def _search_control_html(fmap, layer_by_plate: dict) -> str:
    map_var = fmap.get_name()
    entries = ",\n".join(f'    "{plate}": {layer_var}' for plate, layer_var in layer_by_plate.items())

    return f"""
    <div style="position: fixed; top: 10px; left: 60px; z-index: 9999; background: white;
                padding: 8px 12px; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                font-family: sans-serif;">
      <input id="plate-search" type="text"
             placeholder="Type a plate to isolate it (filters vehicles already on this map)"
             style="padding:4px 8px; width:320px; border:1px solid #ccc; border-radius:4px;"
             oninput="filterTrajectoryLayers(this.value)"/>
      <div id="plate-search-count" style="font-size:12px; color:#555; margin-top:4px;"></div>
    </div>
    <script>
      var trajectoryLayers = {{
{entries}
      }};
      function filterTrajectoryLayers(query) {{
        query = query.trim().toUpperCase();
        var shown = 0;
        for (var plate in trajectoryLayers) {{
          var layer = trajectoryLayers[plate];
          var matches = (query === "") || plate.toUpperCase().indexOf(query) !== -1;
          if (matches) {{
            if (!{map_var}.hasLayer(layer)) {{ {map_var}.addLayer(layer); }}
            shown += 1;
          }} else {{
            if ({map_var}.hasLayer(layer)) {{ {map_var}.removeLayer(layer); }}
          }}
        }}
        document.getElementById('plate-search-count').innerText =
          query === "" ? (Object.keys(trajectoryLayers).length + " vehicles shown")
                       : (shown + " matching vehicle(s)");
      }}
    </script>
    """


def export_rows_to_csv(rows, out_path):
    with open(out_path, "w", newline="") as f:
        if not rows:
            return out_path
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return out_path


def export_od_matrix_to_csv(matrix, cameras, out_path):
    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["origin\\destination"] + cameras)
        for i, origin in enumerate(cameras):
            writer.writerow([origin] + [f"{matrix[i][j]:.2f}" for j in range(len(cameras))])
    return out_path

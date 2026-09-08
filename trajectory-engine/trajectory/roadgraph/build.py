"""Build and cache the demo-city road graph via OSMnx.

First run needs internet access (hits the Overpass API once); every run after that loads
the cached .graphml file and is fully offline. Nothing else in this package calls
osmnx.graph_from_place directly - this is the one place that touches the network.
"""
import osmnx as ox

from trajectory import config


def build_graph(force: bool = False):
    """Download (or load the cached) drive network for config.DEMO_PLACE."""
    if config.GRAPH_CACHE_PATH.exists() and not force:
        return ox.load_graphml(config.GRAPH_CACHE_PATH)

    graph = ox.graph_from_place(config.DEMO_PLACE, network_type=config.NETWORK_TYPE)
    graph = ox.add_edge_speeds(graph)
    graph = ox.add_edge_travel_times(graph)

    config.GRAPH_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(graph, config.GRAPH_CACHE_PATH)
    return graph


def load_graph():
    """Convenience alias: use the cache if present, else build it."""
    return build_graph(force=False)


def largest_component(graph):
    """Restrict to the largest weakly-connected component, so any two nodes in the
    result are guaranteed reachable from one another (avoids stranding synthetic
    cameras on disconnected fragments of the extracted network)."""
    import networkx as nx

    largest_nodes = max(nx.weakly_connected_components(graph), key=len)
    return graph.subgraph(largest_nodes).copy()


if __name__ == "__main__":
    g = build_graph()
    print(f"Graph ready: {len(g.nodes)} nodes, {len(g.edges)} edges")
    g_main = largest_component(g)
    print(f"Largest connected component: {len(g_main.nodes)} nodes, {len(g_main.edges)} edges")

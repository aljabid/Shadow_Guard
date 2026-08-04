import networkx as nx


def compute_centrality(G: nx.Graph) -> dict:
    if len(G.nodes) == 0:
        return {}
    degree_centrality = nx.degree_centrality(G)
    try:
        betweenness = nx.betweenness_centrality(G, normalized=True)
    except Exception:
        betweenness = {n: 0.0 for n in G.nodes}
    combined = {node: round(degree_centrality.get(node, 0) * 0.6 + betweenness.get(node, 0) * 0.4, 4) for node in G.nodes}
    sorted_nodes = sorted(combined.items(), key=lambda x: x[1], reverse=True)
    return {"centrality_scores": combined, "top_nodes": [{"node": n, "centrality": s} for n, s in sorted_nodes[:10]]}

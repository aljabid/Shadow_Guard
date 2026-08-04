def get_edge_color(edge_type: str) -> str:
    return {"shared_admin": "#e94560", "shared_contact": "#f5a623", "shared_infrastructure": "#4a90e2"}.get(edge_type, "#888888")


def classify_edge(edge_data: dict) -> str:
    edge_type = edge_data.get("edge_type", "unknown")
    weight = edge_data.get("weight", 0)
    if edge_type == "shared_admin":
        return "high_confidence"
    if edge_type == "shared_contact" and weight >= 3:
        return "medium_confidence"
    return "low_confidence"


def summarize_edges(edges: list) -> dict:
    type_counts = {}
    for edge in edges:
        t = edge.get("edge_type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
    return {"total_edges": len(edges), "by_type": type_counts, "high_confidence_connections": type_counts.get("shared_admin", 0)}

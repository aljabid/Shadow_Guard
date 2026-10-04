import networkx as nx
from typing import List
from app.modules.droper.graph.edge_builder import get_edge_color, classify_edge


def safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except Exception:
        return default


def safe_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return []


class GraphExporter:
    def export(self, G: nx.Graph, communities: List[dict]) -> dict:
        node_community = {
            node: comm.get("community_id")
            for comm in (communities or [])
            for node in comm.get("nodes", [])
        }

        nodes = []

        for node, attrs in G.nodes(data=True):
            attrs = attrs or {}

            risk = safe_float(attrs.get("risk_score"), 0)
            member_count = safe_float(attrs.get("member_count"), 0)
            recruitment_posts = safe_int(attrs.get("recruitment_posts"), 0)

            nodes.append(
                {
                    "id": str(node),
                    "label": str(node),
                    "node_type": attrs.get("node_type") or "channel",
                    "member_count": safe_int(member_count, 0),
                    "recruitment_posts": recruitment_posts,
                    "risk_score": risk,
                    "banks": safe_list(attrs.get("banks")),
                    "avg_payout": attrs.get("avg_payout"),
                    "community_id": node_community.get(node),
                    "size": max(10, min(member_count / 100, 50)),
                    "color": (
                        "#e94560"
                        if risk >= 80
                        else "#f5a623"
                        if risk >= 60
                        else "#ffd700"
                        if risk >= 40
                        else "#4caf50"
                    ),
                }
            )

        edges = []

        for source, target, attrs in G.edges(data=True):
            attrs = attrs or {}

            edge_type = attrs.get("edge_type") or "unknown"

            edges.append(
                {
                    "source": str(source),
                    "target": str(target),
                    "edge_type": edge_type,
                    "weight": safe_float(attrs.get("weight"), 1.0),
                    "color": get_edge_color(edge_type),
                    "confidence": classify_edge(attrs),
                    "shared": safe_list(attrs.get("shared")),
                }
            )

        return {
            "nodes": nodes,
            "edges": edges,
        }


graph_exporter = GraphExporter()
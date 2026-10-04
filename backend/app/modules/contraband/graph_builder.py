
from typing import Dict, List

def _safe_node_id(prefix: str, value: str) -> str:
    value = (
        str(value)
        .lower()
        .replace(" ", "_")
        .replace("@", "")
        .replace("/", "_")
        .replace("\\", "_")
        .replace(".", "_")
        .replace(":", "_")
    )

    return f"{prefix}_{value}"


def build_graph(findings: List[Dict]) -> Dict:
    """
    Build Cytoscape-compatible graph.

    Relationships:

    Finding
      -> Telegram
      -> Phone
      -> Wallet
      -> Domain
      -> Location
      -> Substance
      -> Brand
      -> Courier
    """

    nodes = {}
    edges = []

    for idx, finding in enumerate(findings):
        finding_id = f"finding_{idx}"

        nodes[finding_id] = {
            "id": finding_id,
            "label": finding.get("title", f"Finding {idx + 1}")[:50],
            "node_type": "finding",
            "risk_score": int(finding.get("risk_score", 0)),
        }

        entities = finding.get("entities") or {}

        entity_sets = {
            "telegram": entities.get("telegram_handles", []),
            "phone": entities.get("phones", []),
            "wallet": entities.get("wallets", []),
            "domain": entities.get("domains", []),
            "location": entities.get("locations", []),
            "substance": entities.get("substances", []),
            "brand": entities.get("brands", []),
            "courier": entities.get("couriers", []),
        }

        for entity_type, values in entity_sets.items():
            for value in values:
                node_id = _safe_node_id(entity_type, value)

                if node_id not in nodes:
                    nodes[node_id] = {
                        "id": node_id,
                        "label": str(value),
                        "node_type": entity_type,
                        "risk_score": int(
                            finding.get("risk_score", 0)
                        ),
                    }

                edges.append(
                    {
                        "source": finding_id,
                        "target": node_id,
                        "edge_type": entity_type,
                        "label": f"mentions_{entity_type}",
                    }
                )

    return {
        "graph_nodes": list(nodes.values()),
        "graph_edges": edges,
    }


def graph_statistics(
    graph_nodes: List[Dict],
    graph_edges: List[Dict],
) -> Dict:
    return {
        "node_count": len(graph_nodes),
        "edge_count": len(graph_edges),
        "telegram_nodes": len(
            [
                n
                for n in graph_nodes
                if n.get("node_type") == "telegram"
            ]
        ),
        "wallet_nodes": len(
            [
                n
                for n in graph_nodes
                if n.get("node_type") == "wallet"
            ]
        ),
        "phone_nodes": len(
            [
                n
                for n in graph_nodes
                if n.get("node_type") == "phone"
            ]
        ),
        "location_nodes": len(
            [
                n
                for n in graph_nodes
                if n.get("node_type") == "location"
            ]
        ),
    }
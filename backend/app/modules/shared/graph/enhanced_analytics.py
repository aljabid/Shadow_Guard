"""
Shared graph analytics engine — used by DROPER, TENGRAF, and KOLKHOZ.
Provides:
  - Betweenness centrality (normalized)
  - Closeness centrality
  - Degree centrality
  - PageRank scores
  - Community clustering (Louvain or connected components fallback)
  - Temporal activity timeline (findings grouped by day)
  - Network risk scoring per community
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import networkx as nx


# ─── Core graph analysis ───────────────────────────────────────────────────

def compute_full_centrality(G: nx.Graph) -> Dict[str, Any]:
    """
    Compute betweenness, closeness, degree, and PageRank for all nodes.
    Returns centrality dicts and ranked top-10 by combined score.
    """
    if len(G.nodes) == 0:
        return {
            "degree":      {},
            "betweenness": {},
            "closeness":   {},
            "pagerank":    {},
            "combined":    {},
            "top_nodes":   [],
        }

    degree      = nx.degree_centrality(G)
    pagerank    = nx.pagerank(G, alpha=0.85) if len(G.nodes) >= 2 else {n: 0.0 for n in G.nodes}

    try:
        betweenness = nx.betweenness_centrality(G, normalized=True)
    except Exception:
        betweenness = {n: 0.0 for n in G.nodes}

    try:
        closeness = nx.closeness_centrality(G)
    except Exception:
        closeness = {n: 0.0 for n in G.nodes}

    # Combined score: weighted sum
    combined = {
        node: round(
            degree.get(node, 0)      * 0.30 +
            betweenness.get(node, 0) * 0.35 +
            closeness.get(node, 0)   * 0.15 +
            pagerank.get(node, 0)    * 0.20,
            4,
        )
        for node in G.nodes
    }

    top_nodes = sorted(combined.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "degree":      {n: round(v, 4) for n, v in degree.items()},
        "betweenness": {n: round(v, 4) for n, v in betweenness.items()},
        "closeness":   {n: round(v, 4) for n, v in closeness.items()},
        "pagerank":    {n: round(v, 4) for n, v in pagerank.items()},
        "combined":    combined,
        "top_nodes": [
            {
                "node":             node,
                "combined_score":   score,
                "betweenness":      round(betweenness.get(node, 0), 4),
                "degree":           round(degree.get(node, 0), 4),
                "pagerank":         round(pagerank.get(node, 0), 4),
                "risk_score":       int(G.nodes[node].get("risk_score", 0)),
                "node_type":        G.nodes[node].get("node_type", "unknown"),
            }
            for node, score in top_nodes
        ],
    }


def detect_communities(G: nx.Graph) -> List[Dict[str, Any]]:
    """
    Detect communities using Louvain (falls back to connected components).
    Returns sorted list of community dicts with node membership and risk stats.
    """
    if len(G.nodes) == 0:
        return []

    partition: Dict[str, int] = {}

    try:
        import community as community_louvain
        partition = community_louvain.best_partition(G.to_undirected())
    except (ImportError, Exception):
        for i, component in enumerate(nx.connected_components(G)):
            for node in component:
                partition[node] = i

    groups: Dict[int, List[str]] = {}
    for node, cid in partition.items():
        groups.setdefault(cid, []).append(node)

    communities = []
    for cid, nodes in groups.items():
        if len(nodes) < 2:
            continue

        subgraph  = G.subgraph(nodes)
        risk_vals = [int(G.nodes[n].get("risk_score", 0)) for n in nodes]
        avg_risk  = sum(risk_vals) / len(risk_vals) if risk_vals else 0
        max_risk  = max(risk_vals) if risk_vals else 0
        members   = sum(int(G.nodes[n].get("member_count", 0)) for n in nodes)

        # Clustering coefficient for this subgraph (internal cohesion)
        try:
            clustering = nx.average_clustering(subgraph.to_undirected())
        except Exception:
            clustering = 0.0

        communities.append({
            "community_id":       cid,
            "nodes":              nodes,
            "channel_count":      len(nodes),
            "total_members":      members,
            "avg_risk_score":     round(avg_risk, 1),
            "max_risk_score":     max_risk,
            "internal_edges":     subgraph.number_of_edges(),
            "clustering_coef":    round(clustering, 3),
            "network_risk_level": (
                "critical" if max_risk >= 85
                else "high" if max_risk >= 70
                else "medium" if max_risk >= 40
                else "low"
            ),
        })

    communities.sort(key=lambda c: c["avg_risk_score"], reverse=True)
    return communities


# ─── Temporal analysis ─────────────────────────────────────────────────────

def _parse_ts(ts_value: Any) -> Optional[datetime]:
    if not ts_value:
        return None
    try:
        if isinstance(ts_value, (int, float)):
            return datetime.utcfromtimestamp(ts_value / 1000 if ts_value > 1e10 else ts_value)
        s = str(ts_value).strip()
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(s[:26], fmt)
            except ValueError:
                continue
    except Exception:
        pass
    return None


def build_temporal_timeline(
    findings: List[Dict[str, Any]],
    date_field: str = "first_seen",
) -> List[Dict[str, Any]]:
    """
    Group findings by day and return a sorted timeline with daily counts,
    average risk, and top categories.
    """
    day_buckets: Dict[str, Dict[str, Any]] = {}

    for f in findings:
        ts = _parse_ts(
            f.get(date_field) or f.get("timestamp") or f.get("collected_at")
        )
        if ts is None:
            ts = datetime.utcnow()

        day = ts.strftime("%Y-%m-%d")
        if day not in day_buckets:
            day_buckets[day] = {
                "date":       day,
                "count":      0,
                "risk_sum":   0,
                "categories": {},
                "findings":   [],
            }

        bucket = day_buckets[day]
        bucket["count"]    += 1
        bucket["risk_sum"] += int(f.get("risk_score", 0))
        cat = f.get("crime_category", "UNKNOWN")
        bucket["categories"][cat] = bucket["categories"].get(cat, 0) + 1
        bucket["findings"].append({
            "title":          f.get("title", "")[:80],
            "risk_score":     f.get("risk_score", 0),
            "crime_category": cat,
            "source_type":    f.get("source_type", ""),
        })

    timeline = []
    for day, bucket in sorted(day_buckets.items()):
        count = bucket["count"]
        avg_risk = round(bucket["risk_sum"] / count, 1) if count else 0
        top_cat  = max(bucket["categories"].items(), key=lambda x: x[1], default=("", 0))[0]
        timeline.append({
            "date":            day,
            "findings_count":  count,
            "avg_risk_score":  avg_risk,
            "top_category":    top_cat,
            "category_breakdown": bucket["categories"],
            "sample_findings": bucket["findings"][:3],
        })

    return timeline


# ─── Unified analytics function ────────────────────────────────────────────

def run_enhanced_graph_analytics(
    G: nx.Graph,
    findings: Optional[List[Dict[str, Any]]] = None,
    date_field: str = "first_seen",
) -> Dict[str, Any]:
    """
    One-shot call that computes all graph analytics in one pass.
    Returns a structured dict suitable for including in module output.
    """
    centrality   = compute_full_centrality(G)
    communities  = detect_communities(G)
    timeline     = build_temporal_timeline(findings or [], date_field=date_field)

    # Network-level risk summary
    node_risks = [
        int(G.nodes[n].get("risk_score", 0)) for n in G.nodes
    ]
    avg_network_risk = round(sum(node_risks) / len(node_risks), 1) if node_risks else 0
    critical_nodes   = [n for n in G.nodes if int(G.nodes[n].get("risk_score", 0)) >= 85]

    return {
        "node_count":         G.number_of_nodes(),
        "edge_count":         G.number_of_edges(),
        "avg_network_risk":   avg_network_risk,
        "critical_nodes":     critical_nodes,
        "top_central_nodes":  centrality["top_nodes"],
        "centrality":         centrality,
        "communities":        communities,
        "community_count":    len(communities),
        "temporal_timeline":  timeline,
        "timeline_days":      len(timeline),
        "computed_at":        datetime.utcnow().isoformat(),
    }

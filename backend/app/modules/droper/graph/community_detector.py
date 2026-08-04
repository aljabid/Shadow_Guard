import networkx as nx
from typing import List
import logging

logger = logging.getLogger(__name__)


class CommunityDetector:
    def detect(self, G: nx.Graph) -> List[dict]:
        if len(G.nodes) == 0:
            return []
        try:
            import community as community_louvain
            partition = community_louvain.best_partition(G)
        except ImportError:
            partition = {}
            for i, component in enumerate(nx.connected_components(G)):
                for node in component:
                    partition[node] = i
        communities = {}
        for node, cid in partition.items():
            communities.setdefault(cid, []).append(node)
        result = []
        for cid, nodes in communities.items():
            if len(nodes) < 2:
                continue
            subgraph = G.subgraph(nodes)
            avg_risk = sum(G.nodes[n].get("risk_score", 0) for n in nodes) / len(nodes)
            total_members = sum(G.nodes[n].get("member_count", 0) for n in nodes)
            result.append({
                "community_id": cid, "nodes": nodes, "channel_count": len(nodes),
                "total_members": total_members, "avg_risk_score": round(avg_risk, 1),
                "internal_edges": subgraph.number_of_edges(),
            })
        result.sort(key=lambda x: x["avg_risk_score"], reverse=True)
        return result


community_detector = CommunityDetector()

import networkx as nx
from typing import List


class GraphBuilder:
    def build(self, channel_data: List[dict]) -> nx.Graph:
        G = nx.Graph()
        for ch in channel_data:
            name = ch.get("username") or ch.get("channel", "unknown")
            G.add_node(name, node_type="channel", member_count=ch.get("member_count", 0),
                       recruitment_posts=ch.get("recruitment_post_count", 0),
                       risk_score=ch.get("risk_score", 0),
                       banks=ch.get("banks_mentioned", []),
                       avg_payout=ch.get("avg_payout"),
                       phones=ch.get("phones_extracted", []),
                       handles=ch.get("handles_extracted", []))
        data_list = list(channel_data)
        for i, ch_a in enumerate(data_list):
            for j, ch_b in enumerate(data_list):
                if i >= j:
                    continue
                name_a = ch_a.get("username") or ch_a.get("channel", "")
                name_b = ch_b.get("username") or ch_b.get("channel", "")
                shared_handles = set(ch_a.get("handles_extracted", [])) & set(ch_b.get("handles_extracted", []))
                shared_phones = set(ch_a.get("phones_extracted", [])) & set(ch_b.get("phones_extracted", []))
                shared_banks = set(ch_a.get("banks_mentioned", [])) & set(ch_b.get("banks_mentioned", []))
                if shared_handles:
                    G.add_edge(name_a, name_b, edge_type="shared_admin", weight=len(shared_handles) * 2.0, shared=list(shared_handles))
                elif shared_phones:
                    G.add_edge(name_a, name_b, edge_type="shared_contact", weight=len(shared_phones) * 1.5, shared=list(shared_phones))
                elif len(shared_banks) >= 2:
                    G.add_edge(name_a, name_b, edge_type="shared_infrastructure", weight=len(shared_banks) * 0.5, shared=list(shared_banks))
        return G


graph_builder = GraphBuilder()

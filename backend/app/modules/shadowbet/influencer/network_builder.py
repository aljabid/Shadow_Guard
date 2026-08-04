from typing import List


class InfluencerNetworkBuilder:
    def build(self, influencer_map: dict, platform_data: List[dict]) -> dict:
        nodes = []
        edges = []
        platform_set = set()
        for item in platform_data:
            pname = item.get("platform_name", "")
            if pname:
                platform_set.add(pname)
                nodes.append({"id": pname, "type": "platform", "label": pname,
                              "is_licensed": item.get("is_licensed", False),
                              "risk_score": item.get("risk_score", 0)})
        for influencer, data in influencer_map.items():
            member_count = data.get("member_count", 0)
            nodes.append({"id": influencer, "type": "influencer", "label": influencer,
                          "member_count": member_count,
                          "size": max(10, min(member_count / 1000, 50))})
            for platform in data.get("platforms", []):
                if platform in platform_set:
                    edges.append({"source": influencer, "target": platform, "edge_type": "promotes",
                                  "affiliate_codes": data.get("affiliate_codes", [])})
        return {"nodes": nodes, "edges": edges}


influencer_network_builder = InfluencerNetworkBuilder()

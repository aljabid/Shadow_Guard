from typing import List


class NetworkRanker:
    def rank(self, communities: List[dict], channel_data: List[dict]) -> List[dict]:
        lookup = {(ch.get("username") or ch.get("channel", "")): ch for ch in channel_data}
        ranked = []
        for community in communities:
            nodes = community.get("nodes", [])
            total_posts = sum(lookup.get(n, {}).get("recruitment_post_count", 0) for n in nodes)
            total_phones = sum(len(lookup.get(n, {}).get("phones_extracted", [])) for n in nodes)
            threat_score = (
                community.get("avg_risk_score", 0) * 0.5
                + min(total_posts / 10, 30) * 0.3
                + community.get("channel_count", 0) * 2 * 0.2
            )
            ranked.append({**community, "total_recruitment_posts": total_posts,
                           "total_phone_numbers": total_phones,
                           "threat_score": round(min(threat_score, 100), 1),
                           "top_channels": nodes[:3]})
        ranked.sort(key=lambda x: x["threat_score"], reverse=True)
        return ranked


network_ranker = NetworkRanker()

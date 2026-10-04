from typing import List
import logging

logger = logging.getLogger(__name__)


class OperatorResolver:
    def resolve(self, clusters: List[dict], wallet_addresses: List[str], influencer_map: dict) -> List[dict]:
        operators = []
        for i, cluster in enumerate(clusters):
            domains = cluster.get("domains", [])
            operator_id = f"operator_{i + 1}"
            influencers_promoting = []
            for influencer, data in influencer_map.items():
                platform_text = " ".join(data.get("platforms", []))
                if any(d in platform_text for d in domains):
                    influencers_promoting.append(influencer)
            operators.append({
                "operator_id": operator_id,
                "domain_count": len(domains),
                "domains": domains,
                "registrar": cluster.get("registrar", "unknown"),
                "shared_infrastructure": cluster.get("name_servers", []),
                "influencer_count": len(set(influencers_promoting)),
                "influencers": list(set(influencers_promoting)),
                "wallet_addresses": wallet_addresses[:3],
                "estimated_weekly_revenue_kzt": 0.0,
            })
        return operators


operator_resolver = OperatorResolver()

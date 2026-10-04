from typing import List
from app.modules.shadowbet.validation.whois_lookup import lookup
import logging

logger = logging.getLogger(__name__)


class DomainClusterer:
    async def cluster(self, domains: List[str]) -> List[dict]:
        if not domains:
            return []
        domain_data = {}
        for domain in domains[:30]:
            try:
                whois_data = await lookup(domain)
                domain_data[domain] = whois_data or {}
            except Exception as e:
                logger.error(f"Cluster lookup error for {domain}: {e}")
                domain_data[domain] = {}
        clusters = {}
        for domain, data in domain_data.items():
            registrar = data.get("registrar", "unknown")
            ns = str(sorted(data.get("name_servers", []) or []))
            cluster_key = f"{registrar}|{ns}"
            if cluster_key not in clusters:
                clusters[cluster_key] = {"cluster_key": cluster_key, "registrar": registrar,
                                         "name_servers": data.get("name_servers", []), "domains": []}
            clusters[cluster_key]["domains"].append(domain)
        result = [v for v in clusters.values() if len(v["domains"]) >= 2]
        result.sort(key=lambda x: len(x["domains"]), reverse=True)
        return result


domain_clusterer = DomainClusterer()

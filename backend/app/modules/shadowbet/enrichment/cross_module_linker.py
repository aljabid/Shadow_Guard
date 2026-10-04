from typing import List
import logging

logger = logging.getLogger(__name__)


async def link_gambling_entities(domains: List[str], wallet_addresses: List[str], db=None) -> dict:
    if not db:
        return {"cross_module_hits": []}
    from app.services.entity_service import EntityService
    entity_service = EntityService(db)
    hits = []
    for wallet in wallet_addresses[:5]:
        entity = await entity_service.get_entity("wallet", wallet)
        if entity and len(entity.source_modules) > 1:
            hits.append({"entity": wallet, "type": "wallet",
                         "found_in_modules": entity.source_modules,
                         "risk_score": entity.risk_score,
                         "significance": "Wallet linked across multiple criminal modules"})
    for domain in domains[:5]:
        entity = await entity_service.get_entity("domain", domain)
        if entity and len(entity.source_modules) > 1:
            hits.append({"entity": domain, "type": "domain",
                         "found_in_modules": entity.source_modules,
                         "risk_score": entity.risk_score,
                         "significance": "Domain linked across multiple criminal modules"})
    return {"cross_module_hits": hits, "is_cross_module": len(hits) > 0, "hit_count": len(hits)}

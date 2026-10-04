from typing import List
import logging

logger = logging.getLogger(__name__)


async def link_pyramid_entities(channel: str, wallet_addresses: List[str], db=None) -> dict:
    if not db:
        return {"cross_module_hits": []}
    from app.services.entity_service import EntityService
    entity_service = EntityService(db)
    hits = []
    channel_entity = await entity_service.get_entity("telegram_channel", channel)
    if channel_entity and len(channel_entity.source_modules) > 1:
        hits.append({"entity": channel, "type": "telegram_channel",
                     "also_in_modules": channel_entity.source_modules, "risk_score": channel_entity.risk_score})
    for wallet in wallet_addresses[:5]:
        wallet_entity = await entity_service.get_entity("wallet", wallet)
        if wallet_entity and len(wallet_entity.source_modules) > 1:
            hits.append({"entity": wallet, "type": "wallet",
                         "also_in_modules": wallet_entity.source_modules, "risk_score": wallet_entity.risk_score})
    return {"cross_module_hits": hits, "is_cross_module": len(hits) > 0}

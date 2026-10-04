from typing import List
import logging

logger = logging.getLogger(__name__)


async def check_cross_module_hits(entity_type: str, entity_values: List[str], db=None) -> List[dict]:
    if not db or not entity_values:
        return []
    from app.services.entity_service import EntityService
    entity_service = EntityService(db)
    hits = []
    for value in entity_values:
        entity = await entity_service.get_entity(entity_type, value)
        if entity and len(entity.source_modules) > 1:
            hits.append({"entity_type": entity_type, "entity_value": value,
                         "found_in_modules": entity.source_modules, "risk_score": entity.risk_score, "is_cross_module": True})
    return hits

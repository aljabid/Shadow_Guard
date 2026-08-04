from app.modules.piramida.validation.aifc_registry_checker import aifc_registry_checker
from app.modules.piramida.validation.egov_registry_checker import egov_registry_checker


async def validate_entity(entity_name: str) -> dict:
    aifc_result = await aifc_registry_checker.check(entity_name)
    egov_result = await egov_registry_checker.check_company(entity_name)
    is_valid = aifc_result["is_registered"] or egov_result["is_registered"]
    validity_score = 100 if aifc_result["is_registered"] else 50 if egov_result["is_registered"] else 0
    return {
        "entity_name": entity_name, "is_valid": is_valid, "validity_score": validity_score,
        "aifc_result": aifc_result, "egov_result": egov_result,
        "recommendation": "Entity appears legitimate" if is_valid else "Entity NOT found in any registry — HIGH RISK",
    }

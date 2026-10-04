import httpx
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
AIFC_REGISTRY_URL = "https://afsa.kz/en/registers/registered-persons/"


class AIFCRegistryChecker:
    async def check(self, entity_name: str) -> dict:
        is_registered = False
        details = None
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(AIFC_REGISTRY_URL, params={"search": entity_name})
                if resp.status_code == 200:
                    is_registered = entity_name.lower() in resp.text.lower()
                    details = {"source": "AIFC Registry", "url": AIFC_REGISTRY_URL,
                               "checked_at": datetime.utcnow().isoformat()}
        except Exception as e:
            logger.error(f"AIFC registry check error: {e}")
            details = {"error": str(e), "source": "AIFC Registry"}
        return {"entity_name": entity_name, "is_registered": is_registered, "registry": "AIFC", "details": details}


aifc_registry_checker = AIFCRegistryChecker()

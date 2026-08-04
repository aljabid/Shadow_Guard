import logging

logger = logging.getLogger(__name__)


class KGRegistryChecker:
    async def check(self, entity_name: str) -> dict:
        return {"entity_name": entity_name, "is_registered": False,
                "registry": "Kyrgyzstan Ministry of Justice",
                "details": {"note": "Manual verification required — API not publicly available"}}


kg_registry_checker = KGRegistryChecker()

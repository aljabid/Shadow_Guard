import logging

logger = logging.getLogger(__name__)
BAC_LICENSED = ["olimpbet.kz", "1xstavka.kz", "fonbet.kz"]


class BACRegistryChecker:
    async def check(self, domain: str) -> dict:
        domain_clean = domain.lower().strip()
        is_registered = any(lic in domain_clean for lic in BAC_LICENSED)
        return {
            "domain": domain, "is_bac_registered": is_registered,
            "registry": "Unified Betting Account Center (BAC)",
            "details": {"note": "Licensed via BAC" if is_registered else "Not found in BAC registry"},
        }


bac_registry_checker = BACRegistryChecker()

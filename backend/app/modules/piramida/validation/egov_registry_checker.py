import httpx
import logging

logger = logging.getLogger(__name__)
EGOV_BASE = "https://stat.gov.kz/api/juridical/counter/api/"


class EGovRegistryChecker:
    async def check_company(self, company_name: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(EGOV_BASE, params={"bin": company_name, "lang": "ru"})
                if resp.status_code == 200:
                    data = resp.json()
                    found = bool(data.get("obj"))
                    return {"entity_name": company_name, "is_registered": found, "registry": "KZ eGov", "details": data.get("obj")}
        except Exception as e:
            logger.error(f"eGov check error: {e}")
        return {"entity_name": company_name, "is_registered": False, "registry": "KZ eGov",
                "details": {"error": "Registry check unavailable"}}


egov_registry_checker = EGovRegistryChecker()

import httpx
import logging

logger = logging.getLogger(__name__)
AIFC_BETTING_REGISTRY = "https://afsa.kz/en/registers/registered-persons/"
KNOWN_LICENSED_OPERATORS = ["olimpbet", "1xstavka", "fonbet", "parimatch_kz"]


class AIFCLicenseChecker:
    async def check(self, platform_name: str) -> dict:
        platform_lower = platform_name.lower().strip()
        if any(lic in platform_lower for lic in KNOWN_LICENSED_OPERATORS):
            return {"platform": platform_name, "is_licensed": True, "registry": "AIFC / BAC",
                    "details": {"note": "Known licensed operator"}}
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(AIFC_BETTING_REGISTRY, params={"search": platform_name})
                is_found = resp.status_code == 200 and platform_lower in resp.text.lower()
                return {"platform": platform_name, "is_licensed": is_found, "registry": "AIFC",
                        "details": {"checked_url": AIFC_BETTING_REGISTRY, "status_code": resp.status_code}}
        except Exception as e:
            logger.error(f"AIFC license check error for {platform_name}: {e}")
            return {"platform": platform_name, "is_licensed": False, "registry": "AIFC",
                    "details": {"error": str(e)}}


aifc_license_checker = AIFCLicenseChecker()

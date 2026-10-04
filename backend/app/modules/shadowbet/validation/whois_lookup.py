import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def lookup(domain: str) -> Optional[dict]:
    try:
        import whois
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, whois.whois, domain)
        return {
            "domain": domain, "registrar": result.registrar,
            "creation_date": str(result.creation_date),
            "expiration_date": str(result.expiration_date),
            "country": result.country, "name_servers": result.name_servers,
        }
    except Exception as e:
        logger.error(f"WHOIS lookup error for {domain}: {e}")
        return {"domain": domain, "error": str(e)}

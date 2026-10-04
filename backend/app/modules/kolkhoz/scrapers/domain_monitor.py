import httpx
import asyncio
import time
import logging

logger = logging.getLogger(__name__)


class DomainMonitor:
    async def check_domain(self, domain: str) -> dict:
        url = f"https://{domain}"
        status = "unknown"
        status_code = None
        latency_ms = None
        try:
            start = time.time()
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url)
                latency_ms = round((time.time() - start) * 1000)
                status_code = resp.status_code
                status = "online" if resp.status_code < 400 else "error"
        except httpx.ConnectError:
            status = "offline"
        except httpx.TimeoutException:
            status = "timeout"
        except Exception as e:
            logger.error(f"Domain check error for {domain}: {e}")
            status = "error"
        return {"domain": domain, "status": status, "status_code": status_code, "latency_ms": latency_ms}

    async def check_multiple(self, domains: list) -> list:
        tasks = [self.check_domain(d) for d in domains]
        return await asyncio.gather(*tasks)


domain_monitor = DomainMonitor()

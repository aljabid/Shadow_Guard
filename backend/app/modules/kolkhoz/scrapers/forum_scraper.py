import httpx
from typing import List
from app.modules.shared.scrapers.rate_limiter import rate_limiter
import logging

logger = logging.getLogger(__name__)
AHMIA_BASE = "https://ahmia.fi/search/"


class ForumScraper:
    async def search_ahmia(self, query: str, limit: int = 20) -> List[dict]:
        await rate_limiter.acquire("ahmia", max_calls=5, period=60.0)
        results = []
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(AHMIA_BASE, params={"q": query})
                if resp.status_code == 200:
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(resp.text, "html.parser")
                    for item in soup.select("li.result")[:limit]:
                        title_el = item.select_one("a")
                        desc_el = item.select_one("p")
                        results.append({
                            "title": title_el.text.strip() if title_el else "",
                            "url": title_el.get("href", "") if title_el else "",
                            "description": desc_el.text.strip() if desc_el else "",
                            "source": "ahmia",
                        })
        except Exception as e:
            logger.error(f"Ahmia search error: {e}")
        return results

    async def search_exchange_complaints(self, exchange_name: str) -> List[dict]:
        queries = [f"{exchange_name} scam", f"{exchange_name} не выводят", f"{exchange_name} кинули"]
        all_results = []
        for query in queries:
            results = await self.search_ahmia(query, limit=10)
            all_results.extend(results)
        return all_results


forum_scraper = ForumScraper()

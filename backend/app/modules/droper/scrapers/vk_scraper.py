import httpx
from typing import List
import logging

logger = logging.getLogger(__name__)


class VKScraper:
    async def search_groups(self, query: str, count: int = 20) -> List[dict]:
        logger.info(f"VK scraping for '{query}' — requires VK API token")
        return []


vk_scraper = VKScraper()

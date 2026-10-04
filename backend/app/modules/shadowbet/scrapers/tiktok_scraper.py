import logging

logger = logging.getLogger(__name__)


class TikTokScraper:
    async def search_hashtag(self, hashtag: str, limit: int = 20) -> list:
        logger.info(f"TikTok scraping for '{hashtag}' — requires authenticated API session")
        return []


tiktok_scraper = TikTokScraper()

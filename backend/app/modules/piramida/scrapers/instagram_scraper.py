import logging

logger = logging.getLogger(__name__)


class InstagramScraper:
    async def search_hashtag(self, hashtag: str, limit: int = 20) -> list:
        logger.info(f"Instagram scraping for '{hashtag}' — requires authenticated session")
        return []


instagram_scraper = InstagramScraper()

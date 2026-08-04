import logging

logger = logging.getLogger(__name__)


class ShadowBetInstagramScraper:
    async def search_hashtag(self, hashtag: str, limit: int = 20) -> list:
        logger.info(f"Instagram scraping for '{hashtag}' — requires authenticated session")
        return []


shadowbet_instagram_scraper = ShadowBetInstagramScraper()

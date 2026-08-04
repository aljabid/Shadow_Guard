import httpx
from typing import Optional
from app.modules.piramida.nlp.return_extractor import return_extractor
import logging

logger = logging.getLogger(__name__)


class WebsiteScraper:
    async def scrape(self, url: str) -> Optional[dict]:
        if not url.startswith("http"):
            url = f"https://{url}"
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    return None
                text = resp.text[:50000]
                returns = return_extractor.extract(text)
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(text, "html.parser")
                title = soup.title.string.strip() if soup.title else ""
                return {"url": url, "title": title, "return_promises": returns, "status_code": resp.status_code}
        except Exception as e:
            logger.error(f"Website scrape error for {url}: {e}")
            return None


website_scraper = WebsiteScraper()

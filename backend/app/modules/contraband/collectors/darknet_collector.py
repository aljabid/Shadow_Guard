import os
import re
from datetime import datetime
from typing import Dict, List
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup


DEFAULT_TIMEOUT = 30


def _get_env_list(name: str) -> List[str]:
    value = os.getenv(name, "")
    return [item.strip() for item in value.split(",") if item.strip()]


def _clean_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value or "")
    return value.strip()


def _safe_title(soup: BeautifulSoup, url: str) -> str:
    if soup.title and soup.title.string:
        return _clean_text(soup.title.string)

    return urlparse(url).netloc or url


def _extract_page_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    return _clean_text(soup.get_text(" "))


class DarknetContrabandCollector:
    """
    Tor/onion collector for approved CONTRABAND-KZ seed sources.

    Required .env examples:
    CONTRABAND_DARKNET_URLS=http://exampleonion.onion/page,http://another.onion
    TOR_PROXY=socks5h://127.0.0.1:9050
    """

    def __init__(self, input_data: Dict | None = None):
        self.input_data = input_data or {}

        self.urls = _get_env_list("CONTRABAND_DARKNET_URLS")
        self.urls.extend(self.input_data.get("darknet_urls") or [])
        self.urls = list(dict.fromkeys(self.urls))

        self.tor_proxy = os.getenv("TOR_PROXY", "socks5h://127.0.0.1:9050")

    async def collect(self) -> List[Dict]:
        max_urls = int(self.input_data.get("max_darknet_urls", 15) or 15)

        if not self.urls:
            return []

        collected: List[Dict] = []

        headers = {
            "User-Agent": "Mozilla/5.0 ShadowGuard-ContrabandKZ/1.0"
        }

        transport = httpx.AsyncHTTPTransport(
            proxy=self.tor_proxy,
            retries=1,
        )

        async with httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            headers=headers,
            transport=transport,
        ) as client:
            for url in self.urls[:max_urls]:
                try:
                    response = await client.get(url)

                    if response.status_code >= 400:
                        continue

                    content_type = response.headers.get("content-type", "")

                    if "text/html" not in content_type and "text/plain" not in content_type:
                        continue

                    html = response.text
                    soup = BeautifulSoup(html, "html.parser")

                    title = _safe_title(soup, url)
                    text = _extract_page_text(html)

                    if not text:
                        continue

                    collected.append(
                        {
                            "source_type": "darknet",
                            "source_name": urlparse(url).netloc or "darknet",
                            "source_url": url,
                            "title": title,
                            "text": text[:8000],
                            "language": None,
                            "collected_at": datetime.utcnow().isoformat(),
                            "metadata": {
                                "collector": "darknet_collector",
                                "collection_mode": "real_tor_seeded_crawl",
                                "status_code": response.status_code,
                                "content_type": content_type,
                                "tor_proxy": self.tor_proxy,
                            },
                        }
                    )

                except Exception as e:
                    collected.append(
                        {
                            "source_type": "darknet",
                            "source_name": urlparse(url).netloc or "darknet",
                            "source_url": url,
                            "title": f"DarkNet collection error: {url}",
                            "text": str(e),
                            "language": None,
                            "collected_at": datetime.utcnow().isoformat(),
                            "metadata": {
                                "collector": "darknet_collector",
                                "error": type(e).__name__,
                                "tor_proxy": self.tor_proxy,
                            },
                        }
                    )

        return collected


async def collect_darknet_sources(input_data: Dict | None = None) -> List[Dict]:
    collector = DarknetContrabandCollector(input_data=input_data)
    return await collector.collect()